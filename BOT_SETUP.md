# PSBA Price WhatsApp Bot

This bot uses the existing scraped data in `output/prices_latest.json`.
It does not call the PSBA API for WhatsApp replies.

## Install

```bat
cd D:\goods-price-checker-bot
npm run bot:install
```

## Pairing-code login

Create `base-resbot-master\.env`:

```env
BOT_PHONE_NUMBER=923xxxxxxxxx
SESSION_FOLDER=session
AUTOREAD=true
```

Start:

```bat
cd D:\goods-price-checker-bot
npm run bot
```

The terminal prints a pairing code. Open WhatsApp on your phone:

Linked devices -> Link with phone number -> enter the code.

## Commands

```txt
help
districts
items lahore
rate tomato lahore
rate tamatar lhr
top lahore
ping
```

Prefixes also work:

```txt
.rate tomato lahore
/top lahore
```
