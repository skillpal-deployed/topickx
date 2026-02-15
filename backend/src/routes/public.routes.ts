import { Router } from 'express';
import prisma from '../utils/prisma';
import * as landingPageService from '../services/landingPage.service';
import * as leadService from '../services/lead.service';
import * as optionService from '../services/option.service';
import * as otpService from '../services/otp.service';
import { resolveProjectsData } from '../services/project.service';
import { distributeLead } from '../services/leadDistribution.service';
import { ProjectStatus, OtpSendRequest, OtpVerifyRequest } from '../types';

const router = Router();

// ==================== Landing Pages ====================

// GET /api/landing-pages - List all active landing pages
router.get('/landing-pages', async (req, res, next) => {
    try {
        const pages = await landingPageService.getPublicLandingPages();
        res.json(pages);
    } catch (error) {
        next(error);
    }
});

// GET /api/landing-page/:slug - Get landing page by slug with projects
router.get('/landing-page/:slug', async (req, res, next) => {
    try {
        const page = await landingPageService.getLandingPageBySlug(req.params.slug);
        res.json(page);
    } catch (error) {
        if (error instanceof Error) {
            res.status(404).json({ error: 'Landing page not found' });
            return;
        }
        next(error);
    }
});

// ==================== Projects ====================



// GET /api/projects/:id - Get project details by ID or Slug (public)
router.get('/projects/:id', async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                OR: [
                    { id: req.params.id },
                    { slug: req.params.id }
                ],
                status: ProjectStatus.LIVE,
                isVisible: true,
            },
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
                priceDetails: true,
                address: true,
                reraId: true,
                slug: true,
                seoTitle: true,
                seoDescription: true,
                floorPlans: true,
                videoUrl: true,
                builderDescription: true,
                aboutProject: true,
                disclaimer: true,
                locationHighlights: true,
                usp1: true,
                usp2: true,
                estimatedPossessionDate: true,
                advertiser: {
                    select: {
                        companyName: true,
                        phone: true,
                        ownerName: true,
                    },
                },
            } as any,
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const resolvedData = (await resolveProjectsData([project]))[0];
        res.json(resolvedData);
    } catch (error) {
        next(error);
    }
});

// GET /api/project/:slug - Get project by slug (public)
router.get('/project/:slug', async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                OR: [
                    { slug: req.params.slug },
                    { id: req.params.slug }
                ],
                status: ProjectStatus.LIVE,
                isVisible: true,
            },
            include: {
                advertiser: {
                    select: {
                        id: true,
                        companyName: true,
                        ownerName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Increment visits counter
        await prisma.project.update({
            where: { id: project.id },
            data: { visits: { increment: 1 } },
        });

        const resolvedData = (await resolveProjectsData([project]))[0];

        res.json({
            ...resolvedData,
            visits: project.visits + 1,
            advertiser_contact: project.advertiser ? {
                company_name: project.advertiser.companyName || '',
                contact_person: project.advertiser.ownerName || '',
                phone: project.advertiser.phone || '',
                email: project.advertiser.email || '',
            } : null,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== Leads ====================
// ... (Keep existing leads endpoint)

// POST /api/leads - Submit a lead
router.post('/leads', async (req, res, next) => {
    try {
        const lead = await leadService.createLead(req.body);

        // Get project with advertiser details for response
        // Get project with advertiser details for response (if project linked)
        let project = null;
        if (req.body.projectId) {
            project = await prisma.project.findUnique({
                where: { id: req.body.projectId },
                include: {
                    advertiser: {
                        select: {
                            companyName: true,
                            ownerName: true,
                            phone: true,
                            email: true,
                        },
                    },
                },
            });
        }

        // Only distribute leads from Facebook (source: 'facebook')
        // Website leads (form/landing_page) go directly to project's advertiser
        if (req.body.source === 'facebook') {
            distributeLead(lead.id).catch(err =>
                console.error('Lead distribution failed:', err)
            );
        }

        res.status(201).json({
            message: 'Lead submitted successfully',
            id: lead.id,
            advertiserContact: project?.advertiser ? {
                companyName: project.advertiser.companyName || '',
                contactPerson: project.advertiser.ownerName || '',
                phone: project.advertiser.phone || '',
                email: project.advertiser.email || '',
            } : null,
        });
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Options ====================

// GET /api/options - Get all active options
router.get('/options', async (req, res, next) => {
    try {
        const options = await optionService.getAllOptions();
        res.json(options);
    } catch (error) {
        next(error);
    }
});

// ==================== Stats ====================

// GET /api/stats - Get public stats
router.get('/stats', async (req, res, next) => {
    try {
        const [citiesCount, projectsCount, advertisersCount] = await Promise.all([
            prisma.option.count({
                where: { optionType: 'CITY', isActive: true },
            }),
            prisma.project.count({
                where: { status: ProjectStatus.LIVE, isVisible: true },
            }),
            prisma.user.count({
                where: { role: 'ADVERTISER', status: 'active' },
            }),
        ]);

        res.json({
            cities: citiesCount,
            projects: projectsCount,
            advertisers: advertisersCount,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== OTP Verification ====================

// POST /api/send-otp - Send OTP to phone number
router.post('/send-otp', async (req, res, next) => {
    try {
        const { phone } = req.body as OtpSendRequest;
        const result = await otpService.sendOtp(phone);
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// POST /api/verify-otp - Verify OTP
router.post('/verify-otp', async (req, res, next) => {
    try {
        const { phone, otp } = req.body as OtpVerifyRequest;
        const result = await otpService.verifyOtp(phone, otp);
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Project Preview ====================

// GET /api/project-preview/:slug - Get project for preview (doesn't require LIVE status)
router.get('/project-preview/:slug', async (req, res, next) => {
    try {
        const project = await prisma.project.findFirst({
            where: {
                OR: [
                    { slug: req.params.slug },
                    { id: req.params.slug }
                ]
            },
            include: {
                advertiser: {
                    select: {
                        id: true,
                        companyName: true,
                        ownerName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        const resolvedData = (await resolveProjectsData([project]))[0];

        res.json({
            ...resolvedData,
            isPreview: true,
            advertiser_contact: project.advertiser ? {
                company_name: project.advertiser.companyName || '',
                contact_person: project.advertiser.ownerName || '',
                phone: project.advertiser.phone || '',
                email: project.advertiser.email || '',
            } : null,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== Budget Ranges ====================

// GET /api/budget-ranges - Get configurable budget filter ranges
router.get('/budget-ranges', (req, res) => {
    res.json([
        { label: '₹5 Lakhs', min: 0, max: 500000 },
        { label: '₹10 Lakhs', min: 500000, max: 1000000 },
        { label: '₹25 Lakhs', min: 1000000, max: 2500000 },
        { label: '₹50 Lakhs', min: 2500000, max: 5000000 },
        { label: '₹1 Cr', min: 5000000, max: 10000000 },
        { label: '₹2 Cr', min: 10000000, max: 20000000 },
        { label: '₹5 Cr+', min: 20000000, max: null },
    ]);
});

// GET /api/options/property-unit-mappings - Get property type to unit type mappings (public)
router.get('/options/property-unit-mappings', async (req, res, next) => {
    try {
        const mappings = await optionService.getPropertyUnitTypeMappings();
        res.json(mappings);
    } catch (error) {
        next(error);
    }
});

export default router;

