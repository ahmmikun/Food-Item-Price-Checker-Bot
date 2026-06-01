import {
  hasData,
  getDistricts,
  getItemsByDistrict,
  findRate,
  getTopSavings,
  districtExists,
} from "../services/priceData.service.js";

import {
  formatRate,
  formatCaption,
  formatMultipleRates,
  formatTop,
  formatDistricts,
  formatItems,
  formatHelp,
  formatError,
} from "../utils/formatter.js";

/**
 * Handle incoming message and return a structured response object (or null if not a price command).
 * @param {string} content - The full message text
 * @returns {Promise<{ type: "text", text: string } | { type: "image", imageUrl: string, caption: string } | null>}
 */
export async function handlePriceCommand(content) {
  if (!content || typeof content !== "string") return null;

  const text = content.trim().toLowerCase().replace(/^[.!/#]+/, "");
  const parts = text.split(/\s+/);
  const command = parts[0];

  // Help command
  if (command === "help" || command === "menu" || command === "start") {
    return { type: "text", text: formatHelp() };
  }

  if (command === "ping") {
    return { type: "text", text: "Pong. PSBA Price Bot is online." };
  }

  // Check data availability for data commands
  if (!hasData()) {
    if (["rate", "top", "districts", "items"].includes(command)) {
      return { type: "text", text: formatError("data_missing") };
    }
    return null;
  }

  // Districts command
  if (command === "districts") {
    const districts = getDistricts();
    return { type: "text", text: formatDistricts(districts) };
  }

  // Items command: items <district>
  if (command === "items") {
    const district = parts.slice(1).join(" ");
    if (!district) {
      return { type: "text", text: `❌ District batao.\n\nExample: *items lahore*` };
    }
    if (!districtExists(district)) {
      return { type: "text", text: formatError("district_not_found") };
    }
    const items = await getItemsByDistrict(district);
    if (items.length === 0) {
      return { type: "text", text: formatError("item_not_found") };
    }
    return { type: "text", text: formatItems(district, items) };
  }

  // Rate command: rate <item> <district>
  if (command === "rate") {
    if (parts.length < 3) {
      return { type: "text", text: `❌ Item aur district dono batao.\n\nExample: *rate tomato lahore*` };
    }

    // Last word is district, everything in between is item
    const district = parts[parts.length - 1];
    const item = parts.slice(1, -1).join(" ");

    if (!districtExists(district)) {
      return { type: "text", text: formatError("district_not_found") };
    }

    const results = await findRate(item, district);
    if (results.length === 0) {
      return { type: "text", text: formatError("item_not_found") };
    }

    if (results.length === 1) {
      const singleItem = results[0];
      if (singleItem.image) {
        return { type: "image", imageUrl: singleItem.image, caption: formatCaption(singleItem) };
      }
      return { type: "text", text: formatRate(singleItem) };
    }

    return { type: "text", text: formatMultipleRates(results, `${item} - ${district}`) };
  }

  // Top command: top <district>
  if (command === "top") {
    const district = parts.slice(1).join(" ");
    if (!district) {
      return { type: "text", text: `❌ District batao.\n\nExample: *top lahore*` };
    }
    if (!districtExists(district)) {
      return { type: "text", text: formatError("district_not_found") };
    }
    const topItems = await getTopSavings(district, 5);
    return { type: "text", text: formatTop(district, topItems) };
  }

  // Not a price command
  return null;
}
