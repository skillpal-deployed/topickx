"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Invoice {
    id: string;
    amount: number;
    discount: number;
    paymentMode: string;
    reference: string;
    createdAt: string;
    package: {
        packageDefinition: {
            name: string;
            description: string;
            durationMonths: number;
            price: number;
        };
        advertiser: {
            companyName: string;
            email: string;
            phone: string;
            ownerName?: string;
            address?: string;
            gst?: string;
        };
    };
}

export default function InvoicePage() {
    const params = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (params.id) {
            fetchInvoice(params.id as string);
        }
    }, [params.id]);

    const fetchInvoice = async (id: string) => {
        try {
            const response = await adminAPI.getInvoice(id);
            setInvoice(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to load invoice");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="flex flex-col h-screen items-center justify-center gap-4">
                <p className="text-destructive font-medium">{error || "Invoice not found"}</p>
                <Button variant="outline" asChild>
                    <Link href="/admin/billing">Back to Billing</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:bg-white print:p-0">
            <div className="max-w-4xl mx-auto space-y-6 print:space-y-0">
                {/* Actions Bar - Hidden when printing */}
                <div className="flex justify-between items-center print:hidden">
                    <Button variant="outline" asChild>
                        <Link href="/admin/billing">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        <Button onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print Invoice
                        </Button>
                    </div>
                </div>

                {/* Invoice Card */}
                <div className="bg-white border rounded-xl shadow-sm p-8 md:p-12 print:border-none print:shadow-none print:p-0">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary mb-1">INVOICE</h1>
                            <p className="text-sm text-muted-foreground">
                                #{invoice.id.substring(0, 8).toUpperCase()}
                            </p>
                            <div className="mt-4 text-sm text-muted-foreground text-right">
                                <p className="font-semibold text-foreground">Topickx</p>
                                <p>D-16, 1st Floor, Mahalaxmi Nagar Rd,</p>
                                <p>Behind World Trade Park, D-Block,</p>
                                <p>Malviya Nagar, Jaipur,</p>
                                <p>Rajasthan 302017</p>
                                <p className="mt-1">T: +91 7976634376</p>
                                <p>E: hello@topickx.com</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {/* Logo Image */}
                            <div className="relative h-24 w-64 ml-auto overflow-visible mb-4">
                                <Image
                                    src="/home-logo.png"
                                    alt="Topickx Logo"
                                    fill
                                    className="object-contain object-right scale-[3] origin-right translate-x-4"
                                />
                            </div>
                            <div className="text-sm text-right">
                                <p className="text-muted-foreground">Date Issued</p>
                                <p className="font-medium">{formatDate(invoice.createdAt)}</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-8" />

                    {/* Bill To */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">BILL TO</h3>
                            <p className="font-medium text-lg">{invoice.package.advertiser.companyName}</p>
                            {invoice.package.advertiser.ownerName && (
                                <p className="text-sm text-slate-600">Attn: {invoice.package.advertiser.ownerName}</p>
                            )}
                            <p className="text-sm text-slate-600 mt-1">{invoice.package.advertiser.email}</p>
                            <p className="text-sm text-slate-600">{invoice.package.advertiser.phone}</p>
                            {invoice.package.advertiser.address && (
                                <p className="text-sm text-slate-600 mt-1 max-w-xs">{invoice.package.advertiser.address}</p>
                            )}
                            {invoice.package.advertiser.gst && (
                                <p className="text-sm text-slate-600 mt-1">GSTIN: {invoice.package.advertiser.gst}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">PAYMENT DETAILS</h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <div className="flex justify-end gap-4">
                                    <span>Method:</span>
                                    <span className="font-medium text-foreground capitalize">{invoice.paymentMode}</span>
                                </div>
                                {invoice.reference && (
                                    <div className="flex justify-end gap-4">
                                        <span>Reference:</span>
                                        <span className="font-medium text-foreground">{invoice.reference}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="mb-8">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="text-left py-3 font-semibold text-slate-600">Description</th>
                                    <th className="text-right py-3 font-semibold text-slate-600">Duration</th>
                                    <th className="text-right py-3 font-semibold text-slate-600">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-50">
                                    <td className="py-4">
                                        <p className="font-medium">{invoice.package.packageDefinition.name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">{invoice.package.packageDefinition.description}</p>
                                    </td>
                                    <td className="text-right py-4 text-slate-600">
                                        {invoice.package.packageDefinition.durationMonths} Months
                                    </td>
                                    <td className="text-right py-4 font-medium">
                                        {formatCurrency(invoice.package.packageDefinition.price)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-12">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Subtotal</span>
                                <span>{formatCurrency(invoice.package.packageDefinition.price)}</span>
                            </div>
                            {invoice.discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(invoice.discount)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{formatCurrency(invoice.package.packageDefinition.price - invoice.discount)}</span>
                            </div>
                            {invoice.amount !== (invoice.package.packageDefinition.price - invoice.discount) && (
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Amount Paid</span>
                                    <span>{formatCurrency(invoice.amount)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-muted-foreground mt-auto pt-8 border-t">
                        <p className="mb-1">Thank you for your business!</p>
                        <p>For any queries, please contact support@topickx.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
