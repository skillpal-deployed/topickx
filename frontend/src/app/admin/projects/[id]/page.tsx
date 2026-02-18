"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminAPI } from "@/lib/api";
import { getImageUrl, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft,
    Building2,
    MapPin,
    Calendar,
    Users,
    CheckCircle,
    XCircle,
    Edit,
    ExternalLink,
    Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");

    useEffect(() => {
        if (params.id) {
            fetchProject(params.id as string);
        }
    }, [params.id]);

    const fetchProject = async (id: string) => {
        try {
            const response = await adminAPI.getProject(id);
            setProject(response.data);
        } catch (error) {
            console.error("Error fetching project:", error);
            toast.error("Failed to load project details");
        } finally {
            setLoading(false);
        }
    };

    const handleReviewAction = async (action: "approve" | "reject") => {
        try {
            await adminAPI.reviewProject(project.id, { action });
            toast.success(`Project ${action}d successfully`);
            fetchProject(project.id);
        } catch (error) {
            console.error("Error reviewing project:", error);
            toast.error("Failed to update status");
        }
    };

    const handleUpdateDates = async () => {
        if (!project.package?.id) return;
        try {
            await adminAPI.updatePackageDates(project.package.id, {
                startDate: editStartDate,
                endDate: editEndDate,
            });
            toast.success("Dates updated successfully");
            setIsEditDatesOpen(false);
            fetchProject(project.id);
        } catch (error) {
            console.error("Error updating dates:", error);
            toast.error("Failed to update dates");
        }
    };

    const openDateEditModal = () => {
        if (project.package?.startDate) {
            setEditStartDate(new Date(project.package.startDate).toISOString().split('T')[0]);
        }
        if (project.package?.endDate) {
            setEditEndDate(new Date(project.package.endDate).toISOString().split('T')[0]);
        }
        setIsEditDatesOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-muted-foreground">Project not found</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{project.name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {project.locality}, {project.city}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/project/${project.slug || project.id}`} target="_blank">
                        <Button variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            {project.status === 'LIVE' ? 'View Live Page' : 'Preview'}
                        </Button>
                    </Link>
                    <Link href={`/admin/projects/${project.id}/edit`}>
                        <Button variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                        </Button>
                    </Link>
                    {project.status === "SUBMITTED_FOR_REVIEW" && (
                        <>
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleReviewAction("approve")}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => handleReviewAction("reject")}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                            </Button>
                        </>
                    )}
                    {project.status === "APPROVED_AWAITING_PLACEMENT" && (
                        <Link href="/admin/placement-queue">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <MapPin className="h-4 w-4 mr-2" />
                                Assign to Landing Page
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Info */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(project.featuredImage || project.heroImage || project.images?.[0]) && (
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100">
                                <img
                                    src={getImageUrl(project.featuredImage || project.heroImage || project.images?.[0])}
                                    alt={project.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-1">Builder</label>
                                <p className="font-medium">{project.builderName}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-1">Advertiser</label>
                                <p className="font-medium text-primary">
                                    {project.advertiser?.companyName || "N/A"}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-1">Budget Range</label>
                                <p className="font-medium">
                                    {formatCurrency(project.budgetMin)} - {formatCurrency(project.budgetMax)}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-1">Property Type</label>
                                <Badge variant="secondary">
                                    {Array.isArray(project.propertyType) ? project.propertyType.join(', ') : project.propertyType}
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Description
                            </label>
                            <div
                                className="prose max-w-none text-sm text-slate-600"
                                dangerouslySetInnerHTML={{ __html: project.description }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Current Status</span>
                                <Badge>{project.status}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Created At</span>
                                <span className="text-sm">{formatDate(project.createdAt)}</span>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm font-medium">Dates</span>
                                {project.package && (
                                    <Button variant="ghost" size="sm" onClick={openDateEditModal} className="h-6 w-6 p-0">
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            {project.status === 'LIVE' && project.package?.startDate && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Live Date</span>
                                    <span className="text-sm">{formatDate(project.package.startDate)}</span>
                                </div>
                            )}
                            {project.status === 'LIVE' && project.package?.endDate && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Expiry Date</span>
                                    <span className="text-sm">{formatDate(project.package.endDate)}</span>
                                </div>
                            )}
                            {project.packageRequest && (
                                <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                                        Package Details
                                    </p>
                                    <div className="flex justify-between text-sm">
                                        <span>Type</span>
                                        <span className="font-medium">
                                            {project.packageRequest.packageDefinition.name}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Duration</span>
                                        <span className="font-medium">
                                            {project.packageRequest.packageDefinition.durationDays} Days
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <Link
                                href={`/project/${project.slug || project.id}`}
                                target="_blank"
                            >
                                <Button variant="outline" className="w-full">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    {project.status === 'LIVE' ? 'View Live Page' : 'Preview Public Page'}
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Dates Modal */}
            <Dialog open={isEditDatesOpen} onOpenChange={setIsEditDatesOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project Dates</DialogTitle>
                        <DialogDescription>
                            Modify the start and expiry dates for this project package.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="startDate">Live Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="endDate">Expiry Date</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDatesOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateDates}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
