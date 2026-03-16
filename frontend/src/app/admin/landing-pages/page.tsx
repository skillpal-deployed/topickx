"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Globe,
    Plus,
    Search,
    Eye,
    MapPin,
    ExternalLink,
    Layers,
    Power,
    Trash2,
    Copy,
} from "lucide-react";

interface LandingPage {
    id: string;
    name: string;
    slug: string;
    city: string;
    locality: string;
    pageType: string;
    isActive: boolean;
    maxProjects: number;
    listings: any[];
    visits: number;
    createdAt: string;
}

export default function LandingPagesPage() {
    const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [locationFilter, setLocationFilter] = useState("all");

    useEffect(() => {
        fetchLandingPages();
    }, []);

    const fetchLandingPages = async () => {
        try {
            const response = await adminAPI.getLandingPages();
            setLandingPages(response.data);
        } catch (error) {
            console.error("Error fetching landing pages:", error);
            toast.error("Failed to load landing pages");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (lp: LandingPage) => {
        try {
            await adminAPI.updateLandingPage(lp.id, { isActive: !lp.isActive });
            toast.success(lp.isActive ? "Landing page disabled" : "Landing page enabled");
            fetchLandingPages();
        } catch (error) {
            toast.error("Failed to update landing page");
        }
    };

    const handleDelete = async (lp: LandingPage) => {
        const projectCount = lp.listings?.length || 0;
        if (projectCount > 0) {
            toast.error("Cannot delete landing page with active projects. Remove projects first.");
            return;
        }
        if (!confirm(`Are you sure you want to delete "${lp.name}"?`)) return;

        try {
            await adminAPI.deleteLandingPage(lp.id);
            toast.success("Landing page deleted");
            fetchLandingPages();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to delete landing page");
        }
    };

    const copyUrl = (slug: string) => {
        const url = `${window.location.origin}/lp/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("URL copied to clipboard");
    };

    // Get unique cities for the location filter
    const uniqueLocations = useMemo(() => {
        const cities = landingPages.map(page => page.city).filter(Boolean);
        return [...new Set(cities)].sort();
    }, [landingPages]);

    const filteredPages = landingPages.filter((page) => {
        const matchesSearch =
            page.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            page.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            page.locality?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesLocation = locationFilter === "all" || page.city === locationFilter;

        return matchesSearch && matchesLocation;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-bold">
                        Landing Pages
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {filteredPages.length} landing page{filteredPages.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Link href="/admin/landing-pages/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Landing Page
                    </Button>
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <MapPin className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by location" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {uniqueLocations.map((city) => (
                            <SelectItem key={city} value={city}>
                                {city}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Landing Pages Grid */}
            {filteredPages.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPages.map((page) => {
                        const projectCount = page.listings?.length || 0;
                        const maxProjects = page.maxProjects || 30;

                        return (
                            <Card key={page.id} className={`card-hover ${!page.isActive ? "opacity-60" : ""}`}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Globe className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{page.name}</CardTitle>
                                                <CardDescription className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {page.locality ? `${page.locality}, ` : ""}{page.city}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant={page.isActive ? "success" : "secondary"}>
                                            {page.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* URL with Copy */}
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-slate-100 px-2 py-1 rounded truncate flex-1">
                                            /lp/{page.slug}
                                        </code>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyUrl(page.slug)}>
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border">
                                            <span className="text-xs text-muted-foreground uppercase font-semibold">Visits</span>
                                            <span className="text-lg font-bold text-primary">{page.visits || 0}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border">
                                            <span className="text-xs text-muted-foreground uppercase font-semibold">Leads</span>
                                            <span className="text-lg font-bold text-blue-600">{(page as any).lead_count || 0}</span>
                                        </div>
                                    </div>

                                    {/* Capacity */}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Projects</span>
                                        <span className="font-semibold">
                                            {projectCount} / {maxProjects}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className={`rounded-full h-2 transition-all ${projectCount >= maxProjects ? "bg-red-500" :
                                                projectCount >= maxProjects * 0.7 ? "bg-amber-500" : "bg-primary"
                                                }`}
                                            style={{
                                                width: `${Math.min((projectCount / maxProjects) * 100, 100)}%`,
                                            }}
                                        />
                                    </div>

                                    {/* Type Badge */}
                                    <Badge variant="outline" className="capitalize">
                                        {page.pageType || "city"}
                                    </Badge>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <Link href={`/admin/landing-pages/${page.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Eye className="h-4 w-4 mr-1" />
                                                Manage
                                            </Button>
                                        </Link>
                                        <a
                                            href={`/lp/${page.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button variant="outline" size="icon">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </a>
                                    </div>

                                    {/* Toggle & Delete */}
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`flex-1 ${page.isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}
                                            onClick={() => handleToggleActive(page)}
                                        >
                                            <Power className="w-4 h-4 mr-1" />
                                            {page.isActive ? "Disable" : "Enable"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(page)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <CardContent>
                        <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Landing Pages Found</h3>
                        <p className="text-muted-foreground mb-4">
                            {searchQuery
                                ? "Try adjusting your search"
                                : "Create your first landing page"}
                        </p>
                        {!searchQuery && (
                            <Link href="/admin/landing-pages/new">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Landing Page
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
