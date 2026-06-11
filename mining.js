const { goals } = require("mineflayer-pathfinder");
const { CONFIG } = require("./config");
const { botCluster, returnToMaster, isToolBroken } = require("./utils");

const targetedBlocks = new Set();
let currentMiningType = null;

function setMiningType(type) {
  currentMiningType = type;
}

function getMiningType() {
  return currentMiningType;
}

async function distributeMiningTask() {
  if (!currentMiningType) return;

  const leader = botCluster.get(1);
  if (!leader) return;

  const blockType = leader.registry.blocksByName[currentMiningType];
  // DEBUGGING 
  // console.log(`DEBUG - Looking for: ${currentMiningType}`);
  // console.log(`DEBUG - Registry keys:`, Object.keys(leader.registry.blocksByName).slice(0, 20));
  // console.log(`DEBUG - Found block:`, blockType);
  

  if (!blockType)
    return leader.chat(`Unknown block registration: ${currentMiningType}`);

  const blocks = leader.findBlocks({
    matching: (block) => block.type === blockType.id,
    maxDistance: 32,
    count: CONFIG.botCount * 4,
  });

  if (blocks.length === 0) {
    leader.chat(`No more ${currentMiningType} chunks detected nearby.`);
    currentMiningType = null;
    return;
  }

  let blockIndex = 0;
  let stagger = 0;

  for (const [id, worker] of botCluster) {
    if (worker.pathfinder.isMining || worker.pvp.target) continue;

    if (worker.inventory.emptySlotCount() <= 1) {
      worker.chat("My inventory is full! Returning to you.");
      returnToMaster(worker);
      continue;
    }

    if (isToolBroken(worker)) {
      worker.chat("My tools are broken! Returning to you.");
      returnToMaster(worker);
      continue;
    }

    let targetPos = blocks[blockIndex];
    while (targetPos && targetedBlocks.has(targetPos.toString())) {
      blockIndex++;
      targetPos = blocks[blockIndex];
    }

    if (!targetPos) break;

    targetedBlocks.add(targetPos.toString());
    blockIndex++;

    setTimeout(() => {
      mineBlockNative(worker, targetPos);
    }, stagger * 200);
    stagger++;
  }
}

async function mineBlockNative(bot, position) {
  bot.pathfinder.isMining = true;

  try {
    await bot.pathfinder.goto(
      new goals.GoalNear(position.x, position.y, position.z, 3),
    );

    const block = bot.blockAt(position);
    if (block && block.name !== "air") {
      // Get best tool from inventory
      const items = bot.inventory.items();
      let tool = null;
      
      // Try to find appropriate tool
      for (const item of items) {
        if (item.name.includes("pickaxe")) tool = item;
        else if (!tool && item.name.includes("axe")) tool = item;
        else if (!tool && item.name.includes("shovel")) tool = item;
      }
      
      // Equip tool if found
      if (tool) {
        await bot.equip(tool, "hand");
      }

      await bot.lookAt(position.offset(0.5, 0.5, 0.5), true);
      await bot.dig(block, true);
      await bot.waitForTicks(3);

      const checkBlock = bot.blockAt(position);
      if (checkBlock && checkBlock.name !== "air") {
        console.log(
          `[${bot.username}] Server rejected block break (Protection/Claim detected).`,
        );
        return;
      }

      await bot.pathfinder.goto(
        new goals.GoalNear(position.x, position.y, position.z, 0.5),
      );
    }
  } catch (err) {
    console.log(`[${bot.username}] Task interrupted: ${err.message}`);
  } finally {
    targetedBlocks.delete(position.toString());
    bot.pathfinder.isMining = false;
    setTimeout(() => distributeMiningTask(), 400);
  }
}


module.exports = { distributeMiningTask, setMiningType, getMiningType };