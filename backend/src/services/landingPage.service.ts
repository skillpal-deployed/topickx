import prisma from '../utils/prisma';
import {
    AdminRole,
    ProjectStatus,
    LandingPageCreateRequest,
    LandingPageUpdateRequest,
    PlacementRequest,
    SlotReorderRequest,
    PackageState,
} from '../types';
import { logAudit } from './audit.service';
import { activatePackage } from './package.service';

// ==================== Landing Pages ====================

export const getLandingPages = async () => {
    const pages = await prisma.landingPage.findMany({
        include: {
            slots: {
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            builderName: true,
                            city: true,
                            locality: true,
                            status: true,
                            featuredImage: true,
                            heroImage: true,
                            budgetMin: true,
                            budgetMax: true,
                            slug: true,
                            advertiser: {
                                select: {
                                    companyName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { position: 'asc' },
            },
            _count: {
                select: { leads: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Collect all option IDs from all projects
    const optionIds: string[] = [];
    pages.forEach(page => {
        page.slots.forEach(slot => {
            if (slot.project.city) optionIds.push(slot.project.city);
            if (slot.project.locality) optionIds.push(slot.project.locality);
        });
    });

    // Resolve UUIDs to names
    const options = await prisma.option.findMany({
        where: { id: { in: optionIds } },
        select: { id: true, name: true },
    });

    const nameMap = new Map(options.map(o => [o.id, o.name]));

    return pages.map((page) => ({
        ...page,
        listings: page.slots.map((slot) => ({
            position: slot.position,
            project: {
                ...slot.project,
                city: nameMap.get(slot.project.city) || slot.project.city,
                locality: nameMap.get(slot.project.locality) || slot.project.locality,
                advertiser: slot.project.advertiser,
            },
        })),
        lead_count: page._count.leads,
        visits: page.visits,
    }));
};

export const getLandingPageById = async (id: string) => {
    const page = await prisma.landingPage.findUnique({
        where: { id },
        include: {
            slots: {
                include: {
                    project: {
                        include: {
                            advertiser: {
                                select: {
                                    id: true,
                                    companyName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { position: 'asc' },
            },
            _count: {
                select: { leads: true },
            },
            fbForms: true,
        },
    });

    if (!page) {
        throw new Error('Landing page not found');
    }

    // Collect all option IDs from projects
    const optionIds: string[] = [];
    page.slots.forEach(slot => {
        if (slot.project.city) optionIds.push(slot.project.city);
        if (slot.project.locality) optionIds.push(slot.project.locality);
    });

    // Resolve UUIDs to names
    const options = await prisma.option.findMany({
        where: { id: { in: optionIds } },
        select: { id: true, name: true },
    });

    const nameMap = new Map(options.map(o => [o.id, o.name]));

    const listings = page.slots.map((slot) => ({
        position: slot.position,
        project: {
            ...slot.project,
            city: nameMap.get(slot.project.city) || slot.project.city,
            locality: nameMap.get(slot.project.locality) || slot.project.locality,
        },
    }));

    return {
        ...page,
        listings,
        lead_count: page._count.leads,
        visits: page.visits,
    };
};

import { resolveProjectsData } from './project.service';

// ... (imports remain)

export const getLandingPageBySlug = async (slug: string) => {
    const page = await prisma.landingPage.findUnique({
        where: { slug },
        include: {
            slots: {
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            builderName: true,
                            city: true,
                            locality: true,
                            propertyType: true,
                            unitTypes: true,
                            budgetMin: true,
                            budgetMax: true,
                            possessionStatus: true,
                            amenities: true,
                            highlights: true,
                            images: true,
                            featuredImage: true,
                            heroImage: true,
                            projectLogo: true,
                            advertiserLogo: true,
                            price: true,
                            status: true,
                            slug: true,
                            advertiser: {
                                select: {
                                    companyName: true,
                                },
                            },
                            cardImage: true, // Ensure cardImage is selected
                            usp1: true,
                            usp2: true,
                            estimatedPossessionDate: true,
                        } as any,
                    },
                },
                orderBy: { position: 'asc' },
            },
        },
    });

    if (!page || !page.isActive) {
        throw new Error('Landing page not found');
    }

    // Filter only live projects
    const liveProjects = (page.slots as any[])
        .filter((slot: any) => slot.project.status === ProjectStatus.LIVE)
        .map((slot: any) => slot.project);

    // Resolve UUIDs to names using shared helper
    const resolvedProjects = await resolveProjectsData(liveProjects);

    return {
        ...page,
        projects: resolvedProjects,
        fbPixelId: page.fbPixelId,
        googleAnalyticsId: page.googleAnalyticsId,
    };
};

export const createLandingPage = async (
    data: LandingPageCreateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    // Check slug uniqueness
    const existing = await prisma.landingPage.findUnique({
        where: { slug: data.slug },
    });

    if (existing) {
        throw new Error('Slug already exists');
    }

    const page = await prisma.landingPage.create({
        data: {
            name: data.name,
            slug: data.slug,
            pageType: data.pageType,
            city: data.city,
            locality: data.locality,
            description: data.description,
            seoTitle: data.seoTitle,
            seoDescription: data.seoDescription,
            heroImage: data.heroImage,
            fbPixelId: data.fbPixelId,
            googleAnalyticsId: data.googleAnalyticsId,
        },
    });

    await logAudit('landing_page_created', currentUserId, currentUserRole, {
        pageId: page.id,
        pageName: page.name,
        slug: page.slug,
    });

    return page;
};

export const updateLandingPage = async (
    id: string,
    data: LandingPageUpdateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const existing = await prisma.landingPage.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new Error('Landing page not found');
    }

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
        const slugExists = await prisma.landingPage.findUnique({
            where: { slug: data.slug },
        });
        if (slugExists) {
            throw new Error('Slug already exists');
        }
    }

    const updateData: any = {};
    const fields = [
        'name', 'slug', 'pageType', 'city', 'locality', 'description',
        'seoTitle', 'seoDescription', 'heroImage', 'isActive',
        'fbPixelId', 'googleAnalyticsId',
    ];

    fields.forEach((field) => {
        if ((data as any)[field] !== undefined) {
            updateData[field] = (data as any)[field];
        }
    });

    const page = await prisma.landingPage.update({
        where: { id },
        data: updateData,
    });

    await logAudit('landing_page_updated', currentUserId, currentUserRole, {
        pageId: id,
        updatedFields: Object.keys(updateData),
    });

    return page;
};

export const deleteLandingPage = async (
    id: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const page = await prisma.landingPage.findUnique({
        where: { id },
    });

    if (!page) {
        throw new Error('Landing page not found');
    }

    // Get all projects on this page before deletion
    const slots = await prisma.landingPageSlot.findMany({
        where: { landingPageId: id },
        select: { projectId: true }
    });

    const projectIds = slots.map(s => s.projectId);

    await prisma.landingPage.delete({
        where: { id },
    });

    // For each project, check if it has any other active placements
    // If not, revert status to APPROVED_AWAITING_PLACEMENT
    await Promise.all(projectIds.map(async (pid) => {
        const count = await prisma.landingPageSlot.count({
            where: { projectId: pid }
        });

        if (count === 0) {
            await prisma.project.update({
                where: { id: pid },
                data: {
                    status: ProjectStatus.APPROVED_AWAITING_PLACEMENT,
                    isVisible: false
                }
            });
        }
    }));

    await logAudit('landing_page_deleted', currentUserId, currentUserRole, {
        pageId: id,
        pageName: page.name,
        affectedProjects: projectIds
    });

    return { message: 'Landing page deleted' };
};

// ==================== Placements ====================

export const placeProject = async (
    data: PlacementRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        include: { package: true },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    if (project.status !== ProjectStatus.APPROVED_AWAITING_PLACEMENT) {
        throw new Error('Project is not ready for placement');
    }

    // Activate package if not started
    if (project.package?.state === PackageState.UNSTARTED) {
        await activatePackage(project.packageId);
    }

    const landingPage = await prisma.landingPage.findUnique({
        where: { id: data.landingPageId },
    });

    if (!landingPage) {
        throw new Error('Landing page not found');
    }

    // Check if landing page has reached max projects limit
    const currentProjectCount = await prisma.landingPageSlot.count({
        where: { landingPageId: data.landingPageId },
    });

    if (currentProjectCount >= landingPage.maxProjects) {
        throw new Error(`Landing page has reached maximum limit of ${landingPage.maxProjects} projects`);
    }

    // Get next position
    const maxPosition = await prisma.landingPageSlot.aggregate({
        where: { landingPageId: data.landingPageId },
        _max: { position: true },
    });

    const position = data.position ?? (maxPosition._max.position || 0) + 1;

    // Check if position is taken
    const existingSlot = await prisma.landingPageSlot.findFirst({
        where: {
            landingPageId: data.landingPageId,
            position,
        },
    });

    if (existingSlot) {
        // Shift all positions >= new position
        await prisma.landingPageSlot.updateMany({
            where: {
                landingPageId: data.landingPageId,
                position: { gte: position },
            },
            data: {
                position: { increment: 1 },
            },
        });
    }

    // Create slot
    await prisma.landingPageSlot.create({
        data: {
            landingPageId: data.landingPageId,
            projectId: data.projectId,
            position,
        },
    });

    // Update project status to LIVE
    await prisma.project.update({
        where: { id: data.projectId },
        data: { status: ProjectStatus.LIVE },
    });

    await logAudit('project_placed', currentUserId, currentUserRole, {
        projectId: data.projectId,
        landingPageId: data.landingPageId,
        position,
    });

    return { message: 'Project placed successfully' };
};

export const removeProject = async (
    projectId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const slots = await prisma.landingPageSlot.findMany({
        where: { projectId },
    });

    if (slots.length === 0) {
        throw new Error('Project is not placed on any landing page');
    }

    // Remove all placements
    await prisma.landingPageSlot.deleteMany({
        where: { projectId },
    });

    // Update project status
    await prisma.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.APPROVED_AWAITING_PLACEMENT },
    });

    await logAudit('project_removed', currentUserId, currentUserRole, {
        projectId,
        removedFromPages: slots.map((s) => s.landingPageId),
    });

    return { message: 'Project removed from landing pages' };
};

export const reorderSlots = async (
    landingPageId: string,
    data: SlotReorderRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    // Check if we are doing a single move or full reorder
    let newOrder: { projectId: string; position: number }[] = [];

    if ((data as any).projectId && (data as any).newPosition) {
        // Single move logic
        const projectId = (data as any).projectId;
        const newPosition = (data as any).newPosition;

        const currentSlots = await prisma.landingPageSlot.findMany({
            where: { landingPageId },
            orderBy: { position: 'asc' },
        });

        const activeSlots = currentSlots.map(s => ({
            projectId: s.projectId,
            position: s.position
        }));

        const currentIndex = activeSlots.findIndex(s => s.projectId === projectId);
        if (currentIndex === -1) {
            throw new Error('Project not found in this landing page');
        }

        // Remove from current position
        const [movedItem] = activeSlots.splice(currentIndex, 1);

        // Insert at new position (adjust for 0-based index)
        // Ensure newPosition is within bounds
        const targetIndex = Math.max(0, Math.min(newPosition - 1, activeSlots.length));
        activeSlots.splice(targetIndex, 0, movedItem);

        // Reassign positions
        newOrder = activeSlots.map((item, index) => ({
            projectId: item.projectId,
            position: index + 1
        }));
    } else if (data.listings) {
        // Full reorder provided
        newOrder = data.listings;
    } else {
        throw new Error('Invalid reorder data');
    }

    // Delete all existing slots for this page
    await prisma.landingPageSlot.deleteMany({
        where: { landingPageId },
    });

    // Create new slots with new positions
    // Use sequential creation to avoid potential race conditions with composite keys
    for (const listing of newOrder) {
        await prisma.landingPageSlot.create({
            data: {
                landingPageId,
                projectId: listing.projectId,
                position: listing.position,
            },
        });
    }

    await logAudit('slots_reordered', currentUserId, currentUserRole, {
        landingPageId,
        newOrder,
    });

    return { message: 'Slots reordered successfully' };
};

export const replaceSlot = async (
    landingPageId: string,
    slot: number,
    newProjectId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const existingSlot = await prisma.landingPageSlot.findFirst({
        where: {
            landingPageId,
            position: slot,
        },
        include: { project: true },
    });

    if (!existingSlot) {
        throw new Error('Slot not found');
    }

    const newProject = await prisma.project.findUnique({
        where: { id: newProjectId },
        include: { package: true },
    });

    if (!newProject || newProject.status !== ProjectStatus.APPROVED_AWAITING_PLACEMENT) {
        throw new Error('New project not found or not ready for placement');
    }

    // Activate package if not started
    if (newProject.package?.state === PackageState.UNSTARTED) {
        await activatePackage(newProject.packageId);
    }

    // Update old project status
    await prisma.project.update({
        where: { id: existingSlot.projectId },
        data: { status: ProjectStatus.APPROVED_AWAITING_PLACEMENT },
    });

    // Update slot with new project
    await prisma.landingPageSlot.update({
        where: { id: existingSlot.id },
        data: { projectId: newProjectId },
    });

    // Update new project status
    await prisma.project.update({
        where: { id: newProjectId },
        data: { status: ProjectStatus.LIVE },
    });

    await logAudit('slot_replaced', currentUserId, currentUserRole, {
        landingPageId,
        slot,
        oldProjectId: existingSlot.projectId,
        newProjectId,
    });

    return { message: 'Slot replaced successfully' };
};

export const reassignProject = async (
    projectId: string,
    landingPageId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    // 1. Verify project exists
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { package: true },
    });

    if (!project) {
        throw new Error('Project not found');
    }

    // Activate package if not started
    if (project.package?.state === PackageState.UNSTARTED) {
        await activatePackage(project.packageId);
    }

    // 2. Verify target landing page exists
    const landingPage = await prisma.landingPage.findUnique({
        where: { id: landingPageId },
    });

    if (!landingPage) {
        throw new Error('Target landing page not found');
    }

    // 3. Remove from any existing landing pages
    const existingSlots = await prisma.landingPageSlot.findMany({
        where: { projectId },
    });

    if (existingSlots.length > 0) {
        await prisma.landingPageSlot.deleteMany({
            where: { projectId },
        });
    }

    // 4. Determine new position on target LP (append to end)
    const maxPosition = await prisma.landingPageSlot.aggregate({
        where: { landingPageId },
        _max: { position: true },
    }); // 0 if null

    const newPosition = (maxPosition._max.position || 0) + 1;

    // 5. Create new slot
    await prisma.landingPageSlot.create({
        data: {
            landingPageId,
            projectId,
            position: newPosition,
        },
    });

    // 6. Ensure project status is LIVE
    if (project.status !== ProjectStatus.LIVE) {
        await prisma.project.update({
            where: { id: projectId },
            data: { status: ProjectStatus.LIVE },
        });
    }

    await logAudit('project_reassigned', currentUserId, currentUserRole, {
        projectId,
        oldLandingPages: existingSlots.map(s => s.landingPageId),
        newLandingPageId: landingPageId,
        newPosition,
    });

    return { message: 'Project reassigned successfully' };
};

// ==================== Public Landing Pages ====================

export const getPublicLandingPages = async () => {
    return prisma.landingPage.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            slug: true,
            pageType: true,
            city: true,
            locality: true,
            description: true,
            heroImage: true,
        },
        orderBy: { name: 'asc' },
    });
};

// ==================== Facebook Integration ====================

export const updateLandingPageFacebookSettings = async (
    id: string,
    data: { fb_ad_account_id?: string; fb_page_id?: string; fb_access_token?: string },
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const page = await prisma.landingPage.update({
        where: { id },
        data: {
            fbAdAccountId: data.fb_ad_account_id,
            fbPageId: data.fb_page_id,
            fbAccessToken: data.fb_access_token,
        },
    });

    await logAudit('landing_page_facebook_settings_updated', currentUserId, currentUserRole, {
        pageId: id,
        fbAdAccountId: data.fb_ad_account_id,
    });

    return page;
};

export const addLandingPageFacebookForm = async (
    id: string,
    data: { formId: string; name: string },
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const form = await prisma.facebookLeadForm.create({
        data: {
            id: data.formId,
            name: data.name,
            landingPageId: id,
        },
    });

    await logAudit('landing_page_facebook_form_added', currentUserId, currentUserRole, {
        pageId: id,
        formId: data.formId,
        formName: data.name,
    });

    return form;
};

export const removeLandingPageFacebookForm = async (
    lpId: string,
    formId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    await prisma.facebookLeadForm.delete({
        where: { id: formId },
    });

    await logAudit('landing_page_facebook_form_removed', currentUserId, currentUserRole, {
        pageId: lpId,
        formId,
    });

    return { message: 'Facebook form removed' };
};
