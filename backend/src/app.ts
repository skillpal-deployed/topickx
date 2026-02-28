import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import compression from 'compression';

// Load environment variables
dotenv.config();

import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import advertiserRoutes from './routes/advertiser.routes';
import adminRoutes from './routes/admin.routes';
import publicRoutes from './routes/public.routes';
import uploadRoutes from './routes/upload.routes';
import analyticsRoutes from './routes/analytics.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

// Trust first proxy (for apps behind nginx/reverse proxy)
// This is required for express-rate-limit to work correctly
app.set('trust proxy', 1);

// ==================== Middleware ====================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false, // Must be disabled for Google OAuth popup window.opener to work
    contentSecurityPolicy: false, // Next.js frontend manages its own CSP
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// GZIP Compression for better performance (reduces payload by 60-70%)
app.use(compression());

// CORS configuration - use environment variables for production domains
const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.ADDITIONAL_ORIGIN,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
].filter(Boolean) as string[];

// Only add production domains if not already covered by env vars
if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_DOMAIN) {
    allowedOrigins.push(`https://${process.env.PRODUCTION_DOMAIN}`);
    allowedOrigins.push(`https://www.${process.env.PRODUCTION_DOMAIN}`);
}

app.use(cors({
    origin: (origin, callback) => {
        // In production, block requests with no Origin header (CSRF protection)
        if (!origin) {
            if (process.env.NODE_ENV === 'production') {
                return callback(null, false); // Graceful reject instead of Error throw (prevents 500)
            }
            // Allow no-origin requests in development (Postman, curl, etc.)
            return callback(null, true);
        }

        // Always securely allow topickx.com domains to prevent auth-popup CORS failures
        if (
            allowedOrigins.includes(origin) ||
            origin.endsWith('.topickx.com') ||
            origin === 'https://topickx.com'
        ) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, false); // Graceful reject instead of Error throw
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsing — exclude /api/webhooks so the raw body is preserved for HMAC verification
// The webhook router applies its own express.raw() middleware for signature checking.
const jsonParser = express.json({ limit: '2mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '2mb' });

app.use((req, res, next) => {
    if (req.path.startsWith('/api/webhooks')) {
        return next(); // Skip JSON parsing for webhooks — handled in webhook.routes.ts
    }
    jsonParser(req, res, (err) => {
        if (err) return next(err);
        urlencodedParser(req, res, next);
    });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== Routes ====================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes

// Rate limiting for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Reduced to 30 requests per window
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for OTP endpoints (prevent OTP spam/brute-force)
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // 3 OTP requests per minute per IP
    message: { error: 'Too many OTP requests, please wait before trying again' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limit (prevent DDoS)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/advertiser', generalLimiter, advertiserRoutes);
app.use('/api/admin', generalLimiter, adminRoutes);
app.use('/api/upload', generalLimiter, uploadRoutes);
app.use('/api/analytics', generalLimiter, analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api', generalLimiter, publicRoutes);

// ==================== Error Handling ====================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
