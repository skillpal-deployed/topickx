import { AdminRole, ProjectStatus, PackageState, OptionType } from '@prisma/client';

// Re-export Prisma enums
export { AdminRole, ProjectStatus, PackageState, OptionType };

// ==================== Request Types ====================

export interface UserCreateRequest {
    email: string;
    password: string;
    companyName: string;
    phone?: string;
}

export interface UserLoginRequest {
    email: string;
    password: string;
}

export interface AdminUserCreateRequest {
    email: string;
    password: string;
    name: string;
    role: AdminRole;
    roleId?: string;
    phone?: string;
    customPermissions?: string[];
}

export interface AdminUserUpdateRequest {
    name?: string;
    phone?: string;
    role?: AdminRole;
    roleId?: string;
    customPermissions?: string[];
    isActive?: boolean;
    leadFilters?: any;
    maxLeadsPerDay?: number;
}

export interface AdvertiserCreateRequest {
    email: string;
    password: string;
    companyName: string;
    ownerName: string;
    phone: string;
    address?: string;
    gst?: string;
    notes?: string;
    assignedSalespersonId?: string;
}

export interface AdvertiserUpdateRequest {
    companyName?: string;
    ownerName?: string;
    phone?: string;
    address?: string;
    gst?: string;
    notes?: string;
    assignedSalespersonId?: string;
    status?: string;
}

export interface PackageDefinitionCreateRequest {
    name: string;
    durationMonths: number;
    price: number;
    currency?: string;
    description?: string;
    isActive?: boolean;
}

export interface PackageDefinitionUpdateRequest {
    name?: string;
    durationMonths?: number;
    price?: number;
    currency?: string;
    description?: string;
    isActive?: boolean;
}

export interface PackageRequestCreateRequest {
    packageDefinitionId: string;
}

export interface PaymentConfirmationRequest {
    paymentMode: string;
    transactionReference: string;
    notes?: string;
    amountPaid?: number;
    discount?: number;
    salespersonId?: string | null;
    paymentType?: string;
    pendingAmount?: number;
    paymentDueDate?: Date | string | null;
}

export interface ProjectCreateRequest {
    packageId: string;
    name: string;
    builderName: string;
    city: string;
    locality: string;
    propertyType: string[];
    unitTypes: string[];
    budgetMin: number;
    budgetMax: number;
    highlights: string[];
    amenities: string[];
    images: string[];
    possessionStatus: string;
    reraId?: string;
    address?: string;
    price?: string;
    priceDetails?: string;
    heroImage?: string;
    projectLogo?: string;
    advertiserLogo?: string;
    floorPlans?: any[];
    videoUrl?: string;
    cardImage?: string;
    builderDescription?: string;
    aboutProject?: string;
    disclaimer?: string;
    locationHighlights?: string[];
}

export interface AdminProjectCreateRequest extends ProjectCreateRequest {
    advertiserId: string;
    slug?: string;
    seoTitle?: string;
    seoDescription?: string;
    featuredImage?: string;
    isVisible?: boolean;
    floorPlans?: any[];
    videoUrl?: string;
    cardImage?: string;
    builderDescription?: string;
    aboutProject?: string;
    disclaimer?: string;
    locationHighlights?: string[];
}

export interface ProjectUpdateRequest {
    name?: string;
    builderName?: string;
    city?: string;
    locality?: string;
    propertyType?: string[];
    unitTypes?: string[];
    budgetMin?: number;
    budgetMax?: number;
    highlights?: string[];
    amenities?: string[];
    images?: string[];
    possessionStatus?: string;
    reraId?: string;
    slug?: string;
    seoTitle?: string;
    seoDescription?: string;
    featuredImage?: string;
    isVisible?: boolean;
    floorPlans?: any[];
    videoUrl?: string;
    cardImage?: string;
    builderDescription?: string;
    aboutProject?: string;
    address?: string;
    price?: string;
    priceDetails?: string;
    heroImage?: string;
    projectLogo?: string;
    advertiserLogo?: string;
    disclaimer?: string;
    locationHighlights?: string[];
}

export interface ProjectReviewActionRequest {
    action: 'approve' | 'request_changes' | 'reject';
    comment?: string;
}

export interface LandingPageCreateRequest {
    name: string;
    slug: string;
    pageType: string;
    city: string;
    locality?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    heroImage?: string;
    fbPixelId?: string;
    googleAnalyticsId?: string;
}

export interface LandingPageUpdateRequest {
    name?: string;
    slug?: string;
    pageType?: string;
    city?: string;
    locality?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    heroImage?: string;
    isActive?: boolean;
    fbPixelId?: string;
    googleAnalyticsId?: string;
}

export interface PlacementRequest {
    projectId: string;
    landingPageId: string;
    position?: number;
}

export interface SlotReorderRequest {
    listings: Array<{ projectId: string; position: number }>;
}

export interface InternalNoteCreateRequest {
    advertiserId: string;
    content: string;
    priority?: 'low' | 'normal' | 'high';
}

export interface LeadCreateRequest {
    name: string;
    phone: string;
    email: string;
    projectId?: string; // Optional now
    landingPageId?: string;
    otpVerified?: boolean;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    city?: string;
    location?: string;
    propertyType?: string;
    unitType?: string;
    budget?: string;
}

export interface OptionCreateRequest {
    optionType: OptionType;
    name: string;
    parentId?: string;
    isActive?: boolean;
}

export interface OptionUpdateRequest {
    name?: string;
    isActive?: boolean;
}

export interface OtpSendRequest {
    phone: string;
}

export interface OtpVerifyRequest {
    phone: string;
    otp: string;
}

// ==================== JWT Payload ====================

export interface JwtPayload {
    userId: string;
    role: string;
    exp?: number;
    iat?: number;
}

// ==================== Extended Express Request ====================

import { Request } from 'express';
import { User } from '@prisma/client';
import { ParamsDictionary } from 'express-serve-static-core';

export interface AuthenticatedRequest<P = ParamsDictionary> extends Request<P> {
    user?: User;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// ==================== Permission Constants ====================

export const ALL_PERMISSIONS = [
    'payments',
    'packages',
    'billing',
    'renewals',
    'projects',
    'placements',
    'landing_pages',
    'landing_pages_manage',
    'advertisers',
    'advertisers_view',
    'leads',
    'leads_full',
    'notes',
    'admin_users',
    'audit_logs',
    'public_pages',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
    [AdminRole.SUPER_ADMIN]: ['all'],
    [AdminRole.SUB_ADMIN]: [],
    [AdminRole.ACCOUNTS]: ['payments', 'packages', 'billing', 'renewals', 'advertisers_view'],
    [AdminRole.OPS]: ['projects', 'placements', 'landing_pages', 'advertisers_view'],
    [AdminRole.SALES]: ['advertisers', 'leads', 'leads_full', 'notes', 'advertisers_view'],
    [AdminRole.PRODUCT]: ['landing_pages_manage', 'public_pages', 'advertisers_view'],
    [AdminRole.ADVERTISER]: [],
};

export const ADMIN_ROLES = [
    AdminRole.SUPER_ADMIN,
    AdminRole.SUB_ADMIN,
    AdminRole.ACCOUNTS,
    AdminRole.OPS,
    AdminRole.SALES,
    AdminRole.PRODUCT,
];

// ==================== Budget Ranges ====================

export const BUDGET_RANGES = [
    { label: '₹5 Lakhs', min: 0, max: 500000 },
    { label: '₹10 Lakhs', min: 500000, max: 1000000 },
    { label: '₹25 Lakhs', min: 1000000, max: 2500000 },
    { label: '₹50 Lakhs', min: 2500000, max: 5000000 },
    { label: '₹1 Cr', min: 5000000, max: 10000000 },
    { label: '₹2 Cr', min: 10000000, max: 20000000 },
    { label: '₹5 Cr+', min: 20000000, max: null },
];
