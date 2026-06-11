// const HOSTILE_NAMES = [
//   "zombie",
//   "skeleton",
//   "spider",
//   "cave_spider",
//   "creeper",
//   "witch",
//   "pillager",
//   "vindicator",
//   "ravager",
//   "blaze",
//   "enderman",
//   "slime",
//   "magma_cube",
//   "phantom",
//   "drowned",
//   "husk",
//   "stray",
//   "wither_skeleton",
// ];

const { manualHostiles } = require('./combatUtils');

function lookAtNearestLivingEntity(bot) {
  const entity = bot.nearestEntity(e =>
    e.position && e.isValid &&
    (
      (e.type === 'hostile' ||
        // e.type == HOSTILE_NAMES ||
        ['zombie', 'skeleton', 'spider', 'creeper', 'pillager'].includes(e.name.toLowerCase())) ||
        (e.type === 'player' && manualHostiles.has(e.username))
      )
    )
  if (entity) {
    bot.lookAt(entity.position.offset(0, entity.height, 0));
  }
}

module.exports = { lookAtNearestLivingEntity };
