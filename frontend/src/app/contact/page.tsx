"use client";

import Link from "next/link";
import Image from "next/image";
import {
    Mail,
    Phone,
    MapPin,
    ArrowLeft,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0fdfa] via-[#ccfbf1] to-[#99f6e4] text-emerald-950 flex flex-col">
            {/* Texture Overlay */}
            <div className="fixed inset-0 opacity-[0.4] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay z-0"></div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-white/80 backdrop-blur-xl border-b border-teal-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <div className="relative w-10 h-10 overflow-visible">
                            <Image
                                src="/icon.jpeg"
                                alt="Topickx Logo"
                                fill
                                className="object-contain scale-[4] origin-left"
                            />
                        </div>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-teal-900 font-bold hover:bg-teal-900/5 rounded-full px-6 flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Header Spacer */}
            <div className="h-20" />

            <main className="relative z-10 flex-1 py-16 px-6 lg:px-8 max-w-4xl mx-auto w-full">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-teal-950">Get in Touch</h1>
                    <p className="text-lg text-teal-800/70 max-w-2xl mx-auto font-light">
                        Have questions about our advertising solutions? Our team is ready to help your real estate projects succeed.
                    </p>
                </div>

                {/* Contact Info Card - Centered and Refined */}
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-2xl shadow-teal-900/10 space-y-12">
                        <div className="space-y-8">
                            <h2 className="text-2xl font-bold text-teal-950 text-center">Contact Information</h2>
                            <div className="space-y-8">
                                {/* Phone */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-white/50 border border-white/80 group">
                                    <div className="flex items-center gap-4 text-center sm:text-left">
                                        <div className="w-14 h-14 rounded-2xl bg-teal-900 text-white flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/20 group-hover:scale-110 transition-transform">
                                            <Phone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-teal-950">Phone Support</p>
                                            <p className="text-teal-800/60 font-light italic text-sm">Update your number here</p>
                                        </div>
                                    </div>
                                    <Button className="rounded-full bg-teal-900 text-white hover:bg-teal-800 px-8 font-bold shadow-lg shadow-teal-900/10">
                                        Call Now
                                    </Button>
                                </div>

                                {/* Email */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-white/50 border border-white/80 group">
                                    <div className="flex items-center gap-4 text-center sm:text-left">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-teal-950">Email Inquiries</p>
                                            <p className="text-teal-800/60 font-light italic text-sm">Update your email here</p>
                                        </div>
                                    </div>
                                    <Button className="rounded-full bg-blue-600 text-white hover:bg-blue-500 px-8 font-bold shadow-lg shadow-blue-600/10">
                                        Send Email
                                    </Button>
                                </div>

                                {/* Office */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-white/50 border border-white/80 group">
                                    <div className="flex items-center gap-4 text-center sm:text-left">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-teal-950">Visit Office</p>
                                            <p className="text-teal-800/60 font-light italic text-sm">Update your address here</p>
                                        </div>
                                    </div>
                                    <Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-500 px-8 font-bold shadow-lg shadow-indigo-600/10">
                                        View Maps
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-teal-900/5 text-center">
                            <p className="text-xs font-bold text-teal-900/40 uppercase tracking-[0.3em] mb-4">Availability</p>
                            <div className="inline-flex items-center gap-2 text-teal-800 font-medium bg-teal-900/5 px-6 py-3 rounded-2xl">
                                <MessageSquare className="w-4 h-4 text-teal-600" />
                                Response within 24 hours
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 py-8 px-6 border-t border-teal-900/5 bg-white/30 backdrop-blur-sm text-center">
                <p className="text-sm text-teal-900/40 font-medium">
                    &copy; {new Date().getFullYear()} Topickx. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
