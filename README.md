# Mandrill Telegram Bot

Telegram bot untuk mengecek dan mengelola email di Mandrill reject list (blocklist, bounce, spam).

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/)
- Telegram Bot Token (dari [@BotFather](https://t.me/BotFather))
- Mandrill API Key (dari [Mailchimp Transactional](https://mandrillapp.com/settings))

## Setup

### 1. Clone & Install

```bash
git clone git@github.com:IrfanArsyad/mandrill-mail-status.git
cd mandrill-mail-status
pnpm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit file `.env`:

```env
# Token dari @BotFather di Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# API Key dari Mandrill (Mailchimp Transactional > Settings > SMTP & API Info)
MANDRILL_API_KEY=your-mandrill-api-key

# (Opsional) Telegram user ID yang boleh akses bot, pisahkan dengan koma
# Kosongkan jika semua orang boleh akses
ALLOWED_USER_IDS=123456789
```

#### Cara Mendapatkan Credentials

| Credential | Cara |
|---|---|
| **Telegram Bot Token** | Chat [@BotFather](https://t.me/BotFather) > `/newbot` > ikuti instruksi > copy token |
| **Mandrill API Key** | Login [Mailchimp](https://login.mailchimp.com/) > Transactional > Settings > SMTP & API Info > + New API Key |
| **Telegram User ID** | Chat [@userinfobot](https://t.me/userinfobot) > `/start` > copy ID |

### 3. Jalankan Bot

```bash
# Development (auto-reload)
pnpm dev

# Production
pnpm start
```

## Commands

| Command | Fungsi |
|---|---|
| `/cek email@domain.com` | Cek status email di reject list |
| `/cekbulk a@x.com b@x.com` | Cek beberapa email sekaligus |
| `/hapus email@domain.com` | Hapus email dari reject list |
| `/listblocked` | Tampilkan semua email yang diblokir |
| `/help` | Tampilkan bantuan |

Bisa juga kirim email langsung tanpa command, bot akan auto-detect dan cek statusnya.

## Contoh Penggunaan

```
Anda: /cek test@example.com
Bot:  Status: CLEAN
      Email: test@example.com
      Email tidak ditemukan di reject list Mandrill.

Anda: /cek bounced@domain.com
Bot:  Status: BLOCKED
      Email: bounced@domain.com

      Detail:
        Alasan: hard-bounce
        Tanggal: 2026-01-15
        Expired: Tidak

      Gunakan /hapus bounced@domain.com untuk menghapus dari reject list.
```
