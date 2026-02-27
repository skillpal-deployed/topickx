import { Router } from 'express';
import * as authService from '../services/auth.service';
import { authenticate } from '../middlewares/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const result = await authService.registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Email already registered') {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const result = await authService.loginUser(req.body);
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Invalid credentials' || error.message.includes('Google Login')) {
                res.status(401).json({ error: error.message });
                return;
            }
        }
        next(error);
    }
});

// POST /api/auth/google
router.post('/google', async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ error: 'Google ID Token is required' });
            return;
        }
        const result = await authService.loginWithGoogle(token);
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(401).json({ error: error.message });
            return;
        }
        next(error);
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const user = (req as AuthenticatedRequest).user!;
        res.json({
            id: user.id,
            email: user.email,
            companyName: user.companyName || user.name || 'Admin',
            name: user.name || user.companyName || '',
            phone: user.phone,
            role: user.role,
            avatar: user.avatar,
            userRole: user.userRole ? {
                name: user.userRole.name,
                permissions: user.userRole.permissions
            } : undefined,
            permissions: user.userRole?.permissions || [],
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        const result = await authService.requestPasswordReset(email);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, new_password } = req.body;
        const result = await authService.resetPassword(token, new_password);
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
            return;
        }
        next(error);
    }
});

export default router;
