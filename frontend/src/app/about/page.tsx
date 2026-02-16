// Converted to Server Component for better performance

import Link from "next/link";
import {
    Building2,
    Zap,
    Target,
    TrendingUp,
    Unlock,
    Users,
    CheckCircle2,
    ArrowRight,
    ShieldCheck,
    Rocket,
    Search,
    Users2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Footer from "@/components/Footer";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f0fdfa] via-[#ccfbf1] to-[#99f6e4] text-emerald-950 selection:bg-teal-200 selection:text-teal-900 overflow-x-hidden">
            {/* Texture Overlay */}
            <div className="fixed inset-0 opacity-[0.4] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay z-0"></div>

            {/* Navigation (Simple) */}
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
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-20 px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <div className="relative z-10 space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-1000">
                    <Badge className="bg-teal-100 text-teal-800 border-none px-4 py-1.5 rounded-full font-bold tracking-wider uppercase text-xs">
                        About TopickX
                    </Badge>
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-teal-950 leading-[1.1]">
                        Redefining the Future of <br />
                        <span className="text-teal-600">Digital Marketing</span>
                    </h1>
                    <p className="text-xl text-teal-800/70 max-w-3xl mx-auto leading-relaxed font-light">
                        TopickX is a revolutionary multi-platform marketing solution designed to help businesses achieve maximum visibility without the traditional marketing budget.
                    </p>
                </div>
            </section>

            {/* Who We Are & Mission */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 p-10 rounded-[3rem] bg-white/40 backdrop-blur-md border border-white/60 shadow-2xl shadow-teal-900/5">
                            <div className="w-14 h-14 rounded-2xl bg-teal-900 text-white flex items-center justify-center shadow-lg shadow-teal-900/20">
                                <Users2 className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-bold text-teal-950">Who We Are</h2>
                            <p className="text-teal-800/70 leading-relaxed font-light">
                                We bridge the gap between expensive Google Ads campaigns and limited Meta-only advertising, providing the best of both worlds at an affordable price. Our team of marketing experts and developers is dedicated to your growth.
                            </p>
                        </div>
                        <div className="space-y-8 p-10 rounded-[3rem] bg-teal-900 text-white shadow-2xl shadow-teal-900/20">
                            <div className="w-14 h-14 rounded-2xl bg-teal-400 text-teal-950 flex items-center justify-center shadow-lg shadow-teal-400/20">
                                <Target className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl font-bold">Our Mission</h2>
                            <p className="text-teal-100/70 leading-relaxed font-light">
                                To democratize digital marketing by making multi-platform advertising accessible to businesses of all sizes. We believe every business deserves premium visibility and quality leads without breaking the bank.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The TopickX Difference */}
            <section className="py-24 bg-white/30 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold text-teal-950 tracking-tight">The TopickX Difference</h2>
                        <div className="h-1 w-20 bg-teal-500 mx-auto mt-4 rounded-full" />
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                title: "Limited Competition",
                                description: "Unlike marketplaces with 1000+ listings, we limit each page to 15 businesses. That's 93% less competition.",
                                icon: <Users className="w-6 h-6" />,
                                accent: "amber"
                            },
                            {
                                title: "Multi-Platform",
                                description: "Simultaneous presence on Google Search, Display, YouTube, Facebook Feed, Meta Stories, and Messenger.",
                                icon: <Zap className="w-6 h-6" />,
                                accent: "teal"
                            },
                            {
                                title: "Smart Technology",
                                description: "Proprietary dual-tracking (Meta Pixel + Google Analytics) for powerful cross-platform remarketing.",
                                icon: <TrendingUp className="w-6 h-6" />,
                                accent: "emerald"
                            },
                            {
                                title: "Affordable Excellence",
                                description: "Enterprise-level marketing capabilities at a fraction of traditional agency costs.",
                                icon: <Unlock className="w-6 h-6" />,
                                accent: "blue"
                            }
                        ].map((item, i) => (
                            <div key={i} className="group p-8 rounded-[2rem] bg-white border border-teal-50 shadow-xl shadow-teal-900/5 hover:-translate-y-2 transition-all duration-300">
                                <div className={`w-12 h-12 rounded-xl bg-${item.accent}-50 text-${item.accent}-600 flex items-center justify-center mb-6 group-hover:bg-teal-900 group-hover:text-white transition-all`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-teal-950 mb-3">{item.title}</h3>
                                <p className="text-sm text-teal-800/60 leading-relaxed font-light">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Our Approach */}
            <section id="approach" className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-12">
                            <div>
                                <h2 className="text-4xl font-bold text-teal-950 tracking-tight mb-4">Our Approach</h2>
                                <p className="text-teal-800/60 font-light text-lg">A strategic, data-driven methodology to scale your business growth.</p>
                            </div>

                            <div className="space-y-8">
                                {[
                                    { title: "Strategic Ad Pool Model", desc: "We curate landing pages with only 15 complementary businesses for maximum visibility." },
                                    { title: "Cross-Platform Retargeting", desc: "Automated remarketing lists on both Facebook and Google capture potential leads multiple times." },
                                    { title: "Data-Driven Optimization", desc: "Continuous monitoring and budget allocation for the highest ROI performance." },
                                    { title: "Transparency First", desc: "Detailed analytics showing exactly where your visitors come from and how they convert." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-6">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                            <span className="font-bold text-teal-900 text-sm">{i + 1}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-teal-950 text-xl mb-1">{item.title}</h4>
                                            <p className="text-teal-800/60 font-light">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div id="why-choose-us" className="bg-teal-950 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/10 blur-[80px] rounded-full -mr-32 -mt-32" />
                            <div className="relative z-10 space-y-8">
                                <h3 className="text-3xl font-bold text-white">Why Businesses Choose Us</h3>
                                <ul className="space-y-4">
                                    {[
                                        "50-70% lower cost per lead",
                                        "93% less competition than marketplaces",
                                        "7-12 customer touchpoints per lead",
                                        "Pre-qualified retargeted audiences",
                                        "Dedicated account managers",
                                        "Fast setup in just 5-7 days"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-teal-100/80">
                                            <div className="w-5 h-5 rounded-full bg-teal-400/20 flex items-center justify-center">
                                                <CheckCircle2 className="w-3 h-3 text-teal-400" />
                                            </div>
                                            <span className="font-light">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="pt-8 border-t border-white/5">
                                    <Link href="/register">
                                        <Button className="w-full h-14 rounded-2xl bg-teal-400 text-teal-950 hover:bg-white font-bold text-lg shadow-xl shadow-teal-400/10 transition-all">
                                            Get Started Today
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Industries & Values */}
            <section className="py-24 bg-gradient-to-b from-transparent to-white/50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-16">
                        <div className="space-y-8 text-center md:text-left">
                            <h3 className="text-3xl font-bold text-teal-950">Our Values</h3>
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { title: "Innovation", icon: <Rocket className="w-5 h-5" /> },
                                    { title: "Transparency", icon: <Search className="w-5 h-5" /> },
                                    { title: "Results", icon: <ShieldCheck className="w-5 h-5" /> },
                                    { title: "Partnership", icon: <Users2 className="w-5 h-5" /> }
                                ].map((v, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-white/60 border border-white flex flex-col items-center md:items-start gap-4 shadow-lg shadow-teal-900/5">
                                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                            {v.icon}
                                        </div>
                                        <span className="font-bold text-teal-900">{v.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-8 text-center md:text-left">
                            <h3 className="text-3xl font-bold text-teal-950">Industries We Serve</h3>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                {[
                                    "Real Estate", "Retail", "E-commerce", "Professional Services",
                                    "Healthcare", "Education", "Home Services", "Automotive",
                                    "Technology", "Hospitality", "Wellness"
                                ].map((ind, i) => (
                                    <Badge key={i} variant="outline" className="px-5 py-2.5 rounded-full border-teal-200 text-teal-800 bg-teal-50/50 text-sm font-medium">
                                        {ind}
                                    </Badge>
                                ))}
                            </div>
                            <p className="text-teal-800/50 font-light italic text-sm">And many more specialized B2B and B2C niches.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-24 px-6 relative">
                <div className="max-w-5xl mx-auto bg-teal-950 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden shadow-[0_40px_100px_-20px_rgba(13,148,136,0.5)]">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-400/20 via-transparent to-transparent animate-pulse" />
                    <div className="relative z-10 space-y-8">
                        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready to Grow Together?</h2>
                        <p className="text-teal-100/60 text-lg max-w-2xl mx-auto font-light">
                            Join hundreds of businesses scaling with multi-platform intelligence.
                        </p>
                        <div className="flex justify-center gap-6 pt-4">
                            <Link href="/contact">
                                <Button size="lg" className="h-16 px-10 rounded-full bg-teal-400 text-teal-950 hover:bg-white font-bold text-lg transition-all shadow-xl shadow-teal-400/20">
                                    Contact Our Team
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
