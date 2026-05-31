# PSBA Price Bot

WhatsApp bot that serves Punjab Food Authority (PSBA) daily price comparison data.

## Project Structure

```
price-scraper/
├── src/
│   ├── bot/              # WhatsApp bot (Baileys)
│   │   ├── index.js      # Bot entry point
│   │   ├── base.js       # Baileys exports
│   │   ├── connect.js    # Connection logic (QR + Pairing)
│   │   ├── commands/     # Bot command handlers
│   │   ├── services/     # Data services
│   │   ├── utils/        # Formatters, aliases, normalizers
│   │   └── libs/         # Baileys helpers (cache, serializer, utils)
│   └── scraper/          # PSBA API scraper
│       └── index.js
├── output/               # Scraped price data (JSON + CSV)
├── .env                  # Environment config
├── .env.example          # Example config
└── package.json
```

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your phone number
```

## Usage

### Scrape latest prices
```bash
npm run scrape
```

### Start WhatsApp bot
```bash
npm run bot
```

## Bot Commands

| Command | Example | Description |
|---------|---------|-------------|
| `help` | `help` | Show all commands |
| `rate <item> <district>` | `rate tomato lahore` | Get price for an item |
| `top <district>` | `top lahore` | Top 5 PSBA savings |
| `districts` | `districts` | List all districts |
| `items <district>` | `items lahore` | Items in a district |

Roman Urdu aliases work: `tamatar`, `aloo`, `pyaz`, `pindi`, `fsd`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BOT_PHONE_NUMBER` | - | WhatsApp number with country code |
| `SESSION_FOLDER` | `session` | Session storage folder |
| `CONNECTION_TYPE` | `pairing` | `pairing` or `qr` |
| `AUTOREAD` | `true` | Auto-read incoming messages |
