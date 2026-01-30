import { Bot, Context } from "grammy";
import { config } from "./config.js";
import {
  checkEmail,
  deleteFromRejectList,
  listAllRejects,
  formatRejectEntry,
} from "./mandrill.js";

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const bot = new Bot(config.telegramToken);

function isAllowed(ctx: Context): boolean {
  if (config.allowedUserIds.length === 0) return true;
  return config.allowedUserIds.includes(ctx.from?.id ?? 0);
}

function extractEmails(text: string): string[] {
  const words = text.replace(/,/g, " ").split(/\s+/);
  return words.filter((w) => EMAIL_REGEX.test(w));
}

// Middleware: check allowed users
bot.use(async (ctx, next) => {
  if (!isAllowed(ctx)) {
    await ctx.reply("Akses ditolak. User ID kamu tidak ada di allowlist.");
    return;
  }
  await next();
});

bot.command("start", async (ctx) => {
  await ctx.reply(
    [
      "Mandrill Email Checker Bot",
      "",
      "Perintah yang tersedia:",
      "/cek <email> - Cek status email di reject list",
      "/cekbulk <email1> <email2> ... - Cek beberapa email sekaligus",
      "/hapus <email> - Hapus email dari reject list",
      "/listblocked - Tampilkan semua email yang diblokir",
      "/help - Tampilkan bantuan",
    ].join("\n")
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "Cara penggunaan:",
      "",
      "/cek test@gmail.com",
      "  Cek apakah email ada di reject list",
      "",
      "/cekbulk a@test.com b@test.com c@test.com",
      "  Cek beberapa email sekaligus",
      "",
      "/hapus test@gmail.com",
      "  Hapus email dari reject list",
      "",
      "/listblocked",
      "  Tampilkan semua email yang diblokir",
      "",
      "Atau kirim email langsung tanpa command untuk cek status.",
    ].join("\n")
  );
});

bot.command("cek", async (ctx) => {
  const email = ctx.match?.trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    await ctx.reply("Format: /cek email@domain.com");
    return;
  }

  await ctx.reply(`Mengecek status email: ${email}...`);

  try {
    const results = await checkEmail(email);

    if (results.length === 0) {
      await ctx.reply(
        [
          `Status: CLEAN`,
          `Email: ${email}`,
          `Email tidak ditemukan di reject list Mandrill.`,
        ].join("\n")
      );
    } else {
      const details = results.map((entry, i) => {
        const header = results.length > 1 ? `\n[${i + 1}]` : "";
        return `${header}\n${formatRejectEntry(entry)}`;
      });

      await ctx.reply(
        [
          `Status: BLOCKED`,
          `Email: ${email}`,
          "",
          "Detail:",
          ...details,
          "",
          `Gunakan /hapus ${email} untuk menghapus dari reject list.`,
        ].join("\n")
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await ctx.reply(`Error saat mengecek email: ${msg}`);
  }
});

bot.command("cekbulk", async (ctx) => {
  const text = ctx.match?.trim() ?? "";
  const emails = extractEmails(text);

  if (emails.length === 0) {
    await ctx.reply("Format: /cekbulk email1@domain.com email2@domain.com ...");
    return;
  }

  await ctx.reply(`Mengecek ${emails.length} email...`);

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

bot.command("hapus", async (ctx) => {
  const email = ctx.match?.trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    await ctx.reply("Format: /hapus email@domain.com");
    return;
  }

  try {
    const result = await deleteFromRejectList(email);
    if (result.deleted) {
      await ctx.reply(`Email ${email} berhasil dihapus dari reject list.`);
    } else {
      await ctx.reply(`Email ${email} tidak ditemukan di reject list.`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await ctx.reply(`Error saat menghapus email: ${msg}`);
  }
});

bot.command("listblocked", async (ctx) => {
  await ctx.reply("Mengambil data reject list...");

  try {
    const results = await listAllRejects();

    if (results.length === 0) {
      await ctx.reply("Reject list kosong. Tidak ada email yang diblokir.");
      return;
    }

    const lines = results.map(
      (entry, i) => `${i + 1}. ${entry.email} (${entry.reason}) - ${entry.created_at}`
    );

    // Telegram message limit is 4096 chars, split if needed
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
      "Kirim email yang ingin dicek, atau gunakan /help untuk melihat perintah."
    );
    return;
  }

  if (emails.length === 1) {
    const email = emails[0];
    await ctx.reply(`Mengecek status email: ${email}...`);

    try {
      const results = await checkEmail(email);
      if (results.length === 0) {
        await ctx.reply(
          [`Status: CLEAN`, `Email: ${email}`, `Tidak ada di reject list.`].join("\n")
        );
      } else {
        const details = results.map((e) => formatRejectEntry(e));
        await ctx.reply(
          [
            `Status: BLOCKED`,
            `Email: ${email}`,
            "",
            "Detail:",
            ...details,
            "",
            `Gunakan /hapus ${email} untuk menghapus.`,
          ].join("\n")
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await ctx.reply(`Error: ${msg}`);
    }
  } else {
    // Multiple emails detected, run bulk check
    await ctx.reply(`Terdeteksi ${emails.length} email, mengecek...`);

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
