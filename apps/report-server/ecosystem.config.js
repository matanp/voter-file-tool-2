// PM2 runs the compiled server under plain node: no pnpm, tsc, Tailwind or ts-node at (re)start.
// Build it first with `pnpm --filter node-pdf-generation run build` (03-build-packages.sh and
// deploy-lightsail.sh do). .env is read by dotenv from `cwd`.
module.exports = {
  apps: [
    {
      name: 'report-server',
      script: 'dist/index.js',
      cwd: '/opt/voter-file-tool/apps/report-server',
      // The node binary running `pm2 start`, i.e. nvm's default node. PM2 stores the
      // absolute path, so restarts and boot-time resurrects don't depend on nvm being loaded.
      interpreter: process.execPath,
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
