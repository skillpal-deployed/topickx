import prisma from '../utils/prisma';
import {
    AdminRole,
    PackageDefinitionCreateRequest,
    PackageDefinitionUpdateRequest,
    PaymentConfirmationRequest,
    PackageState,
} from '../types';
import { logAudit } from './audit.service';
import { addMonths } from 'date-fns';

// ==================== Package Definitions ====================

export const getPackageDefinitions = async (includeInactive = false) => {
    const where = includeInactive ? {} : { isActive: true };

    return prisma.packageDefinition.findMany({
        where,
        orderBy: { price: 'asc' },
    });
};

export const getPackageDefinitionById = async (id: string) => {
    const pkg = await prisma.packageDefinition.findUnique({
        where: { id },
    });

    if (!pkg) {
        throw new Error('Package definition not found');
    }

    return pkg;
};

export const createPackageDefinition = async (
    data: PackageDefinitionCreateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const pkg = await prisma.packageDefinition.create({
        data: {
            name: data.name,
            durationMonths: data.durationMonths,
            price: data.price,
            currency: data.currency || 'INR',
            description: data.description,
            isActive: data.isActive ?? true,
        },
    });

    await logAudit('package_definition_created', currentUserId, currentUserRole, {
        packageId: pkg.id,
        packageName: pkg.name,
    });

    return pkg;
};

export const updatePackageDefinition = async (
    id: string,
    data: PackageDefinitionUpdateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const existing = await prisma.packageDefinition.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new Error('Package definition not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.durationMonths !== undefined) updateData.durationMonths = data.durationMonths;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const pkg = await prisma.packageDefinition.update({
        where: { id },
        data: updateData,
    });

    await logAudit('package_definition_updated', currentUserId, currentUserRole, {
        packageId: id,
        updatedFields: Object.keys(updateData),
    });

    return pkg;
};

export const deletePackageDefinition = async (
    id: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const existing = await prisma.packageDefinition.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new Error('Package definition not found');
    }

    // Check if any purchases exist
    const purchases = await prisma.packagePurchase.count({
        where: { packageDefinitionId: id },
    });

    if (purchases > 0) {
        throw new Error('Cannot delete package with existing purchases');
    }

    await prisma.packageDefinition.delete({
        where: { id },
    });

    await logAudit('package_definition_deleted', currentUserId, currentUserRole, {
        packageId: id,
        packageName: existing.name,
    });

    return { message: 'Package definition deleted' };
};

// ==================== Package Requests ====================

export const getPackageRequests = async (status?: string) => {
    const where: any = {};
    if (status) {
        where.status = {
            equals: status,
            mode: 'insensitive',
        };
    }

    return prisma.packageRequest.findMany({
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
            packageDefinition: true,
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const createPackageRequest = async (
    advertiserId: string,
    packageDefinitionId: string,
    projectId?: string
) => {
    const pkgDef = await prisma.packageDefinition.findUnique({
        where: { id: packageDefinitionId },
    });

    if (!pkgDef || !pkgDef.isActive) {
        throw new Error('Package definition not found or inactive');
    }

    // Check for pending requests
    const pending = await prisma.packageRequest.findFirst({
        where: {
            advertiserId,
            status: 'pending',
        },
    });

    if (pending) {
        throw new Error('You already have a pending package request');
    }

    return prisma.packageRequest.create({
        data: {
            advertiserId,
            packageDefinitionId,
            status: 'pending',
            projectId,
        },
        include: {
            packageDefinition: true,
        },
    });
};

export const confirmPayment = async (
    requestId: string,
    data: PaymentConfirmationRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const request = await prisma.packageRequest.findUnique({
        where: { id: requestId },
        include: {
            packageDefinition: true,
            advertiser: true,
        },
    });

    if (!request) {
        throw new Error('Package request not found');
    }

    if (request.status !== 'pending') {
        throw new Error('Request is not pending');
    }

    // Update request status
    await prisma.packageRequest.update({
        where: { id: requestId },
        data: {
            status: 'approved',
            paymentMode: data.paymentMode,
            transactionReference: data.transactionReference,
            notes: data.notes,
            amountPaid: data.amountPaid || request.packageDefinition.price,
            discount: data.discount || 0,
            salespersonId: data.salespersonId,
            paymentType: data.paymentType,
            pendingAmount: data.pendingAmount || 0,
            paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        },
    });

    // Create package purchase
    const purchase = await prisma.packagePurchase.create({
        data: {
            advertiserId: request.advertiserId,
            packageDefinitionId: request.packageDefinitionId,
            state: PackageState.UNSTARTED,
            paymentMode: data.paymentMode,
            transactionReference: data.transactionReference,
            amountPaid: data.amountPaid || request.packageDefinition.price,
            discount: data.discount || 0,
            salespersonId: data.salespersonId,
            paymentType: data.paymentType,
            pendingAmount: data.pendingAmount || 0,
            paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
        },
    });

    // Create billing record
    await prisma.billingRecord.create({
        data: {
            packageId: purchase.id,
            type: 'purchase',
            amount: data.amountPaid || request.packageDefinition.price,
            discount: data.discount || 0,
            paymentMode: data.paymentMode,
            reference: data.transactionReference,
        },
    });

    // If this was a renewal request (linked to a project), update the project
    if (request.projectId) {
        await prisma.project.update({
            where: { id: request.projectId },
            data: {
                packageId: purchase.id,
                status: 'APPROVED_AWAITING_PLACEMENT', // Reset status for re-placement
                // We keep the original details, just need placement
            },
        });

        await logAudit('project_renewed', currentUserId, currentUserRole, {
            projectId: request.projectId,
            newPackageId: purchase.id,
        });
    }

    await logAudit('payment_confirmed', currentUserId, currentUserRole, {
        requestId,
        purchaseId: purchase.id,
        advertiserId: request.advertiserId,
        amount: data.amountPaid || request.packageDefinition.price,
        paymentType: data.paymentType,
        pendingAmount: data.pendingAmount,
        projectId: request.projectId, // Log if it was a renewal
    });

    return { message: 'Payment confirmed', purchaseId: purchase.id };
};

export const getPackagesWithPendingDues = async () => {
    return prisma.packagePurchase.findMany({
        where: {
            pendingAmount: { gt: 0 },
        },
        include: {
            advertiser: {
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                    phone: true,
                },
            },
            packageDefinition: true,
        },
        orderBy: { paymentDueDate: 'asc' },
    });
};

export const recordPackagePayment = async (
    packageId: string,
    data: {
        amount: number;
        paymentMode: string;
        transactionReference?: string;
        notes?: string;
    },
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const pkg = await prisma.packagePurchase.findUnique({
        where: { id: packageId },
    });

    if (!pkg) {
        throw new Error('Package purchase not found');
    }

    const newPending = (pkg.pendingAmount || 0) - data.amount;
    const newPaid = (pkg.amountPaid || 0) + data.amount;

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
        // Update package
        await tx.packagePurchase.update({
            where: { id: packageId },
            data: {
                pendingAmount: newPending < 0 ? 0 : newPending,
                amountPaid: newPaid,
            },
        });

        // Create billing record
        await tx.billingRecord.create({
            data: {
                packageId: pkg.id,
                type: 'PAYMENT',
                amount: data.amount,
                paymentMode: data.paymentMode,
                reference: data.transactionReference,
                description: data.notes || 'Part payment received',
            },
        });

        await logAudit('payment_recorded_manually', currentUserId, currentUserRole, {
            packageId,
            amount: data.amount,
            remainingPending: newPending,
        });
    });

    return { message: 'Payment recorded', remainingPending: newPending };
};

export const rejectPayment = async (
    requestId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const request = await prisma.packageRequest.findUnique({
        where: { id: requestId },
    });

    if (!request) {
        throw new Error('Package request not found');
    }

    if (request.status !== 'pending') {
        throw new Error('Request is not pending');
    }

    await prisma.packageRequest.update({
        where: { id: requestId },
        data: { status: 'rejected' },
    });

    await logAudit('payment_rejected', currentUserId, currentUserRole, {
        requestId,
        advertiserId: request.advertiserId,
    });

    return { message: 'Payment rejected' };
};

// ==================== Manual Package Management ====================

export const addPackageToAdvertiser = async (
    advertiserId: string,
    data: {
        packageDefinitionId: string;
        paymentMode: string;
        transactionReference?: string;
        amountPaid: number;
        discount?: number;
        salespersonId?: string;
        notes?: string;
        isActive?: boolean;
    },
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const pkgDef = await prisma.packageDefinition.findUnique({
        where: { id: data.packageDefinitionId },
    });

    if (!pkgDef) {
        throw new Error('Package definition not found');
    }

    // Create package purchase
    const purchase = await prisma.packagePurchase.create({
        data: {
            advertiserId,
            packageDefinitionId: data.packageDefinitionId,
            state: data.isActive ? PackageState.ACTIVE : PackageState.UNSTARTED,
            startDate: data.isActive ? new Date() : null,
            endDate: data.isActive ? addMonths(new Date(), pkgDef.durationMonths) : null,
            paymentMode: data.paymentMode,
            transactionReference: data.transactionReference,
            amountPaid: data.amountPaid,
            discount: data.discount || 0,
            salespersonId: data.salespersonId === 'null' ? null : data.salespersonId,
        },
    });

    // Create billing record
    await prisma.billingRecord.create({
        data: {
            packageId: purchase.id,
            type: 'purchase',
            amount: data.amountPaid,
            discount: data.discount || 0,
            paymentMode: data.paymentMode,
            reference: data.transactionReference,
        },
    });

    // If notes provided, add them (optional handling)
    if (data.notes) {
        // Could add to InternalNotes if desired, or just log
    }

    await logAudit('package_added_manually', currentUserId, currentUserRole, {
        advertiserId,
        packageId: purchase.id,
        packageDefinitionId: data.packageDefinitionId,
    });

    return purchase;
};

// ==================== Package Purchases ====================

export const getAdvertiserPackages = async (advertiserId: string) => {
    const packages = await prisma.packagePurchase.findMany({
        where: { advertiserId },
        include: {
            packageDefinition: true,
            projects: {
                include: {
                    placements: {
                        select: {
                            createdAt: true,
                        },
                        orderBy: {
                            createdAt: 'asc',
                        },
                        take: 1,
                    },
                },
            },
            billingRecords: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    // Calculate liveDate for each package (earliest placement across all projects)
    return packages.map(pkg => {
        let liveDate: Date | null = null;

        for (const project of pkg.projects) {
            if (project.placements && project.placements.length > 0) {
                const placementDate = project.placements[0].createdAt;
                if (!liveDate || placementDate < liveDate) {
                    liveDate = placementDate;
                }
            }
        }

        return {
            ...pkg,
            liveDate,
        };
    });
};

export const getAvailablePackages = async (advertiserId: string) => {
    return prisma.packagePurchase.findMany({
        where: {
            advertiserId,
            state: { in: [PackageState.UNSTARTED, PackageState.ACTIVE] },
        },
        include: {
            packageDefinition: true,
            projects: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                },
            },
        },
    });
};

export const activatePackage = async (packageId: string) => {
    const pkg = await prisma.packagePurchase.findUnique({
        where: { id: packageId },
        include: { packageDefinition: true },
    });

    if (!pkg) {
        throw new Error('Package not found');
    }

    if (pkg.state !== PackageState.UNSTARTED) {
        throw new Error('Package is already started');
    }

    const startDate = new Date();
    const endDate = addMonths(startDate, pkg.packageDefinition.durationMonths);

    return prisma.packagePurchase.update({
        where: { id: packageId },
        data: {
            state: PackageState.ACTIVE,
            startDate,
            endDate,
        },
    });
};

export const updatePackageDates = async (
    packageId: string,
    startDate: string | Date,
    endDate: string | Date,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const pkg = await prisma.packagePurchase.findUnique({
        where: { id: packageId },
    });

    if (!pkg) {
        throw new Error('Package not found');
    }

    const updated = await prisma.packagePurchase.update({
        where: { id: packageId },
        data: {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        },
    });

    await logAudit('package_dates_updated', currentUserId, currentUserRole, {
        packageId,
        oldStartDate: pkg.startDate,
        oldEndDate: pkg.endDate,
        newStartDate: updated.startDate,
        newEndDate: updated.endDate,
    });

    return updated;
};

// ==================== Renewals ====================

export const getRenewals = async (days: number = 30) => {
    const targetDate = addMonths(new Date(), 0);
    targetDate.setDate(targetDate.getDate() + days);

    return prisma.packagePurchase.findMany({
        where: {
            state: PackageState.ACTIVE,
            endDate: {
                lte: targetDate,
                gte: new Date(),
            },
        },
        include: {
            advertiser: {
                select: {
                    id: true,
                    email: true,
                    companyName: true,
                    phone: true,
                },
            },
            packageDefinition: true,
            projects: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                },
            },
        },
        orderBy: { endDate: 'asc' },
    });
};

// ==================== Billing ====================

export const getBillingLedger = async (advertiserId?: string) => {
    const where: any = {};

    if (advertiserId) {
        where.package = { advertiserId };
    }

    return prisma.billingRecord.findMany({
        where,
        include: {
            package: {
                include: {
                    advertiser: {
                        select: {
                            id: true,
                            email: true,
                            companyName: true,
                        },
                    },
                    packageDefinition: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getAdvertiserBilling = async (advertiserId: string) => {
    return prisma.billingRecord.findMany({
        where: {
            package: { advertiserId },
        },
        include: {
            package: {
                include: {
                    packageDefinition: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getInvoice = async (billingId: string, advertiserId?: string) => {
    const where: any = { id: billingId };

    const billing = await prisma.billingRecord.findUnique({
        where,
        include: {
            package: {
                include: {
                    advertiser: {
                        select: {
                            id: true,
                            email: true,
                            companyName: true,
                            ownerName: true,
                            phone: true,
                            address: true,
                            gst: true,
                        },
                    },
                    packageDefinition: true,
                },
            },
        },
    });

    if (!billing) {
        throw new Error('Billing record not found');
    }

    // If advertiserId provided, verify ownership
    if (advertiserId && billing.package.advertiserId !== advertiserId) {
        throw new Error('Unauthorized');
    }

    return billing;
};

export const deleteBillingRecord = async (id: string) => {
    return prisma.billingRecord.delete({
        where: { id },
    });
};

// ==================== Expiry Check ====================

export const runExpiryCheck = async (
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const now = new Date();

    // Find expired packages
    const expiredPackages = await prisma.packagePurchase.findMany({
        where: {
            state: PackageState.ACTIVE,
            endDate: { lt: now },
        },
    });

    // Update to expired
    const updatePromises = expiredPackages.map((pkg) =>
        prisma.packagePurchase.update({
            where: { id: pkg.id },
            data: { state: PackageState.EXPIRED },
        })
    );

    // Expire related projects
    const projectUpdatePromises = expiredPackages.map((pkg) =>
        prisma.project.updateMany({
            where: {
                packageId: pkg.id,
                status: { in: ['LIVE', 'APPROVED_AWAITING_PLACEMENT'] },
            },
            data: { status: 'EXPIRED' },
        })
    );

    await Promise.all([...updatePromises, ...projectUpdatePromises]);

    await logAudit('expiry_check_run', currentUserId, currentUserRole, {
        expiredPackages: expiredPackages.length,
        packageIds: expiredPackages.map((p) => p.id),
    });

    return {
        message: 'Expiry check completed',
        expiredCount: expiredPackages.length,
    };
};
