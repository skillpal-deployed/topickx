"use client";

import Link from "next/link";
import { Building2, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

interface LegalLayoutProps {
    children: React.ReactNode;
    title: string;
    lastUpdated: string;
}

export default function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0fdfa] via-[#ccfbf1] to-[#99f6e4] text-emerald-950 selection:bg-teal-200 selection:text-teal-900 overflow-x-hidden">
            {/* Texture Overlay */}
            <div className="fixed inset-0 opacity-[0.4] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay z-0"></div>

            {/* Navigation */}
            <nav className="relative z-50 py-6">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-8 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-12 h-12 rounded-full bg-teal-900/5 backdrop-blur-md flex items-center justify-center border border-teal-900/10 group-hover:bg-teal-900/10 transition-all">
                            <Building2 className="w-6 h-6 text-teal-800" />
                        </div>
                        <span className="font-extrabold text-2xl tracking-tight text-teal-900">
                            Topickx
                        </span>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost" className="text-teal-900 font-bold hover:bg-teal-900/5">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="relative z-10 py-16 px-6 lg:px-8 max-w-4xl mx-auto">
                <div className="bg-white/40 backdrop-blur-md border border-white/60 p-8 md:p-16 rounded-[3rem] shadow-2xl shadow-teal-900/5">
                    <header className="mb-12 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-teal-950 mb-6">{title}</h1>
                        <div className="flex items-center justify-center gap-2 text-teal-800/40 text-sm font-bold uppercase tracking-widest">
                            <Clock className="w-4 h-4" />
                            Last Updated: {lastUpdated}
                        </div>
                        <div className="h-1 w-20 bg-teal-500 mx-auto mt-8 rounded-full opacity-20" />
                    </header>

                    <article className="prose prose-teal prose-lg max-w-none 
            prose-headings:text-teal-950 prose-headings:font-bold prose-headings:mt-12 prose-headings:mb-6
            prose-p:text-teal-800/70 prose-p:leading-relaxed prose-p:font-light prose-p:mb-6
            prose-li:text-teal-800/70 prose-li:font-light prose-li:mb-2
            prose-strong:text-teal-900 prose-strong:font-bold">
                        {children}
                    </article>
                </div>
            </main>

            <Footer />
        </div>
    );
}
