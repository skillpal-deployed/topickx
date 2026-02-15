/**
 * Seed Property-Unit Type Mappings
 * 
 * This script populates the default mappings between property types and unit types.
 * Run this AFTER the migration: npx tsx seed-property-unit-mappings.ts
 */

import { PrismaClient, OptionType } from '@prisma/client';

const prisma = new PrismaClient();

// Default mappings based on current UNIT_TYPES_BY_PROPERTY constant
const DEFAULT_MAPPINGS: Record<string, string[]> = {
    "Apartment": ["1 RK", "1 BHK", "2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK", "5+ BHK", "Studio"],
    "Penthouse": ["3 BHK", "4 BHK", "5+ BHK"],
    "Villa": ["3 BHK", "4 BHK", "5+ BHK"],
    "Independent House": ["2 BHK", "3 BHK", "4 BHK", "5+ BHK"],
    "Plot": ["Residential Plot", "Commercial Plot"],
};

async function main() {
    console.log('🌱 Starting to seed property-unit type mappings...\n');

    for (const [propertyTypeName, unitTypeNames] of Object.entries(DEFAULT_MAPPINGS)) {
        console.log(`📍 Processing: ${propertyTypeName}`);

        // Find the property type option
        const propertyType = await prisma.option.findFirst({
            where: {
                optionType: OptionType.PROPERTY_TYPE,
                name: propertyTypeName,
            },
        });

        if (!propertyType) {
            console.log(`   ⚠️ Property type "${propertyTypeName}" not found. Skipping.`);
            continue;
        }

        // Find all unit type options
        const unitTypes = await prisma.option.findMany({
            where: {
                optionType: OptionType.UNIT_TYPE,
                name: { in: unitTypeNames },
            },
        });

        if (unitTypes.length === 0) {
            console.log(`   ⚠️ No unit types found for "${propertyTypeName}". Skipping.`);
            continue;
        }

        // Update the property type with the allowed unit types
        // Using 'as any' for the update since the Prisma client hasn't been regenerated yet
        await (prisma.option as any).update({
            where: { id: propertyType.id },
            data: {
                allowedUnitTypes: {
                    set: unitTypes.map(ut => ({ id: ut.id })),
                },
            },
        });

        console.log(`   ✅ Mapped ${unitTypes.length} unit types: ${unitTypes.map(ut => ut.name).join(', ')}`);
    }

    console.log('\n✨ Seeding complete!');
    console.log('💡 Note: You can verify the mappings in the Admin Panel -> Options -> Property Types');
}

main()
    .catch((error) => {
        console.error('❌ Error seeding mappings:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
