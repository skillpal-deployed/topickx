"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { advertiserAPI } from "@/lib/api";
import { getImageUrl, formatCurrency, formatBudgetRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Building2,
    ArrowLeft,
    Edit,
    ExternalLink,
    Image as ImageIcon,
    Layers,
    FileText,
    Info,
    MapPin,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    Banknote,
    Home,
    Eye
} from "lucide-react";

export default function ViewProjectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("basic");

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await advertiserAPI.getProject(id);
                setProject(res.data);
            } catch (error) {
                console.error("Error fetching project:", error);
                toast.error("Failed to load project");
                router.push("/dashboard/projects");
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [id, router]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            LIVE: { variant: "success", label: "Live", icon: CheckCircle2, className: "bg-green-100 text-green-700 hover:bg-green-100" },
            SUBMITTED_FOR_REVIEW: { variant: "warning", label: "Under Review", icon: Clock, className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
            REJECTED: { variant: "destructive", label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-700 hover:bg-red-100" },
            DRAFT: { variant: "secondary", label: "Draft", icon: FileText, className: "bg-slate-100 text-slate-700 hover:bg-slate-100" },
            NEEDS_CHANGES: { variant: "destructive", label: "Needs Changes", icon: AlertCircle, className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
            APPROVED_AWAITING_PLACEMENT: { variant: "info", label: "Awaiting Placement", icon: Clock, className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
        };
        const config = variants[status] || { variant: "secondary", label: status, icon: Info };
        const Icon = config.icon;

        return (
            <Badge className={config.className || ""}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard/projects")}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-heading text-2xl font-bold text-slate-900">
                            {project.name}
                        </h1>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            {getStatusBadge(project.status)}
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {project.locality}, {project.city}
                            </div>
                            {project.landingPageSlug && (
                                <Link
                                    href={`/p/${project.landingPageSlug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1 ml-2"
                                >
                                    View Public Page <ExternalLink className="w-3 h-3" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href={`/project/${project.id}`} target="_blank">
                        <Button variant="outline" className="gap-2">
                            <Eye className="w-4 h-4" />
                            {project.status === 'LIVE' ? 'View Live Page' : 'Preview'}
                        </Button>
                    </Link>
                    {/* Edit Project button removed - Advertisers cannot edit after creation */}
                </div>
            </div>

            {/* Admin and Placement Info */}
            <div className="grid gap-4 md:grid-cols-2">
                {(project.reviewComment || project.admin_comment) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <h3 className="font-medium text-slate-900 mb-1 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Admin Feedback
                        </h3>
                        <p className="text-slate-600">
                            {project.reviewComment || project.admin_comment}
                        </p>
                    </div>
                )}

                {project.placements && project.placements.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Placement Details
                        </h3>
                        <div className="space-y-2">
                            {project.placements.map((placement: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-blue-100">
                                    <span className="text-sm font-medium text-slate-700">
                                        {placement.landingPage?.name || "Unknown Landing Page"}
                                    </span>
                                    {placement.landingPage?.slug && (
                                        <Link
                                            href={`/p/${placement.landingPage.slug}`}
                                            target="_blank"
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            View Page <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full mb-6 max-w-2xl bg-slate-100 p-1">
                    <TabsTrigger value="basic" className="gap-2">
                        <Info className="w-4 h-4" />
                        <span className="hidden sm:inline">Basic Info</span>
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="gap-2">
                        <ImageIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Gallery</span>
                    </TabsTrigger>
                    <TabsTrigger value="floorplans" className="gap-2">
                        <Layers className="w-4 h-4" />
                        <span className="hidden sm:inline">Floor Plans</span>
                    </TabsTrigger>
                    <TabsTrigger value="content" className="gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">Content</span>
                    </TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-primary" />
                                    Property Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Builder</p>
                                        <p className="font-medium">{project.builderName || project.builder_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Property Type</p>
                                        <p className="font-medium">{project.propertyType || project.property_type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Possession</p>
                                        <p className="font-medium">{project.possessionStatus || project.possession_status}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">RERA ID</p>
                                        <p className="font-medium font-mono text-xs mt-1 bg-slate-100 py-1 px-2 rounded w-fit">
                                            {project.reraId || project.rera_id || "N/A"}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium text-slate-500 mb-1">Budget Range</p>
                                    <p className="text-lg font-semibold text-primary">
                                        {formatBudgetRange(
                                            project.budgetMin || project.budget_min || 0,
                                            project.budgetMax || project.budget_max || 0
                                        )}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Home className="w-5 h-5 text-primary" />
                                    Configuration
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-2">Unit Types</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(project.unitTypes || project.unit_types || []).map((unit: string) => (
                                            <Badge key={unit} variant="outline" className="bg-slate-50">
                                                {unit}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-2">Amenities</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(project.amenities || []).map((amenity: string) => (
                                            <Badge key={amenity} variant="outline" className="bg-slate-50">
                                                {amenity}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Gallery Tab */}
                <TabsContent value="gallery">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Project Images</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {project.cardImage && (
                                    <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 border relative group">
                                        <img
                                            src={getImageUrl(project.cardImage)}
                                            alt="Card Image"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded-full">
                                            Card Image
                                        </div>
                                    </div>
                                )}
                                {(project.images || []).map((url: string, index: number) => (
                                    <div key={index} className="aspect-video rounded-lg overflow-hidden bg-slate-100 border relative group">
                                        <img
                                            src={getImageUrl(url)}
                                            alt={`Project ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                                {(!project.images || project.images.length === 0) && (
                                    <div className="col-span-full text-center py-12 text-slate-500">
                                        No images available
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Floor Plans Tab */}
                <TabsContent value="floorplans">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Floor Plans</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {(project.floorPlans || project.floor_plans || []).map((fp: any, index: number) => (
                                    <div key={index} className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border p-2">
                                        <img
                                            src={getImageUrl(typeof fp === 'string' ? fp : fp.url)}
                                            alt={`Floor Plan ${index + 1}`}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ))}
                                {(!project.floorPlans && !project.floor_plans) && (
                                    <div className="col-span-full text-center py-12 text-slate-500">
                                        No floor plans available
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Project Highlights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(project.highlights || []).map((highlight: string, index: number) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                        <span>{highlight}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {(project.videoUrl || project.video_url) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Video Tour</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <a
                                    href={project.videoUrl || project.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Watch Video
                                </a>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
