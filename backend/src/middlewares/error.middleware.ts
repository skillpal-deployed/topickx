import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Prisma known request errors (typed — no cast needed)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const target = (err.meta?.target as string[])?.[0];
            res.status(400).json({
                error: 'A record with this value already exists',
                field: target,
            });
            return;
        }

        if (err.code === 'P2025') {
            res.status(404).json({ error: 'Record not found' });
            return;
        }
    }

    // Validation errors (Zod)
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validation error',
            details: err.issues,
        });
        return;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        res.status(401).json({ error: err.message });
        return;
    }

    // Default error — never expose internals in production
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
};

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        error: `Route ${req.method} ${req.path} not found`,
    });
};
