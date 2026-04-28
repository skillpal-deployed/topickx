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
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { Users, Search, Phone, Mail, Calendar, Building, Globe, Loader2 } from "lucide-react";
import { subDays, format } from "date-fns";

interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string;
    createdAt: string;
    source: string;
    location?: string;
    budget?: string;
    project?: {
        id: string;
        name: string;
        builderName: string;
    };
    landingPage?: {
        id: string;
        name: string;
    };
}

export default function CommonLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState({
        startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
    });

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const response = await advertiserAPI.getCommonLeads(dateRange.startDate, dateRange.endDate);
            setLeads(response.data);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleApplyFilter = () => {
        fetchLeads();
    };

    const filteredLeads = leads.filter(
        (lead) =>
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.phone.includes(searchQuery) ||
            lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.landingPage?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-bold">Common Leads</h1>
                    <p className="text-muted-foreground mt-1">
                        All incoming leads from your linked Landing Pages
                    </p>
                </div>
                {/* Date Range Filter */}
                <div className="flex items-end gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <div className="grid gap-1">
                        <Label htmlFor="startDate" className="text-xs">From</Label>
                        <Input
                            id="startDate"
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="h-8 w-36"
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label htmlFor="endDate" className="text-xs">To</Label>
                        <Input
                            id="endDate"
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="h-8 w-36"
                        />
                    </div>
                    <Button size="sm" onClick={handleApplyFilter} disabled={loading} className="h-8">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                </div>
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
                                <p className="text-2xl font-bold">{loading ? "..." : leads.length}</p>
                                <p className="text-sm text-muted-foreground">Total Leads</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Globe className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {loading ? "..." : leads.filter((l) => l.source === 'facebook').length}
                                </p>
                                <p className="text-sm text-muted-foreground">Facebook</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search common pool..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Leads Table */}
            {filteredLeads.length > 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-medium">Contact</th>
                                        <th className="text-left p-4 font-medium">Capture Info</th>
                                        <th className="text-left p-4 font-medium">LP / Source</th>
                                        <th className="text-left p-4 font-medium">Date</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            className="border-b hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {lead.name}
                                                    </p>
                                                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                                        <p className="flex items-center gap-1.5">
                                                            <Mail className="w-3 h-3" />
                                                            {lead.email}
                                                        </p>
                                                        <p className="flex items-center gap-1.5">
                                                            <Phone className="w-3 h-3" />
                                                            {lead.phone}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs space-y-1">
                                                    {lead.location && <p><span className="text-muted-foreground">Loc:</span> {lead.location}</p>}
                                                    {lead.budget && <p><span className="text-muted-foreground">Bud:</span> {lead.budget}</p>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <p className="font-medium text-slate-700">{lead.landingPage?.name || 'Direct'}</p>
                                                    <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                                                        {lead.source}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-muted-foreground">
                                                {formatDate(lead.createdAt)}
                                            </td>
                                            <td className="p-4">
                                                {lead.id.includes('assigned') ? (
                                                    <Badge variant="success">Assigned</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-slate-200">Processing</Badge>
                                                )}
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
                        <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Common Leads</h3>
                        <p className="text-muted-foreground">
                            Incoming leads from your landing pages will appear here before final assignment.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
