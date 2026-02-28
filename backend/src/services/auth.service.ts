import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { hashPassword, verifyPassword } from '../utils/password.utils';
import { createToken } from '../utils/jwt.utils';
import { UserCreateRequest, UserLoginRequest, AdminRole } from '../types';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerUser = async (data: UserCreateRequest) => {
    const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });

    if (existing) {
        throw new Error('Email already registered');
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            companyName: data.companyName,
            ownerName: data.companyName,
            phone: data.phone,
            role: AdminRole.ADVERTISER,
            status: 'active',
        },
    });

    const token = createToken(user.id, user.role);

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            companyName: user.companyName,
            phone: user.phone,
            role: user.role,
        },
    };
};

export const loginUser = async (data: UserLoginRequest) => {
    const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    if (!user.password) {
        throw new Error('This account uses Google Login. Please sign in with Google.');
    }

    const isValid = await verifyPassword(data.password, user.password);

    if (!isValid) {
        throw new Error('Invalid credentials');
    }

    const token = createToken(user.id, user.role);

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            companyName: user.companyName || user.name || 'Admin',
            name: user.name || user.companyName || '',
            phone: user.phone,
            role: user.role,
        },
    };
};

export const verifyGoogleToken = async (accessToken: string) => {
    try {
        // Option 1: Use google-auth-library to get token info (validates token)
        // const tokenInfo = await client.getTokenInfo(accessToken);

        // Option 2: Directly fetch user info (validates token and gets profile)
        // This is often simpler for access tokens if we just want profile data
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info from Google');
        }

        const payload = (await response.json()) as any;

        if (!payload || !payload.email) {
            throw new Error('Invalid Google Token payload');
        }

        return {
            email: payload.email,
            googleId: payload.sub,
            name: payload.name,
            picture: payload.picture,
        };
    } catch (error) {
        console.error("Google Token Verification Error:", error);
        throw new Error('Invalid Google Token');
    }
};

export const loginWithGoogle = async (accessToken: string) => {
    const payload = await verifyGoogleToken(accessToken);

    let user = await prisma.user.findUnique({
        where: { email: payload.email.toLowerCase() },
    });

    if (!user) {
        // Create new advertiser user if not exists
        // Note: For admins, we typically don't auto-create. 
        // But for this requirement, we'll auto-create as advertiser.
        // If an admin email matches, it will link automatically.

        user = await prisma.user.create({
            data: {
                email: payload.email.toLowerCase(),
                googleId: payload.googleId || null,
                role: AdminRole.ADVERTISER,
                name: payload.name || payload.email.split('@')[0],
                ownerName: payload.name || payload.email.split('@')[0],
                companyName: payload.name || payload.email.split('@')[0], // Default to name
                status: 'active',
                isActive: true, // Auto-activate for now
                avatar: payload.picture || null
            }
        });
    } else {
        // Link existing user if not linked
        if (!user.googleId) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    googleId: payload.googleId || null,
                    avatar: payload.picture || user.avatar
                }
            });
        }
    }

    const token = createToken(user.id, user.role);

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            companyName: user.companyName || user.name || 'User',
            name: user.name || user.companyName || '',
            phone: user.phone,
            role: user.role,
            avatar: (user as any).avatar
        },
    };
};

export const getUserById = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            companyName: true,
            name: true,
            phone: true,
            role: true,
            status: true,
            ownerName: true,
            address: true,
            gst: true,
            isActive: true,
            customPermissions: true,
            createdAt: true,
            avatar: true,
        } as any,
    });

    if (!user) {
        throw new Error('User not found');
    }

    return user;
};

export const requestPasswordReset = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (user) {
        // Use cryptographically secure random bytes instead of UUID
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry: resetExpiry,
            },
        });

        // In production, send reset link via email (NEVER log the token)
        // TODO: Implement email sending here
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV ONLY] Password reset requested for ${email}`);
        }
    }

    // Always return success to prevent email enumeration
    return { message: 'If an account exists with this email, you will receive reset instructions' };
};

export const resetPassword = async (token: string, newPassword: string) => {
    if (!token || !newPassword) {
        throw new Error('Token and new password are required');
    }

    if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword)) {
        throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
        throw new Error('Password must contain at least one number');
    }

    const user = await prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: {
                gt: new Date(),
            },
        },
    });

    if (!user) {
        throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null,
        },
    });

    return { message: 'Password reset successfully' };
};
