# Mandrill Telegram Bot

Tired of wasting time checking emails on Mandrill? Use this bot to handle your Mandrill needs right from Telegram. Supports group-only or user ID restriction for secure access.

Check reject list status, view send history, remove blocked emails — all from a single Telegram chat.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/)
- [PM2](https://pm2.keymetrics.io/) (optional, for production)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Mandrill API Key (from [Mailchimp Transactional](https://mandrillapp.com/settings))

## Setup

### 1. Clone & Install

```bash
git clone git@github.com:IrfanArsyad/mandrill-mail-status.git
cd mandrill-mail-status
pnpm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Mandrill API Key (Mailchimp Transactional > Settings > SMTP & API Info)
MANDRILL_API_KEY=your-mandrill-api-key

# (Optional) Restrict bot to a specific Telegram group
# Use /groupid command inside the group to get the ID
ALLOWED_GROUP_ID=-1001234567890

# (Optional) Comma-separated Telegram user IDs for private chat access
# Only used if ALLOWED_GROUP_ID is not set
ALLOWED_USER_IDS=123456789
```

#### How to Get Credentials

| Credential | How |
|---|---|
| **Telegram Bot Token** | Chat [@BotFather](https://t.me/BotFather) > `/newbot` > follow instructions > copy token |
| **Mandrill API Key** | Login [Mailchimp](https://login.mailchimp.com/) > Transactional > Settings > SMTP & API Info > + New API Key |
| **Telegram User ID** | Chat [@userinfobot](https://t.me/userinfobot) > `/start` > copy ID |
| **Group ID** | Add bot to group > type `/groupid` > copy the ID |

### 3. Run the Bot

```bash
# Development (auto-reload)
pnpm dev

# Production
pnpm start
```

### 4. Run with PM2 (Production)

```bash
# Start
./start.sh start

# Stop
./start.sh stop

# Restart
./start.sh restart

# View logs
./start.sh logs

# Check status
./start.sh status
```

Auto-start on reboot:

```bash
pm2 save && pm2 startup
```

## Commands

| Command | Description |
|---|---|
| `/check email@domain.com` | Check email status in reject list + send history |
| `/checkbulk a@x.com b@x.com` | Check multiple emails at once |
| `/remove email@domain.com` | Remove email from reject list |
| `/listblocked` | Show all blocked emails |
| `/groupid` | Show current group ID (for setup) |
| `/help` | Show help |

You can also send an email address directly without a command, and the bot will auto-detect and check its status.

## Example Usage

```
You: /check bounced@domain.com

Bot: Checking email status: bounced@domain.com...

     Status: BLOCKED
     Email: bounced@domain.com

     Detail:

     --- Reject Info ---
     Reason  : Hard Bounce - Email address does not exist or is invalid

     --- SMTP Detail ---
       SMTP Code: 550 (5.1.1)
       Message: The email account that you tried to reach does not exist.

     --- Timestamp ---
     Added     : 2026-01-30 18:36:36
     Last Event: 2026-01-30 18:36:36
     Auto-remove: 2026-02-06 18:36:36
     Expired    : No (still active)

     --- Send History (last 2) ---
     1. 2026-01-28 10:30:00
        Subject: Invoice #123
        Status : SPAM << SPAM REPORT
        Opens  : 0 | Clicks: 0
        Sender : noreply@domain.com
     2. 2026-01-25 14:15:00
        Subject: Promo January
        Status : Sent
        Opens  : 1 | Clicks: 0
        Sender : noreply@domain.com

     !! 1 of 2 emails reported as SPAM

     Use /remove bounced@domain.com to remove from reject list.
```

## Mandrill API Endpoints

This bot uses the following endpoints:

| Endpoint | Description |
|---|---|
| `rejects/list` | Check email in reject list |
| `rejects/delete` | Remove email from reject list |
| `messages/search` | Search send history for an email |
