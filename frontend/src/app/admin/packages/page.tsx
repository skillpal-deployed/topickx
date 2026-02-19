"use client";

import { useEffect, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import { Package, Plus, Edit, Trash2 } from "lucide-react";

interface PackageDefinition {
    id: string;
    name: string;
    description?: string;
    price: number;
    durationMonths: number;
    isActive: boolean;
    createdAt: string;
}

export default function PackagesPage() {
    const [packages, setPackages] = useState<PackageDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => {
        fetchPackages();
    }, [showInactive]);

    const fetchPackages = async () => {
        try {
            const response = await adminAPI.getPackageDefinitions(showInactive);
            setPackages(response.data || []);
        } catch (error) {
            console.error("Error fetching packages:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this package?")) return;
        try {
            await adminAPI.deletePackageDefinition(id);
            fetchPackages();
        } catch (error: any) {
            const message = error.response?.data?.error || "Error deleting package";
            alert(message);
            console.error("Error deleting package:", error);
        }
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
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-bold">
                        Package Definitions
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage available packages for advertisers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowInactive(!showInactive)}
                    >
                        {showInactive ? "Hide" : "Show"} Inactive
                    </Button>
                    <Link href="/admin/packages/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Package
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Packages Grid */}
            {packages?.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(packages || []).map((pkg) => (
                        <Card
                            key={pkg.id}
                            className={`card-hover ${!pkg.isActive ? "opacity-60" : ""}`}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <Package className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                            <CardDescription>
                                                {pkg.durationMonths} month{pkg.durationMonths !== 1 ? 's' : ''} validity
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant={pkg.isActive ? "success" : "secondary"}>
                                        {pkg.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                                {pkg.description && (
                                    <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center py-4 bg-slate-50 rounded-lg">
                                    <span className="text-3xl font-bold text-primary">
                                        {formatCurrency(pkg.price)}
                                    </span>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {pkg.durationMonths} month{pkg.durationMonths !== 1 ? 's' : ''} duration
                                    </p>
                                </div>



                                <div className="flex gap-2 pt-4 border-t">
                                    <Link href={`/admin/packages/${pkg.id}/edit`} className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDelete(pkg.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <CardContent>
                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Packages Found</h3>
                        <p className="text-muted-foreground mb-4">
                            Create your first package to get started
                        </p>
                        <Link href="/admin/packages/new">
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Package
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
