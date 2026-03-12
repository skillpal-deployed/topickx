import { notFound } from "next/navigation";

interface Props {
    params: Promise<{ slug: string }>;
}

// This /p/[slug] route is an old unused page from the pre-Topickx "ListingHub" era.
// Real landing pages live at /lp/[slug].
// This file is kept to prevent 404 errors from silently escalating to unhandledRejections
// in the [...slug] catch-all. It now returns a clean Next.js 404 immediately.
export default async function LandingPage(_: Props) {
    notFound();
}

export async function generateMetadata(_: Props) {
    return { title: "Not Found" };
}
