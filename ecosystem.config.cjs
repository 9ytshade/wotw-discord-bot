module.exports = {
  apps: [
    {
      name: "wotw-discord-bot",
      script: "dist/index.js",
      node_args: "--disable-warning=ExperimentalWarning",
      env: {
        NODE_ENV: "production"
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000
    }
  ]
};
