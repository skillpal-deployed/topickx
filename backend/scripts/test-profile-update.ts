
import { PrismaClient } from '@prisma/client';
import { updateAdvertiserProfile } from '../src/services/user.service';
import { AdminRole } from '../src/types';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Testing Advertiser Profile Update...');

    // 1. Find or create a test advertiser
    let advertiser = await prisma.user.findFirst({
        where: { email: 'test_advertiser_profile_v2@example.com' }
    });

    if (!advertiser) {
        console.log('Creating test advertiser...');
        advertiser = await prisma.user.create({
            data: {
                email: 'test_advertiser_profile_v2@example.com',
                companyName: 'Test Corp',
                role: AdminRole.ADVERTISER,
                isActive: true,
            }
        });
    }

    try {
        console.log(`👤 Using advertiser: ${advertiser.email} (${advertiser.id})`);

        // 2. Update Profile
        const newFilters = {
            city: ['Mumbai', 'Pune'],
            budget: { min: 5000000, max: 10000000 }
        };
        const newMaxLeads = 55;

        console.log('📝 Updating profile with:', { newFilters, newMaxLeads });

        await updateAdvertiserProfile(
            advertiser.id,
            {
                leadFilters: newFilters,
                maxLeadsPerDay: newMaxLeads
            },
            advertiser.id,
            AdminRole.ADVERTISER
        );

        // 3. Verify
        const updatedUser = await prisma.user.findUnique({
            where: { id: advertiser.id }
        });

        console.log('✅ Fetched updated user.');
        console.log('Lead Filters:', JSON.stringify(updatedUser?.leadFilters, null, 2));
        console.log('Max Leads Per Day:', updatedUser?.maxLeadsPerDay);

        if (updatedUser?.maxLeadsPerDay !== newMaxLeads) {
            throw new Error('❌ Max leads mismatch');
        }

        // Prisma JSON comparison might need deep equal, but for string check:
        if (JSON.stringify(updatedUser?.leadFilters) !== JSON.stringify(newFilters)) {
            throw new Error('❌ Lead filters mismatch');
        }

        console.log('🎉 Profile update verified successfully!');
    } finally {
        // Cleanup
        if (advertiser) {
            console.log('🧹 Cleaning up...');
            await prisma.user.delete({ where: { id: advertiser.id } });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
