import { Router, Response } from 'express';
import { differenceInDays } from 'date-fns';
import { authenticate, requireAdmin, requirePermissions } from '../middlewares/auth.middleware';
import { AuthenticatedRequest, AdminRole, ALL_PERMISSIONS, OptionType } from '../types';
import * as userService from '../services/user.service';
import * as packageService from '../services/package.service';
import * as projectService from '../services/project.service';
import * as landingPageService from '../services/landingPage.service';
import * as leadService from '../services/lead.service';
import * as optionService from '../services/option.service';
import { getAuditLogs } from '../services/audit.service';
import prisma from '../utils/prisma';

const router = Router();

// Helper to safely get param as string
const getParam = (param: string | string[] | undefined): string => {
    if (Array.isArray(param)) return param[0] || '';
    return param || '';
};

// All routes require authentication and admin role
router.use(authenticate as any);
router.use(requireAdmin as any);

// ==================== Audit Logs ====================

router.get('/audit-logs', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { action, userId, limit, offset } = req.query;

        const query: any = {};
        if (action) query.action = action;
        if (userId) query.userId = userId;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: query,
                take: limit ? parseInt(limit as string) : 50,
                skip: offset ? parseInt(offset as string) : 0,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        }
                    }
                }
            }),
            prisma.auditLog.count({ where: query })
        ]);

        res.json({ logs, total });
    } catch (error) {
        next(error);
    }
});

// ==================== Dashboard Stats ====================

router.get('/dashboard', async (req: AuthenticatedRequest, res: Response, next) => {
    try {
        const [
            totalAdvertisers,
            pendingRequests,
            pendingReview,
            liveProjects,
            totalLeads,
        ] = await Promise.all([
            prisma.user.count({ where: { role: AdminRole.ADVERTISER } }),
            prisma.packageRequest.count({ where: { status: 'pending' } }),
            prisma.project.count({ where: { status: 'SUBMITTED_FOR_REVIEW' } }),
            prisma.project.count({ where: { status: 'LIVE' } }),
            prisma.lead.count(),
        ]);

        res.json({
            totalAdvertisers,
            pendingRequests,
            pendingReview,
            liveProjects,
            totalLeads,
        });
    } catch (error) {
        next(error);
    }
});

// ==================== Permissions ====================

router.get('/permissions', requirePermissions(['all', 'admin_users']) as any, async (req, res) => {
    res.json({
        permissions: ALL_PERMISSIONS,
        rolePresets: {
            [AdminRole.SUPER_ADMIN]: ['all'],
            [AdminRole.SUB_ADMIN]: [],
            [AdminRole.ACCOUNTS]: ['payments', 'packages', 'billing', 'renewals', 'advertisers_view'],
            [AdminRole.OPS]: ['projects', 'placements', 'landing_pages', 'advertisers_view'],
            [AdminRole.SALES]: ['advertisers', 'leads', 'leads_full', 'notes', 'advertisers_view'],
            [AdminRole.PRODUCT]: ['landing_pages_manage', 'public_pages', 'advertisers_view'],
        },
    });
});

// ==================== Admin Users ====================

router.get('/users', requirePermissions(['all', 'admin_users']) as any, async (req, res, next) => {
    try {
        const users = await userService.getAdminUsers();
        res.json(users);
    } catch (error) {
        next(error);
    }
});

router.get('/users/:id', requirePermissions(['all', 'admin_users']) as any, async (req, res, next) => {
    try {
        const user = await userService.getAdminUserById(req.params.id as string);
        res.json(user);
    } catch (error) {
        next(error);
    }
});

router.post('/users', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.createAdminUser(
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Role Management ====================
import * as roleService from '../services/role.service';

router.get('/roles', requirePermissions(['all', 'admin_users']) as any, async (req, res, next) => {
    try {
        const roles = await roleService.getRoles();
        res.json(roles);
    } catch (error) {
        next(error);
    }
});

router.get('/roles/:id', requirePermissions(['all', 'admin_users']) as any, async (req, res, next) => {
    try {
        const role = await roleService.getRoleById(req.params.id as string);
        res.json(role);
    } catch (error) {
        next(error);
    }
});

router.post('/roles', requirePermissions(['all']) as any, async (req, res, next) => {
    try {
        const role = await roleService.createRole(req.body);
        res.status(201).json(role);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.put('/roles/:id', requirePermissions(['all']) as any, async (req, res, next) => {
    try {
        const role = await roleService.updateRole(req.params.id as string, req.body);
        res.json(role);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.delete('/roles/:id', requirePermissions(['all']) as any, async (req, res, next) => {
    try {
        const result = await roleService.deleteRole(req.params.id as string);
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});
// ===================================================

router.put('/users/:id', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.updateAdminUser(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.delete('/users/:id', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.deleteAdminUser(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/users/:id/change-password', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { new_password } = req.body;
        const result = await userService.changeAdminUserPassword(
            req.params.id as string,
            new_password,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.get('/salespeople', async (req, res, next) => {
    try {
        const salespeople = await userService.getSalespeople();
        res.json(salespeople);
    } catch (error) {
        next(error);
    }
});

// ==================== Advertisers CRM ====================

router.get('/advertisers', async (req, res, next) => {
    try {
        const { status, salesperson_id } = req.query;
        const advertisers = await userService.getAdvertisers({
            status: status as string,
            salespersonId: salesperson_id as string,
        });
        res.json(advertisers);
    } catch (error) {
        next(error);
    }
});

router.get('/advertisers/:id', async (req, res, next) => {
    try {
        const advertiser = await userService.getAdvertiserById(req.params.id as string);
        res.json(advertiser);
    } catch (error) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/advertisers', requirePermissions(['advertisers', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.createAdvertiser(
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.put('/advertisers/:id', requirePermissions(['advertisers', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.updateAdvertiser(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.delete('/advertisers/:id', requirePermissions(['advertisers', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.deleteAdvertiser(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/advertisers/:id/toggle-status', requirePermissions(['advertisers', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.toggleAdvertiserStatus(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/advertisers/:id/change-password', requirePermissions(['advertisers', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { new_password } = req.body;
        const result = await userService.changeAdvertiserPassword(
            req.params.id as string,
            new_password,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.get('/advertisers/:id/packages', async (req, res, next) => {
    try {
        const packages = await packageService.getAdvertiserPackages(req.params.id as string);
        res.json(packages);
    } catch (error) {
        next(error);
    }
});

router.get('/advertisers/:id/available-packages', async (req, res, next) => {
    try {
        const packages = await packageService.getAvailablePackages(req.params.id as string);
        res.json(packages);
    } catch (error) {
        next(error);
    }
});

router.get('/advertisers/:id/projects', async (req, res, next) => {
    try {
        const projects = await projectService.getAdvertiserProjects(req.params.id as string);
        res.json(projects);
    } catch (error) {
        next(error);
    }
});

router.get('/advertisers/:id/leads', async (req, res, next) => {
    try {
        const leads = await leadService.getAllAdvertiserLeads(req.params.id as string);
        res.json(leads);
    } catch (error) {
        next(error);
    }
});

// Notes Routes
router.get('/advertisers/:id/notes', async (req, res, next) => {
    try {
        const notes = await userService.getAdvertiserNotes(req.params.id as string);
        res.json(notes);
    } catch (error) {
        next(error);
    }
});

router.post('/advertisers/:id/notes', requirePermissions(['notes', 'advertisers', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await userService.addAdvertiserNote(
            { ...req.body, advertiserId: req.params.id },
            req.user!.id
        );
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// Manual Package Add
router.post('/advertisers/:id/packages', requirePermissions(['packages', 'advertisers', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.addPackageToAdvertiser(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.get('/advertisers/:id/billing', async (req, res, next) => {
    try {
        const billing = await packageService.getAdvertiserBilling(req.params.id as string);
        res.json(billing);
    } catch (error) {
        next(error);
    }
});

// ==================== Package Definitions ====================

router.get('/package-definitions', async (req, res, next) => {
    try {
        const includeInactive = req.query.include_inactive === 'true';
        const definitions = await packageService.getPackageDefinitions(includeInactive);
        res.json(definitions);
    } catch (error) {
        next(error);
    }
});

router.get('/package-definitions/:id', async (req, res, next) => {
    try {
        const definition = await packageService.getPackageDefinitionById(req.params.id as string);
        res.json(definition);
    } catch (error) {
        next(error);
    }
});

router.post('/package-definitions', requirePermissions(['packages', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.createPackageDefinition(
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

router.put('/package-definitions/:id', requirePermissions(['packages', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.updatePackageDefinition(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.delete('/package-definitions/:id', requirePermissions(['packages', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.deletePackageDefinition(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Packages (Purchases) ====================

router.put('/packages/:id/dates', requirePermissions(['packages', 'projects', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.updatePackageDates(
            req.params.id as string,
            req.body.startDate,
            req.body.endDate,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Payment Requests ====================

router.get('/payment-requests', requirePermissions(['payments', 'all']) as any, async (req, res, next) => {
    try {
        const { status } = req.query;
        const requests = await packageService.getPackageRequests(status as string);
        res.json(requests);
    } catch (error) {
        next(error);
    }
});

router.post('/payment-requests/:id/confirm', requirePermissions(['payments', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.confirmPayment(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/payment-requests/:id/reject', requirePermissions(['payments', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.rejectPayment(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Pending Dues ====================

router.get('/payments/pending-dues', requirePermissions(['payments', 'all']) as any, async (req, res, next) => {
    try {
        const packages = await packageService.getPackagesWithPendingDues();
        res.json(packages);
    } catch (error) {
        next(error);
    }
});

router.post('/payments/:id/record', requirePermissions(['payments', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.recordPackagePayment(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.delete('/billing-ledger/:id', requirePermissions(['payments', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        await packageService.deleteBillingRecord(req.params.id as string);
        res.json({ success: true, message: 'Billing record deleted' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Billing ====================

router.get('/billing-ledger', requirePermissions(['billing', 'all']) as any, async (req, res, next) => {
    try {
        const { advertiser_id } = req.query;
        const ledger = await packageService.getBillingLedger(advertiser_id as string);
        res.json(ledger);
    } catch (error) {
        next(error);
    }
});

router.get('/invoice/:billingId', async (req, res, next) => {
    try {
        const invoice = await packageService.getInvoice(req.params.billingId as string);
        res.json(invoice);
    } catch (error) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Renewals ====================

router.get('/renewals', requirePermissions(['renewals', 'all']) as any, async (req, res, next) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const renewals = await packageService.getRenewals(days);
        res.json(renewals);
    } catch (error) {
        next(error);
    }
});

// ==================== Projects ====================

router.get('/projects/review-inbox', requirePermissions(['projects', 'all']) as any, async (req, res, next) => {
    try {
        const projects = await projectService.getProjectsForReview();
        res.json(projects);
    } catch (error) {
        next(error);
    }
});

// GET /projects - Get all projects with resolved names
router.get('/projects', async (req, res, next) => {
    try {
        const { status, city, advertiser_id } = req.query;

        const projects = await projectService.getAllProjects({
            status: status as any,
            city: city as string,
            advertiserId: advertiser_id as string,
        });

        res.json(projects);
    } catch (error) {
        next(error);
    }
});

router.get('/projects/:id', async (req, res, next) => {
    try {
        const project = await projectService.getProjectById(req.params.id as string);

        // Resolve location UUIDs to names
        const optionIds: string[] = [];
        if (project.city) optionIds.push(project.city);
        if (project.locality) optionIds.push(project.locality);

        const options = await optionService.getOptionsByIds(optionIds);
        const nameMap = new Map(options.map((o: any) => [o.id, o.name]));

        const resolved = {
            ...project,
            city: nameMap.get(project.city) || project.city,
            locality: nameMap.get(project.locality) || project.locality,
        };

        res.json(resolved);
    } catch (error) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/projects', requirePermissions(['projects', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.createAdminProject(
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.status(201).json(project);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.put('/projects/:id', requirePermissions(['projects', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const project = await projectService.updateProject(req.params.id as string, req.body);
        res.json(project);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/projects/:id/review', requirePermissions(['projects', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await projectService.reviewProject(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/projects/:id/pause', requirePermissions(['projects', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await projectService.pauseProject(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/projects/:id/resume', requirePermissions(['projects', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await projectService.resumeProject(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });

            return;
        }
        next(error);
    }
});

router.delete('/projects/:id', requirePermissions(['projects', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await projectService.deleteProject(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/projects/:id/reassign', requirePermissions(['projects', 'placements', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.reassignProject(
            req.params.id as string,
            req.body.landing_page_id,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Placement Queue ====================

router.get('/placement-queue', requirePermissions(['placements', 'all']) as any, async (req, res, next) => {
    try {
        const queue = await projectService.getPlacementQueue();
        res.json(queue);
    } catch (error) {
        next(error);
    }
});

router.post('/place-project', requirePermissions(['placements', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.placeProject(
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/remove-project/:id', requirePermissions(['placements', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.removeProject(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Landing Pages ====================

router.get('/landing-pages', async (req, res, next) => {
    try {
        const pages = await landingPageService.getLandingPages();
        res.json(pages);
    } catch (error) {
        next(error);
    }
});

router.get('/landing-pages/:id', async (req, res, next) => {
    try {
        const page = await landingPageService.getLandingPageById(req.params.id as string);
        res.json(page);
    } catch (error) {
        if (error instanceof Error) {
            res.status(404).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/landing-pages', requirePermissions(['landing_pages_manage', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const page = await landingPageService.createLandingPage(
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.status(201).json(page);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.put('/landing-pages/:id', requirePermissions(['landing_pages_manage', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const page = await landingPageService.updateLandingPage(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(page);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.delete('/landing-pages/:id', requirePermissions(['landing_pages_manage', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.deleteLandingPage(
            req.params.id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

router.post('/landing-pages/:id/reorder', requirePermissions(['placements', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.reorderSlots(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/landing-pages/:id/replace-slot', requirePermissions(['placements', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { slot, new_project_id } = req.query;
        const result = await landingPageService.replaceSlot(
            req.params.id as string,
            parseInt(slot as string),
            new_project_id as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// ==================== Facebook Integration ====================

router.patch('/landing-pages/:id/facebook-settings', requirePermissions(['landing_pages_manage', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.updateLandingPageFacebookSettings(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/landing-pages/:id/facebook-forms', requirePermissions(['landing_pages_manage', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.addLandingPageFacebookForm(
            req.params.id as string,
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

router.delete('/landing-pages/:lpId/facebook-forms/:formId', requirePermissions(['landing_pages_manage', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await landingPageService.removeLandingPageFacebookForm(
            req.params.lpId as string,
            req.params.formId as string,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ==================== Leads ====================

router.get('/leads', requirePermissions(['leads', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { project_id, landing_page_id, start_date, end_date, limit, offset, sourceType } = req.query;
        const result = await leadService.getLeads({
            projectId: project_id as string,
            landingPageId: landing_page_id as string,
            startDate: start_date ? new Date(start_date as string) : undefined,
            endDate: end_date ? new Date(end_date as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            offset: offset ? parseInt(offset as string) : undefined,
            salespersonId: req.user?.role === 'SALES' ? req.user.id : undefined,
            sourceType: sourceType as 'direct' | 'common' | 'all' | undefined,
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/leads/upload', requirePermissions(['leads', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await leadService.manualUploadLeads(
            req.body,
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ==================== Audit Logs ====================

router.get('/audit-logs', requirePermissions(['audit_logs', 'all']) as any, async (req, res, next) => {
    try {
        const { user_id, action, start_date, end_date, limit, offset } = req.query;
        const result = await getAuditLogs({
            userId: user_id as string,
            action: action as string,
            startDate: start_date ? new Date(start_date as string) : undefined,
            endDate: end_date ? new Date(end_date as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            offset: offset ? parseInt(offset as string) : undefined,
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
});



// ==================== Expiry Check ====================

router.post('/run-expiry-check', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const result = await packageService.runExpiryCheck(
            req.user!.id,
            req.user!.role
        );
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// ==================== Options Management ====================

// Category to OptionType mapping
// Category to OptionType mapping
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
    // project_type handled manually
};

// GET /admin/options/:category - Get options by category
router.get('/options/:category', async (req: AuthenticatedRequest, res, next) => {
    try {
        const category = getParam(req.params.category);

        // Manual handling for project_type (not in DB yet)
        if (category === 'project_type') {
            return res.json([
                { label: 'Residential', value: 'Residential' },
                { label: 'Commercial', value: 'Commercial' },
                { label: 'Plots', value: 'Plots' }
            ]);
        }

        const optionType = categoryToOptionType[category];

        if (!optionType) {
            res.status(400).json({ error: `Invalid category: ${category}` });
            return;
        }

        const options = await optionService.getOptions(optionType, true);

        // Transform to match frontend expected format
        const transformed = options.map(opt => ({
            id: opt.id,
            category,
            value: opt.name.toLowerCase().replace(/\s+/g, '_'),
            label: opt.name,
            name: opt.name,  // Add for frontend compatibility
            isActive: opt.isActive,
            parentId: opt.parentId,
            iconUrl: opt.iconUrl ?? null,  // Include iconUrl for amenity icons
        }));

        res.json(transformed);
    } catch (error) {
        next(error);
    }
});

// POST /admin/options - Create option
router.post('/options', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { category, value, label } = req.body;

        if (!category) {
            res.status(400).json({ error: 'Category is required' });
            return;
        }
        if (!label) {
            res.status(400).json({ error: 'Label is required' });
            return;
        }

        const optionTypeString = categoryToOptionType[category];

        if (!optionTypeString) {
            res.status(400).json({ error: `Invalid category: ${category}` });
            return;
        }

        const createData = {
            optionType: optionTypeString as OptionType,
            name: String(label),
            parentId: req.body.parentId,
            iconUrl: req.body.iconUrl || null,
        };

        const option = await optionService.createOption(
            createData,
            req.user!.id,
            req.user!.role
        );

        res.status(201).json({
            id: option.id,
            category,
            value: option.name.toLowerCase().replace(/\s+/g, '_'),
            label: option.name,
            isActive: option.isActive,
            iconUrl: option.iconUrl ?? null,
        });
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// PUT /admin/options/:id - Update option
router.put('/options/:id', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { label, isActive, iconUrl } = req.body;

        const option = await optionService.updateOption(
            getParam(req.params.id),
            { name: label, isActive, iconUrl: iconUrl !== undefined ? (iconUrl || null) : undefined },
            req.user!.id,
            req.user!.role
        );

        res.json({
            id: option.id,
            value: option.name.toLowerCase().replace(/\s+/g, '_'),
            label: option.name,
            isActive: option.isActive,
            iconUrl: option.iconUrl ?? null,
        });
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// DELETE /admin/options/:id - Delete option
router.delete('/options/:id', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        await optionService.deleteOption(
            getParam(req.params.id),
            req.user!.id,
            req.user!.role
        );
        res.json({ message: 'Option deleted' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// PUT /admin/options/:id/unit-type-mapping - Update property type's unit type mapping
router.put('/options/:id/unit-type-mapping', requirePermissions(['all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const { unitTypeIds } = req.body;

        if (!Array.isArray(unitTypeIds)) {
            res.status(400).json({ error: 'unitTypeIds must be an array' });
            return;
        }

        await optionService.updatePropertyUnitTypeMapping(
            getParam(req.params.id),
            unitTypeIds,
            req.user!.id,
            req.user!.role
        );

        res.json({ message: 'Unit type mapping updated successfully' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// GET /admin/options/property-types/mappings - Get all property types with their unit type mappings
router.get('/options/property-types/mappings', async (req: AuthenticatedRequest, res, next) => {
    try {
        const mappings = await optionService.getPropertyTypesWithMappings();
        res.json(mappings);
    } catch (error) {
        next(error);
    }
});

// ==================== Renewals ====================

router.get('/renewals', requirePermissions(['renewals', 'all']) as any, async (req: AuthenticatedRequest, res, next) => {
    try {
        const days = req.query.days ? parseInt(req.query.days as string) : 30;
        const packages = await packageService.getRenewals(days);

        const renewals = packages.map(pkg => ({
            id: pkg.id,
            advertiserName: pkg.advertiser.companyName,
            packageName: pkg.packageDefinition.name,
            expiryDate: pkg.endDate,
            daysRemaining: pkg.endDate ? differenceInDays(new Date(pkg.endDate), new Date()) : 0,
            status: pkg.state
        }));

        res.json(renewals);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

export default router;

