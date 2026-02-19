import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export const recordVisit = async (req: Request, res: Response) => {
    try {
        let { landingPageId, projectId } = req.body;
        const visitorIp = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        if (!landingPageId && !projectId) {
            res.status(400).json({ error: "Missing landingPageId or projectId" });
            return;
        }

        // If projectId looks like a slug (not a UUID), resolve it to actual ID
        if (projectId && !projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const project = await prisma.project.findFirst({
                where: { slug: projectId },
                select: { id: true }
            });
            if (!project) {
                // Project not found by slug, skip recording silently
                res.status(200).json({ success: true });
                return;
            }
            projectId = project.id;
        }

        // Verify project exists before creating page visit
        if (projectId) {
            const projectExists = await prisma.project.findUnique({
                where: { id: projectId },
                select: { id: true }
            });
            if (!projectExists) {
                res.status(200).json({ success: true });
                return;
            }
        }

        await prisma.pageVisit.create({
            data: {
                landingPageId,
                projectId,
                visitorIp: typeof visitorIp === 'string' ? visitorIp : undefined,
                userAgent
            }
        });

        // Also increment the aggregate counters for quick access
        if (projectId) {
            await prisma.project.update({
                where: { id: projectId },
                data: { visits: { increment: 1 } }
            });
        }

        if (landingPageId) {
            await prisma.landingPage.update({
                where: { id: landingPageId },
                data: { visits: { increment: 1 } }
            });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error recording visit:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAdvertiserPerformance = async (req: Request | any, res: Response) => {
    try {
        const advertiserId = req.user.id;
        const { startDate, endDate } = req.query;

        const start = startDate ? startOfDay(new Date(startDate as string)) : new Date(0);
        const end = endDate ? endOfDay(new Date(endDate as string)) : new Date();

        // 1. Get all projects for this advertiser with their placements
        const projects = await prisma.project.findMany({
            where: { advertiserId },
            select: {
                id: true,
                name: true,
                placements: {
                    select: {
                        landingPageId: true,
                        landingPage: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                visits: true
                            }
                        }
                    }
                }
            }
        });

        if (projects.length === 0) {
            res.json({ data: [] });
            return;
        }

        // 2. Build a map of landing pages with visit counts
        // Group by landing page and show which projects are on each
        const lpMap = new Map<string, {
            landingPage: { id: string; name: string; slug: string; visits: number };
            projects: { id: string; name: string }[];
            visits: number;
        }>();

        for (const project of projects) {
            for (const placement of project.placements) {
                const lp = placement.landingPage;
                if (!lp) continue;

                if (!lpMap.has(lp.id)) {
                    lpMap.set(lp.id, {
                        landingPage: lp,
                        projects: [],
                        visits: lp.visits || 0
                    });
                }
                lpMap.get(lp.id)!.projects.push({ id: project.id, name: project.name });
            }
        }

        // 3. If date range is specified, query PageVisit for accurate counts within range
        if (startDate || endDate) {
            const lpIds = Array.from(lpMap.keys());
            if (lpIds.length > 0) {
                const visitCounts = await prisma.pageVisit.groupBy({
                    by: ['landingPageId'],
                    where: {
                        landingPageId: { in: lpIds },
                        createdAt: {
                            gte: start,
                            lte: end
                        }
                    },
                    _count: { _all: true }
                });

                // Update visit counts from the query
                for (const vc of visitCounts) {
                    if (vc.landingPageId && lpMap.has(vc.landingPageId)) {
                        lpMap.get(vc.landingPageId)!.visits = vc._count._all;
                    }
                }

                // Reset visits to 0 for LPs not in the date range results
                for (const [lpId, data] of lpMap) {
                    if (!visitCounts.some(vc => vc.landingPageId === lpId)) {
                        data.visits = 0;
                    }
                }
            }
        }

        // 4. Format response
        const data = Array.from(lpMap.values()).map(entry => ({
            landingPage: {
                name: entry.landingPage.name,
                slug: entry.landingPage.slug
            },
            project: entry.projects.length === 1
                ? entry.projects[0]
                : { id: 'multiple', name: `${entry.projects.length} projects` },
            projects: entry.projects,
            visits: entry.visits
        }));

        res.json({ data });

    } catch (error) {
        console.error("Error fetching performance stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAdminPerformance = async (req: Request | any, res: Response) => {
    try {
        const { startDate, endDate, advertiserId, type } = req.query;

        const start = startDate ? startOfDay(new Date(startDate as string)) : new Date(0);
        const end = endDate ? endOfDay(new Date(endDate as string)) : new Date();

        // 1. Get projects filter
        const whereClause: any = {};
        if (advertiserId) {
            whereClause.advertiserId = advertiserId;
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            select: { id: true, name: true, advertiser: { select: { companyName: true, email: true } } }
        });

        const projectIds = projects.map(p => p.id);

        if (projectIds.length === 0) {
            res.json({ data: [] });
            return;
        }

        // 2. Aggregate visits
        const visitWhere: any = {
            projectId: { in: projectIds },
            createdAt: {
                gte: start,
                lte: end
            }
        };

        if (type === 'landing-page') {
            visitWhere.landingPageId = { not: null };
        } else if (type === 'project-page') {
            visitWhere.landingPageId = null;
        }
        // If type is empty/all, we fetch both

        const stats = await prisma.pageVisit.groupBy({
            by: ['landingPageId', 'projectId'],
            where: visitWhere,
            _count: {
                _all: true
            }
        });

        // 3. Enrich data
        // 3. Enrich data
        const enrichedStats = await Promise.all(stats.map(async (stat) => {
            // Remove the strict check that filters out valid data
            // if (!stat.landingPageId || !stat.projectId) return null;

            let landingPage = null;
            if (stat.landingPageId) {
                landingPage = await prisma.landingPage.findUnique({
                    where: { id: stat.landingPageId },
                    select: { name: true, slug: true }
                });
            }

            let project = null;
            if (stat.projectId) {
                // Find project in our pre-fetched list
                const p = projects.find(p => p.id === stat.projectId);
                if (p) {
                    project = {
                        name: p.name,
                        advertiser: p.advertiser,
                        id: p.id
                    };
                }
            }

            // If we have neither project nor landing page, skip (shouldn't happen with current query)
            if (!landingPage && !project) return null;

            return {
                landingPage,
                project,
                visits: stat._count._all
            };
        }));

        res.json({
            data: enrichedStats.filter(s => s !== null)
        });

    } catch (error) {
        console.error("Error fetching admin performance stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
