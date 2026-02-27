import prisma from '../utils/prisma';
import { LeadCreateRequest, AdminRole } from '../types';
import { logAudit } from './audit.service';

// ==================== Leads ====================

export const createLead = async (data: LeadCreateRequest) => {
    // Verify project exists if projectId is provided
    let project = null;
    if (data.projectId) {
        project = await prisma.project.findUnique({ where: { id: data.projectId } });
        if (!project) {
            throw new Error('Project not found');
        }
    }

    // Verify landing page exists if ID provided
    if (data.landingPageId && data.landingPageId !== 'direct') {
        const landingPage = await prisma.landingPage.findUnique({ where: { id: data.landingPageId } });
        if (!landingPage) {
            throw new Error('Landing page not found');
        }
    }

    // Determine source based on how lead was submitted
    const source = (data.landingPageId && data.landingPageId !== 'direct') ? 'landing_page' : 'form';

    // Create the lead
    const lead = await prisma.lead.create({
        data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            projectId: data.projectId || null,
            landingPageId: (data.landingPageId && data.landingPageId !== 'direct') ? data.landingPageId : null,
            otpVerified: data.otpVerified || false,
            utmSource: data.utmSource,
            utmMedium: data.utmMedium,
            utmCampaign: data.utmCampaign,
            source: source,
            city: data.city,
            location: data.location,
            propertyType: data.propertyType,
            unitType: data.unitType,
            budget: data.budget,
        },
    });

    // Increment leadsCount on the project if applicable
    if (data.projectId) {
        await prisma.project.update({
            where: { id: data.projectId },
            data: { leadsCount: { increment: 1 } },
        });
    }

    return lead;
};

export const getLeads = async (params: {
    projectId?: string;
    landingPageId?: string;
    advertiserId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sourceType?: 'direct' | 'common' | 'all';
    salespersonId?: string;
}) => {
    const where: any = {};

    if (params.projectId) {
        where.projectId = params.projectId;
    }

    if (params.landingPageId) {
        where.landingPageId = params.landingPageId;
    }

    if (params.sourceType === 'direct') {
        where.landingPageId = null;
    } else if (params.sourceType === 'common') {
        where.landingPageId = { not: null };
    }

    if (params.advertiserId) {
        where.project = { advertiserId: params.advertiserId };
    }

    if (params.salespersonId) {
        where.project = {
            ...where.project,
            advertiser: {
                ...where.project?.advertiser,
                assignedSalespersonId: params.salespersonId
            }
        };
    }

    if (params.startDate || params.endDate) {
        where.createdAt = {};
        if (params.startDate) {
            where.createdAt.gte = params.startDate;
        }
        if (params.endDate) {
            where.createdAt.lte = params.endDate;
        }
    }

    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        builderName: true,
                        city: true,
                        locality: true,
                        advertiser: {
                            select: {
                                id: true,
                                companyName: true,
                                email: true,
                            },
                        },
                    },
                },
                landingPage: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: params.limit || 100,
            skip: params.offset || 0,
        }),
        prisma.lead.count({ where }),
    ]);

    return { leads, total };
};

export const getAdvertiserLeads = async (advertiserId: string) => {
    return prisma.lead.findMany({
        where: {
            assignedToId: advertiserId,
            status: 'assigned',
            source: { not: 'manual' }
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    builderName: true,
                },
            },
            landingPage: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

// For admin page - includes ALL leads (both platform and manual/servicing)
export const getAllAdvertiserLeads = async (advertiserId: string) => {
    return prisma.lead.findMany({
        where: {
            assignedToId: advertiserId,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    builderName: true,
                },
            },
            landingPage: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

// For builder servicing leads - returns ONLY manually uploaded leads
export const getServicingLeads = async (advertiserId: string, startDate?: string, endDate?: string) => {
    const dateFilter: any = {};
    if (startDate) {
        dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
        // Set to end of day in UTC to include full end date
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = end;
    }

    return prisma.lead.findMany({
        where: {
            assignedToId: advertiserId,
            source: 'manual',
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    builderName: true,
                },
            },
            landingPage: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getAdvertiserCommonLeads = async (advertiserId: string, startDate?: string, endDate?: string) => {
    // 1. Get all Landing Pages where this advertiser has a project placed + their lead filters
    const [projects, advertiser] = await Promise.all([
        prisma.project.findMany({
            where: { advertiserId },
            select: { placements: { select: { landingPageId: true } } }
        }),
        prisma.user.findUnique({
            where: { id: advertiserId },
            select: { leadFilters: true }
        })
    ]);

    const lpIds = [...new Set(projects.flatMap(p => p.placements.map(pl => pl.landingPageId)))];

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
        dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
        // Set to end of day in UTC to include full end date
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = end;
    }

    // 2. Apply advertiser's lead filters (same filters used during FB lead distribution)
    const filters = (advertiser?.leadFilters as any) || {};
    const leadFilterWhere: any = {};

    if (filters.locations && Array.isArray(filters.locations) && filters.locations.length > 0) {
        leadFilterWhere.location = { in: filters.locations };
    }
    if (filters.cities && Array.isArray(filters.cities) && filters.cities.length > 0) {
        leadFilterWhere.city = { in: filters.cities };
    }
    if (filters.propertyTypes && Array.isArray(filters.propertyTypes) && filters.propertyTypes.length > 0) {
        leadFilterWhere.propertyType = { in: filters.propertyTypes };
    }
    if (filters.unitTypes && Array.isArray(filters.unitTypes) && filters.unitTypes.length > 0) {
        leadFilterWhere.unitType = { in: filters.unitTypes };
    }
    if (filters.projectTypes && Array.isArray(filters.projectTypes) && filters.projectTypes.length > 0) {
        leadFilterWhere.projectType = { in: filters.projectTypes };
    }

    // 3. Return LP leads matching the advertiser's filters (projectId must be null —
    //    leads with a projectId are private to that project's advertiser)
    return prisma.lead.findMany({
        where: {
            landingPageId: { in: lpIds },
            projectId: null, // Only LP-generic/FB leads — project-specific leads are never common
            ...leadFilterWhere,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    builderName: true,
                },
            },
            landingPage: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getProjectLeads = async (projectId: string, advertiserId?: string) => {
    const where: any = { projectId };

    // If advertiserId provided, verify ownership
    if (advertiserId) {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                advertiserId,
            },
        });

        if (!project) {
            throw new Error('Project not found or unauthorized');
        }
    }

    return prisma.lead.findMany({
        where,
        include: {
            landingPage: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const manualUploadLeads = async (
    data: { leads: any[], projectId: string, landingPageId?: string, assignedToId?: string },
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
    };

    for (const leadData of data.leads) {
        try {
            await prisma.lead.create({
                data: {
                    name: leadData.name || 'N/A',
                    phone: String(leadData.phone),
                    email: leadData.email || '',
                    projectId: data.projectId,
                    landingPageId: (data.landingPageId && data.landingPageId !== 'direct') ? data.landingPageId : null,
                    otpVerified: true,
                    source: 'manual',
                    status: (data.assignedToId && data.assignedToId !== 'none') ? 'assigned' : 'unassigned',
                    assignedToId: (data.assignedToId && data.assignedToId !== 'none') ? data.assignedToId : null,
                    location: leadData.location,
                    city: leadData.city,
                    budget: leadData.budget,
                    projectType: leadData.projectType,
                    unitType: leadData.unitType,
                    propertyType: leadData.propertyType,
                },
            });

            if (data.assignedToId) {
                await prisma.user.update({
                    where: { id: data.assignedToId },
                    data: {
                        lastLeadReceivedAt: new Date(),
                        leadsReceivedToday: { increment: 1 }
                    }
                });
            }

            results.success++;
        } catch (error: any) {
            results.failed++;
            results.errors.push(`Lead ${leadData.name}: ${error.message}`);
        }
    }

    await logAudit('leads_manual_upload', currentUserId, currentUserRole, {
        projectId: data.projectId,
        assignedToId: data.assignedToId,
        count: results.success,
    });

    return results;
};

export const getAdvertiserDirectLeads = async (advertiserId: string) => {
    return prisma.lead.findMany({
        where: {
            // Any lead tied to this advertiser's project is private — regardless of whether
            // it also has a landingPageId (LP project card click still belongs to the project owner)
            project: { advertiserId },
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    builderName: true,
                    status: true,
                },
            },
            landingPage: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    isActive: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getCommonPoolLeads = async () => {
    return prisma.lead.findMany({
        where: {
            landingPageId: { not: null },
            status: 'unassigned'
        },
        include: {
            landingPage: {
                select: {
                    id: true,
                    name: true,
                    fbAdAccountId: true,
                }
            },
            project: {
                select: {
                    id: true,
                    name: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' },
    });
};
