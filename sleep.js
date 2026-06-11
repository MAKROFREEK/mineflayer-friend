// sleep.js
// Finds the nearest bed and sleeps in it when it's nighttime.
// Wakes automatically at dawn. Skips if the bot is in combat or mining.

const { goals } = require("mineflayer-pathfinder");

const BED_NAMES = [
  "white_bed", "orange_bed", "magenta_bed", "light_blue_bed",
  "yellow_bed", "lime_bed", "pink_bed", "gray_bed", "light_gray_bed",
  "cyan_bed", "purple_bed", "blue_bed", "brown_bed", "green_bed",
  "red_bed", "black_bed",
];

// Minecraft time: night starts ~13000, dawn at ~23000 (day cycle is 24000 ticks)
function isNight(bot) {
  const time = bot.time.timeOfDay;
  return time >= 12542 && time <= 23460;
}

function findNearestBed(bot, maxDistance = 32) {
  const bedBlocks = bot.findBlocks({
    matching: (block) => BED_NAMES.includes(block.name),
    maxDistance,
    count: 1,
  });
  return bedBlocks.length > 0 ? bot.blockAt(bedBlocks[0]) : null;
}

async function trySleep(bot) {
  if (bot._isSleeping) return;
  if (!isNight(bot)) return;
  if (bot.pvp.target) return;
  if (bot.pathfinder.isMining) return;
  if (!bot.physicsEnabled) return;

  const bed = findNearestBed(bot);
  if (!bed) return;

  try {
    bot._isSleeping = true;

    // Walk to the bed first
    await bot.pathfinder.goto(
      new goals.GoalNear(bed.position.x, bed.position.y, bed.position.z, 2),
    );

    await bot.sleep(bed);
    console.log(`[${bot.username}] Sleeping...`);

    // Wake up is handled by the "wake" event below
  } catch (err) {
    // "You can only sleep at night" or bed occupied — not an error worth logging loudly
    bot._isSleeping = false;
  }
}

function registerSleep(bot) {
  bot.on("wake", () => {
    bot._isSleeping = false;
    console.log(`[${bot.username}] Woke up.`);
  });

  // Check every 30s — no need to spam ticks for this
  setInterval(() => trySleep(bot), 30000);
}

module.exports = { registerSleep, trySleep, isNight };