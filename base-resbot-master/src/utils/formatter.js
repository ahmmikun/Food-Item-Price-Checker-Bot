/**
 * Format price data for WhatsApp messages.
 * Uses WhatsApp markdown (*bold*) and keeps replies short.
 */

export function formatRate(item) {
  const date = formatDate(item.date);
  const cheaper =
    item.difference > 0
      ? "✅ PSBA cheaper hai."
      : item.difference === 0
      ? "➖ Dono same rate hain."
      : "⚠️ Market rate kam hai.";

  return (
    `📊 *${item.itemName} - ${item.district}*\n\n` +
    `DC Rate: Rs. ${item.dcRate}/${item.unit}\n` +
    `PSBA Rate: Rs. ${item.psbaRate}/${item.unit}\n` +
    `Difference: Rs. ${Math.abs(item.difference)}\n\n` +
    `${cheaper}\n\n` +
    `Updated: ${date}`
  );
}

export function formatMultipleRates(items, query) {
  if (items.length === 1) return formatRate(items[0]);

  let msg = `📊 *${query}* - ${items.length} results:\n\n`;
  items.slice(0, 5).forEach((item, i) => {
    msg += `${i + 1}. *${item.itemName}* (${item.district})\n`;
    msg += `   DC: Rs.${item.dcRate} | PSBA: Rs.${item.psbaRate} | Diff: Rs.${item.difference}\n\n`;
  });

  if (items.length > 5) {
    msg += `... aur ${items.length - 5} results hain.`;
  }

  msg += `\nUpdated: ${formatDate(items[0].date)}`;
  return msg;
}

export function formatTop(district, items) {
  if (items.length === 0) {
    return `📊 *Top Savings - ${district}*\n\nKoi item nahi mila jahan PSBA cheaper ho.`;
  }

  let msg = `📊 *Top Savings - ${district}*\n\n`;
  items.forEach((item, i) => {
    msg += `${i + 1}. *${item.itemName}* (${item.unit})\n`;
    msg += `   DC: Rs.${item.dcRate} → PSBA: Rs.${item.psbaRate} | Save: Rs.${item.difference}\n\n`;
  });

  msg += `Updated: ${formatDate(items[0].date)}`;
  return msg;
}

export function formatDistricts(districts) {
  let msg = `🏙️ *Available Districts (${districts.length})*\n\n`;
  districts.forEach((d, i) => {
    msg += `${i + 1}. ${d}\n`;
  });
  return msg;
}

export function formatItems(district, items) {
  let msg = `🛒 *Items in ${district}* (${items.length})\n\n`;

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
    `🤖 *PSBA Price Bot - Commands*\n\n` +
    `1️⃣ *rate <item> <district>*\n` +
    `   Example: rate tomato lahore\n\n` +
    `2️⃣ *top <district>*\n` +
    `   Top 5 items jahan PSBA sasta hai\n\n` +
    `3️⃣ *districts*\n` +
    `   Available districts ki list\n\n` +
    `4️⃣ *items <district>*\n` +
    `   District mein available items\n\n` +
    `5️⃣ *help*\n` +
    `   Ye message\n\n` +
    `💡 Roman Urdu bhi use kar sakte ho:\n` +
    `   rate tamatar lahore\n` +
    `   rate aloo fsd`
  );
}

export function formatError(type) {
  switch (type) {
    case "invalid_command":
      return (
        `❌ Command samajh nahi aayi.\n\n` +
        `Use:\n` +
        `rate tomato lahore\n\n` +
        `Type *help* for commands.`
      );
    case "item_not_found":
      return (
        `❌ Item ka rate nahi mila.\n\n` +
        `Try:\n` +
        `*items lahore* - available items dekhein`
      );
    case "district_not_found":
      return (
        `❌ District ka data available nahi hai.\n\n` +
        `Type *districts* to see available districts.`
      );
    case "data_missing":
      return (
        `❌ Price data file nahi mili.\n` +
        `Please run scraper first.`
      );
    default:
      return `❌ Kuch galat ho gaya. Try again.`;
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
