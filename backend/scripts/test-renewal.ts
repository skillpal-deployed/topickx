import prisma from '../src/utils/prisma';

import { runExpiryCheck, createPackageRequest, confirmPayment, activatePackage } from '../src/services/package.service';
import { PackageState, ProjectStatus, AdminRole } from '../src/types';
import { addMonths, subMonths } from 'date-fns';

async function main() {
    console.log('🔄 Starting Renewal Test...');

    // 1. Setup: Create Advertiser, PackageDef
    const email = `test-renew-${Date.now()}@example.com`;
    const advertiser = await prisma.user.create({
        data: {
            email,
            password: 'password123',
            role: AdminRole.ADVERTISER,
            companyName: 'Renewal Test Corp',
        }
    });
    console.log(`✅ Created advertiser: ${advertiser.email}`);

    const pkgDef = await prisma.packageDefinition.create({
        data: {
            name: 'Test Renewal Package',
            price: 1000,
            durationMonths: 1,
            isActive: true,
        }
    });
    console.log(`✅ Created package definition: ${pkgDef.name}`);

    // 2. Create an EXPIRED Package Purchase manually
    const startDate = subMonths(new Date(), 2);
    const endDate = subMonths(new Date(), 1); // Expired 1 month ago

    const expiredPkg = await prisma.packagePurchase.create({
        data: {
            advertiserId: advertiser.id,
            packageDefinitionId: pkgDef.id,
            state: PackageState.ACTIVE, // Simulating it was active but dates are old
            startDate,
            endDate,
            amountPaid: 1000,
        }
    });
    console.log(`✅ Created supposedly expired package: ${expiredPkg.id}`);

    // 3. Create a Project linked to this package
    const project = await prisma.project.create({
        data: {
            advertiserId: advertiser.id,
            packageId: expiredPkg.id,
            name: 'Expired Project',
            builderName: 'Test Builder',
            city: 'Test City',
            locality: 'Test Locality',
            status: ProjectStatus.LIVE, // Was live
            slug: `expired-project-${Date.now()}`,
            budgetMin: 5000000,
            budgetMax: 10000000,
            propertyType: ['Apartment'],
            unitTypes: ['2 BHK'],
            possessionStatus: 'Ready to Move',
            aboutProject: 'Test Description',
        }
    });
    console.log(`✅ Created LIVE project: ${project.name} (${project.status})`);

    // 4. Run Expiry Check
    console.log('⏳ Running expiry check...');
    const expiryResult = await runExpiryCheck('system-test', AdminRole.SUPER_ADMIN);
    console.log('Expiry Check Result:', expiryResult);

    const updatedProject = await prisma.project.findUnique({ where: { id: project.id } });
    const updatedPkg = await prisma.packagePurchase.findUnique({ where: { id: expiredPkg.id } });

    if (updatedProject?.status === ProjectStatus.EXPIRED && updatedPkg?.state === PackageState.EXPIRED) {
        console.log('✅ Expiry check PASSED: Project and Package are EXPIRED.');
    } else {
        console.error('❌ Expiry check FAILED:', updatedProject?.status, updatedPkg?.state);
        return;
    }

    // 5. Initiate Renewal
    console.log('🔄 Initiating Renewal...');
    const renewalRequest = await createPackageRequest(advertiser.id, pkgDef.id, project.id);
    console.log(`✅ Created renewal request: ${renewalRequest.id} for project ${renewalRequest.projectId}`);

    // 6. Confirm Payment
    console.log('💰 Confirming Payment...');
    await confirmPayment(renewalRequest.id, {
        transactionReference: 'TEST-TXN-123',
        amountPaid: 1000,
        paymentMode: 'Bank Transfer'
    }, 'admin-user', AdminRole.ACCOUNTS);

    // 7. Verify Project Reset
    // 7. Verify Project Reset
    const renewedProject = await prisma.project.findUnique({ where: { id: project.id } });

    if (!renewedProject) {
        console.error('❌ Renewal FAILED: Project not found');
        return;
    }

    if (renewedProject.status === ProjectStatus.APPROVED_AWAITING_PLACEMENT) {
        console.log(`✅ Renewal PASSED: Project status reset to ${renewedProject.status}`);
    } else {
        console.error(`❌ Renewal FAILED: Project status is ${renewedProject.status}`);
        return;
    }

    if (renewedProject.packageId !== expiredPkg.id) { // Should be a NEW package ID
        console.log(`✅ Renewal PASSED: Project linked to NEW package ID: ${renewedProject.packageId}`);
    } else {
        console.error('❌ Renewal FAILED: Project still linked to OLD package ID');
        return;
    }

    // Cleanup
    console.log('🧹 Cleaning up...');
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.packagePurchase.deleteMany({ where: { advertiserId: advertiser.id } });
    await prisma.packageRequest.deleteMany({ where: { advertiserId: advertiser.id } });
    await prisma.packageDefinition.delete({ where: { id: pkgDef.id } });
    await prisma.user.delete({ where: { id: advertiser.id } });

    console.log('✅ Test Complete');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
