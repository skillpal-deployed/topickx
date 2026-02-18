"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { publicAPI } from "@/lib/api";
import { getImageUrl, getProjectUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  X,
  Building2,
  ArrowRight,
  ChevronRight,
  BarChart3,
  Users,
  Zap,
  MapPin,
  TrendingUp,
} from "lucide-react";
import Footer from "@/components/Footer";
import AuthToggle from "@/components/AuthToggle";
import dynamic from "next/dynamic";
import Counter from "@/components/Counter";

// Dynamically import SplineScene to avoid SSR issues and improve initial load
const SplineScene = dynamic(() => import("@/components/SplineScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-emerald-800/40 font-medium">
      Loading 3D Scene...
    </div>
  ),
});

export default function HomePage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await publicAPI.getLandingPages();
        const lpData = response.data || [];

        // Map projects from landing pages
        const allProjects = lpData.flatMap((lp: any) => lp.projects || []);
        const uniqueProjects = Array.from(new Map(allProjects.map((p: any) => [p.id, p])).values()).slice(0, 6);
        setProjects(uniqueProjects);
      } catch (error) {
        console.error("Error fetching homepage data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdfa] via-[#ccfbf1] to-[#99f6e4] text-emerald-950 selection:bg-teal-200 selection:text-teal-900 overflow-x-hidden">
      {/* Texture Overlay for Premium Feel */}
      <div className="fixed inset-0 opacity-[0.4] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay z-0"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-6">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative h-16 w-64">
                <Image
                  src="/home-logo.png"
                  alt="Topickx Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8 text-lg font-semibold text-teal-800/80">
              {[
                { label: 'Advertise', href: user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/register" },
                { label: 'Features', href: '#features' },
                { label: 'Contact', href: '/contact' }
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="hover:text-teal-950 transition-colors relative group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-600 transition-all group-hover:w-full" />
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
                  <Button className="rounded-full bg-teal-900 text-white hover:bg-teal-800 font-semibold px-6 shadow-lg shadow-teal-900/10">
                    Dashboard
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <AuthToggle />
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-teal-900"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-teal-100 p-4 space-y-4 shadow-2xl">
              {[
                { label: 'Advertise', href: user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/register" },
                { label: 'Features', href: '#features' },
                { label: 'Contact', href: '/contact' }
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block text-teal-900 font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-teal-100 flex flex-col gap-3">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-teal-900 text-white">Login</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 lg:px-8 max-w-[1400px] mx-auto min-h-[85vh] flex flex-col justify-center">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left Content */}
          <div className="relative z-10 space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-1000">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-teal-950 drop-shadow-sm">
              Scale Your Business Without <br />
              <span className="text-teal-600">Breaking the Bank</span>
            </h1>

            <p className="text-lg sm:text-xl text-teal-800/80 max-w-lg leading-relaxed font-light">
              Get premium visibility on Google AND Facebook with only 15 competing businesses. No more getting lost in crowded marketplace platforms.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/register"}>
                <Button
                  size="lg"
                  className="h-14 px-8 rounded-full bg-teal-900 text-white hover:bg-teal-800 font-bold text-lg shadow-[0_0_40px_-10px_rgba(13,148,136,0.2)] hover:shadow-[0_0_60px_-10px_rgba(13,148,136,0.3)] transition-all duration-300 group"
                >
                  {user ? 'Go to Dashboard' : 'Get Started'}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link href="#features">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 rounded-full border-teal-900/10 text-teal-900 hover:bg-teal-900/5 font-medium text-lg backdrop-blur-sm"
                >
                  See how it works
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="pt-12 mt-12">
              <div className="flex flex-col md:inline-flex md:flex-row items-center gap-6 md:gap-12 p-6 md:p-8 rounded-[2rem] bg-white/40 backdrop-blur-md border border-white/60 shadow-2xl shadow-teal-900/10 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-500">
                {[
                  { label: 'Less Competition', end: 93, suffix: '%' },
                  { label: 'Ad Platforms', end: 6, suffix: '+' },
                  { label: 'More Buyers Reached', end: 60, suffix: '%' },
                ].map((stat, i) => (
                  <div key={i} className="relative group">
                    <div className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-indigo-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 drop-shadow-md">
                      <Counter end={stat.end} suffix={stat.suffix} />
                    </div>
                    <div className="text-[10px] text-teal-900/40 font-black uppercase tracking-[0.25em] mt-2 group-hover:text-teal-900/60 transition-colors">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Spline 3D */}
          <div className="relative h-[350px] md:h-[500px] lg:h-[700px] w-full animate-in fade-in duration-1000 delay-300 lg:-mr-20">
            {/* Glow Effect behind model */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-teal-400/20 blur-[120px] rounded-full pointer-events-none" />

            <SplineScene
              scene="https://prod.spline.design/wAnPbyrX2X70LI56/scene.splinecode"
              className="transform scale-110 lg:scale-125"
            />
          </div>

        </div>
      </section>


      {/* Value Proposition Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <Badge className="bg-teal-100 text-teal-800 border-none px-4 py-1.5 rounded-full mb-6 font-bold tracking-wider uppercase text-xs">
              Value Proposition
            </Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-teal-950 tracking-tight leading-[1.1]">
              The Smart Alternative to Expensive <br className="hidden md:block" />
              <span className="text-teal-600">Ads & Crowded Platforms</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: "Too Expensive",
                description: "Google Ads cost ₹50,000+ per month. Most businesses simply can't afford it, missing out on 60% of potential customers who search on Google.",
                accent: "from-amber-400 to-amber-600",
                problem: "60% of search traffic ignored"
              },
              {
                title: "Platform Dependent",
                description: "Running only Meta ads? You're missing qualified leads actively searching for your products/services on Google right now.",
                accent: "from-teal-400 to-teal-600",
                problem: "Active intent leads lost"
              },
              {
                title: "Lost in the Crowd",
                description: "Marketplace platforms have 1000+ listings. Your premium offering becomes invisible among the noise.",
                accent: "from-emerald-400 to-emerald-600",
                problem: "99% invisibility rate"
              }
            ].map((card, i) => (
              <div key={i} className="group relative bg-white/40 backdrop-blur-md border border-white/60 p-6 md:p-10 rounded-[2.5rem] shadow-2xl shadow-teal-900/5 hover:-translate-y-2 transition-all duration-500">
                <div className={`w-14 h-1.5 rounded-full bg-gradient-to-r ${card.accent} mb-8`} />
                <h3 className="text-2xl font-bold text-teal-950 mb-4">{card.title}</h3>
                <p className="text-teal-800/70 leading-relaxed font-light mb-8">
                  {card.description}
                </p>
                <div className="pt-6 border-t border-teal-100/50 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-teal-900/40">The Impact</span>
                  <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50/50">
                    {card.problem}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-200/20 blur-[100px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-200/20 blur-[100px] rounded-full -ml-48 -mb-48" />
      </section>

      {/* How Topickx Works Section (Difference) */}
      <section id="features" className="py-24 bg-teal-900 relative">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <Badge className="bg-teal-800/50 text-teal-100 border-teal-700/50 px-4 py-1.5 rounded-full mb-6 font-bold tracking-wider uppercase text-xs">
              The Topickx Difference
            </Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              Your Strategic Ad Pool <br className="hidden md:block" />
              <span className="text-teal-400">Best of Both Worlds</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-12">
            {[
              {
                title: "Not a Marketplace",
                description: "We're not a crowded platform with thousands of listings. We limit each landing page to just 15 premium businesses.",
                icon: <Building2 className="w-8 h-8" />
              },
              {
                title: "Not Just Meta Ads",
                description: "We give you presence on BOTH Meta (Facebook, Instagram) AND Google (Search, Display, YouTube) - simultaneously.",
                icon: <TrendingUp className="w-8 h-8" />
              },
              {
                title: "Your Own Landing Page Slot",
                description: "Get a guaranteed premium slot on our high-converting landing pages with built-in tracking and retargeting.",
                icon: <MapPin className="w-8 h-8" />
              }
            ].map((item, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-teal-800/30 border border-teal-700/30 hover:bg-teal-800/40 transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-teal-400/10 flex items-center justify-center text-teal-400 mb-8">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-teal-100/60 leading-relaxed font-light">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Detailed 3-Step Process Sub-section */}
          <div className="mt-24 pt-24 border-t border-teal-800/50">
            <h3 className="text-3xl font-bold text-white text-center mb-16">The 3-Step Success Path</h3>
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connector lines (Desktop) */}
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-700 to-transparent -translate-y-1/2 z-0" />

              {[
                {
                  step: "01",
                  title: "Select Your Package",
                  description: "Choose a slot on our landing page for guaranteed visibility. Advertise individual ads targeted to specific audiences."
                },
                {
                  step: "02",
                  title: "Get Listed with Expert Help",
                  description: "Once we set up everything, create your listing yourself or take help from your dedicated account manager."
                },
                {
                  step: "03",
                  title: "Track Your Results",
                  description: "Watch qualified leads from multiple sources. We provide detailed analytics showing exact visitor data."
                }
              ].map((step, i) => (
                <div key={i} className="relative z-10 p-8 rounded-3xl bg-teal-950/50 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-teal-400 text-teal-950 flex items-center justify-center font-black text-xl mb-6 shadow-[0_0_20px_rgba(45,212,191,0.3)]">
                    {step.step}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">{step.title}</h4>
                  <p className="text-teal-100/50 text-sm leading-relaxed font-light">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Platform Advantage Section */}
      <section className="py-24 relative">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="bg-amber-100 text-amber-800 border-none px-4 py-1.5 rounded-full mb-6 font-bold tracking-wider uppercase text-xs">
              Multi-Platform Magic
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-teal-950 tracking-tight leading-[1.1]">
              Why Multi-Platform <br className="hidden md:block" />
              <span className="text-teal-600">Marketing Wins</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              {
                time: "Morning",
                platform: "Facebook/Instagram",
                action: "Scrolling Social Media",
                description: "A potential customer sees your striking ad while browsing. They click to learn more.",
                icon: <Users className="w-5 h-5" />
              },
              {
                time: "On Arrival",
                platform: "Topickx Landing Page",
                action: "Engagement & Tracking",
                description: "They land on your premium slot. Both Meta Pixel AND Google Analytics start tracking.",
                icon: <Zap className="w-5 h-5" />
              },
              {
                time: "Afternoon",
                platform: "Google Search/Display",
                action: "Reinforcement",
                description: "They search for a related service and see YOUR ad again! Recognition builds instantly.",
                icon: <TrendingUp className="w-5 h-5" />
              },
              {
                time: "The Result",
                platform: "Conversion",
                action: "High-Trust Inquiry",
                description: "Familiar with your brand across platforms, they're ready to buy. 3-5x higher conversion.",
                icon: <ArrowRight className="w-5 h-5" />
              }
            ].map((step, i) => (
              <div key={i} className="bg-white p-8 rounded-[2rem] border border-teal-50 shadow-xl shadow-teal-900/5 group hover:border-teal-200 transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-900/40">{step.time}</span>
                  <div className="h-px flex-1 bg-teal-100" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-6 group-hover:bg-teal-900 group-hover:text-white transition-all duration-300">
                  {step.icon}
                </div>
                <h3 className="font-bold text-teal-950 mb-2">{step.platform}</h3>
                <p className="text-sm font-semibold text-teal-600 mb-4">{step.action}</p>
                <p className="text-sm text-teal-800/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Limited Competition Advantage Section */}
      <section className="py-24 bg-gradient-to-b from-white to-teal-50/50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <Badge className="bg-emerald-100 text-emerald-800 border-none px-4 py-1.5 rounded-full font-bold tracking-wider uppercase text-xs">
                  Exclusivity Matters
                </Badge>
                <h2 className="text-4xl sm:text-5xl font-bold text-teal-950 tracking-tight leading-tight">
                  ONLY 15 Businesses <br />
                  <span className="text-emerald-600">Per Landing Page</span>
                </h2>
              </div>
              <p className="text-lg text-teal-800/70 leading-relaxed font-light">
                Traditional marketplaces drown your business in a sea of 1000+ competitors. We do things differently.
              </p>

              <div className="space-y-6 pt-4">
                <div className="p-8 rounded-2xl bg-white border border-teal-100 shadow-lg shadow-teal-900/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-teal-950">The Math: Marketplace</span>
                    <span className="text-red-500 font-bold">{"<"} 1% Visibility</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-[1%] h-full bg-red-400" />
                  </div>
                </div>
                <div className="p-8 rounded-2xl bg-teal-900 text-white shadow-xl shadow-teal-900/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold">The Math: TopickX</span>
                    <span className="text-teal-400 font-bold">6.67% Visibility</span>
                  </div>
                  <div className="w-full h-2 bg-teal-800 rounded-full overflow-hidden">
                    <div className="w-[6.67%] h-full bg-teal-400" />
                  </div>
                  <p className="text-xs text-teal-100/60 mt-4">That's 7x more attention for every visitor!</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 lg:p-12 rounded-[3rem] shadow-2xl shadow-teal-900/10 border border-teal-50">
              <h3 className="text-2xl font-bold text-teal-950 mb-8 border-b border-teal-50 pb-6">Comparison Analysis</h3>
              <div className="space-y-6">
                {/* Header for table */}
                <div className="grid grid-cols-[1.2fr_1.5fr_1.5fr] gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-teal-900/30 pb-2 border-b border-teal-50">
                  <span>Factor</span>
                  <span>Marketplace</span>
                  <span>TopickX</span>
                </div>
                {[
                  { label: "Competition", marketplace: "1000+ Listings", topickx: "ONLY 15 Slots", status: "better" },
                  { label: "Visibility", marketplace: "Getting Buried", topickx: "Guaranteed Spot", status: "better" },
                  { label: "Ad Synergy", marketplace: "Internal ONLY", topickx: "Google + Meta", status: "better" },
                  { label: "Presentation", marketplace: "Generic/Noisy", topickx: "Premium/Focused", status: "better" },
                  { label: "Lead Quality", marketplace: "Mixed/Cold", topickx: "Pre-qualified", status: "better" }
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-[1.2fr_1.5fr_1.5fr] gap-4 text-sm items-center py-4 border-b border-teal-50 last:border-0">
                    <span className="font-bold text-teal-900/40 uppercase tracking-widest text-[9px]">{row.label}</span>
                    <span className="text-slate-400 line-through decoration-red-300">{row.marketplace}</span>
                    <span className="font-bold text-teal-900 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-teal-500 fill-teal-500" />
                      {row.topickx}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results & Metrics Section */}
      <section className="py-24 bg-teal-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
          <Badge className="bg-teal-800/50 text-teal-100 border-teal-700/50 px-4 py-1.5 rounded-full mb-6 font-bold tracking-wider uppercase text-xs">
            Performance
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-20 leading-[1.1]">
            Real Results from <br className="hidden md:block" />
            <span className="text-teal-400">Multi-Platform Marketing</span>
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: "Higher Conversion", detail: "Trust builds across platforms", value: "3-5x" },
              { label: "Lower Cost Per Lead", detail: "Smart budget allocation", value: "40%↓" },
              { label: "Touchpoints", detail: "Meta + Google + YouTube", value: "Multi" },
              { label: "Quality Leads", detail: "Pre-qualified retargeting", value: "Elite" }
            ].map((stat, i) => (
              <div key={i} className="p-8 rounded-3xl bg-teal-900/40 border border-teal-800/50 group hover:border-teal-400 transition-all duration-300">
                <div className="text-4xl font-black text-teal-400 mb-2 group-hover:scale-110 transition-transform duration-300">{stat.value}</div>
                <div className="text-xl font-bold text-white mb-2">{stat.label}</div>
                <p className="text-teal-100/40 text-sm">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center mb-20">
          <Badge className="bg-teal-100 text-teal-800 border-none px-4 py-1.5 rounded-full mb-6 font-bold tracking-wider uppercase text-xs">
            Success Stories
          </Badge>
          <h2 className="text-4xl font-bold text-teal-950">Trusted by Leading Businesses</h2>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-3 gap-8">
          {[
            {
              quote: "We were spending heavily on Google Ads with mediocre results. TopickX gave us the same Google presence PLUS Facebook and Instagram at a fraction of the cost. Our cost per lead dropped significantly!",
              author: "Rajesh Sharma",
              role: "Founder, Real Estate Group"
            },
            {
              quote: "Being one of only 15 businesses on the landing page means we actually get noticed. On traditional marketplaces, we were competing with thousands of listings. Night and day difference!",
              author: "Priya Mehta",
              role: "Director, Premium Logistics"
            },
            {
              quote: "The cross-platform retargeting is genius. We see the same prospects on Facebook, then Google, then YouTube. By the time they contact us, they're ready to buy!",
              author: "Amit Patel",
              role: "CEO, Tech Solutions"
            }
          ].map((item, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] bg-teal-50/30 border border-teal-100/50 relative shadow-xl shadow-teal-900/5">
              <div className="text-6xl font-serif text-teal-900/10 absolute top-8 left-8">"</div>
              <p className="text-teal-800/80 italic leading-relaxed mb-8 relative z-10">
                {item.quote}
              </p>
              <div className="pt-6 border-t border-teal-100/50">
                <p className="font-bold text-teal-950">{item.author}</p>
                <p className="text-xs text-teal-800/40 font-bold uppercase tracking-widest mt-1">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed System Phases Section */}
      <section className="py-24 bg-teal-50/50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-teal-950 mb-4">The Complete TopickX System</h2>
            <p className="text-teal-800/60 max-w-2xl mx-auto">From setup to consistent conversion, here's how we scale your growth.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {[
              { title: "Setup", items: ["Professional Listing", "Landing Page Slot", "Tracking Config", "Campaign Launch"] },
              { title: "Traffic", items: ["Google Search/Display", "YouTube Ads", "Facebook Feed", "Instagram Stories"] },
              { title: "Audience", items: ["Page View Tracking", "Interaction Monitoring", "Segment Building", "Pixel Optimization"] },
              { title: "Retargeting", items: ["Cross-platform Ads", "Special Offers", "Priority Follow-up", "Continuous Loop"] },
              { title: "Conversion", items: ["Detailed Analytics", "Real-time Tracking", "Lead Management", "ROI Reports"] }
            ].map((phase, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white border border-teal-100 shadow-xl shadow-teal-900/5 group hover:bg-teal-950 hover:text-white transition-all duration-500">
                <div className="text-xs font-black text-teal-900/30 group-hover:text-teal-400/50 uppercase tracking-[0.3em] mb-4">Phase {i + 1}</div>
                <h3 className="text-xl font-bold mb-6">{phase.title}</h3>
                <ul className="space-y-3">
                  {phase.items.map((item, j) => (
                    <li key={j} className="text-sm text-teal-800/60 group-hover:text-teal-100/60 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-teal-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="text-4xl font-bold text-teal-950 text-center mb-20">Frequently Asked Questions</h2>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
            {/* Column 1: General Questions */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-teal-900 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-900 text-xs">01</span>
                General Questions
              </h3>
              {[
                { q: "What exactly is TopickX?", a: "TopickX is a multi-platform marketing solution that gives you premium visibility on both Meta (Facebook/Instagram) and Google platforms, with only 15 competing businesses per landing page. We're not a crowded marketplace, and we're not just a Meta ads agency - we're the smart middle ground that gets you multi-platform presence at affordable prices." },
                { q: "How is TopickX different from traditional marketplaces?", a: "Traditional marketplaces have 1000+ listings where your business gets lost. TopickX limits each landing page to just 15 premium businesses, giving you 93% less competition. Plus, we handle all the advertising across Google AND Facebook - marketplaces don't do this." },
                { q: "Is TopickX better than hiring a digital marketing agency?", a: "Traditional agencies charge ₹50,000-₹100,000+ per month for Google Ads alone. TopickX gives you Google AND Facebook presence at a fraction of the cost, with pre-built landing pages that convert. We're designed for businesses that need results without the premium agency price tag." },
                { q: "Who is TopickX for?", a: "TopickX is perfect for small to medium businesses with limited marketing budgets, large businesses who want to target competition audiences, service providers wanting better ROI, e-commerce sellers tired of marketplace fees, and anyone captured by customers who are comparison shopping." },
                { q: "What industries does TopickX work for?", a: "TopickX works for virtually any B2C or B2B industry including Retail, Real Estate, Professional Services, Healthcare, Education, Home Services, Automotive, Technology, Hospitality, and more!" }
              ].map((faq, i) => (
                <details key={i} className="group bg-teal-50/50 rounded-2xl border border-teal-100/50 overflow-hidden transition-all duration-300">
                  <summary className="p-6 cursor-pointer flex items-center justify-between list-none font-bold text-teal-950">
                    <span className="max-w-[90%]">{faq.q}</span>
                    <ChevronRight className="w-5 h-5 group-open:rotate-90 transition-transform text-teal-400 shrink-0" />
                  </summary>
                  <div className="px-6 pb-6 text-teal-800/60 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>

            {/* Column 2: Platform & Performance */}
            <div className="space-y-12">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-teal-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-900 text-xs">02</span>
                  Platform & Features
                </h3>
                {[
                  { q: "What platforms do you advertise on?", a: "We run campaigns on Google (Search Ads, Display Ads, YouTube Ads) and Meta (Facebook Feed, Instagram Feed & Stories, Messenger Ads)." },
                  { q: "What is a 'landing page slot'?", a: "Each landing page on TopickX features exactly 15 premium businesses in related categories. A 'slot' is your dedicated space on one of these pages. This gives you guaranteed visibility without getting lost in the crowd." },
                  { q: "What are 'individual ads on audiences'?", a: "In addition to your landing page slot, you can run targeted ads to specific audience segments based on demographics, interests, behaviors, or retargeting lists. These individual ads give you precise control over who sees your messaging." },
                  { q: "How does the dual tracking work?", a: "When someone clicks your ad and lands on your TopickX page, both Meta Pixel and Google Analytics fire simultaneously. This means Facebook knows who visited and can retarget them on FB/Instagram, while Google can retarget them on Search/Display/YouTube." },
                  { q: "What happens to visitors who don't convert immediately?", a: "Low-engagement visitors (30-40%) are automatically entered into remarketing campaigns on both platforms. High-engagement visitors (60-70%) are added to priority lists and shown special offer campaigns." }
                ].map((faq, i) => (
                  <details key={i + 10} className="group bg-teal-50/50 rounded-2xl border border-teal-100/50 overflow-hidden transition-all duration-300">
                    <summary className="p-6 cursor-pointer flex items-center justify-between list-none font-bold text-teal-950">
                      <span className="max-w-[90%]">{faq.q}</span>
                      <ChevronRight className="w-5 h-5 group-open:rotate-90 transition-transform text-teal-400 shrink-0" />
                    </summary>
                    <div className="px-6 pb-6 text-teal-800/60 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-teal-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-900 text-xs">03</span>
                  Results & Performance
                </h3>
                {[
                  { q: "How quickly will I see results?", a: "If the landing page is already live for advertisement, you may start getting leads from the next day itself. However, timing depends upon search volume and competition in your industry." },
                  { q: "How many leads can I expect per month?", a: "Lead volume varies significantly based on your industry, market size, price point, ad budget, and quality of your presentation. We focus on delivering quality leads rather than committing to specific numbers." },
                  { q: "What's a 'qualified lead'?", a: "Someone who has viewed your business details, spent meaningful time on the page, filled out a contact form OR called, and matches your target customer profile. We track lead quality, not just lead quantity." }
                ].map((faq, i) => (
                  <details key={i + 20} className="group bg-teal-50/50 rounded-2xl border border-teal-100/50 overflow-hidden transition-all duration-300">
                    <summary className="p-6 cursor-pointer flex items-center justify-between list-none font-bold text-teal-950">
                      <span className="max-w-[90%]">{faq.q}</span>
                      <ChevronRight className="w-5 h-5 group-open:rotate-90 transition-transform text-teal-400 shrink-0" />
                    </summary>
                    <div className="px-6 pb-6 text-teal-800/60 text-sm leading-relaxed animate-in fade-in slide-in-from-top-2">
                      {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto bg-teal-950 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden shadow-[0_40px_100px_-20px_rgba(13,148,136,0.5)]">
          {/* Animated Glow Background */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-teal-400/20 via-transparent to-transparent animate-pulse" />

          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Ready to Scale <span className="text-teal-400">Your Business?</span></h2>
            <p className="text-teal-100/60 text-lg md:text-xl max-w-2xl mx-auto font-light">
              Join hundreds of businesses getting quality leads from both Google and Facebook simultaneously. No setup fees • Flexible plans • Expert support included.
            </p>
            <div className="flex flex-wrap justify-center gap-6 pt-8">
              <Link href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/register"}>
                <Button size="lg" className="h-16 px-10 rounded-full bg-teal-400 text-teal-950 hover:bg-white font-black text-lg transition-all shadow-[0_0_40px_rgba(45,212,191,0.3)]">
                  Get Started Today
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" className="h-16 px-10 rounded-full border border-white/20 bg-transparent text-white hover:bg-white/10 font-bold text-lg backdrop-blur-md">
                  Schedule Free Demo
                </Button>
              </Link>
            </div>

            <div className="pt-16 flex flex-wrap justify-center gap-8 md:gap-16 opacity-40">
              <span className="text-white text-xs font-black flex items-center gap-2 tracking-[0.2em]"><Zap className="w-4 h-4 text-teal-400" /> SSL ENCRYPTED</span>
              <span className="text-white text-xs font-black flex items-center gap-2 tracking-[0.2em]"><Zap className="w-4 h-4 text-teal-400" /> GDPR COMPLIANT</span>
              <span className="text-white text-xs font-black flex items-center gap-2 tracking-[0.2em]"><Zap className="w-4 h-4 text-teal-400" /> SECURE PAYMENTS</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
