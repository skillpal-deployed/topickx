"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    MapPin,
    Building2,
    Home,
    BedDouble,
    IndianRupee,
    Search,
    Shield,
    Star,
    CheckCircle2,
    ArrowRight,
    Phone,
    Mail,
    User,
    X,
    CheckCircle,
    Clock,
    TrendingUp,
    Timer,
    Verified,
    Filter,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { publicAPI, api } from "@/lib/api";
import { getImageUrl, formatBudgetRange } from "@/lib/utils";
import { OtpInput } from "@/components/ui/otp-input";
import { UNIT_TYPES_BY_PROPERTY } from "@/lib/constants";

const BUDGET_OPTIONS = [
    { label: "Any Budget", value: "any" },
    { label: "₹20 Lakhs", value: "2000000" },
    { label: "₹50 Lakhs", value: "5000000" },
    { label: "₹75 Lakhs", value: "7500000" },
    { label: "₹1 Cr", value: "10000000" },
    { label: "₹1.5 Cr", value: "15000000" },
    { label: "₹2 Cr", value: "20000000" },
    { label: "₹3 Cr", value: "30000000" },
    { label: "₹5 Cr", value: "50000000" },
];

interface Project {
    id: string;
    name: string;
    slug: string;
    builderName: string;
    city: string;
    locality: string;
    propertyType: string | string[];
    unitTypes: string[];
    budgetMin: number;
    budgetMax: number;
    featuredImage?: string;
    heroImage?: string;
    cardImage?: string;
    reraId?: string;
    projectLogo?: string;
    advertiserLogo?: string;
    images?: string[];
    usp1?: string;
    usp2?: string;
}

export interface LandingPageData {
    id: string;
    name: string;
    slug: string;
    city: string;
    locality?: string;
    description?: string;
    projects: Project[];
    heroImage?: string;
    pageType?: string;
    seoTitle?: string;
    seoDescription?: string;
    fbPixelId?: string;
    googleAnalyticsId?: string;
}

export default function PublicLandingPage({ initialData }: { initialData: LandingPageData | null }) {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string;

    const [landingPage, setLandingPage] = useState<LandingPageData | null>(initialData);
    const [loading, setLoading] = useState(!initialData);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [leadSubmitted, setLeadSubmitted] = useState(false);
    const [advertiserContact, setAdvertiserContact] = useState<any>(null);

    // Dynamic property-unit type mappings
    const [propertyUnitMappings, setPropertyUnitMappings] = useState<Record<string, string[]>>({});
    const [mappingsLoaded, setMappingsLoaded] = useState(false);

    // Filters
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
    const [unitTypeFilter, setUnitTypeFilter] = useState("all");
    const [localityFilter, setLocalityFilter] = useState("all");
    const [budgetMinFilter, setBudgetMinFilter] = useState("any");
    const [budgetMaxFilter, setBudgetMaxFilter] = useState("any");
    const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "" });

    // OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otp, setOtp] = useState("");
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);

    // Mandatory Lead Form State
    const [showMandatoryForm, setShowMandatoryForm] = useState(false);
    const [mandatoryForm, setMandatoryForm] = useState({
        name: "",
        phone: "",
        email: "",
        propertyType: "",
        unitType: "",
        budgetMin: "",
        budgetMax: "",
        location: ""
    });
    const [mOtpSent, setMOtpSent] = useState(false);
    const [mOtpVerified, setMOtpVerified] = useState(false);
    const [mOtp, setMOtp] = useState("");
    const [mSendingOtp, setMSendingOtp] = useState(false);
    const [mVerifyingOtp, setMVerifyingOtp] = useState(false);
    const [mOtpTimer, setMOtpTimer] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (mOtpTimer > 0) {
            interval = setInterval(() => setMOtpTimer((prev) => prev - 1), 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [mOtpTimer]);

    useEffect(() => {
        if (!initialData) {
            async function fetchLandingPage() {
                try {
                    const response = await publicAPI.getLandingPage(slug);
                    setLandingPage(response.data);
                } catch (error) {
                    console.error("Error fetching landing page:", error);
                    // Handle 404 or redirect
                } finally {
                    setLoading(false);
                }
            }
            fetchLandingPage();
        }
    }, [slug, initialData]);

    useEffect(() => {
        if (landingPage) {
            // Ping view counter once client-side (avoids SSR double-count)
            api.post(`/landing-page/${landingPage.slug}/view`).catch(() => { });

            // Check if user has already submitted lead for this LP (persists across reloads)
            const hasSubmitted = localStorage.getItem(`lp_lead_submitted_${landingPage.id}`);
            if (!hasSubmitted) {
                setShowMandatoryForm(true);
                // Pre-fill city if available
                if (landingPage.city) {
                    setMandatoryForm(prev => ({ ...prev, city: landingPage.city }));
                }
            }
        }
    }, [landingPage]);

    // Initialize per-landing-page tracking pixels via useEffect.
    // This is the only reliable approach — <Script> tags inside SSR-rendered components
    // can be skipped by Next.js hydration if the script id was already seen. useEffect
    // always runs client-side after hydration, guaranteeing pixel initialization.
    useEffect(() => {
        if (!landingPage) return;

        // ── Facebook Pixel ──────────────────────────────────────────────
        if (landingPage.fbPixelId) {
            // Strip all non-numeric characters and validate — must be at least 10 digits.
            // Guards against DB values like "", "null", "undefined", or accidental text.
            const pixelId = landingPage.fbPixelId.replace(/[^0-9]/g, '');
            if (pixelId && pixelId.length >= 10) {
                const initFbPixel = () => {
                    if (typeof window.fbq === 'function') {
                        window.fbq('init', pixelId);
                        window.fbq('track', 'PageView');
                    }
                };

                if (typeof window.fbq === 'function') {
                    // fbevents.js already loaded — init immediately
                    initFbPixel();
                } else {
                    // Wait for fbevents.js to finish loading (it's async from layout.tsx)
                    const interval = setInterval(() => {
                        if (typeof window.fbq === 'function') {
                            clearInterval(interval);
                            initFbPixel();
                        }
                    }, 50);
                    // Stop polling after 5 seconds to avoid memory leak
                    setTimeout(() => clearInterval(interval), 5000);
                }
            } else {
                console.warn('[FB Pixel] Skipped init — invalid pixel ID in DB:', landingPage.fbPixelId);
            }
        }

        // ── Google Analytics ────────────────────────────────────────────
        if (landingPage.googleAnalyticsId) {
            const gaId = landingPage.googleAnalyticsId.trim();
            if (gaId) {
                const initGtag = () => {
                    window.dataLayer = window.dataLayer || [];
                    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
                    window.gtag('config', gaId);
                };

                // Load gtag.js for this property if not already loaded
                const scriptId = `gtag-lp-js-${gaId}`;
                if (!document.getElementById(scriptId)) {
                    const script = document.createElement('script');
                    script.id = scriptId;
                    script.async = true;
                    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
                    script.onload = initGtag;
                    document.head.appendChild(script);
                } else {
                    initGtag();
                }
            }
        }
    }, [landingPage?.id, landingPage?.fbPixelId, landingPage?.googleAnalyticsId]);

    // OTP Timers
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (otpTimer > 0) {
            interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [otpTimer]);

    const handleSendMOtp = async () => {
        if (!mandatoryForm.phone || mandatoryForm.phone.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        setMSendingOtp(true);
        try {
            await publicAPI.sendOtp(mandatoryForm.phone);
            setMOtpSent(true);
            setMOtpTimer(60);
            toast.success("OTP sent to your phone");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to send OTP");
        } finally {
            setMSendingOtp(false);
        }
    };

    const handleVerifyMOtp = async () => {
        if (!mOtp || mOtp.length !== 6) {
            toast.error("Please enter the 6-digit OTP");
            return;
        }

        setMVerifyingOtp(true);
        try {
            await publicAPI.verifyOtp(mandatoryForm.phone, mOtp);
            setMOtpVerified(true);
            toast.success("Phone verified successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Invalid OTP");
        } finally {
            setMVerifyingOtp(false);
        }
    };

    const handleMandatorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mandatoryForm.name.trim()) { toast.error("Please enter your name"); return; }
        if (!/^[0-9]{10}$/.test(mandatoryForm.phone)) { toast.error("Please enter a valid 10-digit phone number"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mandatoryForm.email)) { toast.error("Please enter a valid email address"); return; }
        if (!mandatoryForm.propertyType) { toast.error("Please select a project type"); return; }
        if (!mandatoryForm.unitType) { toast.error("Please select a configuration"); return; }
        if (!mandatoryForm.budgetMin) { toast.error("Please select min budget"); return; }
        if (!mandatoryForm.budgetMax) { toast.error("Please select max budget"); return; }
        if (!mandatoryForm.location) { toast.error("Please select a location"); return; }

        if (!mOtpVerified) {
            toast.error("Please verify your phone number with OTP first");
            return;
        }

        setSubmitting(true);
        try {
            await publicAPI.submitLead({
                ...mandatoryForm,
                budget: `${mandatoryForm.budgetMin} - ${mandatoryForm.budgetMax}`,
                city: landingPage?.city,
                landingPageId: landingPage?.id || "",
                utmSource: searchParams.get("utm_source") || undefined,
                utmMedium: searchParams.get("utm_medium") || undefined,
                utmCampaign: searchParams.get("utm_campaign") || undefined,
            });
            // Fire conversion events for Meta Pixel and Google Analytics
            if (typeof window !== 'undefined') {
                if (window.fbq) window.fbq('track', 'Lead');
                if (window.gtag) window.gtag('event', 'generate_lead', { currency: 'INR' });
            }
            toast.success("Thank you! You can now browse the projects.");
            localStorage.setItem(`lp_lead_submitted_${landingPage?.id}`, "true");
            setShowMandatoryForm(false);
        } catch (error) {
            toast.error("Failed to submit. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendOtp = async () => {
        if (!leadForm.phone || leadForm.phone.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        setSendingOtp(true);
        try {
            await publicAPI.sendOtp(leadForm.phone);
            setOtpSent(true);
            setOtpTimer(60);
            toast.success("OTP sent to your phone");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to send OTP");
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            toast.error("Please enter the 6-digit OTP");
            return;
        }

        setVerifyingOtp(true);
        try {
            await publicAPI.verifyOtp(leadForm.phone, otp);
            setOtpVerified(true);
            toast.success("Phone verified successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Invalid OTP");
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadForm.name || !leadForm.phone || !leadForm.email) {
            toast.error("Please fill in all details");
            return;
        }

        if (!otpVerified) {
            toast.error("Please verify your phone number first");
            return;
        }

        setSubmitting(true);
        try {
            const response = await publicAPI.submitLead({
                ...leadForm,
                projectId: selectedProject?.id,
                landingPageId: landingPage?.id,
                otpVerified: true,
                utmSource: searchParams.get("utm_source") || undefined,
                utmMedium: searchParams.get("utm_medium") || undefined,
                utmCampaign: searchParams.get("utm_campaign") || undefined,
            });
            setLeadSubmitted(true);
            // Fire conversion events for Meta Pixel and Google Analytics
            if (typeof window !== 'undefined') {
                if (window.fbq) window.fbq('track', 'Lead', { content_name: selectedProject?.name, currency: 'INR' });
                if (window.gtag) window.gtag('event', 'generate_lead', { content_name: selectedProject?.name, currency: 'INR' });
            }
            // Use actual advertiser contact returned by the backend
            setAdvertiserContact(
                response.data.advertiserContact || {
                    companyName: selectedProject?.builderName,
                    phone: "",
                    email: ""
                }
            );
            toast.success("Enquiry submitted successfully!");
        } catch (error) {
            console.error("Error submitting lead:", error);
            toast.error("Failed to submit enquiry");
        } finally {
            setSubmitting(false);
        }
    };


    const openLeadForm = (project: Project) => {
        setSelectedProject(project);
        setShowLeadForm(true);
    };

    // Extract unique property types and localities from projects
    const { propertyTypes, localities } = useMemo(() => {
        if (!landingPage?.projects) return { propertyTypes: [], localities: [] };

        const propTypes = new Set<string>();
        const locs = new Set<string>();

        landingPage.projects.forEach(p => {
            if (p.propertyType) {
                if (Array.isArray(p.propertyType)) {
                    p.propertyType.forEach(pt => propTypes.add(pt));
                } else {
                    propTypes.add(p.propertyType);
                }
            }
            if (p.locality) locs.add(p.locality);
        });

        return {
            propertyTypes: Array.from(propTypes).sort(),
            localities: Array.from(locs).sort()
        };
    }, [landingPage]);

    // Fetch property-unit type mappings on mount
    useEffect(() => {
        publicAPI.getPropertyUnitMappings()
            .then((res: any) => {
                setPropertyUnitMappings(res.data);
                setMappingsLoaded(true);
            })
            .catch((err: any) => {
                console.error('Failed to load property-unit mappings, using fallback', err);
                // Fallback to hardcoded constants if API fails
                setPropertyUnitMappings(UNIT_TYPES_BY_PROPERTY);
                setMappingsLoaded(true);
            });
    }, []);

    // Get available unit types based on selected property type
    const availableUnitTypes = useMemo(() => {
        if (!mappingsLoaded) return []; // Wait for mappings to load

        if (propertyTypeFilter === "all") {
            // Show all unit types from all projects
            const allUnits = new Set<string>();
            landingPage?.projects.forEach(p => {
                if (p.unitTypes) p.unitTypes.forEach(u => allUnits.add(u));
            });
            return Array.from(allUnits).sort();
        }

        // Use dynamic mapping, fallback to empty if not found
        return propertyUnitMappings[propertyTypeFilter] || [];
    }, [propertyTypeFilter, landingPage, propertyUnitMappings, mappingsLoaded]);

    // Reset unit type filter if it becomes invalid
    useEffect(() => {
        if (unitTypeFilter !== "all" && !availableUnitTypes.includes(unitTypeFilter)) {
            setUnitTypeFilter("all");
        }
    }, [availableUnitTypes, unitTypeFilter]);

    // Get available unit types for mandatory form based on selected property type
    const mandatoryFormAvailableUnitTypes = useMemo(() => {
        if (!mandatoryForm.propertyType) {
            // Show all unit types if no property type selected
            const allUnits = new Set<string>();
            landingPage?.projects.forEach(p => {
                if (p.unitTypes) p.unitTypes.forEach(u => allUnits.add(u));
            });
            return Array.from(allUnits).sort();
        }

        // Show only unit types valid for the selected property type
        return UNIT_TYPES_BY_PROPERTY[mandatoryForm.propertyType] || [];
    }, [mandatoryForm.propertyType, landingPage]);

    // Reset unit type in mandatory form if it becomes invalid
    useEffect(() => {
        if (mandatoryForm.unitType && !mandatoryFormAvailableUnitTypes.includes(mandatoryForm.unitType)) {
            setMandatoryForm({ ...mandatoryForm, unitType: "" });
        }
    }, [mandatoryFormAvailableUnitTypes, mandatoryForm]);

    // Filtered projects
    const filteredProjects = useMemo(() => {
        if (!landingPage?.projects) return [];
        let filtered = [...landingPage.projects];

        if (propertyTypeFilter !== "all") {
            filtered = filtered.filter((p) => {
                if (Array.isArray(p.propertyType)) {
                    return p.propertyType.includes(propertyTypeFilter);
                }
                return p.propertyType === propertyTypeFilter;
            });
        }
        if (unitTypeFilter !== "all") {
            filtered = filtered.filter((p) => p.unitTypes?.some(u => u === unitTypeFilter));
        }
        if (localityFilter !== "all") {
            filtered = filtered.filter((p) => p.locality === localityFilter);
        }
        if (budgetMinFilter !== "any") {
            const minVal = parseInt(budgetMinFilter);
            filtered = filtered.filter((p) => (p.budgetMax || 0) >= minVal);
        }
        if (budgetMaxFilter !== "any") {
            const maxVal = parseInt(budgetMaxFilter);
            filtered = filtered.filter((p) => (p.budgetMin || 0) <= maxVal);
        }

        return filtered;
    }, [landingPage, propertyTypeFilter, unitTypeFilter, localityFilter, budgetMinFilter, budgetMaxFilter]);

    const hasActiveFilters = propertyTypeFilter !== "all" || unitTypeFilter !== "all" || localityFilter !== "all" || budgetMinFilter !== "any" || budgetMaxFilter !== "any";

    const clearFilters = () => {
        setPropertyTypeFilter("all");
        setUnitTypeFilter("all");
        setLocalityFilter("all");
        setBudgetMinFilter("any");
        setBudgetMaxFilter("any");
    };

    const showLocationFilter = !landingPage?.locality;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (!landingPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-bg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-800">Landing Page Not Found</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-bg" data-testid="public-landing-page">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-emerald-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="relative h-12 w-12 overflow-visible">
                            <Image
                                src="/icon.jpeg"
                                alt="Topickx Logo"
                                fill
                                className="object-contain scale-[4] origin-left"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowMandatoryForm(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full px-6 shadow-md shadow-emerald-600/10"
                    >
                        Enquire Now
                    </Button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative bg-[#022c22] overflow-hidden min-h-[auto] md:min-h-[600px] flex flex-col items-center justify-center pt-16 pb-12 md:pt-20 md:pb-32">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop"
                        alt="Green Living Room"
                        className="w-full h-full object-cover blur-[1px] scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#022c22]/95 via-[#064e3b]/85 to-[#022c22]/60"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 flex flex-col items-center text-center">
                    <div className="max-w-4xl mx-auto">
                        {/* Location Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 md:px-6 md:py-2.5 rounded-full bg-[#022c22]/60 backdrop-blur-md border border-teal-500/30 text-teal-50 text-xs md:text-sm font-medium mb-3 md:mb-8 shadow-xl">
                            <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-300" />
                            {landingPage.city}
                            {landingPage.locality && ` • ${landingPage.locality}`}
                        </div>

                        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-3 md:mb-8 leading-tight drop-shadow-2xl shadow-black tracking-tight">
                            {landingPage.name}
                        </h1>

                        {landingPage.description && (
                            <p className="text-sm sm:text-base md:text-xl text-emerald-50 max-w-2xl md:max-w-3xl mx-auto mb-4 md:mb-12 leading-relaxed font-normal drop-shadow-md text-balance">
                                {landingPage.description}
                            </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-center gap-3 md:gap-8 text-white mb-6 md:mb-16 px-4">
                            <div className="flex items-center gap-2 md:gap-3 bg-[#022c22]/40 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl backdrop-blur-sm border border-teal-500/20">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-teal-500/20 flex items-center justify-center">
                                    <Building2 className="w-4 h-4 md:w-5 md:h-5 text-teal-100" />
                                </div>
                                <div className="text-left">
                                    <p className="text-base md:text-xl font-bold leading-none">{landingPage.projects?.length || 0}</p>
                                    <p className="text-[10px] md:text-xs text-teal-100/90 font-medium">Projects</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 md:gap-3 bg-[#022c22]/40 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl backdrop-blur-sm border border-teal-500/20">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-teal-500/20 flex items-center justify-center">
                                    <Star className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400" />
                                </div>
                                <div className="text-left">
                                    <p className="text-base md:text-xl font-bold leading-none">Top</p>
                                    <p className="text-[10px] md:text-xs text-teal-100/90 font-medium">Builders</p>
                                </div>
                            </div>
                        </div>

                        {/* Filter Bar Inside Hero */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-950/20 p-3 sm:p-4 border border-white/20 mx-auto w-full max-w-5xl backdrop-blur-sm bg-white/95 transition-all duration-300">
                            {/* Mobile Filter Toggle */}
                            <button
                                onClick={() => setShowMobileFilters(!showMobileFilters)}
                                className="lg:hidden flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                        <Filter className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-semibold text-slate-800 block">Search Filters</span>
                                        {hasActiveFilters && (
                                            <span className="text-[10px] text-emerald-600 font-medium">Filters Active</span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${showMobileFilters ? 'rotate-90' : ''}`} />
                            </button>

                            <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:grid grid-cols-1 sm:grid-cols-2 ${showLocationFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3 items-end text-left animate-in slide-in-from-top-2 lg:animate-none`}>
                                {/* Location Filter */}
                                {showLocationFilter && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider ml-1">Location</Label>
                                        <Select value={localityFilter} onValueChange={setLocalityFilter}>
                                            <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl font-medium text-slate-700 text-sm">
                                                <MapPin className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                                <SelectValue placeholder="All Localities" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Locations</SelectItem>
                                                {localities.map((loc) => (
                                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Project Type */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider ml-1">Project Type</Label>
                                    <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl font-medium text-slate-700 text-sm">
                                            <Home className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                            <SelectValue placeholder="All Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            {propertyTypes.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Unit Type / Configuration */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider ml-1">Configuration</Label>
                                    <Select value={unitTypeFilter} onValueChange={setUnitTypeFilter}>
                                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl font-medium text-slate-700 text-sm">
                                            <BedDouble className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                            <SelectValue placeholder="All BHK" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Configurations</SelectItem>
                                            {availableUnitTypes.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Budget Min */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider ml-1">Min Budget</Label>
                                    <Select value={budgetMinFilter} onValueChange={setBudgetMinFilter}>
                                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl font-medium text-slate-700 text-sm">
                                            <IndianRupee className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                            <SelectValue placeholder="Min" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BUDGET_OPTIONS.map((opt) => (
                                                <SelectItem key={`min-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Budget Max */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider ml-1">Max Budget</Label>
                                    <Select value={budgetMaxFilter} onValueChange={setBudgetMaxFilter}>
                                        <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl font-medium text-slate-700 text-sm">
                                            <IndianRupee className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                            <SelectValue placeholder="Max" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BUDGET_OPTIONS.map((opt) => (
                                                <SelectItem key={`max-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Clear Filters / Results */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider ml-1">Action</Label>
                                    {hasActiveFilters ? (
                                        <Button
                                            variant="outline"
                                            onClick={clearFilters}
                                            className="w-full h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 font-bold bg-slate-50 text-sm"
                                        >
                                            <X className="w-3.5 h-3.5 mr-2" />
                                            Clear
                                        </Button>
                                    ) : (
                                        <Button className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border-0 text-sm shadow-inner">
                                            {filteredProjects.length} Projects
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Results Header */}
            <section className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-6 bg-emerald-600 rounded-full"></div>
                            <h2 className="font-bold text-slate-900">
                                {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'} Found
                            </h2>
                            {hasActiveFilters && (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                    Filtered
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 hidden sm:flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Showing verified projects
                        </p>
                    </div>
                </div>
            </section>

            {/* Projects Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {filteredProjects.length > 0 && (
                    <div className="mb-16">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredProjects.map((project) => {
                                // Check if this project was in the original first 3 (featured)
                                const originalIndex = landingPage.projects.findIndex(p => p.id === project.id);
                                const isFeatured = originalIndex >= 0 && originalIndex < 3;

                                return (
                                    <div
                                        key={project.id}
                                        onClick={() => window.location.href = `/project/${project.slug || project.id}?lp=${landingPage.id}`}
                                        className={`group rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 max-w-sm mx-auto w-full ${isFeatured
                                            ? "bg-[#F2F8FC] shadow-xl border-2 border-amber-400 ring-4 ring-amber-400/20 hover:shadow-2xl hover:shadow-amber-100 scale-[1.01] hover:scale-[1.02]"
                                            : "bg-white shadow-sm border border-slate-100 ring-1 ring-slate-100 hover:shadow-lg hover:border-emerald-600/30"
                                            }`}
                                    >
                                        {/* Image */}
                                        <div className="aspect-[4/3] md:aspect-[4/3] relative overflow-hidden bg-slate-100">
                                            {isFeatured && (
                                                <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1 md:py-1.5 bg-black/80 text-white text-[9px] md:text-[10px] font-bold rounded-full shadow-2xl border border-white/10 uppercase tracking-[0.12em] backdrop-blur-md">
                                                    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-400 fill-yellow-400" />
                                                    Featured Project
                                                </div>
                                            )}
                                            {/* USP Badges - Moved to content below */}

                                            {(project.cardImage || project.featuredImage) ? (
                                                <Image
                                                    src={getImageUrl(project.cardImage || project.featuredImage)}
                                                    alt={project.name}
                                                    fill
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Building2 className="w-12 h-12 text-slate-300" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                            {/* Overlay Stats */}
                                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                                                    View Details
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-4 md:p-5 flex flex-col flex-1">
                                            <div className="mb-2 md:mb-3">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                                                        {project.name}
                                                    </h3>
                                                    <p className="font-bold text-emerald-600 text-base whitespace-nowrap">
                                                        {formatBudgetRange(project.budgetMin, project.budgetMax)}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2">by <span className="font-medium text-slate-700">{project.builderName}</span></p>
                                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="truncate">
                                                        {project.locality}, {project.city}
                                                    </span>
                                                </div>

                                                {/* Relocated USPs */}
                                                {(project.usp1 || project.usp2) && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                        {project.usp1 && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-100 uppercase tracking-tight">
                                                                <Star className="w-2.5 h-2.5 mr-1 fill-current" />
                                                                {project.usp1?.substring(0, 50)}
                                                            </span>
                                                        )}
                                                        {project.usp2 && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100 uppercase tracking-tight">
                                                                <Verified className="w-2.5 h-2.5 mr-1" />
                                                                {project.usp2?.substring(0, 50)}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 md:gap-3 py-2 md:py-3 border-t border-slate-50 text-xs text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <BedDouble className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="font-medium">{project.unitTypes.join(", ")}</span>
                                                </div>
                                                <div className="w-px h-3 bg-slate-200"></div>
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span>{Array.isArray(project.propertyType) ? project.propertyType[0] : project.propertyType}</span>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-2 md:pt-3 flex gap-2">
                                                <Button
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg h-8 md:h-9 text-xs md:text-sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        openLeadForm(project);
                                                    }}
                                                >
                                                    Enquire Now
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 rounded-lg h-8 md:h-9 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-xs md:text-sm"
                                                >
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Trust Indicators */}
            <section className="bg-white border-t border-slate-100 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 gap-8">
                        {[
                            { icon: CheckCircle, title: 'Top Projects', desc: 'Curated Developers' },
                            { icon: TrendingUp, title: 'Best Deals', desc: 'Exclusive Offers' },
                            { icon: Phone, title: 'Free Expert Help', desc: 'Talk to an Advisor' },
                        ].map((item, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <item.icon className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mandatory Lead Form — Slide-in Sidebar */}
            {/* Backdrop */}
            {showMandatoryForm && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300"
                    onClick={() => setShowMandatoryForm(false)}
                />
            )}

            {/* Sidebar Panel */}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${showMandatoryForm ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Sidebar Header */}
                <div className="bg-emerald-900 px-6 py-5 flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Home className="w-5 h-5 text-emerald-400" />
                            <span className="font-bold text-white text-sm tracking-tight">Topickx</span>
                        </div>
                        <h2 className="text-xl font-bold text-white leading-tight">Find Your Perfect Home</h2>
                        <p className="text-emerald-200 text-xs mt-1">in {landingPage?.city} · Tell us what you're looking for</p>
                    </div>
                    <button
                        onClick={() => setShowMandatoryForm(false)}
                        className="mt-1 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>


                {/* Scrollable Form */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <form onSubmit={handleMandatorySubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">City</Label>
                                <Input value={landingPage?.city || ''} disabled className="bg-slate-50 border-slate-200 h-10 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</Label>
                                {localities.length > 0 ? (
                                    <Select value={mandatoryForm.location || undefined} onValueChange={(val) => setMandatoryForm({ ...mandatoryForm, location: val })}>
                                        <SelectTrigger className="h-10 text-sm">
                                            <SelectValue placeholder="Select Locality" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {localities.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input placeholder="Preferred Location" value={mandatoryForm.location} onChange={(e) => setMandatoryForm({ ...mandatoryForm, location: e.target.value })} className="h-10 text-sm" />
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Project Type *</Label>
                                <Select value={mandatoryForm.propertyType || undefined} onValueChange={(val) => setMandatoryForm({ ...mandatoryForm, propertyType: val })}>
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {propertyTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Configuration *</Label>
                                <Select value={mandatoryForm.unitType || undefined} onValueChange={(val) => setMandatoryForm({ ...mandatoryForm, unitType: val })}>
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Select BHK" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mandatoryFormAvailableUnitTypes.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Min Budget *</Label>
                                <Select value={mandatoryForm.budgetMin || undefined} onValueChange={(val) => setMandatoryForm({ ...mandatoryForm, budgetMin: val })}>
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Min Price" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BUDGET_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.label}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Max Budget *</Label>
                                <Select value={mandatoryForm.budgetMax || undefined} onValueChange={(val) => setMandatoryForm({ ...mandatoryForm, budgetMax: val })}>
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Max Price" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BUDGET_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.label}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3 pt-1">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Your Details</Label>
                            <Input
                                placeholder="Full Name *"
                                value={mandatoryForm.name}
                                onChange={(e) => setMandatoryForm({ ...mandatoryForm, name: e.target.value })}
                                className="h-10 text-sm"
                            />
                            <Input
                                type="email"
                                placeholder="Email Address *"
                                value={mandatoryForm.email}
                                onChange={(e) => setMandatoryForm({ ...mandatoryForm, email: e.target.value })}
                                className="h-10 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Mobile Number *"
                                    value={mandatoryForm.phone}
                                    onChange={(e) => {
                                        setMandatoryForm({ ...mandatoryForm, phone: e.target.value });
                                        if (mOtpVerified || mOtpSent) {
                                            setMOtpVerified(false);
                                            setMOtpSent(false);
                                            setMOtp("");
                                        }
                                    }}
                                    disabled={mSendingOtp}
                                    className="flex-1 h-10 text-sm"
                                />
                                {(!mOtpSent && !mOtpVerified) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleSendMOtp}
                                        disabled={mSendingOtp || !mandatoryForm.phone || mandatoryForm.phone.length !== 10}
                                        className="shrink-0 h-10 text-sm"
                                    >
                                        {mSendingOtp ? "..." : "Get OTP"}
                                    </Button>
                                )}
                            </div>

                            {mOtpSent && !mOtpVerified && (
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <Label className="text-xs text-emerald-800 mb-1.5 block">OTP SENT TO {mandatoryForm.phone}</Label>
                                            <OtpInput value={mOtp} onChange={setMOtp} disabled={mVerifyingOtp} />
                                        </div>
                                        <div className="flex flex-col gap-1 shrink-0 pt-5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleVerifyMOtp}
                                                disabled={mVerifyingOtp || mOtp.length !== 6}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                {mVerifyingOtp ? "..." : "Verify"}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-right mt-1">
                                        {mOtpTimer > 0 ? (
                                            <span className="text-xs text-emerald-600">Resend in {mOtpTimer}s</span>
                                        ) : (
                                            <button type="button" className="text-xs text-emerald-700 hover:underline font-bold" onClick={handleSendMOtp}>
                                                Resend OTP
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {mOtpVerified && (
                                <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Phone verified
                                </div>
                            )}
                        </div>

                        <Button type="submit" className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20" disabled={submitting}>
                            {submitting ? "Submitting..." : "View Exclusive Projects →"}
                        </Button>

                        <p className="text-center text-xs text-slate-400 pb-2">
                            By submitting you agree to be contacted by our team.
                        </p>
                    </form>
                </div>
            </div>

            {/* Lead Form Dialog (Enquiry) */}
            <Dialog open={showLeadForm} onOpenChange={(open) => {
                setShowLeadForm(open);
                if (!open) {
                    setLeadSubmitted(false);
                    setAdvertiserContact(null);
                    setOtpSent(false);
                    setOtpVerified(false);
                    setOtp("");
                }
            }}>
                <DialogContent className="sm:max-w-md bg-white rounded-3xl">
                    {!leadSubmitted ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-900">Enquire Now</DialogTitle>
                                <DialogDescription className="text-slate-500">
                                    {selectedProject?.name}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleLeadSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter your name"
                                        value={leadForm.name}
                                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Mobile Number *</Label>
                                    <Input
                                        id="phone"
                                        placeholder="10-digit mobile number"
                                        value={leadForm.phone}
                                        onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                                        className="h-12 rounded-xl"
                                        disabled={otpSent || otpVerified}
                                    />
                                    {otpVerified ? (
                                        <div className="flex items-center gap-2 text-emerald-600 text-sm mt-1 font-medium">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Phone verified
                                        </div>
                                    ) : !otpSent ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mt-2 w-full h-10 rounded-xl"
                                            onClick={handleSendOtp}
                                            disabled={sendingOtp || !leadForm.phone || leadForm.phone.length !== 10}
                                        >
                                            {sendingOtp ? "Sending..." : "Send Verification Code"}
                                        </Button>
                                    ) : (
                                        <div className="space-y-4 mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                            <div className="text-center space-y-2">
                                                <Label className="text-xs text-emerald-800 uppercase font-bold">Enter 6-digit Code</Label>
                                                <OtpInput
                                                    value={otp}
                                                    onChange={setOtp}
                                                    disabled={verifyingOtp}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                                onClick={handleVerifyOtp}
                                                disabled={verifyingOtp || otp.length !== 6}
                                            >
                                                {verifyingOtp ? "Verifying..." : "Verify Code"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={leadForm.email}
                                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/20"
                                    disabled={submitting || !otpVerified}
                                >
                                    {submitting ? "Submitting..." : "Get Callback Now"}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Thank You!</h3>
                            <p className="text-slate-600 mb-6">Here are the contact details:</p>

                            {advertiserContact && (
                                <div className="bg-emerald-50 rounded-xl p-5 text-left space-y-4 border border-emerald-100">
                                    <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-emerald-600" />
                                        {advertiserContact.companyName || 'Contact Details'}
                                    </h4>
                                    <div className="space-y-3">
                                        {advertiserContact.phone && (
                                            <a href={`tel:${advertiserContact.phone}`} className="flex items-center gap-3 hover:bg-white/50 rounded-lg p-1 -m-1 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-emerald-600">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <span className="text-slate-900 font-medium">{advertiserContact.phone}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={() => { setShowLeadForm(false); setLeadSubmitted(false); }}
                                className="mt-6 rounded-full px-8 bg-slate-900 text-white"
                            >
                                Done
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
