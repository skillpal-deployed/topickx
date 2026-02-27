"use client";

import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { subDays, format } from "date-fns";
import { BarChart3, Loader2, ArrowUpRight, Users, LayoutTemplate, Building2, Search } from "lucide-react";

export default function AdminPerformancePage() {
    const [summary, setSummary] = useState({ totalVisits: 0, lpVisits: 0, projectVisits: 0 });
    const [lpStats, setLpStats] = useState<any[]>([]);
    const [projectStats, setProjectStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [advertisers, setAdvertisers] = useState<any[]>([]);

    const [dateRange, setDateRange] = useState({
        startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
    });
    const [selectedAdvertiser, setSelectedAdvertiser] = useState("all");
    const [selectedType, setSelectedType] = useState("all");
    const [projectNameFilter, setProjectNameFilter] = useState("");
    const [projectNameSearch, setProjectNameSearch] = useState(""); // debounced

    useEffect(() => {
        adminAPI.getAdvertisers({ status: 'active' })
            .then(res => setAdvertisers(res.data || []))
            .catch(console.error);
    }, []);

    // Debounce project name input to avoid firing a fetch on every keystroke
    useEffect(() => {
        const t = setTimeout(() => setProjectNameSearch(projectNameFilter), 400);
        return () => clearTimeout(t);
    }, [projectNameFilter]);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const advertiserId = selectedAdvertiser === "all" ? undefined : selectedAdvertiser;
            const type = selectedType === "all" ? undefined : selectedType;
            const res = await adminAPI.getPerformance(
                dateRange.startDate,
                dateRange.endDate,
                advertiserId,
                type,
                projectNameSearch || undefined,
            );
            setSummary(res.data.summary || { totalVisits: 0, lpVisits: 0, projectVisits: 0 });
            setLpStats(res.data.lpStats || []);
            setProjectStats(res.data.projectStats || []);
        } catch (error) {
            console.error("Error fetching performance stats:", error);
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedAdvertiser, selectedType, projectNameSearch]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">Performance Analytics</h1>
                <p className="text-muted-foreground mt-1">
                    Traffic report for landing pages and project pages
                </p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        {/* Page Type */}
                        <div className="grid gap-1 min-w-[160px]">
                            <Label className="text-xs">Page Type</Label>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="landing-page">Landing Pages</SelectItem>
                                    <SelectItem value="project-page">Project Pages</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Advertiser */}
                        <div className="grid gap-1 min-w-[200px]">
                            <Label className="text-xs">Advertiser</Label>
                            <Select value={selectedAdvertiser} onValueChange={setSelectedAdvertiser}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="All Advertisers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Advertisers</SelectItem>
                                    {advertisers.map(adv => (
                                        <SelectItem key={adv.id} value={adv.id}>
                                            {adv.companyName || adv.name || adv.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Project Name Search */}
                        <div className="grid gap-1 min-w-[200px]">
                            <Label className="text-xs">Project Name</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search project..."
                                    value={projectNameFilter}
                                    onChange={e => setProjectNameFilter(e.target.value)}
                                    className="h-9 pl-8"
                                />
                            </div>
                        </div>

                        {/* Start Date */}
                        <div className="grid gap-1">
                            <Label className="text-xs">Start Date</Label>
                            <Input
                                type="date"
                                value={dateRange.startDate}
                                onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))}
                                className="h-9 w-36"
                            />
                        </div>

                        {/* End Date */}
                        <div className="grid gap-1">
                            <Label className="text-xs">End Date</Label>
                            <Input
                                type="date"
                                value={dateRange.endDate}
                                onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))}
                                className="h-9 w-36"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{loading ? "…" : summary.totalVisits.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all pages in selected range</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Landing Page Visitors</CardTitle>
                        <LayoutTemplate className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{loading ? "…" : summary.lpVisits.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">{lpStats.length} landing pages with traffic</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Project Page Visitors</CardTitle>
                        <Building2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{loading ? "…" : summary.projectVisits.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">{projectStats.length} project pages with traffic</p>
                    </CardContent>
                </Card>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    {/* Landing Page Traffic */}
                    {(selectedType === 'all' || selectedType === 'landing-page') && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <LayoutTemplate className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <CardTitle>Landing Page Traffic</CardTitle>
                                        <CardDescription>
                                            Visitors to each landing page (generic LP form + FB leads source)
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {lpStats.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No landing page traffic in this date range
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Landing Page</TableHead>
                                                <TableHead>City</TableHead>
                                                <TableHead>Slug</TableHead>
                                                <TableHead className="text-right">Visitors</TableHead>
                                                <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {lpStats.map((stat, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{stat.landingPage.name}</TableCell>
                                                    <TableCell className="text-muted-foreground">{stat.landingPage.city || '—'}</TableCell>
                                                    <TableCell>
                                                        <span className="text-xs font-mono text-muted-foreground">
                                                            /lp/{stat.landingPage.slug}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-bold text-blue-600 text-base">
                                                            {stat.visits.toLocaleString()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <a href={`/lp/${stat.landingPage.slug}`} target="_blank" rel="noopener noreferrer">
                                                                <ArrowUpRight className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Project Page Traffic */}
                    {(selectedType === 'all' || selectedType === 'project-page') && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-emerald-500" />
                                    <div>
                                        <CardTitle>Project Page Traffic</CardTitle>
                                        <CardDescription>
                                            Direct visitors to individual project pages
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {projectStats.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No project page traffic in this date range
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Project</TableHead>
                                                <TableHead>Advertiser</TableHead>
                                                <TableHead className="text-right">Visitors</TableHead>
                                                <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {projectStats.map((stat, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{stat.project.name}</TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <p>{stat.advertiser?.companyName || '—'}</p>
                                                            <p className="text-xs text-muted-foreground">{stat.advertiser?.email}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-bold text-emerald-600 text-base">
                                                            {stat.visits.toLocaleString()}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" asChild>
                                                            <a href={`/project/${stat.project.slug}`} target="_blank" rel="noopener noreferrer">
                                                                <ArrowUpRight className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
