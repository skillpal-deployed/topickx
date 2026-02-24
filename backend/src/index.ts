import app from './app';
import prisma from './utils/prisma';


import { initCronJobs } from './services/cron.service';

const PORT = process.env.PORT || 5000;
// Forced restart for prisma client update v1.2

async function main() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Initialize Cron Jobs
        initCronJobs();

        // Start server — bind to localhost only (nginx proxies externally)
        app.listen(Number(PORT), '127.0.0.1', () => {
            console.log(`🚀 Server running on http://127.0.0.1:${PORT} [FIXED VERSION 1.1]`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

main();
