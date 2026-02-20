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
                        createdAt: { gte: start, lte: end }
                    },
                    _count: { _all: true }
                });

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
        const { startDate, endDate, advertiserId, type, projectName } = req.query;

        const start = startDate ? startOfDay(new Date(startDate as string)) : new Date(0);
        const end = endDate ? endOfDay(new Date(endDate as string)) : new Date();
        const dateFilter = { gte: start, lte: end };

        // ── 1. LANDING PAGE TRAFFIC ──────────────────────────────────────────
        // Grouped by landingPageId — LP visits have projectId = null so
        // the old projectId-based filter was silently excluding all of them.
        let lpStats: any[] = [];
        if (!type || type === 'all' || type === 'landing-page') {
            const lpVisits = await prisma.pageVisit.groupBy({
                by: ['landingPageId'],
                where: {
                    landingPageId: { not: null },
                    createdAt: dateFilter,
                },
                _count: { _all: true },
                orderBy: { _count: { _all: 'desc' } },
            });

            lpStats = await Promise.all(
                lpVisits.map(async (stat) => {
                    const lp = await prisma.landingPage.findUnique({
                        where: { id: stat.landingPageId! },
                        select: { id: true, name: true, slug: true, city: true },
                    });
                    if (!lp) return null;

                    // Advertiser filter: check if this advertiser has a project on this LP
                    if (advertiserId) {
                        const slotCount = await prisma.landingPageSlot.count({
                            where: {
                                landingPageId: lp.id,
                                project: { advertiserId: advertiserId as string },
                            },
                        });
                        if (slotCount === 0) return null;
                    }

                    return {
                        type: 'landing-page' as const,
                        landingPage: lp,
                        project: null,
                        advertiser: null,
                        visits: stat._count._all,
                    };
                })
            );
            lpStats = lpStats.filter(Boolean);
        }

        // ── 2. PROJECT PAGE TRAFFIC ──────────────────────────────────────────
        // Grouped by projectId, landingPageId = null (direct project page visits only)
        let projectStats: any[] = [];
        if (!type || type === 'all' || type === 'project-page') {
            const projectWhere: any = {};
            if (advertiserId) projectWhere.advertiserId = advertiserId as string;
            if (projectName) {
                projectWhere.name = { contains: projectName as string, mode: 'insensitive' };
            }

            const eligibleProjects = await prisma.project.findMany({
                where: projectWhere,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    advertiser: { select: { id: true, companyName: true, email: true } },
                },
            });
            const eligibleProjectIds = eligibleProjects.map(p => p.id);

            if (eligibleProjectIds.length > 0) {
                const projectVisits = await prisma.pageVisit.groupBy({
                    by: ['projectId'],
                    where: {
                        projectId: { in: eligibleProjectIds },
                        landingPageId: null, // direct project page visits only
                        createdAt: dateFilter,
                    },
                    _count: { _all: true },
                    orderBy: { _count: { _all: 'desc' } },
                });

                projectStats = projectVisits.map(stat => {
                    const project = eligibleProjects.find(p => p.id === stat.projectId);
                    if (!project) return null;
                    return {
                        type: 'project-page' as const,
                        landingPage: null,
                        project: { id: project.id, name: project.name, slug: project.slug },
                        advertiser: project.advertiser,
                        visits: stat._count._all,
                    };
                }).filter(Boolean);
            }
        }

        // ── 3. Summary ───────────────────────────────────────────────────────
        const totalLpVisits = lpStats.reduce((sum: number, s: any) => sum + s.visits, 0);
        const totalProjectVisits = projectStats.reduce((sum: number, s: any) => sum + s.visits, 0);

        res.json({
            summary: {
                totalVisits: totalLpVisits + totalProjectVisits,
                lpVisits: totalLpVisits,
                projectVisits: totalProjectVisits,
            },
            lpStats,
            projectStats,
        });

    } catch (error) {
        console.error("Error fetching admin performance stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
