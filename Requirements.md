You are working inside my existing Node.js project.

Project structure:
- Root folder: PRICE-SCRAPER
- Scraper already exists in scraper.js
- Scraped data is already generated in:
  - output/prices_latest.json
  - output/prices_latest.csv
  - output/prices_2026-05-26.json
  - output/prices_2026-05-26.csv
- WhatsApp bot base exists inside:
  - base-resbot-master/
  - base-resbot-master/index.js
  - base-resbot-master/base.js
  - base-resbot-master/src/
- Requirements are written in Requirements.md

Your task:
Convert the scraped PSBA price data into a working WhatsApp bot.

Important:
Do NOT rebuild the scraper.
Do NOT call the PSBA API on every WhatsApp message.
Use the existing scraped file:
../output/prices_latest.json

First inspect:
1. base-resbot-master/package.json
2. base-resbot-master/index.js
3. base-resbot-master/base.js
4. base-resbot-master/src/
5. output/prices_latest.json
6. Requirements.md

Then implement the bot logic according to the existing bot base structure.

Main goal:
When user sends WhatsApp message:

rate tomato lahore

Bot should reply with clean price data from output/prices_latest.json.

Expected reply format:

📊 *Tomato - Lahore*

DC Rate: Rs. 90
PSBA Rate: Rs. 80
Difference: Rs. 10

✅ PSBA cheaper hai.

Updated: 26 May 2026

Required commands:

1. help
Reply with all available commands.

2. rate <item> <district>
Example:
rate tomato lahore
rate onion faisalabad
rate potato multan

3. top <district>
Show top 5 items where PSBA rate is cheaper than DC rate.

4. districts
Show available districts from the JSON data.

5. items <district>
Show available items for that district.

Data handling requirements:
- Read data from output/prices_latest.json
- Detect actual field names from JSON file
- Normalize data into this internal format:

{
  date,
  district,
  itemName,
  category,
  unit,
  dcRate,
  psbaRate,
  difference,
  status
}

- If the actual JSON field names are different, map them properly.
- Convert prices to numbers.
- Remove extra spaces.
- Ignore invalid rows.
- Handle missing values safely.
- Do not crash if JSON file is missing or invalid.

Search requirements:
- Search should be case-insensitive.
- User should be able to type partial item names.
- Add aliases for Roman Urdu/common names:

tomato = tomato, tamatar, tomatoes
onion = onion, pyaz, piyaz
potato = potato, aloo
eggs = egg, eggs, anda, anday
chicken = chicken, murghi, murga
rice = rice, chawal

District aliases:
lahore = lahore, lhr
faisalabad = faisalabad, fsd
rawalpindi = rawalpindi, pindi, rwp
multan = multan, mlt

Suggested files to create inside base-resbot-master:

src/services/priceData.service.js
src/utils/normalize.js
src/utils/formatter.js
src/utils/aliases.js
src/commands/price.commands.js

But follow the existing project structure if it already has a better command system.

Implementation details:
- Load latest price data once on bot start.
- Reload data automatically if output/prices_latest.json file modified time changes.
- Use cached data for replies.
- Do not repeatedly read file on every message unless needed.
- Keep replies short and WhatsApp friendly.
- Use WhatsApp markdown: *bold*
- Add proper error handling.

Error replies:

If command is wrong:
Command samajh nahi aayi.

Use:
rate tomato lahore

Type help for commands.

If item not found:
Item ka rate nahi mila.

Try:
items lahore

If district not found:
District ka data available nahi hai.

Type districts to see available districts.

If data file missing:
Price data file nahi mili.
Please run scraper first.

Acceptance criteria:
- Bot starts without errors.
- Existing WhatsApp bot base still works.
- User can send "help".
- User can send "districts".
- User can send "items lahore".
- User can send "rate tomato lahore".
- User can send "top lahore".
- Bot reads data from ../output/prices_latest.json.
- Bot does not call PSBA API directly.
- Bot does not crash on wrong input.
- Code is clean and separated into services/utils/commands.
- Do not remove existing working bot code unless necessary.
- After changes, tell me exactly which files were created/modified and how to run the bot.

Now implement this fully in the existing project.