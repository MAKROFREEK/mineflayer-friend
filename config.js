const CONFIG = {
  host: "10.0.40.40",
  port: 25565,
  version: "1.19.4",
  botCount: 1,
  spawnDelay: 3000,
  usernamePrefix: "FRIEND",
  masterUser: "MAKROFREEK",
};

// Define your SOCKS5 proxies here
const PROXIES = [
  { host: "1.2.3.4", port: 1080, type: 5, userId: "BOT_1", password: "pwd" },
  2,
  // { host: "5.6.7.8", port: 1080, type: 5 },
];

module.exports = { CONFIG, PROXIES };
