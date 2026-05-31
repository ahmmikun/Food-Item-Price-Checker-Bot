/**
 * Format price data for WhatsApp messages.
 * Uses WhatsApp markdown: *bold*, _italic_, ```monospace```
 * Bilingual labels: English / Roman Urdu
 */

export function formatRate(item) {
  const date = formatDate(item.date);
  const cheaper =
    item.difference > 0
      ? "✅ PSBA sasta hai / PSBA is cheaper"
      : item.difference === 0
      ? "➖ Dono same rate hain / Both rates are equal"
      : "⚠️ Market rate kam hai / Market rate is lower";

  return (
    `📊 *${item.itemName} - ${item.district}*\n\n` +
    `💰 *Rates / Qeematein:*\n` +
    `   _DC Rate / Sarkari Rate:_ \`\`\`Rs. ${item.dcRate}/${item.unit}\`\`\`\n` +
    `   _PSBA Rate:_ \`\`\`Rs. ${item.psbaRate}/${item.unit}\`\`\`\n` +
    `   _Farq / Difference:_ \`\`\`Rs. ${Math.abs(item.difference)}\`\`\`\n\n` +
    `${cheaper}\n\n` +
    `_Updated: ${date}_`
  );
}

export function formatCaption(item) {
  const date = formatDate(item.date);
  const cheaper =
    item.difference > 0
      ? "✅ PSBA sasta hai"
      : item.difference === 0
      ? "➖ Dono same rate hain"
      : "⚠️ Market rate kam hai";

  return (
    `📊 *${item.itemName} - ${item.district}*\n\n` +
    `_DC Rate:_ \`\`\`Rs. ${item.dcRate}/${item.unit}\`\`\`\n` +
    `_PSBA Rate:_ \`\`\`Rs. ${item.psbaRate}/${item.unit}\`\`\`\n` +
    `_Farq / Difference:_ \`\`\`Rs. ${Math.abs(item.difference)}\`\`\`\n\n` +
    `${cheaper}\n\n` +
    `_Updated: ${date}_`
  );
}

export function formatMultipleRates(items, query) {
  if (items.length === 1) return formatRate(items[0]);

  let msg = `📊 *${query} - ${items.length} Results / Nataij*\n\n`;
  items.slice(0, 5).forEach((item, i) => {
    msg += `${i + 1}. *${item.itemName}* _(${item.district})_\n`;
    msg += `   _DC:_ \`\`\`Rs. ${item.dcRate}\`\`\` | _PSBA:_ \`\`\`Rs. ${item.psbaRate}\`\`\` | _Farq:_ \`\`\`Rs. ${item.difference}\`\`\`\n\n`;
  });

  if (items.length > 5) {
    msg += `_... aur ${items.length - 5} results hain._\n\n`;
  }

  msg += `_Updated: ${formatDate(items[0].date)}_`;
  return msg;
}

export function formatTop(district, items) {
  if (items.length === 0) {
    return `🏆 *Top Savings / Sab Se Zyada Bachat - ${district}*\n\nKoi item nahi mila jahan PSBA cheaper ho.`;
  }

  let msg = `🏆 *Top Savings / Sab Se Zyada Bachat - ${district}*\n\n`;
  items.forEach((item, i) => {
    msg += `${i + 1}. *${item.itemName}* _(${item.unit})_\n`;
    msg += `   _DC:_ \`\`\`Rs. ${item.dcRate}\`\`\` → _PSBA:_ \`\`\`Rs. ${item.psbaRate}\`\`\` | _Bachat / Save:_ \`\`\`Rs. ${item.difference}\`\`\`\n\n`;
  });

  msg += `_Updated: ${formatDate(items[0].date)}_`;
  return msg;
}

export function formatDistricts(districts) {
  let msg = `🏙️ *Available Districts / Dastiyab Zillay (${districts.length})*\n\n`;
  districts.forEach((d, i) => {
    msg += `${i + 1}. ${d}\n`;
  });
  return msg;
}

export function formatItems(district, items) {
  let msg = `🛒 *Items / Cheezein - ${district}* _(${items.length})_\n\n`;

  // Group by category
  const grouped = {};
  items.forEach((item) => {
    const cat = item.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item.itemName);
  });

  for (const [cat, names] of Object.entries(grouped)) {
    msg += `*${cat}:*\n`;
    msg += names.join(", ") + "\n\n";
  }

  return msg;
}

export function formatHelp() {
  return (
    `🤖 *PSBA Price Bot - Commands / Hukum*\n\n` +
    `1️⃣ *rate <item> <district>*\n` +
    `   Check price / Qeemat dekhein\n` +
    `   _Example: rate tomato lahore_\n\n` +
    `2️⃣ *top <district>*\n` +
    `   Top 5 savings / Sab se zyada bachat\n` +
    `   _Items jahan PSBA sasta hai_\n\n` +
    `3️⃣ *districts*\n` +
    `   List of districts / Zillay ki list\n\n` +
    `4️⃣ *items <district>*\n` +
    `   Available items / Dastiyab cheezein\n` +
    `   _District mein available items_\n\n` +
    `5️⃣ *help*\n` +
    `   Show this message / Ye paigham dikhayein\n\n` +
    `💡 _Roman Urdu bhi use kar sakte ho:_\n` +
    `   rate tamatar lahore\n` +
    `   rate aloo fsd`
  );
}

export function formatError(type) {
  switch (type) {
    case "invalid_command":
      return (
        `❌ *Ghalat Command / Invalid Command*\n\n` +
        `Command samajh nahi aayi.\n` +
        `_The command was not recognized._\n\n` +
        `_Example: rate tomato lahore_\n` +
        `Type *help* for commands / Hukum dekhein.`
      );
    case "item_not_found":
      return (
        `❌ *Item Nahi Mili / Item Not Found*\n\n` +
        `Is item ka rate nahi mila.\n` +
        `_Could not find rate for this item._\n\n` +
        `*items <district>* se available items dekhein.`
      );
    case "district_not_found":
      return (
        `❌ *District Nahi Mila / District Not Found*\n\n` +
        `Is district ka data available nahi hai.\n` +
        `_Data not available for this district._\n\n` +
        `Type *districts* to see available districts / Dastiyab zillay dekhein.`
      );
    case "data_missing":
      return (
        `❌ *Data Nahi Mila / Data Missing*\n\n` +
        `Price data file nahi mili.\n` +
        `_Price data file not found._\n\n` +
        `Please run scraper first.`
      );
    default:
      return (
        `❌ *Kuch Galat Ho Gaya / Something Went Wrong*\n\n` +
        `Dobara koshish karein.\n` +
        `_Please try again._`
      );
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "N/A";
  }
}
