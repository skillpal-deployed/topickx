"use client";

import Link from "next/link";
import Image from "next/image";
import { Building2, Mail, Phone, MapPin, Facebook, X, Instagram, Linkedin, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Footer() {
    return (
        <footer className="relative bg-[#050505] text-white pt-24 pb-12 overflow-hidden border-t border-white/5">
            {/* Premium Background Accents */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-600/5 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-500/5 blur-[100px] rounded-full translate-y-1/2 pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
                    {/* Column 1: About TopickX */}
                    <div className="space-y-8">
                        <Link href="/" className="flex items-center gap-4 group">
                            <div className="relative h-24 w-64 -ml-20 overflow-visible">
                                <Image
                                    src="/home-logo.png"
                                    alt="Topickx Logo"
                                    fill
                                    className="object-contain object-left scale-[3] origin-left"
                                />
                            </div>
                        </Link>
                        <p className="text-slate-400 leading-relaxed text-sm font-medium">
                            The smart multi-platform marketing solution that gives you premium visibility on Google AND Facebook with only 15 competing businesses per landing page. Get more leads, pay less, stand out more.
                        </p>
                        <div className="flex items-center gap-3">
                            {[
                                { Icon: Facebook, href: "#" },
                                { Icon: X, href: "#" },
                                { Icon: Instagram, href: "#" },
                                { Icon: Linkedin, href: "#" }
                            ].map(({ Icon, href }, i) => (
                                <a key={i} href={href} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 hover:border-teal-400/30 transition-all group">
                                    <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Platform */}
                    <div>
                        <h4 className="text-white font-bold text-lg mb-8 relative inline-block">
                            Platform
                            <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-teal-500 -mb-2" />
                        </h4>
                        <ul className="space-y-5">
                            {[
                                { label: 'About TopickX', href: '/about' },
                                { label: 'Our Approach', href: '/about#approach' },
                                { label: 'Why Choose Us', href: '/about#why-choose-us' },
                                { label: 'Pricing', href: '/register' },
                                { label: 'Contact Support', href: '/contact' },
                                { label: 'Get Started', href: '/register' }
                            ].map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-slate-400 hover:text-white transition-all flex items-center gap-3 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-600 scale-0 group-hover:scale-100 transition-transform" />
                                        <span className="group-hover:translate-x-1 transition-transform text-sm">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Legal */}
                    <div>
                        <h4 className="text-white font-bold text-lg mb-8 relative inline-block">
                            Legal
                            <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-teal-500 -mb-2" />
                        </h4>
                        <ul className="space-y-5">
                            {[
                                { label: 'Privacy Policy', href: '/privacy-policy' },
                                { label: 'Terms of Service', href: '/terms-of-service' },
                                { label: 'Disclaimer', href: '/disclaimer' },
                                { label: 'Refund Policy', href: '/refund-policy' },
                                { label: 'Cookie Policy', href: '/cookie-policy' }
                            ].map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-slate-400 hover:text-white transition-all flex items-center gap-3 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 scale-0 group-hover:scale-100 transition-transform" />
                                        <span className="group-hover:translate-x-1 transition-transform text-sm">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Connect */}
                    <div>
                        <h4 className="text-white font-bold text-lg mb-8 relative inline-block">
                            Connect
                            <div className="absolute bottom-0 left-0 w-8 h-0.5 bg-teal-500 -mb-2" />
                        </h4>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 group">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-400/10 transition-colors">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="text-slate-400 text-xs leading-relaxed pt-1">
                                    <p className="font-bold text-slate-300 mb-1">Corporate Office</p>
                                    D-16, 1st Floor, Mahalaxmi Nagar Rd,<br />
                                    Behind World Trade Park, D-Block,<br />
                                    Malviya Nagar, Jaipur,<br />
                                    Rajasthan 302017
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-400/10 transition-colors">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <p className="text-slate-400 text-xs font-semibold">+91 7976634376</p>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-400/10 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <p className="text-slate-400 text-xs font-semibold">hello@topickx.com</p>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-wider text-teal-500/60 mb-2">Business Hours</p>
                                <div className="space-y-1 text-[10px] text-slate-500 font-medium">
                                    <p>Mon - Fri: 9:00 AM - 6:00 PM</p>
                                    <p>Sat: 10:00 AM - 4:00 PM</p>
                                    <p>Sunday: Closed</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Bottom Bar */}
                <div className="mt-24 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col gap-2">
                        <p className="text-slate-500 text-xs text-center md:text-left font-medium tracking-wide">
                            © {new Date().getFullYear()} TopickX. All rights reserved.
                        </p>
                        <p className="text-slate-600 text-[10px] text-center md:text-left italic">
                            Redefining Marketing, Connecting Businesses.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
