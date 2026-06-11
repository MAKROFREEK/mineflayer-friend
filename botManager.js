const { pathfinder, Movements } = require("mineflayer-pathfinder");
const mineflayer = require("mineflayer");
// const autoeat = require("mineflayer-auto-eat").plugin;
const { setupAutoEat } = require("./autoEat");
const pvp = require("mineflayer-pvp").plugin;
const { CONFIG, PROXIES } = require("./config");
const { botCluster, lookAtNearestPlayer, returnToMaster } = require("./utils");
const { registerCommands, getGlobalDanceInterval } = require("./commands");
const { registerSleep } = require("./sleep");
const { lookAtNearestLivingEntity } = require("./lookHostiles");
const {
  attackHostile,
  registerAttackNearestHostile,
} = require("./attackHostile");
const { markPlayerHostile, registerAttackPlayer } = require("./attackPlayer");

// tick_end and the scale attribute command only exist in 1.21+
function isModernVersion(ver) {
  const [major, minor] = (ver || "").split(".").map(Number);
  return major > 1 || (major === 1 && minor >= 21);
}

function createBot(id) {
  const username = `${CONFIG.usernamePrefix}${id}`;
  console.log(`[Manager] Launching ${username}...`);

  // pull info from config.js
  const bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: username,
    version: CONFIG.version,
    localAddress: `10.0.20.${id + 1}`
    // proxies: config.proxies;
  });

  bot.clusterId = id;
  bot.isLeader = id === 1;
  bot._hasSpawned = false; // reconnect guard — don't loop on pre-spawn kick

  // load plugins
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);
  // bot.loadPlugin(autoeat);1

  bot.once("spawn", () => {
    // bot.on("physicsTick", () => lookAtNearestLivingEntity(bot));
    bot._hasSpawned = true;
    console.log(`[${bot.username}] Spawned successfully (${bot.version}).`);
    botCluster.set(id, bot);

    // tick_end anti-cheat packet — 1.21+ only; sending it on older servers
    // causes an immediate EPIPE disconnect
    if (isModernVersion(bot.version)) {
      bot.on("physicsTick", () => {
        if (!bot.physicsEnabled) return;
        if (
          bot._client &&
          bot._client.state === "play" &&
          bot._client.socket &&
          bot._client.socket.writable
        ) {
          try {
            bot._client.write("tick_end", {});
          } catch (err) {}
        }
      });

      // stop the bastards from standing inside each other
      bot.chat(`/attribute ${bot.username} minecraft:scale base set 0.9999999`);
    }

    const defaultMove = new Movements(bot, bot.registry);
    defaultMove.canDig = true;
    defaultMove.allow1by1tunnelling = true;
    defaultMove.allowParkour = true;
    bot.pathfinder.setMovements(defaultMove);
    bot.pvp.movements = defaultMove;

    setupAutoEat(bot); // EAT
    registerAttackNearestHostile(bot); // bow + melee + armor;
    registerAttackPlayer(bot);
    registerSleep(bot);
    registerInventoryWatcher(bot);
    registerEyeContactHeartbeat(bot);
    registerCommands(bot);
  });

  // logging
  bot.on("death", () => bot.chat("I'm dead"));
  bot.on("kicked", (reason) => console.log(`Kicked: ${reason}`));
  bot.on("error", (err) => console.error("Bot error:", err));
  bot.on("end", (reason) => console.log(`Disconnected: ${reason}`));
}

// return when inventory is full
function registerInventoryWatcher(bot) {
  bot.on("playerCollect", (collector) => {
    if (collector === bot.entity && bot.inventory.emptySlotCount() <= 1) {
      bot.chat("My inventory is full! Returning to you.");
      returnToMaster(bot);
    }
  });
}

// eye contact
function registerEyeContactHeartbeat(bot) {
  setInterval(() => {
    if (
      !bot.physicsEnabled ||
      bot.pvp.target ||
      bot.pathfinder.isMining ||
      bot.pathfinder.goal ||
      getGlobalDanceInterval()
    )
      return;
    lookAtNearestPlayer(bot);
  }, 200);
}

module.exports = { createBot, botCluster };
