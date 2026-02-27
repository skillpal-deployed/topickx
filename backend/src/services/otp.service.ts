import prisma from '../utils/prisma';
import { addMinutes } from 'date-fns';

// ==================== OTP Service ====================

/**
 * Generate a random 6-digit OTP
 */
const generateOtp = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to a phone number
 * In development, logs OTP to console. In production, integrate with SMS provider.
 */
export const sendOtp = async (phone: string) => {
    // Validate phone number (10 digits for India)
    const cleanPhone = phone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
        throw new Error('Invalid phone number. Please enter a 10-digit mobile number.');
    }

    // Generate 6-digit OTP
    const otp = generateOtp();
    const expiresAt = addMinutes(new Date(), 5); // 5 minutes expiry

    // Upsert OTP record (replace if exists)
    await prisma.otpRecord.upsert({
        where: { phone: cleanPhone },
        update: {
            otp,
            expiresAt,
            verified: false,
        },
        create: {
            phone: cleanPhone,
            otp,
            expiresAt,
            verified: false,
        },
    });

    // In production, send OTP via SMS provider (MeraOTP)
    // We also send if explicitly enabled or if in production
    const isProduction = process.env.NODE_ENV === 'production';
    // Allow explicitly disabling OTP even in production if ENABLE_OTP is set to 'false'
    const otpEnabled = process.env.ENABLE_OTP === 'false' ? false : (process.env.ENABLE_OTP === 'true' || isProduction);

    if (otpEnabled) {
        try {
            const apiKey = process.env.FAST2SMS_API_KEY;

            if (!apiKey) {
                console.error('FAST2SMS_API_KEY is not set in environment variables. OTP not sent.');
                return;
            }

            const params = new URLSearchParams({
                authorization: apiKey,
                route: 'q',
                message: `Your Topickx verification code is ${otp}`,
                language: 'english',
                flash: '0',
                numbers: cleanPhone
            });

            const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
                method: 'GET'
            });

            const data = await response.json() as any;

            if (!data.return) {
                console.error('Fast2SMS Error for phone ending in', cleanPhone.slice(-4), ':', data.message || data);
            }
            // No success log — avoids any association between phone and OTP in logs
        } catch (error) {
            console.error('SMS Sending System Error:', error instanceof Error ? error.message : 'Unknown error');
        }
    } else {
        // Development mode only: safe to log because no real users are involved
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] OTP for ${cleanPhone}: ${otp}`);
        }
    }

    return { message: 'OTP sent successfully' };
};

/**
 * Verify OTP for a phone number
 */
export const verifyOtp = async (phone: string, otp: string) => {
    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
        throw new Error('Invalid OTP format');
    }

    // Find OTP record
    const record = await prisma.otpRecord.findFirst({
        where: {
            phone: cleanPhone,
            otp: cleanOtp,
        },
    });

    if (!record) {
        throw new Error('Invalid OTP');
    }

    // Check if expired
    if (new Date() > record.expiresAt) {
        throw new Error('OTP has expired. Please request a new one.');
    }

    // Mark as verified
    await prisma.otpRecord.update({
        where: { id: record.id },
        data: { verified: true },
    });

    return { message: 'OTP verified successfully', verified: true };
};

/**
 * Check if a phone number has been recently verified (within 30 minutes)
 */
export const isPhoneVerified = async (phone: string): Promise<boolean> => {
    const cleanPhone = phone.trim();
    const thirtyMinutesAgo = addMinutes(new Date(), -30);

    const record = await prisma.otpRecord.findFirst({
        where: {
            phone: cleanPhone,
            verified: true,
            createdAt: { gte: thirtyMinutesAgo },
        },
    });

    return !!record;
};

/**
 * Clear OTP verification after successful lead submission
 */
export const clearOtpVerification = async (phone: string) => {
    const cleanPhone = phone.trim();
    await prisma.otpRecord.deleteMany({
        where: { phone: cleanPhone },
    });
};
