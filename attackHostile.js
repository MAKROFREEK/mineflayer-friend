const { findHostile } = require("./combatUtils");
const { equipBestArmor, equipGear } = require("./equip");

async function attackHostile(bot) {
  if (bot.autoEat?.isEating) return;

  equipBestArmor(bot);

  const hostile = findHostile(bot);
  if (hostile) {
    const dist = bot.entity.position.distanceTo(hostile.position);
    const bow = bot.inventory.items().find((i) => i.name === "bow");
    const arrows = bot.inventory.items().find((i) => i.name.includes("arrow"));

    if (dist > 4 && bow && arrows) {
      if (!bot.heldItem || bot.heldItem.name !== "bow") {
        await bot.equip(bow, "hand").catch(() => {});
      }
      if (!bot.isChargingBow) {
        bot.isChargingBow = true;
        try {
          await bot.lookAt(hostile.position.offset(0, hostile.height, 0));
          bot.activateItem();
          setTimeout(() => {
            bot.deactivateItem();
            bot.isChargingBow = false;
          }, 700);
        } catch (err) {
          console.error("Bow error:", err);
          bot.isChargingBow = false;
        }
      }
    } else {
      equipGear(bot);
      bot.pvp.attack(hostile);
    }
  }
}

// NEW: Register automatic hostile detection on spawn
function registerAttackNearestHostile(bot) {
  // Check for hostiles every tick (20ms = 50 ticks/sec)
  setInterval(() => {
    if (!bot._hasSpawned || bot.autoEat?.isEating) return;
    
    const hostile = findHostile(bot);
    if (hostile) {
      attackHostile(bot).catch(err => {
        console.error("Attack failed:", err.message);
      });
    }
  }, 50); // Check every 50ms
  
  console.log(`[${bot.username}] Auto-attack nearest hostile enabled`);
}

module.exports = { attackHostile, registerAttackNearestHostile };
