import { Metadata } from "next";
import PublicLandingPage, { LandingPageData } from "./client";

import { publicAPI } from "@/lib/api";

async function getLandingPageData(slug: string): Promise<LandingPageData | null> {
    try {
        // Use the shared Axios instance which automatically resolves to an absolute loopback URL during SSR
        const res = await publicAPI.getLandingPage(slug);

        if (!res.data) {
            return null;
        }

        return res.data;
    } catch (error) {
        console.error("Error fetching landing page data:", error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const data = await getLandingPageData(slug);

    if (!data) {
        return {
            title: "Landing Page Not Found",
        };
    }

    return {
        title: data.seoTitle || data.name,
        description: data.seoDescription || data.description || `Find the best properties in ${data.city}`,
        openGraph: {
            title: data.seoTitle || data.name,
            description: data.seoDescription || data.description,
            // We'll leave images out for now or handle them if we have a robust way to get absolute URLs
        },
    };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await getLandingPageData(slug);
    return <PublicLandingPage initialData={data} />;
}
