const { goals } = require("mineflayer-pathfinder");
const { CONFIG } = require("./config");

// Global registry for cluster bots - stores bots by their cluster ID
const botCluster = new Map();

// Helper: Get all active bots in the cluster
function getAllBots() {
  return Array.from(botCluster.values());
}

// Helper: Broadcast a function to all bots in the cluster
function broadcast(fn) {
  getAllBots().forEach(fn);
}

// Helper: Find a bot by username
function getBotByUsername(username) {
  return Array.from(botCluster.values()).find(
    (bot) => bot.username === username,
  ) || null;
}

// Helper: Get the leader bot (clusterId === 1)
function getLeader() {
  return botCluster.get(1) || null;
}

function stopAllActivity(bot) {
  bot.pathfinder.setGoal(null);
  bot.pvp.stop();
  bot.setControlState("jump", false);
  bot.setControlState("sneak", false);
  bot.pathfinder.isMining = false;
}

async function lookAtNearestPlayer(bot) {
  const playerEntity = bot.nearestEntity(
    (entity) =>
      entity.type === "player" &&
      !entity.username.startsWith(CONFIG.usernamePrefix),
  );
  if (playerEntity) {
    await bot.lookAt(
      playerEntity.position.offset(0, playerEntity.height, 0),
      true,
    );
  }
}

function findMasterEntity(bot, masterName) {
  const directEntityScan = Object.values(bot.entities).find(
    (ent) => ent.type === "player" && ent.username === masterName,
  );
  if (directEntityScan) return directEntityScan;

  const tabListFallback = bot.players[masterName];
  if (tabListFallback && tabListFallback.entity)
    return tabListFallback.entity;
  return null;
}

function returnToMaster(bot) {
  const master =
    Object.values(bot.entities).find(
      (ent) => ent.type === "player" && ent.username === CONFIG.masterUser,
    ) || bot.players[CONFIG.masterUser]?.entity;

  if (master) {
    bot.pathfinder.setGoal(new goals.GoalFollow(master, 2), true);
  } else {
    console.log(`[${bot.username}] ${CONFIG.masterUser} could not be found visually to return to.`);
  }
}

function isToolBroken(bot) {
  const items = bot.inventory.items();
  const tools = items.filter(
    (item) =>
      item.name.includes("pickaxe") ||
      item.name.includes("axe") ||
      item.name.includes("shovel"),
  );
  return tools.length === 0;
}
// NEW: Drop all gear (armor, weapons, tools) - for "deposit gear"
async function dropAllGear(bot) {
  // bot.inventory.slots captures everything (hand, armor, inventory)
  const gear = bot.inventory.slots.filter(
    (i) =>
      i && // Filter out empty slots
      (i.name.includes("axe") ||
       i.name.includes("pickaxe") ||
       i.name.includes("sword") ||
       i.name.includes("helmet") ||
       i.name.includes("chestplate") ||
       i.name.includes("leggings") ||
       i.name.includes("boots")) ||
       i.name.includes("bow")
  );

  for (const item of gear) {
    try {
      // await forces Mineflayer to finish processing this item drop packet
      await bot.tossStack(item);
      // Give the server a 50ms breather to update inventory grids
      await new Promise(resolve => setTimeout(resolve, 50)); 
    } catch (err) {
      console.log(`[${bot.username}] Failed to toss ${item.name}: ${err.message}`);
    }
  }
}

// NEW: Drop everything including gear (for "deposit all")
async function dropAllItemsIncludingGear(bot) {
  // Grab all occupied slots across the entire bot inventory body
  const items = bot.inventory.slots.filter(i => i !== null);

  for (const item of items) {
    try {
      await bot.tossStack(item);
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      console.log(`[${bot.username}] Failed to toss ${item.name}: ${err.message}`);
    }
  }
}

// NEW: Drop everything (non-gear items like ores, minerals, food)
async function dropAllItems(bot) {
  const nongear = bot.inventory.slots.filter(
    (i) => 
      i && 
      !i.name.includes("axe") &&
      !i.name.includes("pickaxe") &&
      !i.name.includes("sword") &&
      !i.name.includes("helmet") &&
      !i.name.includes("chestplate") &&
      !i.name.includes("leggings") &&
      !i.name.includes("boots") && 
      !i.name.includes("bow")
  );

  for (const item of nongear) {
    try {
      await bot.tossStack(item);
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (err) {
      console.log(`[${bot.username}] Failed to toss ${item.name}: ${err.message}`);
    }
  }
}
module.exports = {
  stopAllActivity,
  lookAtNearestPlayer,
  findMasterEntity,
  returnToMaster,
  isToolBroken,
  dropAllItems,           // existing - for "deposit items"
  dropAllGear,           // NEW - for "deposit gear"
  dropAllItemsIncludingGear, // NEW - for "deposit all"
  botCluster,            // Global cluster registry
  getAllBots,            // Helper: get all active bots
  broadcast,             // Helper: broadcast to all bots
  getBotByUsername,      // Helper: find bot by username
  getLeader,             // Helper: get leader bot (clusterId === 1)
};
