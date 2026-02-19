import prisma from '../src/utils/prisma';

async function main() {
    // Find the specific projects from the screenshot
    const projects = await prisma.project.findMany({
        where: {
            status: 'LIVE'
        },
        include: {
            package: {
                include: {
                    packageDefinition: true
                }
            },
            advertiser: { select: { companyName: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log('=== LIVE Projects with Package Dates ===');
    projects.forEach(p => {
        const startDate = p.package?.startDate?.toISOString().split('T')[0] || 'null';
        const endDate = p.package?.endDate?.toISOString().split('T')[0] || 'null';
        const durationMonths = p.package?.packageDefinition?.durationMonths || 'N/A';
        console.log(`  ${p.name} | ${p.advertiser?.companyName} | budget: ${p.budgetMin}-${p.budgetMax} | ${startDate} -> ${endDate} | ${durationMonths}mo`);
    });

    await prisma.$disconnect();
}

main().catch(console.error);
