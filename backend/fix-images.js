const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD = 'https://skillpal.sgp1.digitaloceanspaces.com';
const NEW = 'https://topickx.sgp1.digitaloceanspaces.com';

async function fixArray() {
    console.log(`Fixing 'images' array field from ${OLD} to ${NEW}...`);
    try {
        const allProjects = await prisma.project.findMany({ select: { id: true, images: true } });
        let updatedCount = 0;

        for (const p of allProjects) {
            if (p.images && p.images.length > 0) {
                let changed = false;
                const newImages = p.images.map(img => {
                    if (img.includes(OLD)) {
                        changed = true;
                        return img.replace(OLD, NEW);
                    }
                    return img;
                });

                if (changed) {
                    await prisma.project.update({
                        where: { id: p.id },
                        data: { images: newImages }
                    });
                    updatedCount++;
                }
            }
        }

        console.log(`Successfully fixed images array for ${updatedCount} projects!`);
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}
fixArray();
