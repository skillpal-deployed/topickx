"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { getImageUrl, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
    MapPin,
    Building2,
    ArrowLeft,
    ExternalLink,
    Trash2,
    Eye,
    Users,
    Calendar,
    Power,
    Copy,
    Plus,
    Globe,
    TrendingUp,
    ArrowUp,
    ArrowDown,
} from "lucide-react";

interface LandingPageSlot {
    position: number;
    project: {
        id: string;
        name: string;
        builderName: string;
        city: string;
        locality: string;
        budgetMin: number;
        budgetMax: number;
        featuredImage?: string;
    };
}

interface LandingPageDetail {
    id: string;
    name: string;
    slug: string;
    city: string;
    locality: string;
    pageType: string;
    isActive: boolean;
    maxProjects: number;
    listings: LandingPageSlot[];
    lead_count: number;
    fbAdAccountId?: string;
    fbPageId?: string;
    fbAccessToken?: string;
    fbForms?: Array<{ id: string; name: string }>;
    seoTitle?: string;
    seoDescription?: string;
    fbPixelId?: string;
    googleAnalyticsId?: string;
}

export default function LandingPageDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [landingPage, setLandingPage] = useState<LandingPageDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);
    const [reordering, setReordering] = useState(false);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchLandingPage(params.id as string);
        }
    }, [params.id]);

    const fetchLandingPage = async (id: string) => {
        try {
            const response = await adminAPI.getLandingPage(id);
            setLandingPage(response.data);
        } catch (error) {
            console.error("Error fetching landing page:", error);
            toast.error("Failed to load landing page");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveProject = async (projectId: string) => {
        if (!confirm("Are you sure you want to remove this project from the landing page?")) {
            return;
        }

        setRemoving(projectId);
        try {
            await adminAPI.removeProject(projectId);
            toast.success("Project removed from landing page");
            fetchLandingPage(params.id as string);
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Failed to remove project");
        } finally {
            setRemoving(null);
        }
    };

    const handleMoveProject = async (projectId: string, currentPosition: number, direction: 'up' | 'down') => {
        if (!landingPage) return;

        const newPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;
        if (newPosition < 1 || newPosition > landingPage.listings.length) return;

        setReordering(true);
        try {
            await adminAPI.reorderSlots(landingPage.id, {
                projectId,
                newPosition
            });
            await fetchLandingPage(landingPage.id);
            toast.success("Project position updated");
        } catch (error) {
            console.error("Error reordering project:", error);
            toast.error("Failed to reorder project");
        } finally {
            setReordering(false);
        }
    };

    const handleToggleActive = async () => {
        if (!landingPage) return;

        setToggling(true);
        try {
            await adminAPI.updateLandingPage(landingPage.id, {
                isActive: !landingPage.isActive
            });
            toast.success(landingPage.isActive ? "Landing page disabled" : "Landing page enabled");
            fetchLandingPage(params.id as string);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update landing page");
        } finally {
            setToggling(false);
        }
    };

    const copyUrl = () => {
        if (!landingPage) return;
        const url = `${window.location.origin}/lp/${landingPage.slug}`;
        navigator.clipboard.writeText(url);
        toast.success("URL copied to clipboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!landingPage) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-muted-foreground">Landing page not found</p>
                <Link href="/admin/landing-pages">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Landing Pages
                    </Button>
                </Link>
            </div>
        );
    }

    const projectCount = landingPage.listings?.length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/landing-pages">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{landingPage.name}</h1>
                        <p className="text-muted-foreground">
                            {landingPage.city}
                            {landingPage.locality ? `, ${landingPage.locality}` : ""}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyUrl}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy URL
                    </Button>
                    <a href={`/lp/${landingPage.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                            <ExternalLink className="w-4 h-4" />
                            View Public Page
                        </Button>
                    </a>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid sm:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Page Type</p>
                        <p className="font-medium capitalize">{landingPage.pageType}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2">
                            <Badge variant={landingPage.isActive ? "success" : "secondary"}>
                                {landingPage.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleToggleActive}
                                disabled={toggling}
                                className={landingPage.isActive ? "text-amber-600" : "text-green-600"}
                            >
                                <Power className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Capacity</p>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="font-medium">{projectCount}/</p>
                            <Input
                                type="number"
                                className="w-16 h-7 px-2 text-center"
                                min={1}
                                max={50}
                                defaultValue={landingPage.maxProjects || 30}
                                onBlur={(e) => {
                                    const newValue = parseInt(e.target.value) || 30;
                                    if (newValue !== landingPage.maxProjects) {
                                        adminAPI.updateLandingPage(landingPage.id, { maxProjects: newValue })
                                            .then(() => {
                                                toast.success("Max projects limit updated");
                                                fetchLandingPage(landingPage.id);
                                            })
                                            .catch(() => toast.error("Failed to update limit"));
                                    }
                                }}
                            />
                            <p className="font-medium">projects</p>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full mt-2">
                            <div
                                className={`h-full rounded-full transition-all ${projectCount >= (landingPage.maxProjects || 30) ? "bg-red-500" : projectCount >= (landingPage.maxProjects || 30) * 0.7 ? "bg-amber-500" : "bg-primary"
                                    }`}
                                style={{ width: `${(projectCount / (landingPage.maxProjects || 30)) * 100}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Leads</p>
                        <p className="font-medium text-lg">{landingPage.lead_count || 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* SEO Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Search Engine Optimization
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Slug (URL)</label>
                            <Input
                                placeholder="my-landing-page"
                                defaultValue={landingPage.slug}
                                onBlur={(e) => {
                                    if (e.target.value !== landingPage.slug) {
                                        adminAPI.updateLandingPage(landingPage.id, { slug: e.target.value })
                                            .then(() => {
                                                toast.success("Slug updated");
                                                fetchLandingPage(landingPage.id);
                                            })
                                            .catch((err) => toast.error(err.response?.data?.error || "Failed to update slug"));
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">
                                Public URL: {window.location.origin}/lp/{landingPage.slug}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">SEO Title</label>
                            <Input
                                placeholder="Page Title"
                                defaultValue={landingPage.seoTitle || ""}
                                onBlur={(e) => {
                                    if (e.target.value !== (landingPage.seoTitle || "")) {
                                        adminAPI.updateLandingPage(landingPage.id, { seoTitle: e.target.value })
                                            .then(() => toast.success("SEO Title updated"));
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">SEO Description</label>
                        <Textarea
                            placeholder="Page Description"
                            defaultValue={landingPage.seoDescription || ""}
                            onBlur={(e) => {
                                if (e.target.value !== (landingPage.seoDescription || "")) {
                                    adminAPI.updateLandingPage(landingPage.id, { seoDescription: e.target.value })
                                        .then(() => toast.success("SEO Description updated"));
                                }
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Facebook Integration Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" />
                            Facebook Lead Ads Integration
                        </CardTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Meta Connected
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Ad Account ID</label>
                            <Input
                                placeholder="act_xxxxxxxxx"
                                defaultValue={landingPage.fbAdAccountId}
                                onBlur={(e) => {
                                    if (e.target.value !== landingPage.fbAdAccountId) {
                                        adminAPI.updateLandingPageFacebookSettings(landingPage.id, { fb_ad_account_id: e.target.value })
                                            .then(() => toast.success("Ad Account updated"));
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Page ID</label>
                            <Input
                                placeholder="xxxxxxxxxxxx"
                                defaultValue={landingPage.fbPageId}
                                onBlur={(e) => {
                                    if (e.target.value !== landingPage.fbPageId) {
                                        adminAPI.updateLandingPageFacebookSettings(landingPage.id, { fb_page_id: e.target.value })
                                            .then(() => toast.success("Page ID updated"));
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Access Token</label>
                            <Input
                                type="password"
                                placeholder="EAA..."
                                defaultValue={landingPage.fbAccessToken}
                                onBlur={(e) => {
                                    if (e.target.value !== landingPage.fbAccessToken) {
                                        adminAPI.updateLandingPageFacebookSettings(landingPage.id, { fb_access_token: e.target.value })
                                            .then(() => toast.success("Access Token updated"));
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Linked Lead Forms</h3>
                            <Button size="sm" onClick={() => {
                                const formId = prompt("Enter Facebook Form ID:");
                                const name = prompt("Enter Form Name (Label):");
                                if (formId && name) {
                                    adminAPI.addLandingPageFacebookForm(landingPage.id, { formId, name })
                                        .then(() => fetchLandingPage(landingPage.id));
                                }
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Form
                            </Button>
                        </div>

                        {landingPage.fbForms && landingPage.fbForms.length > 0 ? (
                            <div className="grid sm:grid-cols-2 gap-3">
                                {landingPage.fbForms.map((form) => (
                                    <div key={form.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                                        <div>
                                            <p className="font-medium text-sm">{form.name}</p>
                                            <p className="text-xs text-muted-foreground">ID: {form.id}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                                            if (confirm("Remove this form?")) {
                                                adminAPI.removeLandingPageFacebookForm(landingPage.id, form.id)
                                                    .then(() => fetchLandingPage(landingPage.id));
                                            }
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center py-6 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                                No Facebook forms linked to this landing page.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Remarketing Scripts Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Remarketing Scripts
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Facebook Pixel ID</label>
                            <Input
                                placeholder="xxxxxxxxx"
                                defaultValue={landingPage.fbPixelId || ""}
                                onBlur={(e) => {
                                    if (e.target.value !== (landingPage.fbPixelId || "")) {
                                        adminAPI.updateLandingPage(landingPage.id, { fbPixelId: e.target.value })
                                            .then(() => toast.success("Facebook Pixel ID updated"));
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">Enter only the ID (e.g., 1234567890)</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Google Analytics ID (G-XXXXX)</label>
                            <Input
                                placeholder="G-XXXXXXXXXX"
                                defaultValue={landingPage.googleAnalyticsId || ""}
                                onBlur={(e) => {
                                    if (e.target.value !== (landingPage.googleAnalyticsId || "")) {
                                        adminAPI.updateLandingPage(landingPage.id, { googleAnalyticsId: e.target.value })
                                            .then(() => toast.success("Google Analytics ID updated"));
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">Enter the full Measurement ID (including G-)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Projects List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Projects on this Landing Page
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {landingPage.listings && landingPage.listings.length > 0 ? (
                        <div className="space-y-4">
                            {landingPage.listings.map((slot) => (
                                <div
                                    key={slot.project.id}
                                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border hover:border-slate-200 transition-colors gap-4"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Position Badge */}
                                        <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                                            #{slot.position}
                                        </div>

                                        {/* Image */}
                                        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                            {slot.project.featuredImage ? (
                                                <img
                                                    src={getImageUrl(slot.project.featuredImage)}
                                                    alt={slot.project.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Building2 className="w-6 h-6 text-slate-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <h3 className="font-medium">{slot.project.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                by {slot.project.builderName}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 text-sm">
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <MapPin className="w-3 h-3" />
                                                    {slot.project.locality}, {slot.project.city}
                                                </span>
                                                <span className="text-primary font-medium">
                                                    {formatCurrency(slot.project.budgetMin)} - {formatCurrency(slot.project.budgetMax)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1 mr-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleMoveProject(slot.project.id, slot.position, 'up')}
                                                disabled={slot.position === 1 || reordering}
                                            >
                                                <ArrowUp className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleMoveProject(slot.project.id, slot.position, 'down')}
                                                disabled={slot.position === landingPage.listings.length || reordering}
                                            >
                                                <ArrowDown className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        <Link href={`/admin/projects/${slot.project.id}`}>
                                            <Button variant="ghost" size="sm">
                                                <Eye className="w-4 h-4 mr-1" />
                                                View
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleRemoveProject(slot.project.id)}
                                            disabled={removing === slot.project.id}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            {removing === slot.project.id ? "Removing..." : "Remove"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No projects assigned yet</p>
                            <Link href="/admin/placement-queue">
                                <Button variant="outline">Go to Placement Queue</Button>
                            </Link>
                        </div>
                    )
                    }
                </CardContent >
            </Card >
        </div >
    );
}
