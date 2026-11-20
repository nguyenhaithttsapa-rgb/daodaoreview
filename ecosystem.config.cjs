module.exports = {
  apps: [
    {
      name: 'daodaoreview-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'daodaoreview-crawler',
      script: './scripts/realtime_reels_engine.mjs',
      cron_restart: '*/15 * * * *',
      autorestart: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'daodaoreview-updater',
      script: './scripts/vps_auto_updater.mjs',
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
