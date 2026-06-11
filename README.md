Markdown

# Mineflayer-Friend

An all-in-one bot framework for Minecraft based on [Mineflayer](https://github.com/PrismarineJS/mineflayer), designed for automation, combat, and companionship.

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/en/download) installed on your machine.

### Installation
Clone this repository and install the necessary dependencies:


npm install mineflayer mineflayer-pathfinder mineflayer-pvp mineflayer-auto-eat

Optional (Proxy Support):
To scale up to 100+/- bots, install socks to handle proxy connections:
Bash

npm install socks

🎮 Commands

Control your bots using the following chat commands:
Command	Usage	Description
mine	mine <block_name>	Instructs bots to mine the specified block (e.g., mine oak_logs).
goto	goto <x> <y> <z>	Commands bot(s) to move to specific coordinates.
deposit	deposit <type>	Drops items. Types: all (everything), items (non-gear), gear (weapons/armor).
attack	attack <player>	Targets a player within a 32-block radius.
follow	follow	Enables loose following behavior.
dance	dance	Toggles crouch-spamming (dancing).
spread	spread	Commands bots to disperse within a set radius.
stop	stop	Halts all current activities.
server	server <type>	Switches server context (e.g., server survival).
🛠 Planned Features

I am actively working on improving the experience. Upcoming features include:

    Implementing whispers for bot-to-player interaction instead of public chat.
    Advanced socks proxy integration to support 100+ bots simultaneously.
    Simple chat response logic for more natural interaction.
    Fishing, farming, and parkour pathfinding.

⚠️ Known Issues

    Bot Crowding: Bots occasionally group too tightly. We are currently researching a more robust collision and spacing algorithm.

Contributions are welcome! Feel free to open an issue or submit a pull request if you'd like to help improve the project.
