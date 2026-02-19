import prisma from '../utils/prisma';
import { hashPassword } from '../utils/password.utils';
import {
    AdminRole,
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
    AdvertiserCreateRequest,
    AdvertiserUpdateRequest,
    AdvertiserProfileUpdateRequest,
    ALL_PERMISSIONS,
} from '../types';
import { logAudit } from './audit.service';

// ==================== Admin User Management ====================

export const getAdminUsers = async () => {
    return prisma.user.findMany({
        where: {
            role: { not: AdminRole.ADVERTISER },
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            roleId: true,
            userRole: {
                select: { name: true, permissions: true }
            },
            customPermissions: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const getAdminUserById = async (userId: string) => {
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            role: { not: AdminRole.ADVERTISER },
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            roleId: true,
            userRole: {
                select: { name: true, permissions: true }
            },
            customPermissions: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        throw new Error('User not found');
    }

    return user;
};

export const createAdminUser = async (
    data: AdminUserCreateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });

    if (existing) {
        throw new Error('Email already exists');
    }

    // Validate roleId if provided
    if (data.roleId) {
        const roleExists = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (!roleExists) {
            throw new Error('Invalid Role ID');
        }
    }

    // Validate custom permissions for sub_admin (only if no dynamic role used, or legacy path)
    if (!data.roleId && data.role === AdminRole.SUB_ADMIN) {
        if (!data.customPermissions || data.customPermissions.length === 0) {
            throw new Error('Custom permissions required for sub_admin role');
        }

        const invalidPerms = data.customPermissions.filter(
            (p) => !ALL_PERMISSIONS.includes(p as any)
        );
        if (invalidPerms.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPerms.join(', ')}`);
        }
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            name: data.name,
            phone: data.phone,
            role: data.role,
            roleId: data.roleId, // Set the relation
            customPermissions:
                !data.roleId && data.role === AdminRole.SUB_ADMIN ? data.customPermissions || [] : [],
            isActive: true,
        },
    });

    await logAudit('admin_user_created', currentUserId, currentUserRole, {
        newUserId: user.id,
        newUserEmail: user.email,
        newUserRole: user.role,
        newUserRoleId: user.roleId,
        customPermissions: user.customPermissions,
    });

    return { message: 'Admin user created', id: user.id };
};

export const updateAdminUser = async (
    userId: string,
    data: AdminUserUpdateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!targetUser) {
        throw new Error('User not found');
    }

    if (targetUser.role === AdminRole.SUPER_ADMIN && currentUserId !== userId) {
        throw new Error('Cannot modify another super admin');
    }

    // Validate roleId if provided
    if (data.roleId) {
        const roleExists = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (!roleExists) {
            throw new Error('Invalid Role ID');
        }
    }

    // Validate custom permissions if changing to sub_admin without dynamic role
    if (!data.roleId && data.role === AdminRole.SUB_ADMIN) {
        if (!data.customPermissions || data.customPermissions.length === 0) {
            throw new Error('Custom permissions required for sub_admin role');
        }

        const invalidPerms = data.customPermissions.filter(
            (p) => !ALL_PERMISSIONS.includes(p as any)
        );
        if (invalidPerms.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPerms.join(', ')}`);
        }
    }

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.maxLeadsPerDay !== undefined) updateData.maxLeadsPerDay = data.maxLeadsPerDay;
    if (data.leadFilters !== undefined) updateData.leadFilters = data.leadFilters;

    // Handle custom permissions
    if (data.roleId) {
        // If switching to a dynamic role, clear custom permissions legacy field
        updateData.customPermissions = [];
    } else if (data.role === AdminRole.SUB_ADMIN && data.customPermissions) {
        updateData.customPermissions = data.customPermissions;
    } else if (data.role && data.role !== AdminRole.SUB_ADMIN) {
        updateData.customPermissions = [];
    }

    await prisma.user.update({
        where: { id: userId },
        data: updateData,
    });

    await logAudit('admin_user_updated', currentUserId, currentUserRole, {
        targetUserId: userId,
        updatedFields: Object.keys(updateData),
    });

    return { message: 'User updated' };
};

export const deleteAdminUser = async (
    userId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const targetUser = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!targetUser) {
        throw new Error('User not found');
    }

    if (targetUser.role === AdminRole.SUPER_ADMIN) {
        throw new Error('Cannot delete super admin');
    }

    if (currentUserId === userId) {
        throw new Error('Cannot delete yourself');
    }

    await prisma.user.delete({
        where: { id: userId },
    });

    await logAudit('admin_user_deleted', currentUserId, currentUserRole, {
        deletedUserId: userId,
        deletedUserEmail: targetUser.email,
    });

    return { message: 'User deleted' };
};

export const changeAdminUserPassword = async (
    userId: string,
    newPassword: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    await logAudit('admin_password_changed', currentUserId, currentUserRole, {
        targetUserId: userId,
    });

    return { message: 'Password changed successfully' };
};

export const getSalespeople = async () => {
    // Get all active admin users (not ADVERTISER role) as potential salespeople
    const users = await prisma.user.findMany({
        where: {
            isActive: true,
            role: { notIn: [AdminRole.ADVERTISER] },
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
        },
        orderBy: { name: 'asc' },
    });

    // Return with name fallback to email if name is null
    return users.map(u => ({
        ...u,
        name: u.name || u.email,
    }));
};

// ==================== Advertiser CRM ====================

export const getAdvertisers = async (params: {
    status?: string;
    salespersonId?: string;
}) => {
    const where: any = { role: AdminRole.ADVERTISER };

    if (params.status) {
        where.status = params.status;
    }
    if (params.salespersonId) {
        where.assignedSalespersonId = params.salespersonId;
    }

    const advertisers = await prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            companyName: true,
            ownerName: true,
            phone: true,
            address: true,
            gst: true,
            status: true,
            assignedSalespersonId: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    // Get unique salesperson IDs
    const salespersonIds = [...new Set(advertisers.map(a => a.assignedSalespersonId).filter(Boolean))] as string[];

    // Fetch salesperson details
    const salespeople = salespersonIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: salespersonIds } },
            select: { id: true, name: true, email: true }
        })
        : [];

    const salespersonMap = new Map(salespeople.map(sp => [sp.id, sp]));

    // Add stats and salesperson for each advertiser
    const advertisersWithStats = await Promise.all(
        advertisers.map(async (adv) => {
            const [packageCount, projectCount, leadCount] = await Promise.all([
                prisma.packagePurchase.count({ where: { advertiserId: adv.id } }),
                prisma.project.count({ where: { advertiserId: adv.id } }),
                prisma.lead.count({
                    where: {
                        project: { advertiserId: adv.id },
                    },
                }),
            ]);

            return {
                ...adv,
                assignedSalesperson: adv.assignedSalespersonId ? salespersonMap.get(adv.assignedSalespersonId) || null : null,
                package_count: packageCount,
                project_count: projectCount,
                lead_count: leadCount,
            };
        })
    );

    return advertisersWithStats;
};

export const getAdvertiserById = async (advertiserId: string) => {
    const advertiser = await prisma.user.findFirst({
        where: {
            id: advertiserId,
            role: AdminRole.ADVERTISER,
        },
        select: {
            id: true,
            email: true,
            companyName: true,
            ownerName: true,
            phone: true,
            address: true,
            gst: true,
            status: true,
            assignedSalespersonId: true,
            leadFilters: true,
            maxLeadsPerDay: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!advertiser) {
        throw new Error('Advertiser not found');
    }

    // Get salesperson info if assigned
    let salesperson = null;
    if (advertiser.assignedSalespersonId && advertiser.assignedSalespersonId !== 'none') {
        salesperson = await prisma.user.findUnique({
            where: { id: advertiser.assignedSalespersonId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
            },
        });
    }

    return { ...advertiser, salesperson };
};

export const createAdvertiser = async (
    data: AdvertiserCreateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });

    if (existing) {
        throw new Error('Email already exists');
    }

    // Check for duplicate phone
    if (data.phone) {
        const existingPhone = await prisma.user.findFirst({
            where: {
                phone: data.phone,
                role: AdminRole.ADVERTISER,
            },
        });
        if (existingPhone) {
            throw new Error('An advertiser with this phone number already exists');
        }
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            companyName: data.companyName,
            ownerName: data.ownerName,
            phone: data.phone,
            address: data.address,
            gst: data.gst,
            role: AdminRole.ADVERTISER,
            status: 'active',
            assignedSalespersonId: (data.assignedSalespersonId && data.assignedSalespersonId !== 'none') ? data.assignedSalespersonId : null,
        },
    });

    await logAudit('advertiser_created', currentUserId, currentUserRole, {
        advertiserId: user.id,
        advertiserEmail: user.email,
    });

    return { message: 'Advertiser created', id: user.id };
};

export const updateAdvertiser = async (
    advertiserId: string,
    data: AdvertiserUpdateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const advertiser = await prisma.user.findFirst({
        where: {
            id: advertiserId,
            role: AdminRole.ADVERTISER,
        },
    });

    if (!advertiser) {
        throw new Error('Advertiser not found');
    }

    const updateData: any = {};

    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.gst !== undefined) updateData.gst = data.gst;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.assignedSalespersonId !== undefined)
        updateData.assignedSalespersonId = (data.assignedSalespersonId && data.assignedSalespersonId !== 'none') ? data.assignedSalespersonId : null;
    if (data.status !== undefined) updateData.status = data.status;

    await prisma.user.update({
        where: { id: advertiserId },
        data: updateData,
    });

    await logAudit('advertiser_updated', currentUserId, currentUserRole, {
        advertiserId,
        updatedFields: Object.keys(updateData),
    });

    return { message: 'Advertiser updated' };
};

export const deleteAdvertiser = async (
    advertiserId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const advertiser = await prisma.user.findFirst({
        where: {
            id: advertiserId,
            role: AdminRole.ADVERTISER,
        },
    });

    if (!advertiser) {
        throw new Error('Advertiser not found');
    }

    await prisma.user.delete({
        where: { id: advertiserId },
    });

    await logAudit('advertiser_deleted', currentUserId, currentUserRole, {
        advertiserId,
        advertiserEmail: advertiser.email,
    });

    return { message: 'Advertiser deleted' };
};

export const getAdvertiserNotes = async (advertiserId: string) => {
    return prisma.internalNote.findMany({
        where: { advertiserId },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
};

export const addAdvertiserNote = async (
    data: { advertiserId: string; content: string; priority?: string },
    currentUserId: string
) => {
    return prisma.internalNote.create({
        data: {
            advertiserId: data.advertiserId,
            createdById: currentUserId,
            content: data.content,
            priority: data.priority || 'normal',
        },
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
};

export const toggleAdvertiserStatus = async (
    advertiserId: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const advertiser = await prisma.user.findFirst({
        where: {
            id: advertiserId,
            role: AdminRole.ADVERTISER,
        },
    });

    if (!advertiser) {
        throw new Error('Advertiser not found');
    }

    const newStatus = advertiser.status === 'active' ? 'inactive' : 'active';

    await prisma.user.update({
        where: { id: advertiserId },
        data: { status: newStatus },
    });

    await logAudit('advertiser_status_toggled', currentUserId, currentUserRole, {
        advertiserId,
        newStatus,
    });

    return { message: 'Status updated', status: newStatus };
};

export const changeAdvertiserPassword = async (
    advertiserId: string,
    newPassword: string,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }

    const advertiser = await prisma.user.findFirst({
        where: {
            id: advertiserId,
            role: AdminRole.ADVERTISER,
        },
    });

    if (!advertiser) {
        throw new Error('Advertiser not found');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: advertiserId },
        data: { password: hashedPassword },
    });

    await logAudit('advertiser_password_changed', currentUserId, currentUserRole, {
        advertiserId,
    });

    return { message: 'Password changed successfully' };
};

export const updateAdvertiserProfile = async (
    advertiserId: string,
    data: AdvertiserProfileUpdateRequest,
    currentUserId: string,
    currentUserRole: AdminRole
) => {
    const advertiser = await prisma.user.findFirst({
        where: {
            id: advertiserId,
            role: AdminRole.ADVERTISER,
        },
    });

    if (!advertiser) {
        throw new Error('Advertiser not found');
    }

    const updateData: any = {};

    if (data.leadFilters !== undefined) {
        updateData.leadFilters = data.leadFilters;
    }

    if (data.maxLeadsPerDay !== undefined) {
        // Ensure it's a valid number
        const limit = Number(data.maxLeadsPerDay);
        if (isNaN(limit) || limit < 0) {
            throw new Error('Invalid max leads per day');
        }
        updateData.maxLeadsPerDay = limit;
    }

    if (Object.keys(updateData).length === 0) {
        return { message: 'No changes provided' };
    }

    await prisma.user.update({
        where: { id: advertiserId },
        data: updateData,
    });

    await logAudit('advertiser_profile_updated', currentUserId, currentUserRole, {
        advertiserId,
        updatedFields: Object.keys(updateData),
    });

    return { message: 'Profile updated successfully' };
};

