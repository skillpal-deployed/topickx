import { Router, Response } from 'express';
import { authenticate, requireAdvertiser } from '../middlewares/auth.middleware';
import { AuthenticatedRequest, ProjectCreateRequest, AdvertiserProfileUpdateRequest } from '../types';
import * as packageService from '../services/package.service';
import * as projectService from '../services/project.service';
import * as leadService from '../services/lead.service';
import * as userService from '../services/user.service';

const router = Router();

// All routes require authentication and advertiser role
router.use(authenticate as any);
router.use(requireAdvertiser as any);

// ==================== Profile ====================

router.put('/profile', async (req: AuthenticatedRequest, res: Response, next) => {
    try {
        const updateData: AdvertiserProfileUpdateRequest = {
            leadFilters: req.body.leadFilters,
            maxLeadsPerDay: req.body.maxLeadsPerDay,
        };

        const result = await userService.updateAdvertiserProfile(
            req.user!.id,
            updateData,
            req.user!.id,
            req.user!.role as any
        );

        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ==================== Dashboard ====================

router.get('/dashboard', async (req: AuthenticatedRequest, res: Response, next) => {
    try {
        const advertiserId = req.user!.id;

        const [packages, projects, leads] = await Promise.all([
            packageService.getAdvertiserPackages(advertiserId),
            projectService.getAdvertiserProjects(advertiserId),
            leadService.getAdvertiserLeads(advertiserId),
        ]);

        const activePackages = packages.filter(
            (p) => p.state === 'ACTIVE' || p.state === 'UNSTARTED'
        );
        const liveProjects = projects.filter((p) => p.status === 'LIVE');

        res.json({
            stats: {
                totalPackages: packages.length,
                activePackages: activePackages.length,
                totalProjects: projects.length,
                liveProjects: liveProjects.length,
                totalLeads: leads.length,
            },
            recentLeads: leads.slice(0, 5),
        });
    } catch (error) {
        next(error);
    }
});

// ==================== Package Definitions ====================

router.get('/package-definitions', async (req, res, next) => {
    try {
        const definitions = await packageService.getPackageDefinitions(false);
        res.json(definitions);
    } catch (error) {
        next(error);
    }
});

// ==================== Package Requests ====================

router.get('/package-requests', async (req: AuthenticatedRequest, res, next) => {
    try {
        const requests = await packageService.getPackageRequests();
        const userRequests = requests.filter(
            (r) => r.advertiserId === req.user!.id
        );
        res.json(userRequests);
    } catch (error) {
        next(error);
    }
});

router.post('/package-request', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { packageDefinitionId } = req.body;
        const request = await packageService.createPackageRequest(
            req.user!.id,
            packageDefinitionId
        );
        res.status(201).json(request);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Packages ====================

router.get('/packages', async (req: AuthenticatedRequest, res, next) => {
    try {
        const packages = await packageService.getAdvertiserPackages(req.user!.id);
        res.json(packages);
    } catch (error) {
        next(error);
    }
});

router.get('/available-packages', async (req: AuthenticatedRequest, res, next) => {
    try {
        const packages = await packageService.getAvailablePackages(req.user!.id);
        res.json(packages);
    } catch (error) {
        next(error);
    }
});

// ==================== Projects ====================

router.get('/projects', async (req: AuthenticatedRequest, res, next) => {
    try {
        const projects = await projectService.getAdvertiserProjects(req.user!.id);
        res.json(projects);
    } catch (error) {
        next(error);
    }
});

router.get('/projects/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.getProjectById(
            req.params.id as string,
            req.user!.id
        );
        res.json(project);
    } catch (error) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/project', async (req: AuthenticatedRequest, res, next) => {
    try {
        const {
            package_id,
            name,
            builder_name,
            city,
            locality,
            property_type,
            unit_types,
            budget_min,
            budget_max,
            highlights,
            amenities,
            images,
            possession_status,
            estimated_possession_date,
            rera_id,
            address,
            price,
            price_details,
            hero_image,
            project_logo,
            advertiser_logo,
            floor_plans,
            video_url,
            builder_description,
            about_project,
            usp_1,
            usp_2,
            location_highlights,
            card_image,
            disclaimer,
        } = req.body;

        const projectData: ProjectCreateRequest = {
            packageId: package_id,
            name,
            builderName: builder_name,
            city,
            locality,
            propertyType: property_type,
            unitTypes: unit_types,
            budgetMin: budget_min,
            budgetMax: budget_max,
            highlights,
            amenities,
            images,
            possessionStatus: possession_status,
            estimatedPossessionDate: estimated_possession_date || undefined,
            reraId: rera_id,
            address,
            price,
            priceDetails: price_details,
            heroImage: hero_image,
            projectLogo: project_logo,
            advertiserLogo: advertiser_logo,
            floorPlans: floor_plans,
            videoUrl: video_url,
            builderDescription: builder_description,
            aboutProject: about_project,
            usp1: usp_1,
            usp2: usp_2,
            locationHighlights: location_highlights,
            cardImage: card_image,
            disclaimer,
        };

        const project = await projectService.createProject(req.user!.id, projectData);
        res.status(201).json(project);
    } catch (error) {
        console.error("Create Project Error:", error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(400).json({ error: "An unknown error occurred" });
    }
});

router.put('/projects/:id', async (req: AuthenticatedRequest, res, next) => {
    try {
        const {
            name,
            builder_name,
            city,
            locality,
            property_type,
            unit_types,
            budget_min,
            budget_max,
            highlights,
            amenities,
            images,
            possession_status,
            estimated_possession_date,
            rera_id,
            address,
            price,
            price_details,
            hero_image,
            project_logo,
            advertiser_logo,
            floor_plans,
            video_url,
            builder_description,
            about_project,
            slug,
            seo_title,
            seo_description,
            featured_image,
            is_visible,
            usp_1,
            usp_2,
            location_highlights,
            card_image,
            disclaimer,
        } = req.body;

        const updateData: any = {
            name,
            builderName: builder_name,
            city,
            locality,
            propertyType: property_type,
            unitTypes: unit_types,
            budgetMin: budget_min,
            budgetMax: budget_max,
            highlights,
            amenities,
            images,
            possessionStatus: possession_status,
            estimatedPossessionDate: estimated_possession_date,
            reraId: rera_id,
            address,
            price,
            priceDetails: price_details,
            heroImage: hero_image,
            projectLogo: project_logo,
            advertiserLogo: advertiser_logo,
            floorPlans: floor_plans,
            videoUrl: video_url,
            builderDescription: builder_description,
            aboutProject: about_project,
            slug,
            seoTitle: seo_title,
            seoDescription: seo_description,
            featuredImage: featured_image,
            isVisible: is_visible,
            usp1: usp_1,
            usp2: usp_2,
            locationHighlights: location_highlights,
            cardImage: card_image,
            disclaimer,
        };

        const project = await projectService.updateProject(
            req.params.id as string,
            updateData,
            req.user!.id
        );
        res.json(project);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/project/:id/submit', async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.submitProject(
            req.params.id as string,
            req.user!.id
        );
        res.json(project);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Leads ====================

// ==================== Billing ====================

router.get('/leads', async (req: AuthenticatedRequest, res, next) => {
    try {
        // Get leads from projects owned by this advertiser
        const leads = await leadService.getAdvertiserDirectLeads(req.user!.id);
        res.json(leads);
    } catch (error) {
        next(error);
    }
});

router.get('/common-leads', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const leads = await leadService.getAdvertiserCommonLeads(
            req.user!.id,
            startDate as string | undefined,
            endDate as string | undefined
        );
        res.json(leads);
    } catch (error) {
        next(error);
    }
});

router.get('/servicing-leads', async (req: AuthenticatedRequest, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const leads = await leadService.getServicingLeads(
            req.user!.id,
            startDate as string | undefined,
            endDate as string | undefined
        );
        res.json(leads);
    } catch (error) {
        next(error);
    }
});

// ==================== Billing ====================

router.get('/billing', async (req: AuthenticatedRequest, res, next) => {
    try {
        const billing = await packageService.getAdvertiserBilling(req.user!.id);
        res.json(billing);
    } catch (error) {
        next(error);
    }
});

router.get('/invoice/:billingId', async (req: AuthenticatedRequest, res, next) => {
    try {
        const invoice = await packageService.getInvoice(
            req.params.billingId as string,
            req.user!.id
        );
        res.json(invoice);
    } catch (error) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Options (Mirrors Admin Logic) ====================

const categoryToOptionType: Record<string, any> = {
    'city': 'CITY',
    'location': 'LOCATION',
    'property_type': 'PROPERTY_TYPE',
    'propertyType': 'PROPERTY_TYPE',
    'amenity': 'AMENITY',
    'unit_type': 'UNIT_TYPE',
    'unitType': 'UNIT_TYPE',
    'possessionStatus': 'POSSESSION_STATUS',
    'possession_status': 'POSSESSION_STATUS',
};

router.get('/options/:category', async (req: AuthenticatedRequest, res, next) => {
    try {
        const category = req.params.category as string;

        // Manual handling for project_type
        if (category === 'project_type') {
            return res.json([
                { label: 'Residential', value: 'Residential' },
                { label: 'Commercial', value: 'Commercial' },
                { label: 'Plots', value: 'Plots' }
            ]);
        }

        const optionType = categoryToOptionType[category];

        if (!optionType) {
            // Check public options? optional fallback
            res.status(400).json({ error: `Invalid category: ${category}` });
            return;
        }

        // Advertisers can read active options
        const options = await import('../services/option.service').then(s => s.getOptions(optionType, false));

        const transformed = options.map(opt => ({
            id: opt.id,
            category,
            value: opt.name.toLowerCase().replace(/\s+/g, '_'),
            label: opt.name,
            parentId: opt.parentId,
        }));

        res.json(transformed);
    } catch (error) {
        next(error);
    }
});

// ==================== Profile ====================

router.put('/profile', async (req: AuthenticatedRequest, res, next) => {
    try {
        const userId = req.user!.id;
        const updateData = req.body;

        // Only allow specific fields
        const allowedUpdates: any = {};
        if (updateData.leadFilters) allowedUpdates.leadFilters = updateData.leadFilters;
        if (updateData.maxLeadsPerDay !== undefined) allowedUpdates.maxLeadsPerDay = updateData.maxLeadsPerDay;

        // Use userService to update
        const updatedUser = await import('../services/user.service').then(s => s.updateAdvertiser(
            userId,
            allowedUpdates,
            userId,
            req.user!.role
        ));

        res.json(updatedUser);
    } catch (error) {
        next(error);
    }
});

export default router;
