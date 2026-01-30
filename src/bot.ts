import { Bot, Context } from "grammy";
import { config } from "./config.js";
import {
  checkEmail,
  deleteFromRejectList,
  listAllRejects,
  searchMessages,
  formatRejectEntry,
  formatMessageHistory,
} from "./mandrill.js";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const bot = new Bot(config.telegramToken);

function isAllowed(ctx: Context): boolean {
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type;

  if (config.allowedGroupId) {
    return (chatType === "group" || chatType === "supergroup") && chatId === config.allowedGroupId;
  }

  if (config.allowedUserIds.length === 0) return true;
  return config.allowedUserIds.includes(ctx.from?.id ?? 0);
}

function extractEmails(text: string): string[] {
  const words = text.replace(/,/g, " ").split(/\s+/);
  return words.filter((w) => EMAIL_REGEX.test(w));
}

// Unrestricted command: get group ID
bot.command("groupid", async (ctx) => {
  const chatType = ctx.chat?.type;
  if (chatType === "group" || chatType === "supergroup") {
    await ctx.reply(`Group ID: ${ctx.chat.id}\n\nCopy this value to ALLOWED_GROUP_ID in .env`);
  } else {
    await ctx.reply("This command can only be used inside a group.");
  }
});

// Middleware: check allowed group/users
bot.use(async (ctx, next) => {
  if (!isAllowed(ctx)) {
    console.log(`[BLOCKED] chatId=${ctx.chat?.id} type=${ctx.chat?.type} allowedGroup=${config.allowedGroupId}`);
    if (ctx.chat?.type === "private") {
      await ctx.reply("Access denied. This bot can only be used in the allowed group.");
    }
    return;
  }
  await next();
});

bot.command("start", async (ctx) => {
  await ctx.reply(
    [
      "Mandrill Email Checker Bot",
      "",
      "Available commands:",
      "/check <email> - Check email status in reject list",
      "/checkbulk <email1> <email2> ... - Check multiple emails at once",
      "/remove <email> - Remove email from reject list",
      "/listblocked - Show all blocked emails",
      "/help - Show help",
    ].join("\n")
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "Usage:",
      "",
      "/check test@gmail.com",
      "  Check if an email is in the reject list",
      "",
      "/checkbulk a@test.com b@test.com c@test.com",
      "  Check multiple emails at once",
      "",
      "/remove test@gmail.com",
      "  Remove an email from the reject list",
      "",
      "/listblocked",
      "  Show all blocked emails",
      "",
      "Or send an email address directly to check its status.",
    ].join("\n")
  );
});

bot.command("check", async (ctx) => {
  const email = ctx.match?.trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    await ctx.reply("Format: /check email@domain.com");
    return;
  }

  await ctx.reply(`Checking email status: ${email}...`);

  try {
    const [rejects, messages] = await Promise.all([
      checkEmail(email),
      searchMessages(email).catch(() => []),
    ]);

    if (rejects.length === 0) {
      const reply = [
        `Status: CLEAN`,
        `Email: ${email}`,
        `Email not found in Mandrill reject list.`,
      ];

      if (messages.length > 0) {
        reply.push(formatMessageHistory(messages));
      }

      await ctx.reply(reply.join("\n"));
    } else {
      const details = rejects.map((entry, i) => {
        const header = rejects.length > 1 ? `\n[${i + 1}]` : "";
        return `${header}\n${formatRejectEntry(entry)}`;
      });

      const reply = [
        `Status: BLOCKED`,
        `Email: ${email}`,
        "",
        "Detail:",
        ...details,
      ];

      if (messages.length > 0) {
        reply.push(formatMessageHistory(messages));
      }

      reply.push("", `Use /remove ${email} to remove from reject list.`);

      await ctx.reply(reply.join("\n"));
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await ctx.reply(`Error checking email: ${msg}`);
  }
});

bot.command("checkbulk", async (ctx) => {
  const text = ctx.match?.trim() ?? "";
  const emails = extractEmails(text);

  if (emails.length === 0) {
    await ctx.reply("Format: /checkbulk email1@domain.com email2@domain.com ...");
    return;
  }

  await ctx.reply(`Checking ${emails.length} emails...`);

  const results: string[] = [];
  let blocked = 0;
  let clean = 0;

  for (const email of emails) {
    try {
      const entries = await checkEmail(email);
      if (entries.length === 0) {
        results.push(`[CLEAN] ${email}`);
        clean++;
      } else {
        const reason = entries[0].reason;
        results.push(`[BLOCKED] ${email} (${reason})`);
        blocked++;
      }
    } catch {
      results.push(`[ERROR] ${email}`);
    }
  }

  await ctx.reply(
    [
      "Bulk Check Report",
      "=".repeat(30),
      "",
      ...results,
      "",
      "Summary:",
      `  Clean: ${clean}`,
      `  Blocked: ${blocked}`,
      `  Total: ${emails.length}`,
    ].join("\n")
  );
});

bot.command("remove", async (ctx) => {
  const email = ctx.match?.trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    await ctx.reply("Format: /remove email@domain.com");
    return;
  }

  try {
    const result = await deleteFromRejectList(email);
    if (result.deleted) {
      await ctx.reply(`Email ${email} has been removed from the reject list.`);
    } else {
      await ctx.reply(`Email ${email} was not found in the reject list.`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await ctx.reply(`Error removing email: ${msg}`);
  }
});

bot.command("listblocked", async (ctx) => {
  await ctx.reply("Fetching reject list...");

  try {
    const results = await listAllRejects();

    if (results.length === 0) {
      await ctx.reply("Reject list is empty. No blocked emails.");
      return;
    }

    const lines = results.map(
      (entry, i) => `${i + 1}. ${entry.email} (${entry.reason}) - ${entry.created_at}`
    );

    const header = `Total blocked: ${results.length}\n\n`;
    const chunks: string[] = [];
    let current = header;

    for (const line of lines) {
      if (current.length + line.length + 1 > 4000) {
        chunks.push(current);
        current = "";
      }
      current += line + "\n";
    }
    if (current) chunks.push(current);

    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await ctx.reply(`Error: ${msg}`);
  }
});

// Handle plain text messages - auto detect emails
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  const emails = extractEmails(text);

  if (emails.length === 0) {
    await ctx.reply(
      "Send an email address to check, or use /help to see available commands."
    );
    return;
  }

  if (emails.length === 1) {
    const email = emails[0];
    await ctx.reply(`Checking email status: ${email}...`);

    try {
      const [rejects, messages] = await Promise.all([
        checkEmail(email),
        searchMessages(email).catch(() => []),
      ]);

      if (rejects.length === 0) {
        const reply = [`Status: CLEAN`, `Email: ${email}`, `Not found in reject list.`];
        if (messages.length > 0) reply.push(formatMessageHistory(messages));
        await ctx.reply(reply.join("\n"));
      } else {
        const details = rejects.map((e) => formatRejectEntry(e));
        const reply = [
          `Status: BLOCKED`,
          `Email: ${email}`,
          "",
          "Detail:",
          ...details,
        ];
        if (messages.length > 0) reply.push(formatMessageHistory(messages));
        reply.push("", `Use /remove ${email} to remove from reject list.`);
        await ctx.reply(reply.join("\n"));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.reply(`Error: ${msg}`);
    }
  } else {
    await ctx.reply(`Detected ${emails.length} emails, checking...`);

    const results: string[] = [];
    let blocked = 0;
    let clean = 0;

    for (const email of emails) {
      try {
        const entries = await checkEmail(email);
        if (entries.length === 0) {
          results.push(`[CLEAN] ${email}`);
          clean++;
        } else {
          results.push(`[BLOCKED] ${email} (${entries[0].reason})`);
          blocked++;
        }
      } catch {
        results.push(`[ERROR] ${email}`);
      }
    }

    await ctx.reply(
      [
        "Bulk Check Report",
        "=".repeat(30),
        "",
        ...results,
        "",
        `Clean: ${clean} | Blocked: ${blocked} | Total: ${emails.length}`,
      ].join("\n")
    );
  }
});
