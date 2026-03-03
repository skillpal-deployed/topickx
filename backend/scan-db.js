const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log("Scanning database for old 'skillpal.sgp1' URLs...");

    const options = await prisma.option.findMany({ where: { iconUrl: { contains: 'skillpal.sgp1' } } });
    console.log(`[Option] icons: ${options.length} records found`);

    const users = await prisma.user.findMany({ where: { avatar: { contains: 'skillpal.sgp1' } } });
    console.log(`[User] avatars: ${users.length} records found`);

    const landingPages = await prisma.landingPage.findMany({ where: { heroImage: { contains: 'skillpal.sgp1' } } });
    console.log(`[LandingPage] heroImages: ${landingPages.length} records found`);

    const projects = await prisma.project.findMany();

    const badProjects = {
        floorPlans: 0,
        highlights: 0,
        amenities: 0,
        images: 0,
        locationHighlights: 0
    };

    for (const p of projects) {
        if (JSON.stringify(p.floorPlans).includes('skillpal.sgp1')) badProjects.floorPlans++;
        if (JSON.stringify(p.highlights).includes('skillpal.sgp1')) badProjects.highlights++;
        if (JSON.stringify(p.amenities).includes('skillpal.sgp1')) badProjects.amenities++;
        if (JSON.stringify(p.images).includes('skillpal.sgp1')) badProjects.images++;
        if (JSON.stringify(p.locationHighlights).includes('skillpal.sgp1')) badProjects.locationHighlights++;
    }

    console.log(`[Project] Broken Array/JSON Fields:`, badProjects);

    await prisma.$disconnect();
}
run();
