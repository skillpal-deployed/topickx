"use client";

import { useEffect, useState } from "react";
import { adminAPI } from "@/lib/api";
import { getImageUrl, formatCurrency } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    ClipboardList,
    Building2,
    MapPin,
    Clock,
    ArrowRight,
    Plus,
    CheckCircle,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function PlacementQueuePage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [landingPages, setLandingPages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPlaceDialog, setShowPlaceDialog] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [selectedLP, setSelectedLP] = useState("");
    const [selectedPosition, setSelectedPosition] = useState("auto");
    const [placing, setPlacing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projectsRes, lpRes] = await Promise.all([
                adminAPI.getPlacementQueue(),
                adminAPI.getLandingPages(),
            ]);
            setProjects(projectsRes.data);
            setLandingPages(lpRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch placement queue");
        } finally {
            setLoading(false);
        }
    };

    const openPlaceDialog = (project: any) => {
        setSelectedProject(project);
        setSelectedLP("");
        setSelectedPosition("auto");
        setShowPlaceDialog(true);
    };

    const handlePlace = async () => {
        if (!selectedLP) {
            toast.error("Please select a landing page");
            return;
        }

        setPlacing(true);
        try {
            await adminAPI.placeProject({
                projectId: selectedProject.id,
                landingPageId: selectedLP,
                position: selectedPosition === "auto" ? undefined : parseInt(selectedPosition),
            });
            toast.success("Project placed successfully! Validity started.");
            setShowPlaceDialog(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to place project");
        } finally {
            setPlacing(false);
        }
    };

    const getAvailableLandingPages = () => {
        // Filter out full landing pages based on their maxProjects settings
        return landingPages.filter((lp) => (lp.listings?.length || 0) < (lp.maxProjects || 30));
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-800 text-sm">
                    <strong>Important:</strong> Only approved projects with confirmed payment appear
                    here. Package validity (duration) starts when you assign a project to a landing
                    page.
                </p>
            </div>

            <Card className="border-slate-100">
                <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        Approved Projects Ready for Placement ({projects.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {projects.length > 0 ? (
                        <div className="space-y-4">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors gap-4"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Image */}
                                        <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                                            {project.featuredImage ? (
                                                <img
                                                    src={getImageUrl(project.featuredImage)}
                                                    alt={project.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Building2 className="w-8 h-8 text-slate-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <h3 className="font-medium text-slate-900">
                                                {project.name}
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                by {project.builderName}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                                                <span className="flex items-center gap-1 text-slate-500">
                                                    <MapPin className="w-4 h-4" />
                                                    {project.locality}, {project.city}
                                                </span>
                                                <Badge variant="secondary" className="bg-slate-100">
                                                    {Array.isArray(project.propertyType) ? project.propertyType.join(', ') : project.propertyType}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-primary font-medium mt-1">
                                                {formatCurrency(project.budgetMin)} -{" "}
                                                {formatCurrency(project.budgetMax)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        {/* Package Info */}
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {project.packageRequest?.packageDefinition?.durationDays / 30 || 0} Months
                                            </Badge>
                                            <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Payment Confirmed
                                            </Badge>
                                        </div>

                                        <Button
                                            className="rounded-full gap-2"
                                            onClick={() => openPlaceDialog(project)}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Assign to LP
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">
                                No approved projects awaiting placement
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                Projects appear here after they are approved in Project Review
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Place Dialog */}
            <Dialog open={showPlaceDialog} onOpenChange={setShowPlaceDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display">Assign to Landing Page</DialogTitle>
                        <DialogDescription>
                            {selectedProject?.name} by {selectedProject?.builderName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Landing Page *</label>
                            <Select value={selectedLP} onValueChange={setSelectedLP}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose landing page" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAvailableLandingPages().map((lp) => (
                                        <SelectItem key={lp.id} value={lp.id}>
                                            {lp.name} ({lp.listings?.length || 0}/{lp.maxProjects || 15} slots)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {landingPages.length === 0 && (
                                <p className="text-sm text-amber-600">
                                    No landing pages created yet. Create one first.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            {(() => {
                                const selectedLandingPage = landingPages.find((lp: any) => lp.id === selectedLP);
                                const maxPositions = selectedLandingPage?.maxProjects || 15;
                                return (
                                    <>
                                        <label className="text-sm font-medium">Position (1-{maxPositions})</label>
                                        <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select position" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">Auto (next available)</SelectItem>
                                                {Array.from({ length: maxPositions }, (_, i) => i + 1).map((pos) => (
                                                    <SelectItem key={pos} value={pos.toString()}>
                                                        Position {pos}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
                            <strong>⚠️ Important:</strong> Package validity will start immediately upon
                            placement.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPlaceDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePlace}
                            disabled={!selectedLP || placing}
                            className="rounded-full"
                        >
                            {placing ? "Placing..." : "Confirm Placement"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
