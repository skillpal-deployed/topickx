"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Upload, Plus, Trash, Eye, CheckCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { publicAPI } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { adminAPI, uploadAPI } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { UNIT_TYPES_BY_PROPERTY, PROPERTY_TYPES } from "@/lib/constants";

export default function EditProjectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [amenityOptions, setAmenityOptions] = useState<any[]>([]);
    const [cityOptions, setCityOptions] = useState<any[]>([]);
    const [localityOptions, setLocalityOptions] = useState<any[]>([]);
    const [propertyTypeOptions, setPropertyTypeOptions] = useState<any[]>([]);
    const [unitTypeOptions, setUnitTypeOptions] = useState<any[]>([]);
    const [possessionStatusOptions, setPossessionStatusOptions] = useState<any[]>([]);
    const [propertyUnitMappings, setPropertyUnitMappings] = useState<Record<string, string[]>>({});

    const [formData, setFormData] = useState({
        name: "",
        builderName: "",
        city: "",
        locality: "",
        address: "",
        price: "",
        priceDetails: "",
        reraId: "",
        possessionStatus: "",
        estimatedPossessionDate: "",
        aboutProject: "",
        builderDescription: "",
        amenities: [] as string[],
        seoTitle: "",
        seoDescription: "",
        slug: "",
        status: "",
        projectLogo: "",
        heroImage: "",
        advertiserLogo: "",
        images: [] as string[],
        floorPlans: [] as any[],
        videoUrl: "",
        cardImage: "",
        disclaimer: "",
        locationHighlights: [] as string[],
        budgetMin: 0,
        budgetMax: 0,
        propertyType: [] as string[],
        unitTypes: [] as string[],
        highlights: [] as string[],
        usp1: "",
        usp2: "",
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [projectRes, amenityRes, cityRes, localityRes, propTypeRes, unitTypeRes, possessionRes, mappingsRes] = await Promise.all([
                    adminAPI.getProject(projectId),
                    adminAPI.getOptions('amenity', { include_inactive: true }),
                    adminAPI.getOptions('city', { include_inactive: true }),
                    adminAPI.getOptions('location', { include_inactive: true }),
                    adminAPI.getOptions('property_type', { include_inactive: true }),
                    adminAPI.getOptions('unit_type', { include_inactive: true }),
                    adminAPI.getOptions('possession_status', { include_inactive: true }),
                    publicAPI.getPropertyUnitMappings().catch((err: any) => {
                        console.error('Failed to load property-unit mappings, using fallback', err);
                        return { data: UNIT_TYPES_BY_PROPERTY };
                    })
                ]);

                setPropertyUnitMappings(mappingsRes.data || UNIT_TYPES_BY_PROPERTY);

                // Helper to map values (names or IDs) to IDs based on available options
                const mapToIds = (values: string[] | string | undefined | any[], options: any[]) => {
                    if (!values) return [];
                    const arr = Array.isArray(values) ? values : [values];
                    return arr.map(val => {
                        // Convert to string to handle any type safely
                        // Handle objects with 'name' property (from resolved amenities)
                        const valStr = typeof val === 'object' && val !== null && val.name
                            ? String(val.name)
                            : String(val);
                        // Check if val is already an ID (exact match)
                        const idMatch = options.find(o => o.id === val || (typeof val === 'object' && val.name && o.name === val.name));
                        if (idMatch) return idMatch.id;
                        // Check if val is a Name (legacy data)
                        const nameMatch = options.find(o => o.name.toLowerCase() === valStr.toLowerCase() || (o.label && o.label.toLowerCase() === valStr.toLowerCase()));
                        return nameMatch ? nameMatch.id : valStr;
                    }).filter(Boolean); // Filter out nulls if any
                };

                const p = projectRes.data;
                const amOpts = amenityRes.data;
                const cityOpts = cityRes.data;
                const locOpts = localityRes.data;
                const propOpts = propTypeRes.data;
                const unitOpts = unitTypeRes.data;
                const possOpts = possessionRes.data;

                setFormData({
                    name: p.name || "",
                    builderName: p.builderName || "",
                    city: mapToIds(p.city, cityOpts)[0] || p.city || "",
                    locality: mapToIds(p.locality, locOpts)[0] || p.locality || "",
                    address: p.address || "",
                    price: p.price?.toString() || "",
                    priceDetails: p.priceDetails || "",
                    reraId: p.reraId || "",
                    possessionStatus: mapToIds(p.possessionStatus, possOpts)[0] || p.possessionStatus || "",
                    estimatedPossessionDate: (() => {
                        const date = p.estimatedPossessionDate;
                        if (!date) return "";
                        try {
                            const dateStr = typeof date === 'string' ? date : new Date(date).toISOString();
                            return dateStr.substring(0, 7);
                        } catch (error) {
                            console.warn('Invalid estimated possession date:', date);
                            return "";
                        }
                    })(),
                    aboutProject: p.aboutProject || "",
                    builderDescription: p.builderDescription || "",
                    amenities: mapToIds(p.amenities, amOpts),
                    seoTitle: p.seoTitle || "",
                    seoDescription: p.seoDescription || "",
                    slug: p.slug || "",
                    status: p.status,
                    projectLogo: p.projectLogo || "",
                    heroImage: p.heroImage || "",
                    advertiserLogo: p.advertiserLogo || "",
                    images: p.images || [],
                    floorPlans: p.floorPlans || [],
                    videoUrl: p.videoUrl || "",
                    cardImage: p.cardImage || "",
                    disclaimer: p.disclaimer || "",
                    locationHighlights: p.locationHighlights || [],
                    budgetMin: p.budgetMin || 0,
                    budgetMax: p.budgetMax || 0,
                    propertyType: mapToIds(p.propertyType, propOpts),
                    unitTypes: mapToIds(p.unitTypes, unitOpts),
                    highlights: p.highlights || [],
                    usp1: p.usp1 || "",
                    usp2: p.usp2 || "",
                });
                setAmenityOptions(amOpts);
                setCityOptions(cityOpts);
                setLocalityOptions(locOpts);
                setPropertyTypeOptions(propOpts);
                setUnitTypeOptions(unitOpts);
                setPossessionStatusOptions(possOpts);
            } catch (error) {
                console.error("Failed to load project", error);
                toast.error("Failed to load project details");
                router.push("/admin/projects");
            } finally {
                setIsLoading(false);
            }
        };

        if (projectId) {
            loadData();
        }
    }, [projectId, router]);

    // Auto-clear estimated possession date when possession status changes from "Under Construction"
    useEffect(() => {
        const possessionLabel = possessionStatusOptions.find(opt => opt.id === formData.possessionStatus)?.name || "";
        if (!possessionLabel.toLowerCase().includes("under construction") && formData.estimatedPossessionDate) {
            setFormData(prev => ({ ...prev, estimatedPossessionDate: "" }));
        }
    }, [formData.possessionStatus, formData.estimatedPossessionDate, possessionStatusOptions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => {
            const updates: any = { [name]: value };
            if (name === "city") {
                updates.locality = ""; // Clear locality on city change
            }
            return { ...prev, ...updates };
        });
    };

    const handleAmenityChange = (amenityId: string, checked: boolean) => {
        setFormData((prev) => {
            const newAmenities = checked
                ? [...prev.amenities, amenityId]
                : prev.amenities.filter((id) => id !== amenityId);
            return { ...prev, amenities: newAmenities };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        const toastId = toast.loading("Uploading image...");

        try {
            const formDataUpload = new FormData();
            formDataUpload.append("file", file);

            // Direct call to API not working with FormData in helper cleanly sometimes, 
            // but uploadAPI wrapper should handle it.
            const response = await uploadAPI.uploadFile(file);
            setFormData((prev) => ({ ...prev, [field]: response.data.url }));
            toast.success("Image uploaded", { id: toastId });
        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Upload failed", { id: toastId });
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const toastId = toast.loading(`Uploading ${e.target.files.length} images...`);
        try {
            const files = Array.from(e.target.files);
            const response = await uploadAPI.uploadFiles(files);

            // Assuming simplified response or handling multiple calls if needed. 
            // If uploadFiles not implementing batch, loop:
            // But checking api.ts, uploadFiles exists.

            // Wait, api.ts definition of uploadFiles takes File[] but returns one promise.
            // Let's assume it returns { urls: string[] } or similar.
            // Actually, backend check needed. backend/routes/upload.routes.ts.
            // If not supported, loop single uploads.

            // Fallback to single uploads for safety
            const urls = await Promise.all(files.map(f => uploadAPI.uploadFile(f).then(r => r.data.url)));

            setFormData((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
            toast.success("Gallery updated", { id: toastId });
        } catch (error) {
            console.error("Gallery upload failed", error);
            toast.error("Gallery upload failed", { id: toastId });
        }
    };

    const removeGalleryImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await adminAPI.updateProject(projectId, formData);
            toast.success("Project updated successfully");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update project");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReviewAction = async (action: string) => {
        try {
            await adminAPI.reviewProject(projectId, { action });
            toast.success(`Project ${action}ed`);
            // Refresh data
            const res = await adminAPI.getProject(projectId);
            setFormData(prev => ({ ...prev, status: res.data.status }));
        } catch (error) {
            toast.error("Action failed");
        }
    };

    if (isLoading) return <div className="p-8 text-center"><div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-2"></div>Loading project...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/projects')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit Project</h1>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span>{formData.name}</span>
                            <Badge variant="outline">{formData.status}</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {formData.status === "SUBMITTED_FOR_REVIEW" && (
                        <>
                            <Button variant="outline" onClick={() => handleReviewAction("request_changes")}>
                                Request Changes
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleReviewAction("approve")}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                        </>
                    )}
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="floorplans">Floor Plans</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Core Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Project Name</Label>
                                    <Input name="name" value={formData.name} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Builder Name</Label>
                                    <Input name="builderName" value={formData.builderName} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Select value={formData.city} onValueChange={(v) => handleSelectChange("city", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select city" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cityOptions.map((opt) => (
                                                <SelectItem key={opt.id} value={opt.id}>
                                                    {opt.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Locality</Label>
                                    <Select value={formData.locality} onValueChange={(v) => handleSelectChange("locality", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select locality" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {localityOptions
                                                .filter(l => l.parentId === formData.city)
                                                .map((opt) => (
                                                    <SelectItem key={opt.id} value={opt.id}>
                                                        {opt.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Full Address</Label>
                                <Textarea name="address" value={formData.address} onChange={handleChange} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Price (Numeric)</Label>
                                    <Input type="number" name="price" value={formData.price} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>RERA ID</Label>
                                    <Input name="reraId" value={formData.reraId} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Budget Min (in Rupees)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 5000000 for ₹50L"
                                        value={formData.budgetMin || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: parseInt(e.target.value) || 0 }))}
                                    />
                                    <p className="text-xs text-muted-foreground">Enter 5000000 for ₹50 Lakhs, 10000000 for ₹1 Crore</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Budget Max (in Rupees)</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 15000000 for ₹1.5 Cr"
                                        value={formData.budgetMax || ""}
                                        onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: parseInt(e.target.value) || 0 }))}
                                    />
                                    <p className="text-xs text-muted-foreground">Enter 5000000 for ₹50 Lakhs, 10000000 for ₹1 Crore</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Possession Status</Label>
                                <Select value={formData.possessionStatus} onValueChange={(v) => handleSelectChange("possessionStatus", v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {possessionStatusOptions.map((opt) => (
                                            <SelectItem key={opt.id} value={opt.id}>
                                                {opt.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conditional: Estimated Possession Date (shown only for Under Construction) */}
                            {(() => {
                                const possessionLabel = possessionStatusOptions.find(opt => opt.id === formData.possessionStatus)?.name || "";
                                return possessionLabel.toLowerCase().includes("under construction");
                            })() && (
                                    <div className="space-y-2">
                                        <Label htmlFor="estimatedPossessionDate">Estimated Completion Date</Label>
                                        <Input
                                            id="estimatedPossessionDate"
                                            name="estimatedPossessionDate"
                                            type="month"
                                            value={formData.estimatedPossessionDate}
                                            onChange={handleChange}
                                        />
                                        <p className="text-xs text-muted-foreground">Select the expected month and year of completion</p>
                                    </div>
                                )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Property Type</Label>
                                    <MultiSelect
                                        options={propertyTypeOptions.map(o => ({ label: o.name, value: o.id }))}
                                        selected={formData.propertyType || []}
                                        onChange={(v) => setFormData(prev => ({ ...prev, propertyType: v, unitTypes: [] }))}
                                        placeholder="Select property types"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit Types</Label>
                                    <MultiSelect
                                        options={(() => {
                                            // Get all selected property type names
                                            const selectedPropTypeNames = (formData.propertyType || [])
                                                .map(id => propertyTypeOptions.find(o => o.id === id)?.name)
                                                .filter(Boolean) as string[];

                                            if (selectedPropTypeNames.length === 0) {
                                                // If no property type selected, show all unit types
                                                return unitTypeOptions.map(o => ({ label: o.name, value: o.id }));
                                            }

                                            // Get union of allowed unit types for all selected property types
                                            const allowedUnitNames = new Set<string>();
                                            selectedPropTypeNames.forEach(propName => {
                                                const mappings = propertyUnitMappings[propName] || [];
                                                mappings.forEach(unitName => allowedUnitNames.add(unitName));
                                            });

                                            // If no specific mappings found, show all (fallback)
                                            if (allowedUnitNames.size === 0) {
                                                return unitTypeOptions.map(o => ({ label: o.name, value: o.id }));
                                            }

                                            return unitTypeOptions
                                                .filter(o => allowedUnitNames.has(o.name))
                                                .map(o => ({ label: o.name, value: o.id }));
                                        })()}
                                        selected={formData.unitTypes || []}
                                        onChange={(v) => setFormData(prev => ({ ...prev, unitTypes: v }))}
                                        placeholder="Select unit types"
                                    />
                                </div>
                            </div>


                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MEDIA TAB */}
                <TabsContent value="media">
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Branding & Hero</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Project Logo</Label>
                                    <div className="flex flex-col gap-2">
                                        {formData.projectLogo && (
                                            <div className="relative w-fit">
                                                <img src={getImageUrl(formData.projectLogo)} alt="Logo" className="h-20 w-20 object-contain border rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, projectLogo: "" }))}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <Trash className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                        <Input type="file" onChange={(e) => handleFileUpload(e, "projectLogo")} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Advertiser Logo</Label>
                                    <div className="flex flex-col gap-2">
                                        {formData.advertiserLogo && (
                                            <div className="relative w-fit">
                                                <img src={getImageUrl(formData.advertiserLogo)} alt="Adv Logo" className="h-20 w-20 object-contain border rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, advertiserLogo: "" }))}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <Trash className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                        <Input type="file" onChange={(e) => handleFileUpload(e, "advertiserLogo")} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Hero Image (Banner)</Label>
                                    <div className="flex flex-col gap-2">
                                        {formData.heroImage && (
                                            <div className="relative w-full">
                                                <img src={getImageUrl(formData.heroImage)} alt="Hero" className="h-24 w-full object-cover border rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, heroImage: "" }))}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <Trash className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                        <Input type="file" onChange={(e) => handleFileUpload(e, "heroImage")} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Property Card Image</Label>
                                    <div className="flex flex-col gap-2">
                                        {formData.cardImage && (
                                            <div className="relative w-full">
                                                <img src={getImageUrl(formData.cardImage)} alt="Card Preview" className="h-24 w-full object-cover border rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, cardImage: "" }))}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <Trash className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                        <Input type="file" onChange={(e) => handleFileUpload(e, "cardImage")} />
                                        <p className="text-xs text-muted-foreground">Used for project listing cards.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Video Tour</CardTitle>
                                <CardDescription>Add a link to a YouTube or Vimeo video tour.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Label>Video URL</Label>
                                    <Input
                                        name="videoUrl"
                                        value={formData.videoUrl}
                                        onChange={handleChange}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
                                    {formData.videoUrl && (
                                        <p className="text-xs text-muted-foreground">
                                            Video will be embedded on the project page.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Gallery</CardTitle>
                                <CardDescription>Upload multiple images for the project gallery.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    {formData.images.map((img, i) => (
                                        <div key={i} className="relative group">
                                            <img src={getImageUrl(img)} alt={`Gallery ${i}`} className="h-24 w-full object-cover rounded" />
                                            <button
                                                onClick={() => removeGalleryImage(i)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 h-24">
                                        <Plus className="h-6 w-6 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Add Images</span>
                                        <Input type="file" multiple className="hidden" onChange={handleGalleryUpload} />
                                    </label>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* CONTENT TAB */}
                <TabsContent value="content">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>About Project</Label>
                                <Textarea name="aboutProject" value={formData.aboutProject} onChange={handleChange} className="min-h-[150px]" />
                            </div>

                            <div className="space-y-2">
                                <Label>Builder Description</Label>
                                <Textarea name="builderDescription" value={formData.builderDescription} onChange={handleChange} className="min-h-[100px]" />
                            </div>

                            <div className="space-y-2">
                                <Label>Amenities</Label>
                                <MultiSelect
                                    options={amenityOptions.map(o => ({ label: o.label || o.name, value: o.id }))}
                                    selected={formData.amenities || []}
                                    onChange={(v) => setFormData(prev => ({ ...prev, amenities: v }))}
                                    placeholder="Select amenities"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Project Highlights (Key Features)</Label>
                                <div className="space-y-3">
                                    {formData.highlights.map((highlight, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="e.g., Premium 3 BHK Apartments"
                                                value={highlight}
                                                onChange={(e) => {
                                                    const newHighlights = [...formData.highlights];
                                                    newHighlights[index] = e.target.value;
                                                    setFormData({ ...formData, highlights: newHighlights });
                                                }}
                                                className="h-10"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        highlights: prev.highlights.filter((_, i) => i !== index)
                                                    }));
                                                }}
                                                className="text-muted-foreground hover:text-red-500"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                highlights: [...prev.highlights, ""]
                                            }));
                                        }}
                                        className="gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Highlight
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Location Highlights</Label>
                                <p className="text-sm text-muted-foreground">Enter each location advantage on a new line (e.g., "5 min to Metro Station")</p>
                                <Textarea
                                    value={formData.locationHighlights.join("\n")}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        locationHighlights: e.target.value.split("\n").filter(line => line.trim())
                                    }))}
                                    className="min-h-[100px]"
                                    placeholder="Near IT Park&#10;Close to Schools&#10;5 min to Highway"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Project Disclaimer</Label>
                                <Textarea
                                    name="disclaimer"
                                    value={formData.disclaimer}
                                    onChange={handleChange}
                                    className="min-h-[100px]"
                                    placeholder="Enter any legal disclaimer or terms that should appear below the project..."
                                />
                            </div>
                        </CardContent>
                    </Card>


                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Unique Selling Points (USPs)</CardTitle>
                            <CardDescription>Key differentiators for this project.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>USP 1</Label>
                                    <Input name="usp1" value={formData.usp1} onChange={handleChange} placeholder="e.g. Waterfront View" maxLength={50} />
                                </div>
                                <div className="space-y-2">
                                    <Label>USP 2</Label>
                                    <Input name="usp2" value={formData.usp2} onChange={handleChange} placeholder="e.g. 5 mins to Airport" maxLength={50} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FLOOR PLANS TAB */}
                <TabsContent value="floorplans">
                    <Card>
                        <CardHeader>
                            <CardTitle>Floor Plans</CardTitle>
                            <CardDescription>Manage floor plans with pricing and descriptions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                {formData.floorPlans.map((fp, index) => (
                                    <div
                                        key={index}
                                        className="relative rounded-lg overflow-hidden bg-slate-100 border p-2 space-y-2"
                                    >
                                        <div className="aspect-[4/3] relative rounded-md overflow-hidden bg-white mb-2">
                                            <img
                                                src={getImageUrl(typeof fp === 'string' ? fp : fp.url)}
                                                alt={`Floor Plan ${index + 1}`}
                                                className="w-full h-full object-contain"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        floorPlans: prev.floorPlans.filter((_, i) => i !== index)
                                                    }));
                                                }}
                                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                                            >
                                                <Trash className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <Input
                                                placeholder="Config (e.g. 2 BHK)"
                                                value={fp.description || ""}
                                                onChange={(e) => {
                                                    const newPlans = [...formData.floorPlans];
                                                    if (typeof newPlans[index] === 'string') {
                                                        newPlans[index] = { url: newPlans[index], description: e.target.value, price: "" };
                                                    } else {
                                                        newPlans[index].description = e.target.value;
                                                    }
                                                    setFormData({ ...formData, floorPlans: newPlans });
                                                }}
                                                className="h-8 text-xs"
                                            />
                                            <Input
                                                placeholder="Price (e.g. 1.2 Cr)"
                                                value={fp.price || ""}
                                                onChange={(e) => {
                                                    const newPlans = [...formData.floorPlans];
                                                    if (typeof newPlans[index] === 'string') {
                                                        newPlans[index] = { url: newPlans[index], description: "", price: e.target.value };
                                                    } else {
                                                        newPlans[index].price = e.target.value;
                                                    }
                                                    setFormData({ ...formData, floorPlans: newPlans });
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
                                        className="hidden"
                                        onChange={async (e) => {
                                            if (!e.target.files?.length) return;
                                            const toastId = toast.loading("Uploading floor plans...");
                                            try {
                                                const files = Array.from(e.target.files);
                                                // Parallel upload manual implementation
                                                const urls = await Promise.all(
                                                    files.map(f => uploadAPI.uploadFile(f).then(r => r.data.url))
                                                );
                                                const newPlans = urls.map(url => ({ url, description: "", price: "" }));
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    floorPlans: [...prev.floorPlans, ...newPlans]
                                                }));
                                                toast.success("Floor plans uploaded", { id: toastId });
                                            } catch (error) {
                                                toast.error("Upload failed", { id: toastId });
                                            }
                                        }}
                                    />
                                    <Plus className="w-8 h-8 text-slate-300 mb-2" />
                                    <span className="text-sm text-slate-500">Add Floor Plans</span>
                                </label>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SEO TAB */}
                <TabsContent value="seo">
                    <Card>
                        <CardHeader>
                            <CardTitle>Search Engine Optimization</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Slug (URL Friendly Name)</Label>
                                <Input
                                    name="slug"
                                    value={formData.slug || ""}
                                    onChange={handleChange}
                                    placeholder="Leave empty to auto-generate from Name + Builder + City"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Leave empty to automatically generate from Project Name, Builder Name, and City.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>SEO Title</Label>
                                <Input name="seoTitle" value={formData.seoTitle} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label>SEO Description</Label>
                                <Textarea name="seoDescription" value={formData.seoDescription} onChange={handleChange} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >
        </div >
    );
}
