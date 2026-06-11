// equip.js
// Weapon, armor, and tool equip helpers.

const WEAPON_PRIORITY = [
  "wooden_sword", "stone_sword", "iron_sword",
  "golden_sword", "diamond_sword", "netherite_sword",
  "wooden_axe",   "stone_axe",   "iron_axe",
  "golden_axe",   "diamond_axe", "netherite_axe",
];

const ARMOR_PRIORITY = [
  "leather", "chainmail", "golden", "iron", "diamond", "netherite",
];

const ARMOR_SLOTS = {
  helmet:     "head",
  chestplate: "torso",
  leggings:   "legs",
  boots:      "feet",
};

// ── Weapons ──────────────────────────────────────────────────────────────────

function getBestWeapon(bot) {
  let best = null;
  let bestScore = -1;
  for (const item of bot.inventory.items()) {
    const score = WEAPON_PRIORITY.indexOf(item.name);
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return best;
}

async function equipBestWeapon(bot) {
  const weapon = getBestWeapon(bot);
  if (!weapon) return;
  try { await bot.equip(weapon, "hand"); }
  catch (err) { console.log(`[${bot.username}] equipBestWeapon: ${err.message}`); }
}

// equipGear — alias used by autoAttack (equips best melee weapon)
const equipGear = equipBestWeapon;

// ── Armor ─────────────────────────────────────────────────────────────────────

function getBestArmorPiece(bot, type) {
  // type = "helmet" | "chestplate" | "leggings" | "boots"
  let best = null;
  let bestScore = -1;
  for (const item of bot.inventory.items()) {
    if (!item.name.endsWith(type)) continue;
    const material = ARMOR_PRIORITY.find((m) => item.name.startsWith(m));
    const score = material ? ARMOR_PRIORITY.indexOf(material) : -1;
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return best;
}

async function equipBestArmor(bot) {
  for (const [type, slot] of Object.entries(ARMOR_SLOTS)) {
    const piece = getBestArmorPiece(bot, type);
    if (!piece) continue;
    try { await bot.equip(piece, slot); }
    catch (_) {} // slot already filled with equal/better piece — harmless
  }
}

// ── Tools ─────────────────────────────────────────────────────────────────────

async function equipBestTool(bot, block) {
  try {
    const tool = bot.pathfinder.movements.getBestHarvestTool(block);
    if (tool) await bot.equip(tool, "hand");
  } catch (err) {
    console.log(`[${bot.username}] equipBestTool: ${err.message}`);
  }
}

module.exports = { equipBestWeapon, equipBestTool, equipBestArmor, equipGear };