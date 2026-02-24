module.exports = {
    apps: [
        {
            name: 'skillpal-backend',
            script: 'dist/index.js',
            cwd: '/var/www/skillpal/backend',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
            error_file: '/var/log/pm2/skillpal-backend-error.log',
            out_file: '/var/log/pm2/skillpal-backend-out.log',
            log_file: '/var/log/pm2/skillpal-backend.log',
            time: true,
        },
        {
            name: 'skillpal-frontend',
            script: 'npm',
            args: 'start -- --hostname 127.0.0.1 --port 3000',
            cwd: '/var/www/skillpal/frontend',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
            error_file: '/var/log/pm2/skillpal-frontend-error.log',
            out_file: '/var/log/pm2/skillpal-frontend-out.log',
            log_file: '/var/log/pm2/skillpal-frontend.log',
            time: true,
        },
    ],
};
