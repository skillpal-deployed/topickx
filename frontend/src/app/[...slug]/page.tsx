import { publicAPI } from "@/lib/api";
import ProjectDetailView from "@/components/project/ProjectDetailView";
import { Metadata } from "next";

// Force dynamic rendering since we are using params
export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{
        slug: string[];
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Helper to reconstruct slug from URL segments
// Expects: [advertiser, project, location, ...others]
// DB Slug: advertiser-project-location
const reconstructSlug = (segments: string[]): string => {
    // Join all URL path segments with hyphens to reconstruct the DB slug.
    // e.g. ["abc-builders", "green-valley-heights", "new-pune"] → "abc-builders-green-valley-heights-new-pune"
    // Previously this incorrectly took only the first 3 segments, breaking multi-word names/cities.
    return segments.join("-");
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const reconstructedSlug = reconstructSlug(slug);

    try {
        const response = await publicAPI.getProjectBySlug(reconstructedSlug);
        const project = response.data;

        return {
            title: project.seoTitle || `${project.name} by ${project.builderName} in ${project.city}`,
            description: project.seoDescription || project.aboutProject?.substring(0, 160) || `Check out ${project.name} in ${project.city}.`,
        };
    } catch (error) {
        return {
            title: 'Project Not Found',
            description: 'The requested project could not be found.',
        };
    }
}

export default async function ProjectCatchAllPage({ params }: Props) {
    const { slug } = await params;
    const reconstructedSlug = reconstructSlug(slug);
    let project = null;

    try {
        // Fetch project on server
        // Using publicAPI which uses axios. 
        // Note: For better Next.js caching, using native fetch is preferred, 
        // but publicAPI encapsulates logic. We'll use it for consistency.
        const response = await publicAPI.getProjectBySlug(reconstructedSlug);
        project = response.data;
    } catch (error) {
        // Project not found with constructed slug
        // You might want to try other combinations or just let ProjectDetailView handle the 404 state
        console.error("Error fetching project for slug:", reconstructedSlug, error);
    }

    // Pass the project data (or null) to the client component
    // We pass the composite slug as the ID if project is missing, so it can try client-side or show error
    return <ProjectDetailView projectIdOrSlug={reconstructedSlug} initialProject={project} />;
}
