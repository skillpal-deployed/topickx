const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD_PREFIX = 'https://skillpal.sgp1.digitaloceanspaces.com';
const NEW_PREFIX = 'https://topickx.sgp1.digitaloceanspaces.com';

async function fix() {
    console.log(`Replacing ${OLD_PREFIX} with ${NEW_PREFIX}`);

    try {
        // Update Users
        const users = await prisma.$executeRawUnsafe(`
            UPDATE "users" 
            SET "avatar" = REPLACE("avatar", '${OLD_PREFIX}', '${NEW_PREFIX}')
            WHERE "avatar" LIKE '%${OLD_PREFIX}%'
        `);
        console.log(`Updated Users:`, users);

        // Update Projects (String Fields)
        const projects = await prisma.$executeRawUnsafe(`
            UPDATE "projects" 
            SET "featuredImage" = REPLACE("featuredImage", '${OLD_PREFIX}', '${NEW_PREFIX}'),
                "cardImage" = REPLACE("cardImage", '${OLD_PREFIX}', '${NEW_PREFIX}'),
                "projectLogo" = REPLACE("projectLogo", '${OLD_PREFIX}', '${NEW_PREFIX}'),
                "advertiserLogo" = REPLACE("advertiserLogo", '${OLD_PREFIX}', '${NEW_PREFIX}')
            WHERE "featuredImage" LIKE '%${OLD_PREFIX}%' 
               OR "cardImage" LIKE '%${OLD_PREFIX}%'
               OR "projectLogo" LIKE '%${OLD_PREFIX}%'
               OR "advertiserLogo" LIKE '%${OLD_PREFIX}%'
        `);
        console.log(`Updated Projects (String fields):`, projects);

        // Update Landing Pages
        const pages = await prisma.$executeRawUnsafe(`
            UPDATE "landing_pages" 
            SET "heroImage" = REPLACE("heroImage", '${OLD_PREFIX}', '${NEW_PREFIX}')
            WHERE "heroImage" LIKE '%${OLD_PREFIX}%'
        `);
        console.log(`Updated Landing Pages:`, pages);

        // Update Project JSON Arrays (galleryImages, floorPlans)
        const allProjects = await prisma.project.findMany();
        let jsonCount = 0;

        for (const p of allProjects) {
            let changed = false;

            // Fix Gallery Images Array
            if (p.galleryImages) {
                let galStr = JSON.stringify(p.galleryImages);
                if (galStr.includes(OLD_PREFIX)) {
                    galStr = galStr.split(OLD_PREFIX).join(NEW_PREFIX);
                    p.galleryImages = JSON.parse(galStr);
                    changed = true;
                }
            }

            // Fix Floor Plans JSON
            if (p.floorPlans) {
                let floorStr = JSON.stringify(p.floorPlans);
                if (floorStr.includes(OLD_PREFIX)) {
                    floorStr = floorStr.split(OLD_PREFIX).join(NEW_PREFIX);
                    p.floorPlans = JSON.parse(floorStr);
                    changed = true;
                }
            }

            if (changed) {
                await prisma.project.update({
                    where: { id: p.id },
                    data: {
                        galleryImages: p.galleryImages,
                        floorPlans: p.floorPlans
                    }
                });
                jsonCount++;
            }
        }
        console.log(`Updated Projects (JSON fields): ${jsonCount}`);

        console.log("Database URL fixing complete!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
