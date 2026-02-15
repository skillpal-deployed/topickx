"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { advertiserAPI, publicAPI, uploadAPI } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Building2,
    Upload,
    X,
    Plus,
    ArrowLeft,
    Save,
    Eye,
    ExternalLink,
    Image as ImageIcon,
    Layers,
    FileText,
    Info,
} from "lucide-react";
import { UNIT_TYPES_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/constants";

// Constants
// const PROPERTY_TYPES = ["Apartment", "Villa", "Plot"]; // Removed local constants
// const UNIT_TYPES = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK", "Studio"];
const AMENITIES = [
    "Swimming Pool",
    "Gym",
    "Clubhouse",
    "Garden",
    "Parking",
    "Security",
    "Power Backup",
    "Lift",
    "Children Play Area",
    "Tennis Court",
    "Basketball Court",
    "Jogging Track",
    "Shopping Complex",
    "Hospital",
    "School",
    "Temple",
];


const POSSESSION_STATUS = [
    "Ready to Move",
    "Under Construction",
    "1-2 Years",
    "2-3 Years",
    "3+ Years",
];

export default function EditProjectPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadingFloorPlans, setUploadingFloorPlans] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");
    const [propertyUnitMappings, setPropertyUnitMappings] = useState<Record<string, string[]>>({});
    const [unitTypes, setUnitTypes] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: "",
        builder_name: "",
        city: "",
        locality: "",
        property_type: "",
        unit_types: [] as string[],
        budget_min: "",
        budget_max: "",
        highlights: [""] as string[],
        amenities: [] as string[],
        images: [] as string[],
        floor_plans: [] as any[], // strings or objects
        video_url: "",
        card_image: "",
        hero_image: "",
        project_logo: "",
        advertiser_logo: "",
        about_project: "",
        builder_description: "",
        possession_status: "",
        estimated_possession_date: "",
        rera_id: "",
        usp_1: "",
        usp_2: "",
    });

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const [projectRes, optionsRes, mappingsRes] = await Promise.all([
                    advertiserAPI.getProject(id),
                    publicAPI.getOptions(),
                    publicAPI.getPropertyUnitMappings().catch((err: any) => {
                        console.error('Failed to load property-unit mappings, using fallback', err);
                        return { data: UNIT_TYPES_BY_PROPERTY };
                    })
                ]);

                const data = projectRes.data;
                setUnitTypes(optionsRes.data?.unit_types || []);
                setPropertyUnitMappings(mappingsRes.data || UNIT_TYPES_BY_PROPERTY);
                setProject(data);
                setFormData({
                    name: data.name || "",
                    builder_name: data.builderName || data.builder_name || "",
                    city: data.city || "",
                    locality: data.locality || "",
                    property_type: Array.isArray(data.propertyType) ? data.propertyType[0] : (data.propertyType || data.property_type || ""),
                    unit_types: data.unitTypes || data.unit_types || [],
                    budget_min: data.budgetMin || data.budget_min || "",
                    budget_max: data.budgetMax || data.budget_max || "",
                    highlights:
                        (data.highlights && data.highlights.length > 0)
                            ? data.highlights
                            : [""],
                    amenities: data.amenities || [],
                    images: data.images || [],
                    floor_plans: data.floorPlans || data.floor_plans || [],
                    video_url: data.videoUrl || data.video_url || "",
                    card_image: data.cardImage || data.card_image || "",
                    hero_image: data.heroImage || data.hero_image || "",
                    project_logo: data.projectLogo || data.project_logo || "",
                    advertiser_logo: data.advertiserLogo || data.advertiser_logo || "",
                    about_project: data.aboutProject || data.about_project || "",
                    builder_description:
                        data.builderDescription || data.builder_description || "",
                    possession_status: data.possessionStatus || data.possession_status || "",
                    estimated_possession_date: (() => {
                        const date = data.estimatedPossessionDate;
                        if (!date) return "";
                        try {
                            // Handle both string and Date objects
                            const dateStr = typeof date === 'string' ? date : new Date(date).toISOString();
                            return dateStr.substring(0, 7); // Convert to YYYY-MM format
                        } catch (error) {
                            console.warn('Invalid estimated possession date:', date);
                            return "";
                        }
                    })(),
                    rera_id: data.reraId || data.rera_id || "",
                    usp_1: data.usp1 || "",
                    usp_2: data.usp2 || "",
                });
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

    // Auto-clear estimated possession date when possession status changes from "Under Construction"
    useEffect(() => {
        if (!formData.possession_status?.toLowerCase().includes("under construction") && formData.estimated_possession_date) {
            setFormData(prev => ({ ...prev, estimated_possession_date: "" }));
        }
    }, [formData.possession_status, formData.estimated_possession_date]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUnitTypeToggle = (unit: string) => {
        setFormData((prev) => ({
            ...prev,
            unit_types: prev.unit_types.includes(unit)
                ? prev.unit_types.filter((u) => u !== unit)
                : [...prev.unit_types, unit],
        }));
    };

    const handleAmenityToggle = (amenity: string) => {
        setFormData((prev) => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter((a) => a !== amenity)
                : [...prev.amenities, amenity],
        }));
    };

    const handleHighlightChange = (index: number, value: string) => {
        const newHighlights = [...formData.highlights];
        newHighlights[index] = value;
        setFormData({ ...formData, highlights: newHighlights });
    };

    const addHighlight = () => {
        setFormData({ ...formData, highlights: [...formData.highlights, ""] });
    };

    const removeHighlight = (index: number) => {
        if (formData.highlights.length > 1) {
            setFormData({
                ...formData,
                highlights: formData.highlights.filter((_, i) => i !== index),
            });
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length === 0) return;

        setUploadingImages(true);
        try {
            const uploadPromises = files.map((file) => uploadAPI.uploadFile(file));
            const responses = await Promise.all(uploadPromises);
            const urls = responses.map((res) => res.data.url);
            setFormData((prev) => ({
                ...prev,
                images: [...prev.images, ...urls],
            }));
            toast.success(`${files.length} image(s) uploaded`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload images");
        } finally {
            setUploadingImages(false);
        }
    };

    const handleFloorPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length === 0) return;

        setUploadingFloorPlans(true);
        try {
            const uploadPromises = files.map((file) => uploadAPI.uploadFile(file));
            const responses = await Promise.all(uploadPromises);
            const urls = responses.map((res) => res.data.url);
            // Assuming simplified floor plans (just URLs) for now, matching AddProject
            // But if backend accepts objects, we might need to adjust.
            // The formData init handles existing ones.
            const newFloorPlans = urls.map(url => ({ url }));
            setFormData((prev) => ({
                ...prev,
                floor_plans: [...prev.floor_plans, ...newFloorPlans],
            }));
            toast.success(`${files.length} floor plan(s) uploaded`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload floor plans");
        } finally {
            setUploadingFloorPlans(false);
        }
    };

    const removeImage = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
    };

    const removeFloorPlan = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            floor_plans: prev.floor_plans.filter((_, i) => i !== index),
        }));
    };

    const handleSave = async () => {
        if (
            !formData.name ||
            !formData.builder_name ||
            !formData.city ||
            !formData.locality
        ) {
            toast.error("Please fill all required fields");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                builder_name: formData.builder_name,
                city: formData.city,
                locality: formData.locality,
                property_type: formData.property_type,
                unit_types: formData.unit_types,
                budget_min: parseFloat(formData.budget_min) || 0,
                budget_max: parseFloat(formData.budget_max) || 0,
                highlights: formData.highlights.filter((h) => h.trim()),
                amenities: formData.amenities,
                images: formData.images,
                floor_plans: formData.floor_plans,
                video_url: formData.video_url,
                card_image: formData.card_image,
                hero_image: formData.hero_image,
                project_logo: formData.project_logo,
                advertiser_logo: formData.advertiser_logo,
                about_project: formData.about_project,
                builder_description: formData.builder_description,
                possession_status: formData.possession_status,

                rera_id: formData.rera_id,
                usp_1: formData.usp_1,
                usp_2: formData.usp_2,
            };

            await advertiserAPI.updateProject(id, payload);
            toast.success("Project updated successfully");

            // Refresh project data
            const res = await advertiserAPI.getProject(id);
            setProject(res.data);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.detail || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "LIVE":
            case "live":
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Live</Badge>;
            case "APPROVED_AWAITING_PLACEMENT":
            case "approved_awaiting_placement":
                return (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        Awaiting Placement
                    </Badge>
                );
            case "SUBMITTED_FOR_REVIEW":
            case "submitted_for_review":
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Under Review</Badge>;
            case "NEEDS_CHANGES":
            case "needs_changes":
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Needs Changes</Badge>;
            case "DRAFT":
            case "draft":
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Draft</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // Determine editability - Advertisers can no longer edit after creation
    const canEdit = false;

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
                        <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(project.status)}
                            {project.landingPageSlug && (
                                <Link
                                    href={`/p/${project.landingPageSlug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    Landing Page <ExternalLink className="w-3 h-3" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {project.status === "LIVE" && (
                        <Link
                            href={`/project/${project.slug || project.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="outline" className="gap-2">
                                <Eye className="w-4 h-4" />
                                Preview
                            </Button>
                        </Link>
                    )}
                    {canEdit && (
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Admin Feedback */}
            {(project.reviewComment || project.admin_comment) &&
                (project.status === "NEEDS_CHANGES" || project.status === "needs_changes") && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <h3 className="font-medium text-red-800 mb-1">Admin Feedback</h3>
                        <p className="text-red-700">
                            {project.reviewComment || project.admin_comment}
                        </p>
                    </div>
                )}

            {/* Read-only notice */}
            {!canEdit && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800">
                        <strong>Edit Restricted:</strong> This project is created and can only be modified by an Administrator.
                    </p>
                </div>
            )}

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
                <TabsContent value="basic" className="space-y-6 max-w-4xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Project Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Project Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="builder_name">Builder Name *</Label>
                                    <Input
                                        id="builder_name"
                                        name="builder_name"
                                        value={formData.builder_name}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City *</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="locality">Locality *</Label>
                                    <Input
                                        id="locality"
                                        name="locality"
                                        value={formData.locality}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Property Type *</Label>
                                    <Select
                                        value={formData.property_type}
                                        onValueChange={(v) =>
                                            setFormData({ ...formData, property_type: v, unit_types: [] })
                                        }
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(PROPERTY_TYPES).map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="budget_min">Min Budget (₹)</Label>
                                    <Input
                                        id="budget_min"
                                        name="budget_min"
                                        type="number"
                                        value={formData.budget_min}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="budget_max">Max Budget (₹)</Label>
                                    <Input
                                        id="budget_max"
                                        name="budget_max"
                                        type="number"
                                        value={formData.budget_max}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Possession Status</Label>
                                    <Select
                                        value={formData.possession_status}
                                        onValueChange={(v) =>
                                            setFormData({ ...formData, possession_status: v })
                                        }
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {POSSESSION_STATUS.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rera_id">RERA ID</Label>
                                    <Input
                                        id="rera_id"
                                        name="rera_id"
                                        value={formData.rera_id}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="usp_1">Premium USP 1</Label>
                                    <Input
                                        id="usp_1"
                                        name="usp_1"
                                        value={formData.usp_1}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        maxLength={50}
                                        className="h-11"
                                        placeholder="e.g. Waterfront View"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="usp_2">Premium USP 2</Label>
                                    <Input
                                        id="usp_2"
                                        name="usp_2"
                                        value={formData.usp_2}
                                        onChange={handleInputChange}
                                        disabled={!canEdit}
                                        maxLength={50}
                                        className="h-11"
                                        placeholder="e.g. 5 mins to Airport"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Unit Types</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                {(() => {
                                    const allowedUnitTypeNames = formData.property_type ? (propertyUnitMappings[formData.property_type] || []) : [];

                                    // If property type is selected but no mappings found, show all units as fallback
                                    const unitsToShow = allowedUnitTypeNames.length > 0
                                        ? allowedUnitTypeNames
                                        : unitTypes.map(u => u.name);

                                    if (unitsToShow.length === 0 && unitTypes.length > 0) {
                                        // If still 0, maybe the names are differently stored (fallback to all)
                                        return unitTypes.map(u => u.name).map(unitName => (
                                            <label key={unitName} className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={formData.unit_types.includes(unitName)}
                                                    onCheckedChange={() => canEdit && handleUnitTypeToggle(unitName)}
                                                    disabled={!canEdit}
                                                />
                                                <span className="text-sm">{unitName}</span>
                                            </label>
                                        ));
                                    }

                                    return unitsToShow.map((unit) => (
                                        <label
                                            key={unit}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={formData.unit_types.includes(unit)}
                                                onCheckedChange={() =>
                                                    canEdit && handleUnitTypeToggle(unit)
                                                }
                                                disabled={!canEdit}
                                            />
                                            <span className="text-sm">{unit}</span>
                                        </label>
                                    ));
                                })()}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Amenities</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {AMENITIES.map((amenity) => (
                                    <label
                                        key={amenity}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={formData.amenities.includes(amenity)}
                                            onCheckedChange={() =>
                                                canEdit && handleAmenityToggle(amenity)
                                            }
                                            disabled={!canEdit}
                                        />
                                        <span className="text-sm">{amenity}</span>
                                    </label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Gallery Tab */}
                <TabsContent value="gallery" className="space-y-6 max-w-4xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Project Images ({formData.images.length})</span>
                                {canEdit && (
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={uploadingImages}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={uploadingImages}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            {uploadingImages ? "Uploading..." : "Upload Images"}
                                        </Button>
                                    </label>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Hero Image Section */}
                            <div className="border-b pb-6">
                                <Label className="mb-2 block">Hero Image (Banner)</Label>
                                <div className="flex items-start gap-4">
                                    {formData.hero_image ? (
                                        <div className="relative w-full md:w-2/3 aspect-[21/9] rounded-lg overflow-hidden bg-slate-100 group border">
                                            <img
                                                src={getImageUrl(formData.hero_image)}
                                                alt="Hero Image"
                                                className="w-full h-full object-cover"
                                            />
                                            {canEdit && (
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, hero_image: "" }))}
                                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full md:w-2/3 aspect-[21/9] rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400">
                                            <ImageIcon className="w-12 h-12" />
                                        </div>
                                    )}

                                    {canEdit && (
                                        <div className="space-y-2">
                                            <label className="cursor-pointer inline-flex">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const toastId = toast.loading("Uploading hero image...");
                                                        try {
                                                            const res = await uploadAPI.uploadFile(file);
                                                            setFormData(prev => ({ ...prev, hero_image: res.data.url }));
                                                            toast.success("Hero image uploaded", { id: toastId });
                                                        } catch (err) {
                                                            toast.error("Upload failed", { id: toastId });
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                                <div className="h-9 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2">
                                                    <Upload className="w-4 h-4" />
                                                    Upload Hero Image
                                                </div>
                                            </label>
                                            <p className="text-xs text-muted-foreground max-w-xs">
                                                High-quality banner image for the top of the project page.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Logos Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
                                {/* Project Logo */}
                                <div>
                                    <Label className="mb-2 block">Project Logo</Label>
                                    <div className="flex items-start gap-4">
                                        {formData.project_logo ? (
                                            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-slate-100 group border">
                                                <img
                                                    src={getImageUrl(formData.project_logo)}
                                                    alt="Project Logo"
                                                    className="w-full h-full object-contain p-2"
                                                />
                                                {canEdit && (
                                                    <button
                                                        onClick={() => setFormData(prev => ({ ...prev, project_logo: "" }))}
                                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400">
                                                <Building2 className="w-8 h-8" />
                                            </div>
                                        )}

                                        {canEdit && (
                                            <div className="space-y-2">
                                                <label className="cursor-pointer inline-flex">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const toastId = toast.loading("Uploading project logo...");
                                                            try {
                                                                const res = await uploadAPI.uploadFile(file);
                                                                setFormData(prev => ({ ...prev, project_logo: res.data.url }));
                                                                toast.success("Project logo uploaded", { id: toastId });
                                                            } catch (err) {
                                                                toast.error("Upload failed", { id: toastId });
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <div className="h-9 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2">
                                                        <Upload className="w-4 h-4" />
                                                        Upload Logo
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Advertiser Logo */}
                                <div>
                                    <Label className="mb-2 block">Advertiser/Builder Logo</Label>
                                    <div className="flex items-start gap-4">
                                        {formData.advertiser_logo ? (
                                            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-slate-100 group border">
                                                <img
                                                    src={getImageUrl(formData.advertiser_logo)}
                                                    alt="Advertiser Logo"
                                                    className="w-full h-full object-contain p-2"
                                                />
                                                {canEdit && (
                                                    <button
                                                        onClick={() => setFormData(prev => ({ ...prev, advertiser_logo: "" }))}
                                                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400">
                                                <Building2 className="w-8 h-8" />
                                            </div>
                                        )}

                                        {canEdit && (
                                            <div className="space-y-2">
                                                <label className="cursor-pointer inline-flex">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const toastId = toast.loading("Uploading advertiser logo...");
                                                            try {
                                                                const res = await uploadAPI.uploadFile(file);
                                                                setFormData(prev => ({ ...prev, advertiser_logo: res.data.url }));
                                                                toast.success("Advertiser logo uploaded", { id: toastId });
                                                            } catch (err) {
                                                                toast.error("Upload failed", { id: toastId });
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <div className="h-9 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2">
                                                        <Upload className="w-4 h-4" />
                                                        Upload Logo
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Image Section */}
                            <div className="border-b pb-6">
                                <Label className="mb-2 block">Property Card Image (Main Thumbnail)</Label>
                                <div className="flex items-start gap-4">
                                    {formData.card_image ? (
                                        <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-slate-100 group border">
                                            <img
                                                src={getImageUrl(formData.card_image)}
                                                alt="Card Image"
                                                className="w-full h-full object-cover"
                                            />
                                            {canEdit && (
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, card_image: "" }))}
                                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-40 aspect-video rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 text-slate-400">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )}

                                    {canEdit && (
                                        <div className="space-y-2">
                                            <label className="cursor-pointer inline-flex">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const toastId = toast.loading("Uploading card image...");
                                                        try {
                                                            const res = await uploadAPI.uploadFile(file);
                                                            setFormData(prev => ({ ...prev, card_image: res.data.url }));
                                                            toast.success("Card image uploaded", { id: toastId });
                                                        } catch (err) {
                                                            toast.error("Upload failed", { id: toastId });
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                                <div className="h-9 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors flex items-center gap-2">
                                                    <Upload className="w-4 h-4" />
                                                    Upload Card Image
                                                </div>
                                            </label>
                                            <p className="text-xs text-muted-foreground max-w-xs">
                                                This image will be displayed on the project card in search results and listings.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Existing Gallery Section */}
                            <div>
                                <Label className="mb-2 block">Gallery Images</Label>
                                {formData.images.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {formData.images.map((url, index) => (
                                            <div
                                                key={index}
                                                className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 group"
                                            >
                                                <img
                                                    src={getImageUrl(url)}
                                                    alt={`Gallery ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                {index === 0 && (
                                                    <span className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded-full">
                                                        Cover
                                                    </span>
                                                )}
                                                {canEdit && (
                                                    <button
                                                        onClick={() => removeImage(index)}
                                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                                        <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500">No images uploaded yet</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Floor Plans Tab */}
                <TabsContent value="floorplans" className="space-y-6 max-w-4xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Floor Plans ({formData.floor_plans.length})</span>
                                {canEdit && (
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFloorPlanUpload}
                                            className="hidden"
                                            disabled={uploadingFloorPlans}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={uploadingFloorPlans}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            {uploadingFloorPlans
                                                ? "Uploading..."
                                                : "Upload Floor Plans"}
                                        </Button>
                                    </label>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {formData.floor_plans.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {formData.floor_plans.map((fp, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 group border"
                                        >
                                            <img
                                                src={getImageUrl(fp?.url || fp)}
                                                alt={`Floor Plan ${index + 1}`}
                                                className="w-full h-full object-contain p-2"
                                            />
                                            {canEdit && (
                                                <button
                                                    onClick={() => removeFloorPlan(index)}
                                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                                    <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No floor plans uploaded yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-6 max-w-4xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Video</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="video_url">YouTube / Vimeo URL</Label>
                                <Input
                                    id="video_url"
                                    name="video_url"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    value={formData.video_url}
                                    onChange={handleInputChange}
                                    disabled={!canEdit}
                                    className="h-11"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Project Highlights</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {formData.highlights.map((highlight, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder="e.g., 5 mins from Metro Station"
                                        value={highlight}
                                        onChange={(e) =>
                                            handleHighlightChange(index, e.target.value)
                                        }
                                        disabled={!canEdit}
                                        className="h-10"
                                    />
                                    {canEdit && formData.highlights.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeHighlight(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {canEdit && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addHighlight}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Highlight
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">About the Project</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                name="about_project"
                                placeholder="Describe the project in detail..."
                                value={formData.about_project}
                                onChange={handleInputChange}
                                disabled={!canEdit}
                                rows={6}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">About the Builder</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                name="builder_description"
                                placeholder="Describe the builder/developer..."
                                value={formData.builder_description}
                                onChange={handleInputChange}
                                disabled={!canEdit}
                                rows={4}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
