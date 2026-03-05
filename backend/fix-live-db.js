const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD = 'https://skillpal.sgp1.digitaloceanspaces.com';
const NEW = 'https://topickx.sgp1.digitaloceanspaces.com';

async function run() {
    console.log(`Starting master database URL migration...`);
    console.log(`Replacing ${OLD} with ${NEW} across all tables.`);

    try {
        let totalFixed = 0;

        // --- 1. Fix Project Images & Strings ---
        const projects = await prisma.project.findMany();
        let projectFixes = 0;
        for (const p of projects) {
            let data = {};
            let isChanged = false;

            // Fix String fields
            ['featuredImage', 'heroImage', 'cardImage', 'projectLogo', 'advertiserLogo', 'videoUrl'].forEach(field => {
                if (p[field] && typeof p[field] === 'string' && p[field].includes(OLD)) {
                    data[field] = p[field].replace(new RegExp(OLD, 'g'), NEW);
                    isChanged = true;
                }
            });

            // Fix Array fields
            ['images', 'highlights', 'amenities', 'locationHighlights'].forEach(arrField => {
                if (Array.isArray(p[arrField]) && p[arrField].some(str => typeof str === 'string' && str.includes(OLD))) {
                    data[arrField] = p[arrField].map(str => {
                        if (typeof str === 'string' && str.includes(OLD)) return str.replace(new RegExp(OLD, 'g'), NEW);
                        return str;
                    });
                    isChanged = true;
                }
            });

            // Fix JSON fields (floorPlans)
            if (Array.isArray(p.floorPlans)) {
                let jText = JSON.stringify(p.floorPlans);
                if (jText.includes(OLD)) {
                    data.floorPlans = JSON.parse(jText.replace(new RegExp(OLD, 'g'), NEW));
                    isChanged = true;
                }
            }

            if (isChanged) {
                await prisma.project.update({ where: { id: p.id }, data });
                projectFixes++;
                totalFixed++;
            }
        }
        console.log(`Fixed Project records: ${projectFixes}`);

        // --- 2. Fix Landing Page Hero Images ---
        const landingPages = await prisma.landingPage.findMany();
        let lpFixes = 0;
        for (const lp of landingPages) {
            if (lp.heroImage && lp.heroImage.includes(OLD)) {
                await prisma.landingPage.update({
                    where: { id: lp.id },
                    data: { heroImage: lp.heroImage.replace(new RegExp(OLD, 'g'), NEW) }
                });
                lpFixes++;
                totalFixed++;
            }
        }
        console.log(`Fixed LandingPage records: ${lpFixes}`);

        // --- 3. Fix User avatars ---
        const users = await prisma.user.findMany();
        let userFixes = 0;
        for (const u of users) {
            if (u.avatar && u.avatar.includes(OLD)) {
                await prisma.user.update({
                    where: { id: u.id },
                    data: { avatar: u.avatar.replace(new RegExp(OLD, 'g'), NEW) }
                });
                userFixes++;
                totalFixed++;
            }
        }
        console.log(`Fixed User records: ${userFixes}`);

        // --- 4. Fix Option icons ---
        const options = await prisma.option.findMany();
        let optionFixes = 0;
        for (const opt of options) {
            if (opt.iconUrl && opt.iconUrl.includes(OLD)) {
                await prisma.option.update({
                    where: { id: opt.id },
                    data: { iconUrl: opt.iconUrl.replace(new RegExp(OLD, 'g'), NEW) }
                });
                optionFixes++;
                totalFixed++;
            }
        }
        console.log(`Fixed Option records: ${optionFixes}`);

        console.log(`\n🎉 Success! A total of ${totalFixed} records were updated to the new bucket URL.`);

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
