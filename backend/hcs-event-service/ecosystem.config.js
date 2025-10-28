/**
 * PM2 Ecosystem Configuration for HCS Event Service
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs dera-hcs-service
 *   pm2 restart dera-hcs-service
 */
module.exports = {
  apps: [
    {
      name: 'dera-hcs-service',
      script: './src/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
