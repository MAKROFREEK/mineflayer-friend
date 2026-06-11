const { CONFIG } = require("./config");
const { createBot } = require("./botManager");

function startBots() {
  console.log(`[Manager] Initializing Native 1.21.11 Cluster...`);
  for (let i = 1; i <= CONFIG.botCount; i++) {
    setTimeout(() => createBot(i), (i - 1) * CONFIG.spawnDelay);
  }
}

startBots();
