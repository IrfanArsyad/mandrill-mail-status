# Mandrill Telegram Bot

Telegram bot untuk mengecek dan mengelola email di Mandrill reject list (blocklist, bounce, spam) beserta riwayat pengiriman.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/)
- [PM2](https://pm2.keymetrics.io/) (opsional, untuk production)
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

### 4. Jalankan dengan PM2 (Production)

```bash
# Start
./start.sh start

# Stop
./start.sh stop

# Restart
./start.sh restart

# Lihat log
./start.sh logs

# Cek status
./start.sh status
```

Auto-start saat reboot:

```bash
pm2 save && pm2 startup
```

## Commands

| Command | Fungsi |
|---|---|
| `/cek email@domain.com` | Cek status email di reject list + riwayat pengiriman |
| `/cekbulk a@x.com b@x.com` | Cek beberapa email sekaligus |
| `/hapus email@domain.com` | Hapus email dari reject list |
| `/listblocked` | Tampilkan semua email yang diblokir |
| `/help` | Tampilkan bantuan |

Bisa juga kirim email langsung tanpa command, bot akan auto-detect dan cek statusnya.

## Contoh Penggunaan

```
Anda: /cek bounced@domain.com

Bot:  Status: BLOCKED
      Email: bounced@domain.com

      Detail:

      --- Reject Info ---
      Alasan  : Hard Bounce - Email tidak bisa dikirim (alamat tidak ada/tidak valid)

      --- SMTP Detail ---
        SMTP Code: 550 (5.1.1)
        Pesan: The email account that you tried to reach does not exist.

      --- Waktu ---
      Ditambahkan  : 2026-01-30 18:36:36
      Event Terakhir: 2026-01-30 18:36:36
      Auto-hapus   : 2026-02-06 18:36:36
      Status Expire: Masih aktif (belum expired)

      --- Riwayat Pengiriman (2 terakhir) ---
      1. 2026-01-28 10:30:00
         Subject : Invoice #123
         Status  : SPAM << SPAM REPORT
         Opens   : 0 | Clicks: 0
         Sender  : noreply@domain.com
      2. 2026-01-25 14:15:00
         Subject : Promo Januari
         Status  : Terkirim
         Opens   : 1 | Clicks: 0
         Sender  : noreply@domain.com

      !! 1 dari 2 email di-report SPAM

      Gunakan /hapus bounced@domain.com untuk menghapus dari reject list.
```

## Mandrill API Endpoints

Bot ini menggunakan endpoint berikut:

| Endpoint | Fungsi |
|---|---|
| `rejects/list` | Cek email di reject list |
| `rejects/delete` | Hapus email dari reject list |
| `messages/search` | Cari riwayat pengiriman ke email |
