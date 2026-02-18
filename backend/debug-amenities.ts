

import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
    const project = await prisma.project.findFirst({
        where: {
            amenities: {
                isEmpty: false
            }
        },
        take: 1
    });

    if (!project) {
        console.log("No projects found with amenities");
        return;
    }

    console.log(`Checking Project: ${project.name} (${project.id})`);
    console.log("Amenities in Project:", project.amenities);

    if (!project.amenities || project.amenities.length === 0) {
        console.log("Project has no amenities to check.");
        return;
    }

    const amenityIds = project.amenities;

    const options = await prisma.option.findMany({
        where: {
            id: { in: amenityIds }
        }
    });

    console.log("Found Options:", options);

    // Check which ones are missing
    const foundIds = new Set(options.map(o => o.id));
    const missing = amenityIds.filter(id => !foundIds.has(id));

    console.log("Missing IDs (these will show as slugs):", missing);

    // Also check if any amenities are actually names
    const optionsByName = await prisma.option.findMany({
        where: {
            name: { in: amenityIds }
        }
    });
    console.log("Found Options by Name (if amenities were stored as names):", optionsByName);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
