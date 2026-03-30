module.exports = {
  apps: [
    {
      name: 'witnesssketch',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      restart_delay: 1000,
      max_restarts: 10,
    },
  ],
};
