import { Metadata } from "next";
import PublicLandingPage, { LandingPageData } from "./client";

async function getLandingPageData(slug: string): Promise<LandingPageData | null> {
    try {
        // This runs on the Next.js server (SSR), so we MUST use an absolute URL to loopback to the backend directly,
        // otherwise `fetch()` crashes with ERR_INVALID_URL.
        const apiUrl = process.env.NEXT_INTERNAL_BACKEND_URL || "http://127.0.0.1:5000/api";
        const res = await fetch(`${apiUrl}/landing-page/${slug}`, {
            next: { revalidate: 60 }, // Revalidate every minute for testing, maybe longer in prod
        });

        if (!res.ok) {
            return null;
        }

        return res.json();
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
