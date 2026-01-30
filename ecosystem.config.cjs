module.exports = {
  apps: [
    {
      name: "mandrill-bot",
      script: "npx",
      args: "tsx src/index.ts",
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
