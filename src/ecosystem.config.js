module.exports = {
  apps: [
    {
      name: "auth-service",
      script: "auth.js",
      watch: true
    },
    {
      name: "history-service",
      script: "history-server.js",
      watch: true
    },
    {
      name: "realtime-service",
      script: "realtime-server.js",
      watch: true
    },
    {
      name: "save-payload-service",
      script: "save-payload.js",
      watch: true
    }
  ]
};