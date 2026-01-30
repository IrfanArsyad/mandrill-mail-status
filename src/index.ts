import { bot } from "./bot.js";

async function main() {
  console.log("Starting Mandrill Telegram Bot...");

  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  await bot.start({
    onStart: () => console.log("Bot is running!"),
  });
}

main();
