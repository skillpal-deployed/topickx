import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

// SECURITY: JWT_SECRET MUST always be set — no fallback allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}
const SECRET = JWT_SECRET;
const JWT_EXPIRATION_HOURS = parseInt(process.env.JWT_EXPIRATION_HOURS || '24', 10);

export const createToken = (userId: string, role: string): string => {
    const payload: JwtPayload = {
        userId,
        role,
    };

    return jwt.sign(payload, SECRET, {
        expiresIn: `${JWT_EXPIRATION_HOURS}h`,
    });
};

export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, SECRET) as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
    try {
        return jwt.decode(token) as JwtPayload;
    } catch {
        return null;
    }
};
