import { Router } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Check which storage provider to use
const useSpaces = process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET && process.env.DO_SPACES_BUCKET;
const useCloudinary = !useSpaces && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

// Configure Digital Ocean Spaces (S3-compatible)
let s3Client: S3Client | null = null;
if (useSpaces) {
    s3Client = new S3Client({
        endpoint: process.env.DO_SPACES_ENDPOINT || 'https://sgp1.digitaloceanspaces.com',
        region: 'sgp1',
        credentials: {
            accessKeyId: process.env.DO_SPACES_KEY!,
            secretAccessKey: process.env.DO_SPACES_SECRET!,
        },
    });
    console.log('Using Digital Ocean Spaces for file storage');
} else if (useCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('Using Cloudinary for file storage');
} else {
    console.log('Using Local Disk for file storage (no cloud credentials)');
}

// Configure storage based on provider
let storage: multer.StorageEngine;

if (useSpaces && s3Client) {
    storage = multerS3({
        s3: s3Client,
        bucket: process.env.DO_SPACES_BUCKET!,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req: Express.Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
            const ext = path.extname(file.originalname);
            const name = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
            cb(null, `uploads/${uuidv4()}-${name}${ext}`);
        },
    });
} else if (useCloudinary) {
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'listinghub',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'gif', 'svg'],
            public_id: (req: Express.Request, file: Express.Multer.File) => {
                const name = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
                return `${uuidv4()}-${name}`;
            },
        } as any,
    });
} else {
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, '../../uploads'));
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const filename = `${uuidv4()}${ext}`;
            cb(null, filename);
        },
    });
}

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'image/svg+xml'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, SVG, and PDF are allowed.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// All upload routes require authentication
router.use(authenticate as any);

// Helper function to get file URL based on storage provider
const getFileUrl = (file: Express.Multer.File): string => {
    if (useSpaces) {
        // multer-s3 adds 'location' property with the full S3/Spaces URL
        return (file as any).location;
    } else if (useCloudinary) {
        // Cloudinary stores URL in 'path'
        return (file as any).path;
    } else {
        // Local storage - construct relative URL
        return `/uploads/${file.filename}`;
    }
};

// POST /api/upload - Upload a single file
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const fileUrl = getFileUrl(req.file);

        res.json({
            url: fileUrl,
            filename: (req.file as any).key || req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/upload/multiple - Upload multiple files
router.post('/multiple', upload.array('files', 10), async (req, res, next) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ error: 'No files uploaded' });
            return;
        }

        const uploadedFiles = files.map((file) => ({
            url: getFileUrl(file),
            filename: (file as any).key || file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        }));

        res.json({ files: uploadedFiles });
    } catch (error) {
        next(error);
    }
});

export default router;
