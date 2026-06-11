const { manualHostiles } = require("./combatUtils");

function markPlayerHostile(bot, playerName) {
  const target = bot.players[playerName]?.entity;
  if (!target) {
    bot.whisper(`I can't see ${playerName}.`); 
    return;
  }

  manualHostiles.add(playerName);
  bot.whisper(`${playerName} marked as hostile!`);
}

function registerAttackPlayer(bot) {
  bot.on('chat', (username, message) => {
    if (username === bot.username) return; // Ignore self messages
    
    const parts = message.split(' ');
    if (parts[0] === 'attack' && parts.length >= 2) {
      const playerName = parts.slice(1).join(' ');
      markPlayerHostile(bot, playerName);
    }
  });
}

module.exports = { markPlayerHostile, registerAttackPlayer };
