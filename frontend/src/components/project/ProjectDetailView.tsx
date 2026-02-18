"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { publicAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatBudgetRange, getImageUrl } from "@/lib/utils";
import {
    Building2,
    MapPin,
    Building,
    Phone,
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    Home,
    Car,
    Dumbbell,
    Trees,
    Shield,
    Droplets,
    Wifi,
    Zap,
    Users,
    Timer,
    CheckCircle2,
    X,
    Play,
    Calendar,
    Ruler,
    IndianRupee,
    Verified,
    Star,
    ChevronDown,
    AlertTriangle,
    Activity,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/ui/otp-input";
import { toast } from "sonner";

interface FloorPlan {
    url: string;
    description?: string;
    price?: string;
}

export interface ProjectData {
    id: string;
    name: string;
    builderName: string;
    city: string;
    locality: string;
    address?: string;
    propertyType: string | string[];
    budgetMin: number;
    budgetMax: number;
    price?: string;
    priceDetails?: string;
    unitTypes: string[];
    highlights: string[];
    amenities: string[];
    images: string[];
    floorPlans?: FloorPlan[] | string[];
    videoUrl?: string;
    heroImage?: string;
    projectLogo?: string;
    advertiserLogo?: string;
    cardImage?: string;
    possessionStatus: string;
    estimatedPossessionDate?: string;
    reraId?: string;
    aboutProject?: string;
    builderDescription?: string;
    disclaimer?: string;
    locationHighlights?: string[];
    advertiser?: {
        companyName: string;
        phone?: string;
        ownerName?: string;
    };
    is_preview?: boolean;
    status?: string;
    usp1?: string;
    usp2?: string;
}

const AMENITY_ICONS: Record<string, any> = {
    "swimming pool": Droplets,
    "pool": Droplets,
    "gym": Dumbbell,
    "fitness": Dumbbell,
    "garden": Trees,
    "park": Trees,
    "parking": Car,
    "security": Shield,
    "clubhouse": Building,
    "library": Home,
    "wifi": Wifi,
    "internet": Wifi,
    "power backup": Zap,
    "lift": ArrowLeft, // Using ArrowLeft as placeholder, should use Elevator if available, or just Building
    "elevator": Building,
    "fire safety": AlertTriangle,
    "intercom": Phone,
    "maintenance staff": Users,
    "bank": IndianRupee,
    "atm": IndianRupee,
    "play area": Dumbbell, // Playground
    "jogging track": Activity,
    "cctv": Shield,
};

interface ProjectDetailViewProps {
    projectIdOrSlug: string; // Can be ID or Slug
    initialProject?: ProjectData | null; // Optional pre-fetched data
}

export default function ProjectDetailView({ projectIdOrSlug, initialProject }: ProjectDetailViewProps) {
    const searchParams = useSearchParams();
    const landingPageId = searchParams.get('lp') || undefined;

    const [project, setProject] = useState<ProjectData | null>(initialProject || null);
    const [loading, setLoading] = useState(!initialProject);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showFullAbout, setShowFullAbout] = useState(false);

    // OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otp, setOtp] = useState("");
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpTimer, setOtpTimer] = useState(0);

    useEffect(() => {
        if (initialProject) {
            setProject(initialProject);
            setLoading(false);
            return;
        }

        const fetchProject = async () => {
            setLoading(true);
            try {
                // Determine if it's likely a slug or ID. 
                // The API can handle both via getProject usually, or specialized endpoints.
                // Assuming publicAPI.getProject handles slug or id.
                // If the backend route /api/projects/:id handles OR condition for slug/id, we can just use getProject.
                // If specific route needed for slug, we might need to adjust.
                // Based on previous file reads, GET /api/projects/:id handles both.

                const response = await publicAPI.getProject(projectIdOrSlug);
                setProject(response.data);
            } catch (error: any) {
                if (error.response?.status === 404) {
                    try {
                        const previewRes = await publicAPI.getProjectPreview(projectIdOrSlug);
                        setProject({ ...previewRes.data, is_preview: true });
                        setLoading(false);
                        return;
                    } catch (previewError) {
                        console.error("Error fetching project preview:", previewError);
                    }
                }
                console.error("Error fetching project:", error);
            } finally {
                setLoading(false);
            }
        };

        if (projectIdOrSlug) {
            fetchProject();
            publicAPI.recordVisit({ projectId: projectIdOrSlug, landingPageId }).catch(err => console.error("Error recording visit:", err));
        }
    }, [projectIdOrSlug, landingPageId, initialProject]);

    // OTP Timer
    useEffect(() => {
        if (otpTimer > 0) {
            const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpTimer]);

    // Lightbox Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (lightboxIndex === -1) return;
            if (e.key === "ArrowRight") {
                setLightboxIndex(prev => (prev < lightboxImages.length - 1 ? prev + 1 : prev));
            }
            if (e.key === "ArrowLeft") {
                setLightboxIndex(prev => (prev > 0 ? prev - 1 : prev));
            }
            if (e.key === "Escape") {
                setLightboxIndex(-1);
                setLightboxImages([]);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxIndex, lightboxImages]);

    const handleSendOtp = async () => {
        if (!formData.phone || formData.phone.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        setSendingOtp(true);
        try {
            await publicAPI.sendOtp(formData.phone);
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
            await publicAPI.verifyOtp(formData.phone, otp);
            setOtpVerified(true);
            toast.success("Phone verified successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Invalid OTP");
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!otpVerified) {
            toast.error("Please verify your phone number with OTP first");
            return;
        }

        setSubmitting(true);

        try {
            await publicAPI.submitLead({
                ...formData,
                projectId: project?.id || projectIdOrSlug, // Use ID if available, else likely failure if slug is passed but backend expects ID. 
                // Wait, submitLead usually expects ID. if we only have slug, we might need the ID from the fetched project.
                // Fortunately, we fetch 'project' which contains the ID.
                // So project?.id is the safe bet.
                landingPageId: landingPageId || "direct",
                otpVerified: true,
            });
            setSubmitted(true);
            toast.success("Inquiry submitted successfully!");
        } catch (error) {
            console.error("Error submitting lead:", error);
            toast.error("Failed to submit inquiry. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const getAmenityIcon = (amenity: string) => {
        const key = amenity.toLowerCase();
        for (const [name, Icon] of Object.entries(AMENITY_ICONS)) {
            if (key.includes(name)) {
                return Icon;
            }
        }
        return Check;
    };

    const openLightbox = (index: number, images: string[]) => {
        setLightboxImages(images);
        setLightboxIndex(index);
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lightboxIndex < lightboxImages.length - 1) {
            setLightboxIndex(lightboxIndex + 1);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lightboxIndex > 0) {
            setLightboxIndex(lightboxIndex - 1);
        }
    };

    const scrollToEnquiry = () => {
        document.getElementById('enquiry-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading project details...</p>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center max-w-md mx-auto p-8">
                    <Building className="h-20 w-20 mx-auto mb-6 text-slate-300" />
                    <h1 className="text-3xl font-bold mb-3">Project Not Found</h1>
                    <p className="text-muted-foreground mb-6">
                        This project may have been removed or is no longer available.
                    </p>
                    <Link href="/">
                        <Button size="lg">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const heroImage = project.heroImage || (project.images?.length > 0 ? project.images[0] : null);
    const galleryImages = project.images?.length > 0 ? project.images : [];

    // Safety check for floor plans array
    const floorPlans = Array.isArray(project.floorPlans) ? project.floorPlans : [];

    return (
        <div className="min-h-screen bg-stone-50 font-sans selection:bg-amber-100 selection:text-amber-900 relative">
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
            {/* Preview Banner */}
            {project.is_preview && project.status !== 'LIVE' && (
                <div className="bg-amber-600 text-white text-center py-2 px-4 text-sm font-medium sticky top-0 z-50 flex items-center justify-center gap-2 shadow-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Preview Mode - This project is not yet live</span>
                </div>
            )}

            {/* Sticky Header */}
            <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b shadow-sm">
                <div className="container mx-auto px-4 h-24 flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="relative h-12 w-12">
                            <Image
                                src="/logo-icon.png"
                                alt="Topickx Icon"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
                            Topickx
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Button onClick={scrollToEnquiry} className="bg-slate-900 hover:bg-slate-800 text-amber-50 font-semibold shadow-md border border-white/10 rounded-full px-6 transition-all active:scale-95">
                            Enquire
                        </Button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative min-h-[50vh] md:min-h-[80vh] flex items-end overflow-hidden bg-slate-900">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center blur-[2px] scale-105"
                    style={{
                        backgroundImage: heroImage
                            ? `url(${getImageUrl(heroImage)})`
                            : 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
                    }}
                />

                {/* Premium Charcoal Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/80 to-slate-900/30" />


                {/* Hero Content */}
                <div className="relative container mx-auto px-4 py-12 md:py-20">
                    <div className="grid lg:grid-cols-5 gap-8 items-end">
                        {/* Project Info - Left Side */}
                        <div className="lg:col-span-3 text-white flex flex-col justify-center items-center text-center">
                            {/* Project Logo - Centered */}
                            {project.projectLogo && (
                                <div className="bg-white/95 p-3 rounded-2xl shadow-lg backdrop-blur-md mb-6 animate-in fade-in zoom-in duration-500">
                                    <div className="relative h-16 w-16 md:h-20 md:w-20">
                                        <Image
                                            src={getImageUrl(project.projectLogo)}
                                            alt={`${project.name} Logo`}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Badges */}
                            {/* Badges - Unified Premium Design */}
                            <div className="flex flex-wrap justify-center gap-3 mb-8">
                                {/* Property Type */}
                                <Badge variant="outline" className="bg-slate-950/40 border-white/10 text-white px-4 py-1.5 backdrop-blur-md shadow-sm">
                                    {Array.isArray(project.propertyType) ? project.propertyType.join(', ') : project.propertyType}
                                </Badge>

                                {/* RERA Approved */}
                                {project.reraId && (
                                    <Badge variant="outline" className="bg-slate-950/40 border-white/10 text-white px-4 py-1.5 backdrop-blur-md shadow-sm">
                                        <Verified className="h-3.5 w-3.5 mr-2 text-amber-400" />
                                        RERA Approved
                                    </Badge>
                                )}

                                {/* Possession Status */}
                                <Badge variant="outline" className="bg-slate-950/40 border-white/10 text-white px-4 py-1.5 backdrop-blur-md shadow-sm">
                                    <Calendar className="h-3.5 w-3.5 mr-2 text-amber-400" />
                                    {project.possessionStatus}
                                </Badge>

                                {/* Expected Completion - Only if under construction */}
                                {project.possessionStatus?.toLowerCase().includes("under construction") && project.estimatedPossessionDate && (() => {
                                    try {
                                        const date = new Date(project.estimatedPossessionDate);
                                        if (isNaN(date.getTime())) return null;
                                        return (
                                            <Badge variant="outline" className="bg-slate-950/40 border-white/10 text-white px-4 py-1.5 backdrop-blur-md shadow-sm">
                                                <Timer className="h-3.5 w-3.5 mr-2 text-amber-400" />
                                                Expected: {date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                            </Badge>
                                        );
                                    } catch (error) {
                                        return null;
                                    }
                                })()}
                            </div>

                            {/* Project Name */}
                            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight">
                                {project.name}
                            </h1>

                            {/* Builder */}
                            <p className="text-lg text-white/80 mb-4">
                                by <span className="font-semibold text-white">{project.builderName}</span>
                            </p>

                            {/* Location */}
                            <div className="flex items-center gap-2 text-white/80 mb-6">
                                <MapPin className="h-5 w-5" />
                                <span className="text-lg">{project.locality}, {project.city}</span>
                            </div>

                            {/* Price */}
                            <div className="mb-6">
                                <p className="text-white/60 text-sm uppercase tracking-wider mb-1" data-label="price">Price Range</p>
                                <p className="text-3xl md:text-4xl font-bold text-white">
                                    {formatBudgetRange(project.budgetMin, project.budgetMax)}
                                </p>
                                {project.priceDetails && (
                                    <p className="text-white/70 text-sm mt-1">{project.priceDetails}</p>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="flex flex-wrap gap-4 md:gap-6">
                                {project.unitTypes?.length > 0 && (
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                        <p className="text-white/60 text-xs uppercase">Configuration</p>
                                        <p className="text-white font-semibold">{project.unitTypes.join(", ")}</p>
                                    </div>
                                )}
                                {project.reraId && (
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                        <p className="text-white/60 text-xs uppercase">RERA ID</p>
                                        <p className="text-white font-semibold text-sm">{project.reraId}</p>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* USPs - Removed from here, moved to content below */}


                        {/* Enquiry Form - Right Side */}
                        <div className="lg:col-span-2 scroll-mt-24" id="enquiry-form">
                            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                                        Request Quote
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Fill your details to receive more information
                                    </p>

                                    {/* USPs - Removed from Form Header */}

                                </div>

                                {submitted ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                            <Check className="h-8 w-8 text-green-600" />
                                        </div>
                                        <h4 className="text-lg font-semibold mb-2 text-slate-900">Thank You!</h4>
                                        <p className="text-slate-500 mb-4">
                                            Our team will contact you shortly.
                                        </p>
                                        {project.advertiser?.phone && (
                                            <a
                                                href={`tel:${project.advertiser.phone}`}
                                                className="inline-flex items-center gap-2 text-teal-600 font-medium hover:underline"
                                            >
                                                <Phone className="h-4 w-4" />
                                                Call Now: {project.advertiser.phone}
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <Input
                                                placeholder="Your Name *"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                className="h-12 bg-slate-50 border-slate-200"
                                            />
                                        </div>

                                        <div>
                                            <Input
                                                type="tel"
                                                placeholder="Mobile Number *"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                required
                                                disabled={otpSent || otpVerified}
                                                className="h-12 bg-slate-50 border-slate-200"
                                            />

                                            {otpVerified ? (
                                                <div className="flex items-center gap-2 text-green-600 text-sm mt-2 font-medium">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Phone verified
                                                </div>
                                            ) : !otpSent ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-2 w-full"
                                                    onClick={handleSendOtp}
                                                    disabled={sendingOtp || !formData.phone || formData.phone.length !== 10}
                                                >
                                                    {sendingOtp ? "Sending..." : "Verify with OTP"}
                                                </Button>
                                            ) : (
                                                <div className="space-y-3 mt-3 p-4 bg-slate-50 rounded-xl border">
                                                    <div className="text-center space-y-2">
                                                        <Label className="text-xs text-slate-500 uppercase font-bold">Enter OTP</Label>
                                                        <OtpInput
                                                            value={otp}
                                                            onChange={setOtp}
                                                            disabled={verifyingOtp}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        onClick={handleVerifyOtp}
                                                        disabled={verifyingOtp || otp.length !== 6}
                                                    >
                                                        {verifyingOtp ? "Verifying..." : "Verify"}
                                                    </Button>
                                                    <div className="text-center">
                                                        {otpTimer > 0 ? (
                                                            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                                                                <Timer className="h-3 w-3" />
                                                                Resend in {otpTimer}s
                                                            </p>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={handleSendOtp}
                                                                className="text-xs text-primary hover:underline font-medium"
                                                            >
                                                                Resend OTP
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <Input
                                                type="email"
                                                placeholder="Email Address *"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                className="h-12 bg-slate-50 border-slate-200"
                                            />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-14 text-lg font-bold bg-emerald-950 hover:bg-emerald-900 text-amber-50 shadow-md rounded-xl border border-white/10"
                                            size="lg"
                                            disabled={submitting || !otpVerified}
                                        >
                                            {submitting ? "Submitting..." : "Get Exclusive Deals"}
                                        </Button>

                                        <p className="text-xs text-center text-slate-400">
                                            By submitting, you agree to our Terms & Privacy Policy
                                        </p>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section >

            {/* Main Content */}
            < div className="container mx-auto px-4 py-8 md:py-12 space-y-6 md:space-y-10 relative z-10 pb-24 md:pb-12" >

                {/* USP Section - New Location */}
                {
                    (project.usp1 || project.usp2) && (
                        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
                            {project.usp1 && (
                                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border-2 border-amber-100/50 shadow-sm flex items-center gap-4 group hover:border-amber-400 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                        <Star className="w-6 h-6 fill-current" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Premium USP</p>
                                        <p className="text-lg font-bold text-slate-800">{project.usp1?.substring(0, 50)}</p>
                                    </div>
                                </div>
                            )}
                            {project.usp2 && (
                                <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border-2 border-emerald-100/50 shadow-sm flex items-center gap-4 group hover:border-emerald-400 transition-all">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                                        <Verified className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Premium USP</p>
                                        <p className="text-lg font-bold text-slate-800">{project.usp2?.substring(0, 50)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }


                {/* About Project */}
                {
                    project.aboutProject && (
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                            <h2 className="text-3xl md:text-4xl font-bold text-emerald-950 mb-6 flex items-center gap-3">
                                <span className="bg-amber-50 p-2 rounded-xl text-amber-600"><Building className="h-6 w-6" /></span>
                                About {project.name}
                            </h2>
                            <div className="relative">
                                <p className={`text-slate-600 leading-relaxed whitespace-pre-line ${!showFullAbout ? 'line-clamp-6' : ''}`}>
                                    {project.aboutProject}
                                </p>
                                {project.aboutProject.length > 400 && (
                                    <Button
                                        variant="link"
                                        onClick={() => setShowFullAbout(!showFullAbout)}
                                        className="p-0 h-auto text-emerald-600 font-semibold mt-2 hover:text-emerald-700"
                                    >
                                        {showFullAbout ? "Read Less" : "Read All"}
                                    </Button>
                                )}
                            </div>
                        </section>
                    )
                }

                {/* Highlights */}
                {
                    project.highlights?.length > 0 && (
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                            <h2 className="text-3xl md:text-4xl font-bold text-emerald-950 mb-8 flex items-center gap-3">
                                <span className="bg-amber-50 p-2 rounded-xl text-amber-600"><Star className="h-6 w-6" /></span>
                                Key Highlights
                            </h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {project.highlights.flatMap(h => {
                                    // 1. Terminology Replacement: Property -> Project
                                    const cleanH = h.replace(/\bProperty\b/g, 'Project').replace(/\bProperties\b/g, 'Projects');

                                    // 2. Robust Splitting Logic
                                    if (cleanH.includes('\n')) {
                                        return cleanH.split('\n').filter(s => s.trim());
                                    }

                                    // Return as is (trusted input from new admin UI)
                                    return [cleanH];
                                }).map((highlight, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-5 bg-stone-50 rounded-2xl border border-stone-100">
                                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                                            <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                                        </div>
                                        <span className="text-emerald-900 font-medium leading-relaxed">{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                }


                {/* Amenities */}
                {
                    project.amenities?.length > 0 && (
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                            <h2 className="text-3xl md:text-4xl font-bold text-emerald-950 mb-8 flex items-center gap-3">
                                <span className="bg-amber-50 p-2 rounded-xl text-amber-600"><Wifi className="h-6 w-6" /></span>
                                Premium Amenities
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                {project.amenities.map((amenity: any, idx: number) => {
                                    const amenityName = typeof amenity === 'string' ? amenity : amenity.name;
                                    const iconUrl = typeof amenity === 'object' ? amenity.iconUrl : null;
                                    const Icon = getAmenityIcon(amenityName);

                                    return (
                                        <div key={idx} className="flex flex-col items-center text-center gap-3 p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                {iconUrl ? (
                                                    <img src={iconUrl} alt={amenityName} className="h-8 w-8 object-contain" />
                                                ) : (
                                                    <Icon className="h-8 w-8" />
                                                )}
                                            </div>
                                            <span className="font-semibold text-slate-700 text-sm">{amenityName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )
                }

                {/* Video Tour */}
                {
                    project.videoUrl && (
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                                <span className="bg-amber-50 p-2 rounded-xl text-amber-600"><Play className="h-6 w-6" /></span>
                                Project Video Tour
                            </h2>
                            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-2xl ring-4 ring-slate-100">
                                <iframe
                                    src={project.videoUrl.replace("watch?v=", "embed/")}
                                    title="Project Video Tour"
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </section>
                    )
                }

                {/* Gallery */}
                {
                    galleryImages.length > 1 && (
                        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
                            <h2 className="text-2xl font-bold mb-6">Gallery</h2>
                            <div className="relative group">
                                {/* Left Arrow */}
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('gallery-scroll');
                                        if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                                    }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2 hover:scale-110"
                                >
                                    <ChevronLeft className="w-6 h-6 text-slate-700" />
                                </button>

                                {/* Gallery Container */}
                                <div
                                    id="gallery-scroll"
                                    className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2 snap-x snap-mandatory px-4 md:px-0"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {galleryImages.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="flex-shrink-0 w-64 md:w-80 aspect-video rounded-xl overflow-hidden cursor-pointer group/item snap-center"
                                            onClick={() => openLightbox(idx, galleryImages.map(img => getImageUrl(img)))}
                                        >
                                            <img
                                                src={getImageUrl(img)}
                                                alt={`Gallery ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Right Arrow */}
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('gallery-scroll');
                                        if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 translate-x-1/2 hover:scale-110"
                                >
                                    <ChevronRight className="w-6 h-6 text-slate-700" />
                                </button>
                            </div>
                        </section>
                    )
                }

                {/* Floor Plans */}
                {
                    floorPlans.length > 0 && (
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                                <span className="bg-amber-50 p-2 rounded-xl text-amber-600"><Ruler className="h-6 w-6" /></span>
                                Floor Plans & Configuration
                            </h2>
                            <div className="relative group">
                                {/* Left Arrow */}
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('floorplans-scroll');
                                        if (container) container.scrollBy({ left: -300, behavior: 'smooth' });
                                    }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 -translate-x-1/2 hover:scale-110"
                                >
                                    <ChevronLeft className="w-6 h-6 text-slate-700" />
                                </button>

                                {/* Floor Plans Container */}
                                <div
                                    id="floorplans-scroll"
                                    className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-2 snap-x snap-mandatory px-4 md:px-0"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {floorPlans.map((fp, idx) => (
                                        <div
                                            key={idx}
                                            className="flex-shrink-0 w-72 md:w-80 group/item border border-slate-200 rounded-xl overflow-hidden cursor-pointer snap-center"
                                            onClick={() => {
                                                const images = floorPlans.map(p => getImageUrl(typeof p === 'string' ? p : p.url));
                                                openLightbox(idx, images);
                                            }}
                                        >
                                            <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden">
                                                <img
                                                    src={getImageUrl(typeof fp === 'string' ? fp : fp.url)}
                                                    alt={typeof fp === 'string' ? `Floor Plan ${idx + 1}` : (fp.description || `Floor Plan ${idx + 1}`)}
                                                    className="w-full h-full object-contain"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors flex items-center justify-center">
                                                    <span className="opacity-0 group-hover/item:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                                                        Click to expand
                                                    </span>
                                                </div>
                                            </div>
                                            {typeof fp !== 'string' && (fp.description || fp.price) && (
                                                <div className="p-4 bg-white">
                                                    {fp.description && (
                                                        <p className="font-semibold text-slate-900">{fp.description}</p>
                                                    )}
                                                    {fp.price && (
                                                        <p className="text-primary font-bold text-lg flex items-center gap-1 mt-1">
                                                            <IndianRupee className="h-4 w-4" />
                                                            {fp.price}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Right Arrow */}
                                <button
                                    onClick={() => {
                                        const container = document.getElementById('floorplans-scroll');
                                        if (container) container.scrollBy({ left: 300, behavior: 'smooth' });
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white shadow-lg rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 translate-x-1/2 hover:scale-110"
                                >
                                    <ChevronRight className="w-6 h-6 text-slate-700" />
                                </button>
                            </div>
                        </section>
                    )
                }

                {/* Location Highlights */}
                {
                    project.locationHighlights && project.locationHighlights?.length > 0 && (
                        <section className="bg-emerald-950 rounded-[2rem] p-8 md:p-10 text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                            <h2 className="text-3xl md:text-4xl font-bold text-amber-50 mb-8 flex items-center gap-3 relative z-10">
                                <span className="bg-white/10 p-2 rounded-xl text-amber-400 backdrop-blur-sm"><MapPin className="h-6 w-6" /></span>
                                Commute & Convenience
                            </h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                                {project.locationHighlights.map((highlight, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <span className="text-stone-200">{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                }

                {/* Location */}
                {
                    project.address && (
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                            <h2 className="text-3xl md:text-4xl font-bold text-emerald-950 mb-6 flex items-center gap-3">
                                <span className="bg-amber-50 p-2 rounded-xl text-amber-600"><MapPin className="h-6 w-6" /></span>
                                Address
                            </h2>
                            <p className="text-slate-600 text-lg">{project.address}</p>
                            <p className="text-slate-500 mt-2">{project.locality}, {project.city}</p>
                        </section>
                    )
                }

                {/* Builder Description */}
                {
                    project.builderDescription && (
                        <section className="bg-white rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100">
                            <h2 className="text-3xl md:text-4xl font-bold text-emerald-950 mb-6 flex items-center gap-3">
                                <span className="bg-amber-50 p-2 rounded-xl text-amber-600"><Building className="h-6 w-6" /></span>
                                About Advertiser
                            </h2>
                            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
                                <div className="flex items-center gap-4 mb-4">
                                    {project.advertiserLogo && (
                                        <div className="relative h-16 w-16 flex-shrink-0 bg-white rounded-xl p-2 shadow-sm border border-stone-200">
                                            <Image
                                                src={getImageUrl(project.advertiserLogo)}
                                                alt={`${project.builderName} Logo`}
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold text-emerald-900">{project.builderName}</h3>
                                </div>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{project.builderDescription}</p>
                            </div>
                        </section>
                    )
                }

                {/* Disclaimer */}
                {
                    project.disclaimer && (
                        <div className="text-xs text-muted-foreground p-4 bg-slate-50 rounded-lg text-center">
                            <p className="font-semibold mb-1">Disclaimer</p>
                            <p>{project.disclaimer}</p>
                        </div>
                    )
                }
            </div >

            {/* Lightbox */}
            {
                lightboxIndex > -1 && lightboxImages.length > 0 && (
                    <div
                        className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => {
                            setLightboxIndex(-1);
                            setLightboxImages([]);
                        }}
                    >
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            onClick={() => {
                                setLightboxIndex(-1);
                                setLightboxImages([]);
                            }}
                        >
                            <X className="w-8 h-8" />
                        </button>

                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-4"
                            onClick={prevImage}
                        >
                            <ChevronLeft className="w-12 h-12" />
                        </button>

                        <div className="max-w-[90vw] max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
                            <img
                                src={getImageUrl(lightboxImages[lightboxIndex])}
                                alt="Lightbox"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 bg-black/50 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md">
                                {lightboxIndex + 1} / {lightboxImages.length}
                            </div>
                        </div>

                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-4"
                            onClick={nextImage}
                        >
                            <ChevronRight className="w-12 h-12" />
                        </button>
                    </div>
                )
            }
            {/* Sticky Bottom Action Bar (Mobile Only) */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-3 flex gap-3 items-center md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-safe-area">
                {/* Starting Price */}
                <div className="flex-1 flex flex-col">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Price Range</span>
                    <div className="text-lg font-bold text-emerald-950 flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />
                        {formatBudgetRange(project.budgetMin, project.budgetMax)}
                    </div>
                </div>
                {/* Enquire Button */}
                <Button
                    onClick={scrollToEnquiry}
                    className="flex-1 h-12 rounded-xl bg-emerald-950 text-white font-bold shadow-lg shadow-emerald-900/20"
                >
                    Enquire
                </Button>
            </div>
        </div >
    );
}
