"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminAPI, publicAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Upload, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface City {
    id: string;
    name: string;
    locations: { id: string; name: string }[];
}

export default function CreateLandingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState<City[]>([]);
    const [localities, setLocalities] = useState<{ id: string; name: string }[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        city: "",
        locality: "",
        description: "",
        heroImage: "",
        seoTitle: "",
        seoDescription: "",
        pageType: "CITY_LOCALITY",
        maxProjects: 30,
        fbPixelId: "",
        googleAnalyticsId: "",
    });

    useEffect(() => {
        fetchOptions();
    }, []);

    const fetchOptions = async () => {
        try {
            const response = await publicAPI.getOptions();
            setCities(response.data.cities || []);
        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    // Update localities when city changes
    useEffect(() => {
        if (formData.city) {
            const selectedCity = cities.find(c => c.name === formData.city);
            setLocalities(selectedCity?.locations || []);
            // Clear locality if city changed
            if (formData.locality && selectedCity) {
                const localityExists = selectedCity.locations.some(l => l.name === formData.locality);
                if (!localityExists) {
                    setFormData(prev => ({ ...prev, locality: "" }));
                }
            }
        } else {
            setLocalities([]);
        }
    }, [formData.city, cities]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Auto-generate slug from name if slug is empty
        if (name === "name" && !formData.slug) {
            setFormData((prev) => ({
                ...prev,
                slug: value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)+/g, ""),
            }));
        }
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await adminAPI.createLandingPage(formData);
            toast.success("Landing page created successfully");
            router.push("/admin/landing-pages");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create landing page");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/landing-pages">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold font-heading">Create Landing Page</h1>
                    <p className="text-muted-foreground">
                        Set up a new SEO landing page for placements
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Page Details</CardTitle>
                        <CardDescription>
                            Basic information about the landing page
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Page Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. Top Projects in Whitefield"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug (URL)</Label>
                                <Input
                                    id="slug"
                                    name="slug"
                                    placeholder="e.g. top-projects-in-whitefield"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Select
                                    value={formData.city}
                                    onValueChange={(value) => handleSelectChange("city", value)}
                                >
                                    <SelectTrigger>
                                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="Select a city" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map((city) => (
                                            <SelectItem key={city.id} value={city.name}>
                                                {city.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="locality">Locality</Label>
                                <Select
                                    value={formData.locality}
                                    onValueChange={(value) => handleSelectChange("locality", value)}
                                    disabled={!formData.city || localities.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={formData.city ? "Select a locality" : "Select city first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {localities.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.name}>
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Visible on page)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe the area and property trends..."
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="heroImage">Hero Image URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="heroImage"
                                        name="heroImage"
                                        placeholder="https://..."
                                        value={formData.heroImage}
                                        onChange={handleChange}
                                    />
                                    <Button type="button" variant="outline" size="icon">
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxProjects">Max Projects Limit</Label>
                                <Input
                                    id="maxProjects"
                                    name="maxProjects"
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={formData.maxProjects}
                                    onChange={handleChange}
                                />
                                <p className="text-xs text-muted-foreground">Maximum projects that can be placed on this page</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>SEO Settings</Label>
                            <div className="grid gap-4 p-4 bg-slate-50 rounded-lg border">
                                <div className="space-y-2">
                                    <Label htmlFor="seoTitle" className="text-xs">Meta Title</Label>
                                    <Input
                                        id="seoTitle"
                                        name="seoTitle"
                                        placeholder="Optional (Defaults to Name + Location)"
                                        value={formData.seoTitle}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="seoDescription" className="text-xs">Meta Description</Label>
                                    <Textarea
                                        id="seoDescription"
                                        name="seoDescription"
                                        placeholder="Optional (Defaults to generic description)"
                                        value={formData.seoDescription}
                                        onChange={handleChange}
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Tracking / Analytics</Label>
                            <div className="grid gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="space-y-2">
                                    <Label htmlFor="fbPixelId" className="text-xs">Facebook Pixel ID</Label>
                                    <Input
                                        id="fbPixelId"
                                        name="fbPixelId"
                                        placeholder="e.g. 1234567890123456"
                                        value={formData.fbPixelId}
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-muted-foreground">Fires a PageView + Lead event specific to this landing page campaign.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="googleAnalyticsId" className="text-xs">Google Analytics Measurement ID</Label>
                                    <Input
                                        id="googleAnalyticsId"
                                        name="googleAnalyticsId"
                                        placeholder="e.g. G-XXXXXXXXXX"
                                        value={formData.googleAnalyticsId}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Page
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div >
    );
}
