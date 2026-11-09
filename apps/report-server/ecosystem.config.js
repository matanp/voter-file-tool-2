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
      // Memory limits for the 1 GB box. The numbers come from 20,000-row (MAX_RECORDS_FOR_EXPORT)
      // voter-list xlsx exports with every field filled, under node 22 on Linux. That export
      // needs ~275 MB of heap and peaks at ~535 MB RSS (see ticket 11 in
      // .scratch/report-server-provisioning).
      // The heap cap is the real-time guard: past it node aborts, and autorestart brings it back,
      // instead of node growing until the box swaps itself unresponsive. 256 MB fails that export.
      node_args: ['--max-old-space-size=384'],
      // PM2 checks RSS every 30 s. That catches growth outside the JS heap (Buffers, native
      // memory) that the heap cap can't see. It sits above the export's ~535 MB peak, so a
      // legitimate export isn't restarted mid-job. Chrome's processes aren't counted.
      max_memory_restart: '600M',
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
