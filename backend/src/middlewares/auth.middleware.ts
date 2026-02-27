import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import prisma from '../utils/prisma';
import { AuthenticatedRequest, AdminRole, ROLE_PERMISSIONS, ADMIN_ROLES } from '../types';

export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization header missing or invalid' });
            return;
        }

        const token = authHeader.split(' ')[1];

        try {
            const payload = verifyToken(token);

            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                include: { userRole: true },
            });

            if (!user) {
                res.status(401).json({ error: 'User not found' });
                return;
            }

            if (!user.isActive || user.status === 'inactive' || user.status === 'banned') {
                res.status(401).json({ error: 'Account is deactivated. Please contact support.' });
                return;
            }

            req.user = user;
            next();
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'TokenExpiredError') {
                    res.status(401).json({ error: 'Token expired' });
                    return;
                }
            }
            res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        next(error);
    }
};

export const requireAdmin = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    // Check both legacy enum and new dynamic role
    // Assuming ADVERTISER role in DB also has specific permissions or is identified by name?
    // For now, keep the enum check for ADVERTISER as it's a fundamental distinction
    if (req.user.role === AdminRole.ADVERTISER) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    next();
};

export const requireAdvertiser = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (req.user.role !== AdminRole.ADVERTISER) {
        res.status(403).json({ error: 'Advertiser access required' });
        return;
    }

    next();
};

export const checkPermission = (user: any, requiredPermissions: string[]): boolean => {
    // Super Admin Override
    if (user.role === AdminRole.SUPER_ADMIN || user.userRole?.name === 'SUPER_ADMIN') {
        return true;
    }

    let userPerms: string[] = [];

    // Prioritize Dynamic Role Permissions
    if (user.userRole) {
        userPerms = user.userRole.permissions;
    } else if (user.role === AdminRole.SUB_ADMIN) {
        // Fallback for Sub-Admin custom permissions (legacy field)
        userPerms = user.customPermissions || [];
    } else {
        // Fallback to static map
        userPerms = ROLE_PERMISSIONS[user.role as AdminRole] || [];
    }

    if (userPerms.includes('all')) {
        return true;
    }

    return requiredPermissions.some((perm) => userPerms.includes(perm));
};

export const requirePermissions = (permissions: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (req.user.role === AdminRole.ADVERTISER) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }

        if (!checkPermission(req.user, permissions)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
};

export const authorize = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        next();
    };
};
