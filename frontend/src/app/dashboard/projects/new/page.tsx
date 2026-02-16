"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import {
    Building2,
    Upload,
    X,
    Plus,
    Image as ImageIcon,
    FileText,
    IndianRupee,
    Layers,
    ArrowLeft,
} from "lucide-react";
import { UNIT_TYPES_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/constants";

export default function AddProjectPage() {
    const router = useRouter();
    const [availablePackages, setAvailablePackages] = useState<any[]>([]);
    const [options, setOptions] = useState<{
        amenities: any[];
        unit_types: any[];
        cities: any[];
        locations: any[];
        property_types: any[];
        possession_statuses: any[];
    }>({
        amenities: [],
        unit_types: [],
        cities: [],
        locations: [],
        property_types: [],
        possession_statuses: [],
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [uploadingFloorPlans, setUploadingFloorPlans] = useState(false);
    const [uploadingProjectLogo, setUploadingProjectLogo] = useState(false);
    const [uploadingBuilderLogo, setUploadingBuilderLogo] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");
    const [propertyUnitMappings, setPropertyUnitMappings] = useState<Record<string, string[]>>({});

    const [formData, setFormData] = useState({
        package_id: "",
        name: "",
        builder_name: "",
        city: "",
        locality: "",
        address: "",
        property_type: "",
        unit_types: [] as string[],
        budget_min: "",
        budget_max: "",
        price: "",
        price_details: "",
        highlights: [""] as string[],
        amenities: [] as string[],
        images: [] as string[],
        floor_plans: [] as any[], // { url, description, price }
        video_url: "",
        about_project: "",
        builder_description: "",
        possession_status: "",
        estimated_possession_date: "",
        rera_id: "",
        usp_1: "",
        usp_2: "",
        project_logo: "",
        advertiser_logo: "",
    });
    const [isManualLocality, setIsManualLocality] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [packagesRes, optionsRes, mappingsRes] = await Promise.all([
                    advertiserAPI.getAvailablePackages(),
                    publicAPI.getOptions(),
                    publicAPI.getPropertyUnitMappings().catch(err => {
                        console.error('Failed to load property-unit mappings, using fallback', err);
                        return { data: UNIT_TYPES_BY_PROPERTY };
                    })
                ]);
                setAvailablePackages(packagesRes.data || []);
                setPropertyUnitMappings(mappingsRes.data || UNIT_TYPES_BY_PROPERTY);
                setOptions(optionsRes.data || {
                    amenities: [],
                    unit_types: [],
                    cities: [],
                    locations: [],
                    property_types: [],
                    possession_statuses: [],
                });

                if (packagesRes.data?.length === 0) {
                    toast.error(
                        "No available packages. Request and get a package activated first."
                    );
                    router.push("/dashboard/packages");
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load form data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    // Auto-clear estimated possession date when possession status changes from "Under Construction"
    useEffect(() => {
        if (!formData.possession_status?.toLowerCase().includes("under construction") && formData.estimated_possession_date) {
            setFormData(prev => ({ ...prev, estimated_possession_date: "" }));
        }
    }, [formData.possession_status]);

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
        setFormData({
            ...formData,
            highlights: formData.highlights.filter((_, i) => i !== index),
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length === 0) return;

        setUploadingImages(true);
        try {
            // Upload sequentially or parallel - usually parallel is fine
            // Using uploadAPI.uploadFile individually
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
            const newFloorPlans = responses.map((res) => ({
                url: res.data.url,
                description: "",
                price: "",
            }));
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

    const handleProjectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingProjectLogo(true);
        try {
            const res = await uploadAPI.uploadFile(file);
            setFormData((prev) => ({ ...prev, project_logo: res.data.url }));
            toast.success("Project logo uploaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload project logo");
        } finally {
            setUploadingProjectLogo(false);
        }
    };

    const handleBuilderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingBuilderLogo(true);
        try {
            const res = await uploadAPI.uploadFile(file);
            setFormData((prev) => ({ ...prev, advertiser_logo: res.data.url }));
            toast.success("Builder logo uploaded");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload builder logo");
        } finally {
            setUploadingBuilderLogo(false);
        }
    };

    const removeImage = (index: number) => {
        setFormData({
            ...formData,
            images: formData.images.filter((_, i) => i !== index),
        });
    };

    const removeFloorPlan = (index: number) => {
        setFormData({
            ...formData,
            floor_plans: formData.floor_plans.filter((_, i) => i !== index),
        });
    };

    const filteredLocations = formData.city
        ? (options.locations || []).filter((loc) => {
            const city = (options.cities || []).find((c) => c.name === formData.city);
            return city && loc.parentId === city.id;
        })
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.package_id) {
            toast.error("Please select a package");
            setActiveTab("basic");
            return;
        }
        if (
            !formData.name ||
            !formData.builder_name ||
            !formData.city ||
            !formData.locality
        ) {
            toast.error("Please fill in all required fields in Basic Info");
            setActiveTab("basic");
            return;
        }
        if (!formData.property_type) {
            toast.error("Please select property type");
            setActiveTab("basic");
            return;
        }
        if (formData.unit_types.length === 0) {
            toast.error("Please select at least one unit type");
            setActiveTab("basic");
            return;
        }
        if (!formData.budget_min || !formData.budget_max) {
            toast.error("Please enter budget range");
            setActiveTab("basic");
            return;
        }
        if (!formData.possession_status) {
            toast.error("Please select possession status");
            setActiveTab("basic");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                estimatedPossessionDate: formData.estimated_possession_date ? new Date(formData.estimated_possession_date).toISOString() : null,
                budget_min: parseFloat(formData.budget_min),
                budget_max: parseFloat(formData.budget_max),
                highlights: formData.highlights.filter((h) => h.trim() !== ""),
            };

            await advertiserAPI.createProject(payload);
            toast.success(
                "Project submitted for review! Admin will review and place it on a landing page."
            );
            router.push("/dashboard/projects");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Failed to create project");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="font-heading text-2xl font-bold">Add Project</h1>
                    <p className="text-muted-foreground">Create a new property listing</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4 w-full mb-6 max-w-2xl bg-slate-100 p-1">
                        <TabsTrigger value="basic" className="gap-2">
                            <Building2 className="w-4 h-4" />
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
                        {/* Package Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Select Package</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select
                                    value={formData.package_id}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, package_id: value })
                                    }
                                >
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Choose a package to use" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(availablePackages || []).map((pkg) => (
                                            <SelectItem key={pkg.id} value={pkg.id}>
                                                {pkg.packageDefinition?.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        {/* Logos */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Logos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid sm:grid-cols-2 gap-6">
                                    {/* Project Logo */}
                                    <div className="space-y-2">
                                        <Label>Project Logo</Label>
                                        <div className="flex items-center gap-4">
                                            {formData.project_logo ? (
                                                <div className="relative w-24 h-24 rounded-lg border overflow-hidden">
                                                    <img
                                                        src={getImageUrl(formData.project_logo)}
                                                        alt="Project Logo"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setFormData({ ...formData, project_logo: "" })
                                                        }
                                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleProjectLogoUpload}
                                                        className="hidden"
                                                        disabled={uploadingProjectLogo}
                                                    />
                                                    {uploadingProjectLogo ? (
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-slate-400" />
                                                            <span className="text-xs text-slate-500 mt-1">
                                                                Upload
                                                            </span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* Builder Logo */}
                                    <div className="space-y-2">
                                        <Label>Builder / Advertiser Logo</Label>
                                        <div className="flex items-center gap-4">
                                            {formData.advertiser_logo ? (
                                                <div className="relative w-24 h-24 rounded-lg border overflow-hidden">
                                                    <img
                                                        src={getImageUrl(formData.advertiser_logo)}
                                                        alt="Builder Logo"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setFormData({ ...formData, advertiser_logo: "" })
                                                        }
                                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center p-0.5"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleBuilderLogoUpload}
                                                        className="hidden"
                                                        disabled={uploadingBuilderLogo}
                                                    />
                                                    {uploadingBuilderLogo ? (
                                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-slate-400" />
                                                            <span className="text-xs text-slate-500 mt-1">
                                                                Upload
                                                            </span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Project Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Project Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Project Name *</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="e.g., Green Valley Heights"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="builder_name">
                                            Builder / Developer Name *
                                        </Label>
                                        <Input
                                            id="builder_name"
                                            name="builder_name"
                                            placeholder="e.g., ABC Developers"
                                            value={formData.builder_name}
                                            onChange={handleInputChange}
                                            className="h-12"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>City *</Label>
                                        <Select
                                            value={formData.city}
                                            onValueChange={(value) => {
                                                setFormData({ ...formData, city: value, locality: "" });
                                                setIsManualLocality(false);
                                            }}
                                        >
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="Select city" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(options.cities || []).map((city) => (
                                                    <SelectItem key={city.id} value={city.name}>
                                                        {city.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Locality *</Label>
                                        {isManualLocality ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Enter locality manually"
                                                    value={formData.locality}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, locality: e.target.value })
                                                    }
                                                    className="h-12"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => {
                                                        setIsManualLocality(false);
                                                        setFormData({ ...formData, locality: "" });
                                                    }}
                                                    type="button"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Select
                                                value={formData.locality}
                                                onValueChange={(value) => {
                                                    if (value === "__manual__") {
                                                        setIsManualLocality(true);
                                                        setFormData({ ...formData, locality: "" });
                                                    } else {
                                                        setFormData({ ...formData, locality: value });
                                                    }
                                                }}
                                                disabled={!formData.city}
                                            >
                                                <SelectTrigger className="h-12">
                                                    <SelectValue
                                                        placeholder={
                                                            formData.city
                                                                ? "Select locality"
                                                                : "Select city first"
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {filteredLocations.map((loc) => (
                                                        <SelectItem key={loc.id} value={loc.name}>
                                                            {loc.name}
                                                        </SelectItem>
                                                    ))}
                                                    <SelectItem value="__manual__" className="font-medium text-primary">
                                                        + Enter manually
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Full Address</Label>
                                    <Textarea
                                        id="address"
                                        name="address"
                                        placeholder="Complete project address for display"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        rows={2}
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Property Type *</Label>
                                        <Select
                                            value={formData.property_type}
                                            onValueChange={(value) => {
                                                // Clear selections that might be invalid for the new property type
                                                // (Though they stay in formData until next save, it's better to reset if UX requires)
                                                // To keep it simple but safe: we reset unit_types on property type change
                                                setFormData({ ...formData, property_type: value, unit_types: [] });
                                            }}
                                        >
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(options.property_types || []).map((type) => (
                                                    <SelectItem key={type.id} value={type.name}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Possession Status *</Label>
                                        <Select
                                            value={formData.possession_status}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, possession_status: value })
                                            }
                                        >
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(options.possession_statuses || []).map((status) => (
                                                    <SelectItem key={status.id} value={status.name}>
                                                        {status.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Conditional: Estimated Possession Date (shown only for Under Construction) */}
                                {formData.possession_status?.toLowerCase().includes("under construction") && (
                                    <div className="space-y-2">
                                        <Label htmlFor="estimated_possession_date">Estimated Completion Date</Label>
                                        <Input
                                            id="estimated_possession_date"
                                            name="estimated_possession_date"
                                            type="month"
                                            value={formData.estimated_possession_date}
                                            onChange={handleInputChange}
                                            className="h-12"
                                        />
                                        <p className="text-xs text-muted-foreground">Select the expected month and year of completion</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="rera_id">RERA ID (Optional)</Label>
                                    <Input
                                        id="rera_id"
                                        name="rera_id"
                                        placeholder="e.g., RAJ/P/2023/12345"
                                        value={formData.rera_id}
                                        onChange={handleInputChange}
                                        className="h-12"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="usp_1">Premium USP 1</Label>
                                        <Input
                                            id="usp_1"
                                            name="usp_1"
                                            value={formData.usp_1}
                                            onChange={handleInputChange}
                                            maxLength={50}
                                            placeholder="e.g. Waterfront View"
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="usp_2">Premium USP 2</Label>
                                        <Input
                                            id="usp_2"
                                            name="usp_2"
                                            value={formData.usp_2}
                                            onChange={handleInputChange}
                                            maxLength={50}
                                            placeholder="e.g. 5 mins to Airport"
                                            className="h-12"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Unit Types */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Unit Types *</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-3">
                                    {(() => {
                                        const allowedUnitTypeNames = formData.property_type ? (propertyUnitMappings[formData.property_type] || []) : [];

                                        // If property type is selected but no mappings found, show a message
                                        // (Fallback for backward compatibility: if mappings are empty but property_type is set, it might be a new property type without mapping yet)
                                        const unitsToShow = allowedUnitTypeNames.length > 0
                                            ? allowedUnitTypeNames
                                            : options.unit_types.map(u => u.name);

                                        return unitsToShow.map((unit) => (
                                            <label
                                                key={unit}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer transition-colors ${formData.unit_types.includes(unit)
                                                    ? "bg-primary text-white border-primary"
                                                    : "bg-white border-slate-200 hover:border-primary"
                                                    }`}
                                            >
                                                <Checkbox
                                                    checked={formData.unit_types.includes(unit)}
                                                    onCheckedChange={() => handleUnitTypeToggle(unit)}
                                                    className="hidden"
                                                />
                                                {unit}
                                            </label>
                                        ));
                                    })()}
                                    {formData.property_type && propertyUnitMappings[formData.property_type] && propertyUnitMappings[formData.property_type].length === 0 && (
                                        <p className="text-sm text-yellow-600 w-full">
                                            No unit types configured for this property type. Showing all units.
                                            (Type: {formData.property_type})
                                        </p>
                                    )}
                                    {!formData.property_type && (
                                        <p className="text-sm text-slate-500 w-full">
                                            Select a property type to see available unit configurations.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Price & Budget */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <IndianRupee className="w-5 h-5" />
                                    Price & Budget
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Display Price</Label>
                                        <Input
                                            id="price"
                                            name="price"
                                            placeholder="e.g., ₹45 Lac onwards"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="budget_min">Min Budget (₹) *</Label>
                                        <Input
                                            id="budget_min"
                                            name="budget_min"
                                            type="number"
                                            placeholder="e.g., 4500000"
                                            value={formData.budget_min}
                                            onChange={handleInputChange}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="budget_max">Max Budget (₹) *</Label>
                                        <Input
                                            id="budget_max"
                                            name="budget_max"
                                            type="number"
                                            placeholder="e.g., 15000000"
                                            value={formData.budget_max}
                                            onChange={handleInputChange}
                                            className="h-12"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price_details">Price Details</Label>
                                    <Textarea
                                        id="price_details"
                                        name="price_details"
                                        placeholder="Detailed pricing, payment plans, offers, etc."
                                        value={formData.price_details}
                                        onChange={handleInputChange}
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Amenities */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Amenities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {(options.amenities || []).map((a) => a.name).map((amenity) => (
                                        <label
                                            key={amenity}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${formData.amenities.includes(amenity)
                                                ? "bg-primary/10 border-primary text-primary"
                                                : "bg-white border-slate-200 hover:border-slate-300"
                                                }`}
                                        >
                                            <Checkbox
                                                checked={formData.amenities.includes(amenity)}
                                                onCheckedChange={() => handleAmenityToggle(amenity)}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                            {amenity}
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Highlights */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Highlights</CardTitle>
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
                                            className="h-12"
                                        />
                                        {formData.highlights.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeHighlight(index)}
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <X className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addHighlight}
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Highlight
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Gallery Tab */}
                    <TabsContent value="gallery" className="space-y-6 max-w-4xl">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5" />
                                    Project Gallery
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                    {formData.images.map((url, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-video rounded-lg overflow-hidden bg-slate-100"
                                        >
                                            <img
                                                src={getImageUrl(url)}
                                                alt={`Project ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            {index === 0 && (
                                                <span className="absolute bottom-2 left-2 text-xs bg-primary text-white px-2 py-1 rounded">
                                                    Cover
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                    <label className="aspect-video rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={uploadingImages}
                                        />
                                        {uploadingImages ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        ) : (
                                            <>
                                                <Plus className="w-8 h-8 text-slate-300 mb-2" />
                                                <span className="text-sm text-slate-500">
                                                    Add Images
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Supported formats: JPG, PNG, WEBP. Max size: 5MB per image.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Floor Plans Tab */}
                    <TabsContent value="floorplans" className="space-y-6 max-w-4xl">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Layers className="w-5 h-5" />
                                    Floor Plans
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                    {formData.floor_plans.map((fp, index) => (
                                        <div
                                            key={index}
                                            className="relative rounded-lg overflow-hidden bg-slate-100 border p-2 space-y-2"
                                        >
                                            <div className="aspect-[4/3] relative rounded-md overflow-hidden bg-white mb-2">
                                                <img
                                                    src={getImageUrl(fp?.url || fp)}
                                                    alt={`Floor Plan ${index + 1}`}
                                                    className="w-full h-full object-contain"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeFloorPlan(index)}
                                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                <Input
                                                    placeholder="Config / Type (e.g. 2 BHK)"
                                                    value={fp.description || ""}
                                                    onChange={(e) => {
                                                        const newPlans = [...formData.floor_plans];
                                                        // Ensure object structure
                                                        if (typeof newPlans[index] === 'string') {
                                                            newPlans[index] = { url: newPlans[index], description: e.target.value, price: "" };
                                                        } else {
                                                            newPlans[index].description = e.target.value;
                                                        }
                                                        setFormData({ ...formData, floor_plans: newPlans });
                                                    }}
                                                    className="h-8 text-xs"
                                                />
                                                <Input
                                                    placeholder="Price (e.g. ₹45 L)"
                                                    value={fp.price || ""}
                                                    onChange={(e) => {
                                                        const newPlans = [...formData.floor_plans];
                                                        if (typeof newPlans[index] === 'string') {
                                                            newPlans[index] = { url: newPlans[index], description: "", price: e.target.value };
                                                        } else {
                                                            newPlans[index].price = e.target.value;
                                                        }
                                                        setFormData({ ...formData, floor_plans: newPlans });
                                                    }}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <label className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFloorPlanUpload}
                                            className="hidden"
                                            disabled={uploadingFloorPlans}
                                        />
                                        {uploadingFloorPlans ? (
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        ) : (
                                            <>
                                                <Plus className="w-8 h-8 text-slate-300 mb-2" />
                                                <span className="text-sm text-slate-500">
                                                    Add Floor Plans
                                                </span>
                                            </>
                                        )}
                                    </label>
                                </div>
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
                                        className="h-12"
                                    />
                                </div>
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
                                    rows={8}
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
                                    rows={6}
                                />
                            </CardContent>
                        </Card>

                        <div className="flex justify-end pt-6">
                            <Button size="lg" disabled={submitting} type="submit">
                                {submitting ? "Submitting..." : "Submit Project"}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </form>
        </div>
    );
}
