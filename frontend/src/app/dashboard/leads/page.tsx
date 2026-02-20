"use client";

import { useEffect, useState } from "react";
import { advertiserAPI } from "@/lib/api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Users, Search, Phone, Mail, Calendar, Building, Filter, X, ExternalLink } from "lucide-react";

interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string;
    createdAt: string;
    otpVerified: boolean;
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    city?: string;
    location?: string;
    budget?: string;
    propertyType?: string;
    unitType?: string;
    project?: {
        id: string;
        name: string;
        builderName: string;
        status?: string;
    };
    landingPage?: {
        id: string;
        name: string;
        slug: string;
        isActive?: boolean;
    };
}

interface Project {
    id: string;
    name: string;
    status: string;
}

interface LandingPage {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter states
    const [selectedProject, setSelectedProject] = useState<string>("all");
    const [selectedLandingPage, setSelectedLandingPage] = useState<string>("all");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [leadsRes, projectsRes] = await Promise.all([
                    advertiserAPI.getDirectLeads(),
                    advertiserAPI.getProjects(),
                ]);
                // Backend already filters out manual/servicing leads
                setLeads(leadsRes.data);
                setProjects(projectsRes.data);

                // Extract unique landing pages from leads
                const lpMap = new Map<string, LandingPage>();
                leadsRes.data.forEach((lead: Lead) => {
                    if (lead.landingPage) {
                        lpMap.set(lead.landingPage.id, {
                            id: lead.landingPage.id,
                            name: lead.landingPage.name,
                            slug: lead.landingPage.slug,
                            isActive: lead.landingPage.isActive ?? true,
                        });
                    }
                });
                setLandingPages(Array.from(lpMap.values()));
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Apply all filters
    const filteredLeads = leads.filter((lead) => {
        // Search filter
        const matchesSearch =
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.phone.includes(searchQuery) ||
            lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.project?.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Project filter
        const matchesProject = selectedProject === "all" || lead.project?.id === selectedProject;

        // Landing page filter
        const matchesLP = selectedLandingPage === "all" || lead.landingPage?.id === selectedLandingPage;

        // Date range filter
        let matchesDate = true;
        const leadDate = new Date(lead.createdAt);
        if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            if (leadDate < from) matchesDate = false;
        }
        if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (leadDate > to) matchesDate = false;
        }

        return matchesSearch && matchesProject && matchesLP && matchesDate;
    });

    const clearFilters = () => {
        setSelectedProject("all");
        setSelectedLandingPage("all");
        setFromDate("");
        setToDate("");
        setSearchQuery("");
    };

    const hasActiveFilters = selectedProject !== "all" || selectedLandingPage !== "all" || fromDate || toDate || searchQuery;

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
            <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">Leads</h1>
                <p className="text-muted-foreground mt-1">
                    Leads captured through enquiry forms on project pages and landing pages
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{leads.length}</p>
                                <p className="text-sm text-muted-foreground">Total Leads</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {
                                        leads.filter(
                                            (l) =>
                                                new Date(l.createdAt) >
                                                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                                        ).length
                                    }
                                </p>
                                <p className="text-sm text-muted-foreground">This Week</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {
                                        leads.filter(
                                            (l) =>
                                                new Date(l.createdAt).toDateString() === new Date().toDateString()
                                        ).length
                                    }
                                </p>
                                <p className="text-sm text-muted-foreground">Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, phone, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Project Filter */}
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <Building className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name}
                                        {project.status !== "active" && (
                                            <span className="text-xs text-muted-foreground ml-1">
                                                ({project.status})
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Landing Page Filter */}
                        <Select value={selectedLandingPage} onValueChange={setSelectedLandingPage}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Landing Pages" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Landing Pages</SelectItem>
                                {landingPages.map((lp) => (
                                    <SelectItem key={lp.id} value={lp.id}>
                                        {lp.name}
                                        {!lp.isActive && (
                                            <span className="text-xs text-red-500 ml-1">(Inactive)</span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Custom Date Range Filter */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">From:</span>
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-[140px]"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">To:</span>
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-[140px]"
                                />
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                <X className="h-4 w-4 mr-1" /> Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Leads Table */}
            {filteredLeads.length > 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-medium">Date</th>
                                        <th className="text-left p-4 font-medium">Name</th>
                                        <th className="text-left p-4 font-medium">Mobile No.</th>
                                        <th className="text-left p-4 font-medium">Email ID</th>
                                        <th className="text-left p-4 font-medium">Preferences</th>
                                        <th className="text-left p-4 font-medium">Project Name</th>
                                        <th className="text-left p-4 font-medium">Landing Page</th>
                                        <th className="text-left p-4 font-medium">Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            className="border-b hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="p-4 text-sm text-muted-foreground">
                                                {formatDate(lead.createdAt)}
                                            </td>
                                            <td className="p-4 font-medium">{lead.name}</td>
                                            <td className="p-4 text-sm">
                                                <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                                                    {lead.phone}
                                                </a>
                                            </td>
                                            <td className="p-4 text-sm">
                                                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                                                    {lead.email || "-"}
                                                </a>
                                            </td>
                                            <td className="p-4 text-sm">
                                                <div className="space-y-0.5">
                                                    {lead.city && <span className="block text-muted-foreground">{lead.city}</span>}
                                                    {lead.location && lead.location !== lead.city && <span className="block text-muted-foreground">{lead.location}</span>}
                                                    {lead.propertyType && <Badge variant="outline" className="text-xs">{lead.propertyType}</Badge>}
                                                    {lead.unitType && <span className="block text-xs text-muted-foreground">{lead.unitType}</span>}
                                                    {lead.budget && <span className="block text-xs font-medium">{lead.budget}</span>}
                                                    {!lead.city && !lead.location && !lead.propertyType && !lead.budget && <span className="text-muted-foreground">-</span>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {lead.project ? (
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`/project/${lead.project.id}`}
                                                            target="_blank"
                                                            className="font-medium text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            {lead.project.name}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                        {lead.project.status && lead.project.status !== "active" && lead.project.status !== "LIVE" && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {lead.project.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {lead.landingPage ? (
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`/lp/${lead.landingPage.slug}`}
                                                            target="_blank"
                                                            className="text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            {lead.landingPage.name}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                        {lead.landingPage.isActive === false && (
                                                            <Badge variant="destructive" className="text-xs">
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm flex items-center gap-1">
                                                        Direct
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    {lead.source ? (
                                                        <Badge variant="outline">{lead.source}</Badge>
                                                    ) : lead.utmSource ? (
                                                        <Badge variant="outline">{lead.utmSource}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">Organic</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="text-center py-12">
                    <CardContent>
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Leads Found</h3>
                        <p className="text-muted-foreground">
                            {hasActiveFilters
                                ? "Try adjusting your filters"
                                : "Leads will appear here once customers inquire about your projects"}
                        </p>
                        {hasActiveFilters && (
                            <Button variant="outline" className="mt-4" onClick={clearFilters}>
                                Clear All Filters
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )
            }
        </div >
    );
}
