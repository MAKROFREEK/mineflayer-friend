const { manualHostiles } = require("./combatUtils");
const { markPlayerHostile } = require("./attackPlayer");
const { Movements, goals } = require("mineflayer-pathfinder");
const { botCluster } = require("./utils");
const { CONFIG } = require("./config");
const {
  stopAllActivity,
  findMasterEntity,
  broadcast, // NEW: cluster-wide broadcast helper
  dropAllItems, // existing - for "deposit items"
  dropAllGear, // NEW - for "deposit gear"
  dropAllItemsIncludingGear, // NEW - for "deposit all"
} = require("./utils");
const {
  distributeMiningTask,
  setMiningType,
  getMiningType,
} = require("./mining.js");

let globalDanceInterval = null;

function getGlobalDanceInterval() {
  return globalDanceInterval;
}

function registerCommands(bot) {
  bot.on("chat", (masterName, message) => {
    if (masterName !== CONFIG.masterUser) return;
    if (!bot.isLeader) return;

    const args = message.split(" ");
    const command = args[0].toLowerCase();

    // Stop dance + clear mining type on any new command
    const resettingCommands = [
      "mine",
      "come",
      "follow",
      "deposit",
      "stop",
      "dance",
      "spread",
      "server",
    ];

    if (resettingCommands.includes(command)) {
      if (globalDanceInterval) {
        clearInterval(globalDanceInterval);
        globalDanceInterval = null;
      }
      if (command !== "mine") setMiningType(null);
    }

    switch (command) {
      case "server":
        handleServer(bot, args);
        break;
      case "mine":
        handleMine(bot, args);
        break;
      case "follow":
        handleFollow(bot, masterName);
        break;
      case "spread":
        handleSpread(bot, masterName);
        break;
      case "deposit":
        handleDeposit(bot, args);
        break;
      case "stop":
        handleStop(bot);
        break;
      case "dance":
        handleDance(bot);
        break;
      case "attack":
        handleAttack(bot, args);
        break;
      case "goto":
        handleGoto(bot, args);
        break;
      case "status":
        handleStatus(bot);
        break;
    }
  });
}

function handleStatus(bot) {
  const allBots = require("./utils").getAllBots();

  let statusMessage = "\n=== BOT STATUS REPORT ===\n";

  allBots.forEach((b, index) => {
    // Mineflayer properties: b.health and b.food (0 to 20)
    const health = b.health !== undefined ? b.health.toFixed(1) : "N/A";
    const hunger = b.food !== undefined ? b.food.toFixed(1) : "N/A";
    const coords = b.entity?.position
      ? `${b.entity.position.x.toFixed(1)}, ${b.entity.position.y.toFixed(1)}, ${b.entity.position.z.toFixed(1)}`
      : "N/A";

    statusMessage += `\n[${index + 1}] ${b.username}\n`;
    statusMessage += `    Health: ${health}\n`;
    statusMessage += `    Hunger: ${hunger}/20.0\n`; // Added /20.0 for cleaner visual clarity
    statusMessage += `    Coords: ${coords}\n`;
  });

  statusMessage += "\n=========================\n";
  bot.chat(statusMessage);
}

function handleAttack(bot, args) {
  const playerName = args.slice(1).join(" ");
  if (!playerName) {
    return bot.chat("Usage: attack <player_name>");
  }

  // Stop all other activities while attacking
  stopAllActivity(bot);

  // Mark the player as hostile
  markPlayerHostile(bot, playerName);

  bot.chat(`Marked ${playerName} as hostile!`);
}

function handleServer(bot, args) {
  const serverName = args.slice(1).join(" ");
  if (!serverName)
    return bot.chat("Please specify a server! Usage: server <name>");

  let staggerDelay = 0;
  bot.chat(`Initiating staggered proxy jump to: ${serverName}`);

  broadcast((worker) => {
    stopAllActivity(worker);
    worker.physicsEnabled = false;

    setTimeout(() => {
      worker.chat(`/server ${serverName}`);
    }, staggerDelay);

    staggerDelay += 1000;

    worker.once("spawn", () => {
      worker.physicsEnabled = true;
      worker.chat(
        `/attribute ${worker.username} minecraft:scale base set 0.9999999`,
      );
    });
  });
}

function handleGoto(bot, args) {
  const x = parseFloat(args[1]);
  const y = parseFloat(args[2]);
  const z = parseFloat(args[3]);

  if (!x || !y || !z) {
    return bot.chat("Usage: goto <x> <y> <z>");
  }

  // Stop all other activities while navigating
  broadcast((worker) => {
    stopAllActivity(worker);
  });

  bot.chat(`Navigating to coordinates: ${x}, ${y}, ${z}`);

  // Use GoalNear with tolerance
  const goal = new goals.GoalNear(x, y, z, 0.5); // 0.5 block tolerance

  bot.pathfinder.setGoal(goal, true);
}

function handleMine(bot, args) {
  const miningType = args[1] || "coal_ore";
  setMiningType(miningType);
  bot.chat(`Cluster mining sequence initiated for: ${miningType}`);
  distributeMiningTask();
}
function handleFollow(bot, masterName) {
  const globalTarget = findMasterEntity(bot, masterName);
  if (!globalTarget)
    return bot.chat("Target lost. Get within my line of sight!");

  bot.chat("Loosely following your position.");
  broadcast((worker) => {
    stopAllActivity(worker);
    const localTarget =
      Object.values(worker.entities).find(
        (ent) => ent.type === "player" && ent.username === masterName,
      ) || worker.players[masterName]?.entity;

    if (localTarget) {
      worker.pathfinder.setGoal(new goals.GoalFollow(localTarget, 3.5), true);
    }
  });
}

function handleSpread(bot, masterName) {
  bot.chat("Dispersing units to a safe perimeter.");
  broadcast((worker) => {
    stopAllActivity(worker);
    const master =
      Object.values(worker.entities).find(
        (ent) => ent.type === "player" && ent.username === masterName,
      ) || findMasterEntity(bot, masterName);

    const origin = master ? master.position : worker.entity.position;
    const angle = (worker.clusterId / CONFIG.botCount) * 2 * Math.PI;
    const distance = 2.5 + (worker.clusterId % 3);

    worker.pathfinder.setGoal(
      new goals.GoalNear(
        origin.x + Math.cos(angle) * distance,
        origin.y,
        origin.z + Math.sin(angle) * distance,
        1,
      ),
    );
  });
}

function handleDeposit(bot, args) {
  console.log(
    `[${bot.username}] [DEBUG] handleDeposit called with args:`,
    args,
  );

  // Skip the first element (the command name itself) and use the rest for subcommand
  const subcommand = args[1] || "items"; // Default to "items" for backward compatibility
  console.log(`[${bot.username}] [DEBUG] Subcommand: ${subcommand}`);

  switch (subcommand.toLowerCase()) {
    case "all":
      bot.chat("Dropping all items including gear.");
      console.log(
        `[${bot.username}] [DEBUG] Calling dropAllItemsIncludingGear`,
      );
      dropAllItemsIncludingGear(bot);
      break;

    case "items":
      bot.chat("Dropping collected resources only.");
      console.log(`[${bot.username}] [DEBUG] Calling dropAllItems`);
      dropAllItems(bot);
      break;

    case "gear":
      bot.chat("Dropping all gear (armor, weapons, tools).");
      console.log(`[${bot.username}] [DEBUG] Calling dropAllGear`);
      dropAllGear(bot);
      break;

    case "help":
      // Show usage info for invalid commands or help
      bot.chat("Usage: deposit <all, items, gear>");
      bot.chat("");
      bot.chat("  deposit all   - drops everything including gear");
      bot.chat(
        "  deposit items  - drops resources only (default behavior 'deposit')",
      );
      bot.chat("  deposit gear   - drops armor, weapons, tools");
      break;

    default:
      console.log(
        `[${bot.username}] [DEBUG] Unknown subcommand: ${subcommand}`,
      );
      bot.chat(
        `Unknown command: ${subcommand}. Usage: deposit <all|items|gear>`,
      );
  }
}

function handleStop(bot) {
  bot.chat("All units breaking operations.");
  let staggerDelay = 0;
  Object.values(bot.world?.entities || {}).forEach((worker) => {
    if (worker.type === "player") {
      stopAllActivity(worker);
    }
  });
  manualHostiles.clear();
}

function handleDance(bot) {
  bot.chat("Drop the beat!");

  globalDanceInterval = setInterval(() => {
    for (const [id, worker] of botCluster) {
      worker.setControlState("sneak", !worker.controlState.sneak);
    }
  }, 130);
}

// Helper: Check if inventory is empty
function isInventoryEmpty(bot) {
  return bot.inventory.items().length === 0;
}

// Helper: Get remaining item count after deposit
function getRemainingItemCount(bot) {
  return bot.inventory.items().length;
}

module.exports = {
  registerCommands,
  getGlobalDanceInterval,
  isInventoryEmpty,
  getRemainingItemCount,
};
