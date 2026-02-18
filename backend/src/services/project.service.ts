import prisma from '../utils/prisma';
import {
    AdminRole,
    ProjectStatus,
    ProjectCreateRequest,
    AdminProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectReviewActionRequest,
    PackageState,
} from '../types';
import { logAudit } from './audit.service';
// import { activatePackage } from './package.service';

// ==================== Advertiser Project Operations ====================

export const getAdvertiserProjects = async (advertiserId: string) => {
    const projects = await prisma.project.findMany({
        where: { advertiserId },
        include: {
            package: {
                include: {
                    packageDefinition: true,
                },
            },
            placements: {
                include: {
                    landingPage: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
            _count: {
                select: { leads: true },
            },
            advertiser: {
                select: {
                    companyName: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Add expiry date, lead count, and simplify landing page info
    const mappedProjects = projects.map(project => ({
        ...project,
        expiryDate: project.package?.endDate || null,
        leadCount: project._count.leads,
        landingPages: project.placements.map(p => p.landingPage),
    }));

    return resolveProjectsData(mappedProjects);
};

// Helper to resolve options for a list of projects
export const resolveProjectsData = async (projects: any[]) => {
    if (projects.length === 0) return [];

    const optionIds = new Set<string>();

    projects.forEach(p => {
        if (p.city) optionIds.add(p.city);
        if (p.locality) optionIds.add(p.locality);
        if (p.possessionStatus) optionIds.add(p.possessionStatus);

        if (Array.isArray(p.propertyType)) {
            p.propertyType.forEach((id: string) => optionIds.add(id));
        } else if (typeof p.propertyType === 'string' && p.propertyType) {
            optionIds.add(p.propertyType);
        }

        if (Array.isArray(p.unitTypes)) {
            p.unitTypes.forEach((id: string) => optionIds.add(id));
        }

        if (Array.isArray(p.amenities)) {
            p.amenities.forEach((id: string) => optionIds.add(id));
        }
    });

    if (optionIds.size === 0) return projects;

    const options = await prisma.option.findMany({
        where: { id: { in: Array.from(optionIds) } },
        select: { id: true, name: true, iconUrl: true }
    });

    const optionMap = new Map(options.map(o => [o.id, { name: o.name, iconUrl: o.iconUrl }]));

    // Check for amenities that were not found by ID, they might be stored as names
    // This handles legacy data or data inconsistencies where names were saved instead of IDs
    const missingOptionIds = Array.from(optionIds).filter(id => !optionMap.has(id));

    if (missingOptionIds.length > 0) {
        // Try to find them by name (case insensitive)
        const optionsByName = await prisma.option.findMany({
            where: {
                name: {
                    in: missingOptionIds,
                    mode: 'insensitive'
                },
                optionType: 'AMENITY' // Restrict to amenities to avoid confusion
            },
            select: { id: true, name: true, iconUrl: true }
        });

        // Add found options to map, using the "missing ID" (which is actually a name) as the key
        optionsByName.forEach(o => {
            // Find which original ID (name) matches this option
            const originalName = missingOptionIds.find(missing => missing.toLowerCase() === o.name.toLowerCase());
            if (originalName) {
                optionMap.set(originalName, { name: o.name, iconUrl: o.iconUrl });
            }
        });
    }

    const resolve = (id: string | null | undefined) => (id && optionMap.has(id) ? optionMap.get(id)!.name : id || "");

    const resolveArray = (ids: any) => {
        if (!ids) return [];
        if (Array.isArray(ids)) return ids.map(id => optionMap.get(id)?.name || id);
        return [optionMap.get(ids)?.name || ids];
    };

    // Special resolver for amenities that keeps iconUrl
    const resolveAmenitiesArray = (ids: any) => {
        if (!ids) return [];
        if (Array.isArray(ids)) {
            return ids.map(id => {
                const option = optionMap.get(id);
                // Return option if found, otherwise filter it out (don't show raw UUIDs)
                return option ? { name: option.name, iconUrl: option.iconUrl } : null;
            }).filter(Boolean);
        }
        const option = optionMap.get(ids);
        return option ? [{ name: option.name, iconUrl: option.iconUrl }] : [];
    };

    return projects.map(p => ({
        ...p,
        city: resolve(p.city),
        locality: resolve(p.locality),
        possessionStatus: resolve(p.possessionStatus),
        propertyType: resolveArray(p.propertyType),
        unitTypes: resolveArray(p.unitTypes),
        amenities: resolveAmenitiesArray(p.amenities),
    }));
};

export const getProjectById = async (projectId: string, advertiserId?: string) => {
    const where: any = { id: projectId };
    if (advertiserId) {
        where.advertiserId = advertiserId;
    }

    const project = await prisma.project.findFirst({
        where,
        include: {
            advertiser: {
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                    phone: true,
                },
            },
            package: {
                include: {
                    packageDefinition: true,
                },
            },
            placements: {
                include: {
                    landingPage: true,
                },
            },
        },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    const resolved = await resolveProjectsData([project]);
    return resolved[0];
};

export const createProject = async (
    advertiserId: string,
    data: ProjectCreateRequest
) => {
    // Verify package belongs to advertiser and is available
    const pkg = await prisma.packagePurchase.findFirst({
        where: {
            id: data.packageId,
            advertiserId,
            state: { in: [PackageState.UNSTARTED, PackageState.ACTIVE] },
        },
        include: {
            projects: true,
        },
    });

    if (!pkg) {
        throw new Error('Package not found or not available');
    }

    // Check if package already has a project
    // if (pkg.projects.length > 0) {
    //     throw new Error('This package already has a project assigned');
    // }

    // Generate unique slug
    let finalSlug = await generateSlug(data.name, data.builderName, data.city, advertiserId);
    let counter = 1;
    let uniqueSlug = finalSlug;

    while (await prisma.project.findFirst({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${finalSlug}-${counter}`;
        counter++;
    }
    finalSlug = uniqueSlug;

    const project = await prisma.project.create({
        data: {
            advertiserId,
            packageId: data.packageId,
            name: data.name,
            builderName: data.builderName,
            city: data.city,
            locality: data.locality,
            propertyType: Array.isArray(data.propertyType) ? data.propertyType : [data.propertyType],
            unitTypes: data.unitTypes,
            budgetMin: data.budgetMin,
            budgetMax: data.budgetMax,
            highlights: data.highlights,
            amenities: data.amenities,
            images: data.images,
            possessionStatus: data.possessionStatus,
            reraId: data.reraId,
            address: data.address,
            price: data.price,
            priceDetails: data.priceDetails,
            heroImage: data.heroImage,
            projectLogo: data.projectLogo,
            advertiserLogo: data.advertiserLogo,
            floorPlans: data.floorPlans || [],
            videoUrl: data.videoUrl,
            cardImage: data.cardImage,
            builderDescription: data.builderDescription,
            aboutProject: data.aboutProject,
            disclaimer: data.disclaimer,
            locationHighlights: data.locationHighlights || [],
            status: ProjectStatus.SUBMITTED_FOR_REVIEW,
            featuredImage: data.heroImage || (data.images && data.images.length > 0 ? data.images[0] : undefined),
            slug: finalSlug,
        },
    });

    return project;
};

// Helper to generate slug
const generateSlug = async (name: string, builderName: string, cityId: string, advertiserId?: string): Promise<string> => {
    // Get City Name
    let cityName = cityId;

    // Check if cityId looks like a UUID before querying, otherwise treat it as the name itself
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(cityId)) {
        try {
            const city = await prisma.option.findUnique({
                where: { id: cityId },
                select: { name: true },
            });
            if (city) {
                cityName = city.name;
            }
        } catch (e) {
            // Ignore error and use cityId as name if lookup fails
        }
    }

    // Get Advertiser Name if available
    let advertiserName = "";
    if (advertiserId) {
        try {
            const advertiser = await prisma.user.findUnique({
                where: { id: advertiserId },
                select: { companyName: true },
            });
            if (advertiser && advertiser.companyName) {
                advertiserName = advertiser.companyName;
            }
        } catch (e) {
            // Ignore
        }
    }

    // New Structure: advertiserName-name-city
    const rawSlug = `${advertiserName} ${name} ${cityName}`;

    const normalized = rawSlug
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || `project-${Date.now()}`;
};

export const updateProject = async (
    projectId: string,
    data: ProjectUpdateRequest,
    advertiserId?: string
) => {
    const where: any = { id: projectId };
    if (advertiserId) {
        where.advertiserId = advertiserId;
    }

    const project = await prisma.project.findFirst({
        where,
    });

    if (!project) {
        throw new Error('Project not found');
    }

    // Advertisers can edit draft, needs_changes, live, and approved_awaiting_placement projects
    if (advertiserId && !['DRAFT', 'NEEDS_CHANGES', 'LIVE', 'APPROVED_AWAITING_PLACEMENT'].includes(project.status)) {
        throw new Error('Cannot edit project in current status');
    }

    const updateData: any = {};
    const fields = [
        'name', 'builderName', 'city', 'locality', 'propertyType', 'unitTypes',
        'budgetMin', 'budgetMax', 'highlights', 'amenities', 'images', 'possessionStatus',
        'reraId', 'seoTitle', 'seoDescription', 'featuredImage', 'isVisible',
        'floorPlans', 'videoUrl', 'builderDescription', 'aboutProject', 'address',
        'price', 'priceDetails', 'heroImage', 'projectLogo', 'advertiserLogo',
        'disclaimer', 'locationHighlights', 'cardImage', 'usp1', 'usp2', 'estimatedPossessionDate',
    ];

    fields.forEach((field) => {
        if ((data as any)[field] !== undefined) {
            let value = (data as any)[field];

            // Ensure array fields are actually arrays
            if (['propertyType', 'unitTypes', 'amenities', 'highlights', 'images', 'locationHighlights'].includes(field)) {
                if (value && !Array.isArray(value)) {
                    // Handle object with numeric keys (e.g., {0: "val1", 1: "val2"})
                    if (typeof value === 'object' && value !== null) {
                        value = Object.values(value);
                    } else {
                        value = [value];
                    }
                }
            }

            // Convert estimatedPossessionDate to proper ISO-8601 format
            // Convert estimatedPossessionDate to proper ISO-8601 format
            if (field === 'estimatedPossessionDate') {
                if (value) {
                    // If value is in "YYYY-MM" format, convert to "YYYY-MM-01T00:00:00.000Z"
                    if (typeof value === 'string') {
                        // Check if it's a partial date (YYYY-MM or similar)
                        if (/^\d{4}-\d{2}$/.test(value)) {
                            // Add -01 for the first day of the month and make it a full ISO date
                            value = new Date(`${value}-01T00:00:00.000Z`).toISOString();
                        } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                            // If it's YYYY-MM-DD, convert to full ISO
                            value = new Date(`${value}T00:00:00.000Z`).toISOString();
                        }
                        // Otherwise, assume it's already a valid ISO string
                    }
                } else if (value === "") {
                    value = null;
                }
            }

            updateData[field] = value;
        }
    });

    // Handle slug logic
    let targetSlug = data.slug;

    // Auto-generate if explicit slug is empty OR if Name/Builder/City changed and no explicit slug provided
    // BUT user requested "not update everytime", implying stability.
    // However, user specifically asked for "automatically generated based on...".
    // Strategy: 
    // 1. If user explicitly clears slug (sends ""), regenerate.
    // 2. If user changes Name/Builder/City AND doesn't provide a manual slug, should we regenerate?
    //    Ideally yes, to keep it sync. BUT this changes URLs. 
    //    Given the "I don't want to update slug everytime" comment, likely they mean "I don't want to MANUALLY update it".
    //    So if they change the name, they EXPECT the slug to update automatically.
    //    Let's regenerate if name/builder/city changes OR if slug is empty.

    const nameChanged = data.name && data.name !== project.name;
    const builderChanged = data.builderName && data.builderName !== project.builderName;
    const cityChanged = data.city && data.city !== project.city;

    if (!targetSlug || targetSlug.trim() === '' || nameChanged || builderChanged || cityChanged) {
        // Only regenerate if the user didn't provide a specific (non-empty) slug to override
        if (!targetSlug || targetSlug.trim() === '') {
            const n = data.name || project.name;
            const b = data.builderName || project.builderName;
            const c = data.city || project.city;
            const advId = advertiserId || project.advertiserId;
            targetSlug = await generateSlug(n, b, c, advId);
        }
    }

    // Attempt to update slug if it's different and valid
    if (targetSlug && targetSlug !== project.slug) {
        const existingWithSlug = await prisma.project.findFirst({
            where: {
                slug: targetSlug,
                id: { not: projectId },
            },
        });

        if (existingWithSlug) {
            let counter = 1;
            let uniqueSlug = `${targetSlug}-${counter}`;
            while (await prisma.project.findFirst({ where: { slug: uniqueSlug, id: { not: projectId } } })) {
                counter++;
                uniqueSlug = `${targetSlug}-${counter}`;
            }
            targetSlug = uniqueSlug;
        }
        updateData.slug = targetSlug;
    } else if (data.slug === "" || data.slug === null) {
        // If user cleared it and we generated a same one, or simply keeping existing.
        // Ensure strictly that we don't send "" to DB.
        // If targetSlug became same as project.slug, checking logic:
        // if targetSlug was calculated as "empire-estate-..." and project.slug is "empire-estate-..." -> no update
        // loops handled.
        // If data.slug was empty, we calculated targetSlug.
        // If targetSlug !== project.slug, we update.
        // If targetSlug === project.slug, we do nothing.
    }

    return prisma.project.update({
        where: { id: projectId },
        data: updateData,
    });
};

export const submitProject = async (projectId: string, advertiserId: string) => {
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            advertiserId,
        },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    if (!['DRAFT', 'NEEDS_CHANGES'].includes(project.status)) {
        throw new Error('Cannot submit project in current status');
    }

    return prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.SUBMITTED_FOR_REVIEW },
    });
};

// ==================== Admin Project Operations ====================

export const getProjectsForReview = async () => {
    const projects = await prisma.project.findMany({
        where: { status: ProjectStatus.SUBMITTED_FOR_REVIEW },
        include: {
            advertiser: {
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                    phone: true,
                },
            },
            package: {
                include: {
                    packageDefinition: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    return resolveProjectsData(projects);
};

export const reviewProject = async (
    projectId: string,
    data: ProjectReviewActionRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            package: true,
        },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    if (project.status !== ProjectStatus.SUBMITTED_FOR_REVIEW) {
        throw new Error('Project is not pending review');
    }

    let newStatus: ProjectStatus;

    switch (data.action) {
        case 'approve':
            newStatus = ProjectStatus.APPROVED_AWAITING_PLACEMENT;

            // Activate the package if not already active
            // if (project.package.state === PackageState.UNSTARTED) {
            //     await activatePackage(project.packageId);
            // }
            break;

        case 'request_changes':
            newStatus = ProjectStatus.NEEDS_CHANGES;
            break;

        case 'reject':
            newStatus = ProjectStatus.REJECTED;
            break;

        default:
            throw new Error('Invalid action');
    }

    const updated = await prisma.project.update({
        where: { id: projectId },
        data: {
            status: newStatus,
            reviewComment: data.comment,
        },
    });

    await logAudit('project_reviewed', currentUserId, currentUserRole, {
        projectId,
        action: data.action,
        newStatus,
        comment: data.comment,
    });

    return updated;
};

export const getAllProjects = async (params: {
    status?: ProjectStatus;
    city?: string;
    advertiserId?: string;
}) => {
    const where: any = {};

    if (params.status) {
        where.status = params.status;
    }
    if (params.city) {
        where.city = params.city;
    }
    if (params.advertiserId) {
        where.advertiserId = params.advertiserId;
    }

    const projects = await prisma.project.findMany({
        where,
        include: {
            advertiser: {
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                },
            },
            package: {
                include: {
                    packageDefinition: true,
                },
            },
            placements: {
                include: {
                    landingPage: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return resolveProjectsData(projects);
};

export const createAdminProject = async (
    data: AdminProjectCreateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    // Verify package exists and belongs to advertiser
    const pkg = await prisma.packagePurchase.findFirst({
        where: {
            id: data.packageId,
            advertiserId: data.advertiserId,
        },
    });

    if (!pkg) {
        throw new Error('Package not found');
    }

    // Handle slug uniqueness before creating
    let finalSlug = data.slug;
    if (!finalSlug) {
        finalSlug = await generateSlug(data.name, data.builderName, data.city, data.advertiserId);
    }

    if (finalSlug) {
        const existingWithSlug = await prisma.project.findFirst({
            where: { slug: finalSlug },
        });

        if (existingWithSlug) {
            let counter = 1;
            let uniqueSlug = `${finalSlug}-${counter}`;

            while (await prisma.project.findFirst({ where: { slug: uniqueSlug } })) {
                counter++;
                uniqueSlug = `${finalSlug}-${counter}`;
            }

            finalSlug = uniqueSlug;
        }
    }

    const project = await prisma.project.create({
        data: {
            advertiserId: data.advertiserId,
            packageId: data.packageId,
            name: data.name,
            builderName: data.builderName,
            city: data.city,
            locality: data.locality,
            propertyType: Array.isArray(data.propertyType) ? data.propertyType : [data.propertyType],
            unitTypes: data.unitTypes,
            budgetMin: data.budgetMin,
            budgetMax: data.budgetMax,
            highlights: data.highlights,
            amenities: data.amenities,
            images: data.images,
            possessionStatus: data.possessionStatus,
            reraId: data.reraId,
            slug: finalSlug,
            seoTitle: data.seoTitle,
            seoDescription: data.seoDescription,
            featuredImage: data.featuredImage,
            isVisible: data.isVisible ?? true,
            floorPlans: data.floorPlans || [],
            videoUrl: data.videoUrl,
            builderDescription: data.builderDescription,
            aboutProject: data.aboutProject,
            address: data.address,
            price: data.price,
            priceDetails: data.priceDetails,
            heroImage: data.heroImage,
            projectLogo: data.projectLogo,
            advertiserLogo: data.advertiserLogo,
            disclaimer: data.disclaimer,
            locationHighlights: data.locationHighlights || [],
            cardImage: data.cardImage,
            status: ProjectStatus.APPROVED_AWAITING_PLACEMENT,
        },
    });

    // Activate package - MOVED TO PLACEMENT
    // if (pkg.state === PackageState.UNSTARTED) {
    //     await activatePackage(pkg.id);
    // }

    await logAudit('admin_project_created', currentUserId, currentUserRole, {
        projectId: project.id,
        advertiserId: data.advertiserId,
    });

    return project;
};

export const pauseProject = async (
    projectId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    // Remove from all landing pages
    await prisma.landingPageSlot.deleteMany({
        where: { projectId },
    });

    const updated = await prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.APPROVED_AWAITING_PLACEMENT },
    });

    await logAudit('project_paused', currentUserId, currentUserRole, {
        projectId,
    });

    return updated;
};

export const deleteProject = async (
    projectId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    await prisma.project.delete({
        where: { id: projectId },
    });

    await logAudit('project_deleted', currentUserId, currentUserRole, {
        projectId,
        projectName: project.name,
    });

    return { message: 'Project deleted' };
};

export const getPlacementQueue = async () => {
    return prisma.project.findMany({
        where: { status: ProjectStatus.APPROVED_AWAITING_PLACEMENT },
        include: {
            advertiser: {
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                },
            },
            package: {
                include: {
                    packageDefinition: true,
                },
            },
        },
        orderBy: { createdAt: 'asc' },
    });
};
