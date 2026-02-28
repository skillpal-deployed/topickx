/**
 * One-off script to bulk update all DigitalOcean Spaces files in the `uploads/` folder to `public-read`.
 * Run using: npx ts-node spaces-make-public.ts
 */
import { S3Client, ListObjectsV2Command, PutObjectAclCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
import path from 'path';

// Load the backend environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'skillpal';
const ENDPOINT = process.env.DO_SPACES_ENDPOINT || 'https://sgp1.digitaloceanspaces.com';

const s3 = new S3Client({
    endpoint: ENDPOINT,
    region: "sgp1", // Standard for DO Spaces
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY || '',
        secretAccessKey: process.env.DO_SPACES_SECRET || ''
    }
});

async function makeFolderPublic(prefix: string) {
    console.log(`Scanning bucket '${BUCKET_NAME}' with prefix '${prefix}'...`);
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    let updatedCount = 0;

    try {
        while (isTruncated) {
            const listParams: any = {
                Bucket: BUCKET_NAME,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            };

            const listCommand = new ListObjectsV2Command(listParams);
            const listResponse = await s3.send(listCommand);

            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                console.log("No files found.");
                break;
            }

            for (const item of listResponse.Contents) {
                if (item.Key) {
                    try {
                        const aclParams = {
                            Bucket: BUCKET_NAME,
                            Key: item.Key,
                            ACL: "public-read" as const
                        };
                        await s3.send(new PutObjectAclCommand(aclParams));
                        console.log(`[SUCCESS] Set public-read: ${item.Key}`);
                        updatedCount++;
                    } catch (aclError) {
                        console.error(`[ERROR] Failed to set ACL for ${item.Key}:`, aclError);
                    }
                }
            }

            isTruncated = listResponse.IsTruncated ?? false;
            continuationToken = listResponse.NextContinuationToken;
        }

        console.log(`\n✅ Finished! Successfully updated ${updatedCount} files to public-read.`);
    } catch (error) {
        console.error("Critical Execution Error:", error);
    }
}

// Run for the uploads folder
makeFolderPublic('uploads/');
