"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { formatBudgetRange, formatDate, getImageUrl } from "@/lib/utils";
import {
    FolderOpen,
    Search,
    Eye,
    Edit,
    CheckCircle,
    XCircle,
    MapPin,
    Building,
    Clock,
    Pause,
    Trash2,
    EyeOff,
    ArrowRightLeft,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface Project {
    id: string;
    name: string;
    builderName: string;
    city: string;
    locality: string;
    status: string;
    budgetMin: number;
    budgetMax: number;
    propertyType: string | string[];
    visits: number;
    createdAt: string;
    cardImage?: string;
    featuredImage?: string;
    images?: string[];
    advertiser?: {
        id: string;
        companyName: string;
    };
    placements?: {
        landingPage: {
            id: string;
            name: string;
            slug: string;
        };
    }[];
    package?: {
        startDate?: string;
        endDate?: string;
        packageDefinition?: {
            name: string;
            durationMonths: number;
        };
    };
}




export default function AdminProjectsPage() {
    const searchParams = useSearchParams();
    const initialStatus = searchParams.get("status") || "all";

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState(initialStatus);

    // Reassign Modal State
    const [landingPages, setLandingPages] = useState<any[]>([]);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedLPId, setSelectedLPId] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchProjects();
        fetchLandingPages();
    }, [statusFilter]);

    const fetchLandingPages = async () => {
        try {
            const response = await adminAPI.getLandingPages();
            setLandingPages(response.data);
        } catch (error) {
            console.error("Error fetching landing pages:", error);
        }
    };

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const params: { status?: string } = {};
            if (statusFilter !== "all") {
                params.status = statusFilter;
            }
            const response = await adminAPI.getProjects(params);
            setProjects(response.data);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string; icon: any }> = {
            LIVE: { variant: "success", label: "Live", icon: CheckCircle },
            SUBMITTED_FOR_REVIEW: { variant: "warning", label: "Under Review", icon: Clock },
            REJECTED: { variant: "destructive", label: "Rejected", icon: XCircle },
            DRAFT: { variant: "secondary", label: "Draft", icon: null },
            PAUSED: { variant: "outline", label: "Paused", icon: Pause },
            PENDING_PLACEMENT: { variant: "info", label: "Pending Placement", icon: Clock },
            APPROVED: { variant: "success", label: "Approved", icon: CheckCircle },
        };
        const config = variants[status] || { variant: "secondary", label: status, icon: null };
        return (
            <Badge variant={config.variant}>
                {config.icon && <config.icon className="h-3 w-3 mr-1" />}
                {config.label}
            </Badge>
        );
    };

    const handleReviewAction = async (
        projectId: string,
        action: "approve" | "reject",
        comment?: string
    ) => {
        try {
            await adminAPI.reviewProject(projectId, { action, comment });
            fetchProjects();
            toast.success(`Project ${action}d successfully`);
        } catch (error) {
            console.error("Error reviewing project:", error);
            toast.error("Failed to update project status");
        }
    };

    const handleDeleteProject = async (id: string) => {
        if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            return;
        }
        try {
            await adminAPI.deleteProject(id);
            setProjects(projects.filter((p) => p.id !== id));
            toast.success("Project deleted successfully");
        } catch (error) {
            console.error("Error deleting project:", error);
            toast.error("Failed to delete project");
        }
    };

    const handleToggleVisibility = async (project: Project) => {
        try {
            if (project.status === 'PAUSED') {
                await adminAPI.resumeProject(project.id);
                toast.success("Project resumed");
            } else {
                await adminAPI.pauseProject(project.id);
                toast.success("Project paused");
            }
            fetchProjects();
        } catch (error) {
            console.error("Error toggling project:", error);
            toast.error("Failed to update project");
        }
    };

    const handleReassignProject = async () => {
        if (!selectedProject || !selectedLPId) {
            toast.error("Please select a landing page");
            return;
        }
        setActionLoading(true);
        try {
            await adminAPI.reassignProject(selectedProject.id, { landing_page_id: selectedLPId });
            toast.success("Project reassigned successfully");
            setShowReassignModal(false);
            setSelectedProject(null);
            setSelectedLPId("");
            fetchProjects();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to reassign project");
        } finally {
            setActionLoading(false);
        }
    };

    const openReassignModal = (project: Project) => {
        setSelectedProject(project);
        setSelectedLPId("");
        setShowReassignModal(true);
    };

    const filteredProjects = projects.filter(
        (project) =>
            project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.builderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.advertiser?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusOptions = [
        { value: "all", label: "All" },
        { value: "SUBMITTED_FOR_REVIEW", label: "Under Review" },
        { value: "LIVE", label: "Live" },
        { value: "APPROVED", label: "Approved" },
        { value: "PENDING_PLACEMENT", label: "Pending Placement" },
        { value: "REJECTED", label: "Rejected" },
        { value: "DRAFT", label: "Draft" },
        { value: "PAUSED", label: "Paused" },
    ];

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
                <h1 className="text-2xl md:text-3xl font-heading font-bold">Projects</h1>
                <p className="text-muted-foreground mt-1">
                    Manage all property projects
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {statusOptions.map((option) => (
                        <Button
                            key={option.value}
                            variant={statusFilter === option.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(option.value)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Projects Table */}
            {filteredProjects.length > 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="text-left p-4 font-medium w-max">Image</th>
                                        <th className="text-left p-4 font-medium">Project</th>
                                        <th className="text-left p-4 font-medium">Location</th>
                                        <th className="text-left p-4 font-medium">Landing Page</th>
                                        <th className="text-left p-4 font-medium">Advertiser</th>
                                        <th className="text-left p-4 font-medium">Package</th>
                                        <th className="text-left p-4 font-medium">Budget</th>
                                        <th className="text-left p-4 font-medium">Live Date</th>
                                        <th className="text-left p-4 font-medium">Expiry Date</th>
                                        <th className="text-right p-4 font-medium">Visits</th>
                                        <th className="text-left p-4 font-medium">Status</th>
                                        <th className="text-left p-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.map((project) => (
                                        <tr key={project.id} className="border-b hover:bg-slate-50/50">
                                            <td className="p-4">
                                                <div className="w-16 h-12 bg-slate-100 rounded-md overflow-hidden relative">
                                                    {(project.cardImage || project.featuredImage || (project.images && project.images.length > 0)) ? (
                                                        <img
                                                            src={getImageUrl(project.cardImage || project.featuredImage || project.images?.[0])}
                                                            alt={project.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://placehold.co/100x60?text=No+Img';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <Building className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium">{project.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    by {project.builderName}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    {project.locality}, {project.city}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm">
                                                {project.placements && project.placements.length > 0 ? (
                                                    project.placements.map((placement, idx) => (
                                                        <div key={idx} className="mb-1 last:mb-0">
                                                            <Link
                                                                href={`/lp/${placement.landingPage.slug}`}
                                                                target="_blank"
                                                                className="text-primary hover:underline flex items-center gap-1 group"
                                                            >
                                                                {placement.landingPage.name}
                                                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </Link>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm">
                                                {project.advertiser ? (
                                                    <Link
                                                        href={`/admin/advertisers/${project.advertiser.id}`}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {project.advertiser.companyName}
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm">
                                                {project.package?.packageDefinition ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{project.package.packageDefinition.name}</span>
                                                        <span className="text-xs text-muted-foreground">{project.package.packageDefinition.durationMonths} months</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm font-medium">
                                                {formatBudgetRange(project.budgetMin, project.budgetMax)}
                                            </td>
                                            <td className="p-4 text-sm text-nowrap">
                                                {project.package?.startDate ? formatDate(project.package.startDate) : "-"}
                                            </td>
                                            <td className="p-4 text-sm text-nowrap">
                                                {project.package?.endDate ? formatDate(project.package.endDate) : "-"}
                                            </td>
                                            <td className="p-4 text-right font-bold text-primary">
                                                {project.visits || 0}
                                            </td>
                                            <td className="p-4">{getStatusBadge(project.status)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/admin/projects/${project.id}`}>
                                                        <Button variant="ghost" size="icon" title="View Details">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/admin/projects/${project.id}/edit`}>
                                                        <Button variant="ghost" size="icon" title="Edit Project">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {project.status !== "DRAFT" && project.status !== "SUBMITTED_FOR_REVIEW" && (
                                                                <DropdownMenuItem onClick={() => handleToggleVisibility(project)}>
                                                                    {project.status === "PAUSED" ? (
                                                                        <>
                                                                            <Clock className="h-4 w-4 mr-2" />
                                                                            Resume Project
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Pause className="h-4 w-4 mr-2" />
                                                                            Pause Project
                                                                        </>
                                                                    )}
                                                                </DropdownMenuItem>
                                                            )}

                                                            <DropdownMenuItem onClick={() => openReassignModal(project)}>
                                                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                                                Reassign to LP
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteProject(project.id)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete Project
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    {project.status === "SUBMITTED_FOR_REVIEW" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="bg-green-600 hover:bg-green-700 ml-2"
                                                                onClick={() =>
                                                                    handleReviewAction(project.id, "approve")
                                                                }
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() =>
                                                                    handleReviewAction(project.id, "reject")
                                                                }
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                            </Button>
                                                        </>
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
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
                        <p className="text-muted-foreground">
                            {searchQuery || statusFilter !== "all"
                                ? "Try adjusting your filters"
                                : "No projects have been created yet"}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Reassign Project Modal */}
            <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="w-5 h-5 text-primary" />
                            Reassign Project to Landing Page
                        </DialogTitle>
                        <DialogDescription>
                            Select a landing page to move <strong>{selectedProject?.name}</strong> to:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Target Landing Page</Label>
                        <Select value={selectedLPId} onValueChange={setSelectedLPId}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select landing page" />
                            </SelectTrigger>
                            <SelectContent>
                                {landingPages.length > 0 ? (
                                    landingPages.map((lp) => (
                                        <SelectItem key={lp.id} value={lp.id}>
                                            {lp.name} ({lp.city})
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="_none" disabled>
                                        No landing pages available
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReassignModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReassignProject}
                            disabled={actionLoading || !selectedLPId}
                        >
                            {actionLoading ? "Reassigning..." : "Reassign Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
