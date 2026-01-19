module.exports = {
  apps: [
    {
      name: 'report-server',
      script: 'pnpm',
      args: 'start',
      cwd: '/opt/voter-file-tool/apps/report-server',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/opt/voter-file-tool/apps/report-server/logs/pm2-error.log',
      out_file: '/opt/voter-file-tool/apps/report-server/logs/pm2-out.log',
      log_file: '/opt/voter-file-tool/apps/report-server/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
