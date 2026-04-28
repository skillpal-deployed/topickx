"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
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
import { formatDate } from "@/lib/utils";
import { Search, Download, Globe, Building2, LayoutTemplate } from "lucide-react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string;
    createdAt: string;
    source: string;
    status: string;
    fbLeadId?: string;
    location?: string;
    city?: string;
    budget?: string;
    propertyType?: string;
    unitType?: string;
    projectId?: string;
    project?: {
        id: string;
        name: string;
        builderName: string;
        advertiser?: {
            id: string;
            companyName: string;
        };
    };
    landingPageId?: string;
    landingPage?: {
        id: string;
        name: string;
        slug?: string;
        fbAdAccountId?: string;
    };
    assignedTo?: {
        id: string;
        companyName: string;
    };
}

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const response = await adminAPI.getLeads({});
            setLeads(response.data.leads || response.data);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    // Project Leads: any lead with a projectId — private to that project's advertiser.
    // May also carry a landingPageId if submitted via a project card on an LP.
    const projectLeads = leads.filter(l => !!l.projectId);

    // Common Pool: no projectId + has landingPageId — generic LP enquiry form or FB lead form.
    const commonPoolLeads = leads.filter(l => !l.projectId && !!l.landingPageId);

    const filterFn = (lead: Lead) => {
        const query = searchQuery.toLowerCase();
        return (
            (lead.name || '').toLowerCase().includes(query) ||
            (lead.phone || '').includes(searchQuery) ||
            (lead.email || '').toLowerCase().includes(query) ||
            (lead.project?.name || '').toLowerCase().includes(query) ||
            (lead.project?.advertiser?.companyName || '').toLowerCase().includes(query) ||
            (lead.landingPage?.name || '').toLowerCase().includes(query)
        );
    };

    const handleExport = (data: Lead[]) => {
        const csvContent = [
            ["Name", "Phone", "Email", "Project", "Advertiser", "Landing Page", "Source", "City", "Budget", "Type", "FB Lead ID", "Date"].join(","),
            ...data.map(lead =>
                [
                    lead.name,
                    lead.phone,
                    lead.email,
                    lead.project?.name || "",
                    lead.project?.advertiser?.companyName || "",
                    lead.landingPage?.name || "",
                    lead.source,
                    lead.city || "",
                    lead.budget || "",
                    lead.propertyType || "",
                    lead.fbLeadId || "",
                    formatDate(lead.createdAt),
                ].join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const LeadsTable = ({ data }: { data: Lead[] }) => {
        const filtered = data.filter(filterFn);
        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="text-left p-4 font-medium">Contact</th>
                            <th className="text-left p-4 font-medium">Project / LP</th>
                            <th className="text-left p-4 font-medium">Preferences</th>
                            <th className="text-left p-4 font-medium">Source</th>
                            <th className="text-left p-4 font-medium">Date</th>
                            <th className="text-left p-4 font-medium">Assignment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    No leads found
                                </td>
                            </tr>
                        ) : filtered.map(lead => (
                            <tr key={lead.id} className="border-b hover:bg-slate-50 transition-colors">
                                {/* Contact */}
                                <td className="p-4">
                                    <div className="font-medium">{lead.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {lead.phone} | {lead.email}
                                    </div>
                                </td>

                                {/* Project / LP */}
                                <td className="p-4">
                                    <div className="text-sm space-y-0.5">
                                        {lead.project ? (
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="h-3 w-3 text-primary shrink-0" />
                                                <span className="font-medium text-slate-700">{lead.project.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">No project</span>
                                        )}
                                        {lead.landingPage && (
                                            <div className="flex items-center gap-1.5">
                                                <LayoutTemplate className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="text-xs text-muted-foreground">{lead.landingPage.name}</span>
                                            </div>
                                        )}
                                        {lead.project?.advertiser && (
                                            <span className="text-xs text-slate-400">{lead.project.advertiser.companyName}</span>
                                        )}
                                    </div>
                                </td>

                                {/* Preferences */}
                                <td className="p-4 text-xs text-muted-foreground space-y-0.5">
                                    {lead.city && <div>{lead.city}</div>}
                                    {lead.location && lead.location !== lead.city && <div>{lead.location}</div>}
                                    {lead.propertyType && <Badge variant="outline" className="text-[10px]">{lead.propertyType}</Badge>}
                                    {lead.unitType && <div>{lead.unitType}</div>}
                                    {lead.budget && <div className="font-medium text-slate-600">{lead.budget}</div>}
                                    {!lead.city && !lead.location && !lead.propertyType && !lead.budget && <span>—</span>}
                                </td>

                                {/* Source */}
                                <td className="p-4">
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="capitalize text-[10px]">{lead.source}</Badge>
                                        {lead.source === 'facebook' && <Globe className="h-3 w-3 text-blue-600" />}
                                    </div>
                                    {lead.fbLeadId && <p className="text-[10px] text-muted-foreground mt-1">ID: {lead.fbLeadId}</p>}
                                </td>

                                {/* Date */}
                                <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                                    {formatDate(lead.createdAt)}
                                </td>

                                {/* Assignment */}
                                <td className="p-4">
                                    {lead.status === 'assigned' ? (
                                        <div className="text-xs">
                                            <Badge variant="success" className="mb-1">Assigned</Badge>
                                            {(lead.assignedTo?.companyName || lead.project?.advertiser?.companyName) && (
                                                <p className="text-muted-foreground truncate max-w-[120px]">
                                                    {lead.assignedTo?.companyName || lead.project?.advertiser?.companyName}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <Badge variant="secondary" className="bg-slate-200">Pending Pool</Badge>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">Leads Management</h1>
                <p className="text-muted-foreground mt-1">
                    Track and distribute leads across all landing pages and projects
                </p>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <div className="flex items-center justify-between mb-4 border-b">
                    <TabsList className="bg-transparent h-auto p-0 gap-6">
                        <TabsTrigger
                            value="all"
                            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 py-2 text-base font-semibold"
                        >
                            All Leads ({leads.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="project"
                            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 py-2 text-base font-semibold"
                        >
                            Project Leads ({projectLeads.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="common"
                            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 py-2 text-base font-semibold"
                        >
                            Common Pool ({commonPoolLeads.length})
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 mb-2">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 h-9"
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExport(leads)}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* All Leads */}
                <TabsContent value="all" className="mt-0">
                    <Card>
                        <CardContent className="p-0">
                            <LeadsTable data={leads} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Project Leads */}
                <TabsContent value="project" className="mt-0">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Project Leads
                            </CardTitle>
                            <CardDescription>
                                Leads submitted on a specific project page — private to that project's advertiser only.
                                The landing page column shows which LP the project was listed on (if any).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <LeadsTable data={projectLeads} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Common Pool */}
                <TabsContent value="common" className="mt-0">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LayoutTemplate className="h-5 w-5 text-primary" />
                                Common Pool
                            </CardTitle>
                            <CardDescription>
                                Leads from the landing page's generic enquiry form or Facebook lead forms — no specific project selected.
                                Distributed to eligible advertisers on that LP based on their lead filters.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <LeadsTable data={commonPoolLeads} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
