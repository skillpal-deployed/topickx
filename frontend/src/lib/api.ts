import axios from "axios";

// In the browser, use the env var (which is now /api on production to bypass CORS)
// On the server (Next.js SSR), relative URLs crash Node's fetch, so we MUST use an absolute URL hitting the backend directly
const IS_SERVER = typeof window === "undefined";
const getBaseUrl = () => {
    if (IS_SERVER) {
        // When Next.js is rendering on the server, hit the local backend port directly
        return process.env.NEXT_INTERNAL_BACKEND_URL || "http://127.0.0.1:5000/api";
    }
    // In browser, use the public URL
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error("API Error Response:", error.response.data);
            console.error("API Error Status:", error.response.status);
        }
        if (error.response?.status === 401) {
            // Clear auth data and redirect to login
            if (typeof window !== "undefined") {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

// ==================== Auth API ====================

export const authAPI = {
    login: (email: string, password: string) =>
        api.post("/auth/login", { email, password }),

    register: (data: {
        email: string;
        password: string;
        companyName: string;
        phone?: string;
    }) => api.post("/auth/register", data),

    me: () => api.get("/auth/me"),

    googleLogin: (token: string) => api.post("/auth/google", { token }),

    forgotPassword: (email: string) =>
        api.post("/auth/forgot-password", { email }),

    resetPassword: (token: string, newPassword: string) =>
        api.post("/auth/reset-password", { token, new_password: newPassword }),
};

// ==================== Advertiser API ====================

export const advertiserAPI = {
    // Dashboard
    getDashboard: () => api.get("/advertiser/dashboard"),

    // Package Definitions
    getPackageDefinitions: () => api.get("/advertiser/package-definitions"),

    // Package Requests
    getPackageRequests: () => api.get("/advertiser/package-requests"),
    createPackageRequest: (packageDefinitionId: string, projectId?: string) =>
        api.post("/advertiser/package-request", { packageDefinitionId, projectId }),

    // Packages
    getPackages: () => api.get("/advertiser/packages"),
    getAvailablePackages: () => api.get("/advertiser/available-packages"),
    updatePackageDates: (packageId: string, data: { startDate: string; endDate: string }) =>
        api.put(`/admin/packages/${packageId}/dates`, data),

    // Projects
    getProjects: () => api.get("/advertiser/projects"),
    getProject: (id: string) => api.get(`/advertiser/projects/${id}`),
    createProject: (data: any) => api.post("/advertiser/project", data),
    updateProject: (id: string, data: any) =>
        api.put(`/advertiser/projects/${id}`, data),
    submitProject: (id: string) => api.post(`/advertiser/project/${id}/submit`),

    // Leads
    getDirectLeads: () => api.get("/advertiser/leads"),
    getCommonLeads: (startDate?: string, endDate?: string) =>
        api.get("/advertiser/common-leads", { params: { startDate, endDate } }),
    getServicingLeads: (startDate?: string, endDate?: string) =>
        api.get("/advertiser/servicing-leads", { params: { startDate, endDate } }),

    // Options
    getOptions: (category: string) => api.get(`/advertiser/options/${category}`),

    // Profile
    updateProfile: (data: any) => api.put("/advertiser/profile", data),

    // Billing
    getBilling: () => api.get("/advertiser/billing"),
    getInvoice: (billingId: string) =>
        api.get(`/advertiser/invoice/${billingId}`),
};

// ==================== Admin API ====================

export const adminAPI = {
    // Dashboard
    getDashboard: () => api.get("/admin/dashboard"),

    // Permissions
    getPermissions: () => api.get("/admin/permissions"),

    // File Upload
    uploadFile: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },

    // Admin Users
    getUsers: () => api.get("/admin/users"),
    getUser: (id: string) => api.get(`/admin/users/${id}`),
    createUser: (data: any) => api.post("/admin/users", data),
    updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
    deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
    changeUserPassword: (id: string, password: string) =>
        api.post(`/admin/users/${id}/change-password`, { new_password: password }),

    // Roles
    getRoles: () => api.get("/admin/roles"),
    getRole: (id: string) => api.get(`/admin/roles/${id}`),
    createRole: (data: any) => api.post("/admin/roles", data),
    updateRole: (id: string, data: any) => api.put(`/admin/roles/${id}`, data),
    deleteRole: (id: string) => api.delete(`/admin/roles/${id}`),

    // Options Mapping
    getPropertyUnitMappings: () => api.get('/admin/options/property-types/mappings'),
    updatePropertyUnitMapping: (id: string, unitTypeIds: string[]) =>
        api.put(`/admin/options/${id}/unit-type-mapping`, { unitTypeIds }),


    // Salespeople
    getSalespeople: () => api.get("/admin/salespeople"),

    // Advertisers
    getAdvertisers: (params?: { status?: string; salesperson_id?: string }) =>
        api.get("/admin/advertisers", { params }),
    getAdvertiser: (id: string) => api.get(`/admin/advertisers/${id}`),
    createAdvertiser: (data: any) => api.post("/admin/advertisers", data),
    updateAdvertiser: (id: string, data: any) =>
        api.put(`/admin/advertisers/${id}`, data),
    deleteAdvertiser: (id: string) => api.delete(`/admin/advertisers/${id}`),
    toggleAdvertiserStatus: (id: string) =>
        api.post(`/admin/advertisers/${id}/toggle-status`),
    changeAdvertiserPassword: (id: string, password: string) =>
        api.post(`/admin/advertisers/${id}/change-password`, {
            new_password: password,
        }),
    getAdvertiserPackages: (id: string) =>
        api.get(`/admin/advertisers/${id}/packages`),
    getAdvertiserProjects: (id: string) =>
        api.get(`/admin/advertisers/${id}/projects`),
    getAdvertiserLeads: (id: string) => api.get(`/admin/advertisers/${id}/leads`),
    getAdvertiserBilling: (id: string) =>
        api.get(`/admin/advertisers/${id}/billing`),
    getAdvertiserAvailablePackages: (id: string) =>
        api.get(`/admin/advertisers/${id}/available-packages`),

    // Gap Filling: Notes & Manual Packages
    getAdvertiserNotes: (id: string) => api.get(`/admin/advertisers/${id}/notes`),
    addAdvertiserNote: (id: string, data: any) => api.post(`/admin/advertisers/${id}/notes`, data),
    addPackageToAdvertiser: (id: string, data: any) => api.post(`/admin/advertisers/${id}/packages`, data),

    // Package Definitions
    getPackageDefinitions: (includeInactive?: boolean) =>
        api.get("/admin/package-definitions", {
            params: { include_inactive: includeInactive },
        }),
    getPackageDefinition: (id: string) =>
        api.get(`/admin/package-definitions/${id}`),
    createPackageDefinition: (data: any) =>
        api.post("/admin/package-definitions", data),
    updatePackageDefinition: (id: string, data: any) =>
        api.put(`/admin/package-definitions/${id}`, data),
    deletePackageDefinition: (id: string) =>
        api.delete(`/admin/package-definitions/${id}`),

    // Packages
    updatePackageDates: (packageId: string, data: { startDate: string; endDate: string }) =>
        api.put(`/admin/packages/${packageId}/dates`, data),

    // Payment Requests
    getPaymentRequests: (status?: string) =>
        api.get("/admin/payment-requests", { params: { status } }),
    confirmPayment: (id: string, data: any) =>
        api.post(`/admin/payment-requests/${id}/confirm`, data),
    rejectPayment: (id: string) =>
        api.post(`/admin/payment-requests/${id}/reject`),

    getPendingDues: () => api.get("/admin/payments/pending-dues"),
    recordPayment: (id: string, data: any) =>
        api.post(`/admin/payments/${id}/record`, data),

    // Billing
    getBillingLedger: (advertiserId?: string) =>
        api.get("/admin/billing-ledger", { params: { advertiser_id: advertiserId } }),
    deleteBillingLedger: (id: string) => api.delete(`/admin/billing-ledger/${id}`),
    getInvoice: (billingId: string) => api.get(`/admin/invoice/${billingId}`),

    // Renewals
    getRenewals: (days?: number) =>
        api.get("/admin/renewals", { params: { days } }),

    // Projects
    getProjectsForReview: () => api.get("/admin/projects/review-inbox"),
    getProjects: (params?: {
        status?: string;
        city?: string;
        advertiser_id?: string;
    }) => api.get("/admin/projects", { params }),
    getProject: (id: string) => api.get(`/admin/projects/${id}`),
    createProject: (data: any) => api.post("/admin/projects", data),
    updateProject: (id: string, data: any) =>
        api.put(`/admin/projects/${id}`, data),
    reviewProject: (id: string, data: { action: string; comment?: string }) =>
        api.post(`/admin/projects/${id}/review`, data),
    pauseProject: (id: string) => api.post(`/admin/projects/${id}/pause`),
    resumeProject: (id: string) => api.post(`/admin/projects/${id}/resume`),
    deleteProject: (id: string) => api.delete(`/admin/projects/${id}`),
    reassignProject: (id: string, data: { landing_page_id: string }) =>
        api.post(`/admin/projects/${id}/reassign`, data),

    // Placement Queue
    getPlacementQueue: () => api.get("/admin/placement-queue"),
    placeProject: (data: {
        projectId: string;
        landingPageId: string;
        position?: number;
    }) => api.post("/admin/place-project", data),
    removeProject: (projectId: string) =>
        api.post(`/admin/remove-project/${projectId}`),

    // Landing Pages
    getLandingPages: (params?: { city?: string }) =>
        api.get("/admin/landing-pages", { params }),
    getLandingPage: (id: string) => api.get(`/admin/landing-pages/${id}`),
    createLandingPage: (data: any) => api.post("/admin/landing-pages", data),
    updateLandingPage: (id: string, data: any) =>
        api.put(`/admin/landing-pages/${id}`, data),
    deleteLandingPage: (id: string) => api.delete(`/admin/landing-pages/${id}`),
    reorderSlots: (id: string, data: any) =>
        api.post(`/admin/landing-pages/${id}/reorder`, data),
    replaceSlot: (id: string, slot: number, newProjectId: string) =>
        api.post(`/admin/landing-pages/${id}/replace-slot`, null, {
            params: { slot, new_project_id: newProjectId },
        }),

    // Facebook Integration
    updateLandingPageFacebookSettings: (id: string, data: {
        fb_ad_account_id?: string;
        fb_page_id?: string;
        fb_access_token?: string;
    }) => api.patch(`/admin/landing-pages/${id}/facebook-settings`, data),

    addLandingPageFacebookForm: (id: string, data: {
        formId: string;
        name: string;
    }) => api.post(`/admin/landing-pages/${id}/facebook-forms`, data),

    removeLandingPageFacebookForm: (lpId: string, formId: string) =>
        api.delete(`/admin/landing-pages/${lpId}/facebook-forms/${formId}`),

    // Leads
    getLeads: (params?: {
        project_id?: string;
        landing_page_id?: string;
        start_date?: string;
        end_date?: string;
        limit?: number;
        offset?: number;
        sourceType?: 'direct' | 'common' | 'all';
    }) => api.get("/admin/leads", { params }),

    uploadLeads: (data: { leads: any[], projectId: string, landingPageId?: string, assignedToId?: string }) =>
        api.post('/admin/leads/upload', data),

    // Audit Logs
    getAuditLogs: (params?: {
        userId?: string;
        action?: string;
        start_date?: string;
        end_date?: string;
        limit?: number;
        offset?: number;
        page?: number;
    }) => {
        const p = params || {};
        const limit = p.limit || 50;
        const page = p.page || 1;
        const offset = p.offset !== undefined ? p.offset : (page - 1) * limit;

        return api.get("/admin/audit-logs", { params: { ...p, limit, offset } });
    },

    // Options
    getOptions: (optionType: string, params?: { include_inactive?: boolean; parent_id?: string }) =>
        api.get(`/admin/options/${optionType}`, { params }),
    createOption: (data: any) => api.post("/admin/options", data),
    updateOption: (id: string, data: any) => api.put(`/admin/options/${id}`, data),
    deleteOption: (id: string) => api.delete(`/admin/options/${id}`),

    // Expiry Check
    runExpiryCheck: () => api.post("/admin/run-expiry-check"),

    // Analytics
    getPerformance: (startDate?: string, endDate?: string, advertiserId?: string, type?: string, projectName?: string) =>
        api.get("/analytics/admin/performance", { params: { startDate, endDate, advertiserId, type, projectName } }),

};

// ==================== Public API ====================

export const publicAPI = {
    getLandingPages: () => api.get("/landing-pages"),
    getLandingPage: (slug: string) => api.get(`/landing-page/${slug}`),
    getProject: (id: string) => api.get(`/projects/${id}`),
    getProjectBySlug: (slug: string) => api.get(`/project/${slug}`),
    getOptions: () => api.get("/options"),
    getStats: () => api.get("/stats"),
    getProjectPreview: (id: string) => api.get(`/project-preview/${id}`),
    submitLead: (data: {
        name: string;
        phone: string;
        email: string;
        projectId?: string;
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
    }) => api.post("/leads", data),

    sendOtp: (phone: string) => api.post("/send-otp", { phone }),

    verifyOtp: (phone: string, otp: string) => api.post("/verify-otp", { phone, otp }),

    recordVisit: (data: { landingPageId?: string; projectId?: string }) =>
        api.post("/analytics/visit", data),

    getPropertyUnitMappings: () => api.get("/options/property-unit-mappings"),
};

export const analyticsAPI = {
    getPerformance: (startDate?: string, endDate?: string) =>
        api.get("/analytics/performance", { params: { startDate, endDate } }),
};

// ==================== Upload API ====================

export const uploadAPI = {
    uploadFile: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    uploadFiles: (files: File[]) => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        return api.post("/upload/multiple", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
};

export default api;
