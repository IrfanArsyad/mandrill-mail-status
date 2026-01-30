import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  telegramToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  mandrillApiKey: requireEnv("MANDRILL_API_KEY"),
  allowedGroupId: process.env.ALLOWED_GROUP_ID
    ? Number(process.env.ALLOWED_GROUP_ID)
    : null,
  allowedUserIds: process.env.ALLOWED_USER_IDS
    ? process.env.ALLOWED_USER_IDS.split(",").map(Number)
    : [],
} as const;
