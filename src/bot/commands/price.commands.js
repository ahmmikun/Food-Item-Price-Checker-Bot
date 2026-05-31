import {
  loadPriceData,
  hasData,
  getDistricts,
  getItemsByDistrict,
  findRate,
  getTopSavings,
  districtExists,
} from "../services/priceData.service.js";

import {
  formatRate,
  formatMultipleRates,
  formatTop,
  formatDistricts,
  formatItems,
  formatHelp,
  formatError,
} from "../utils/formatter.js";

/**
 * Handle incoming message and return a reply string (or null if not a price command).
 * @param {string} content - The full message text
 * @returns {string|null} - Reply text or null if not handled
 */
export function handlePriceCommand(content) {
  if (!content || typeof content !== "string") return null;

  const text = content.trim().toLowerCase().replace(/^[.!/#]+/, "");
  const parts = text.split(/\s+/);
  const command = parts[0];

  // Reload data on each command (uses cache, only reads file if modified)
  const dataLoaded = loadPriceData();

  // Help command
  if (command === "help" || command === "menu" || command === "start") {
    return formatHelp();
  }

  if (command === "ping") {
    return "Pong. PSBA Price Bot is online.";
  }

  // Check data availability for data commands
  if (!dataLoaded || !hasData()) {
    if (["rate", "top", "districts", "items"].includes(command)) {
      return formatError("data_missing");
    }
    return null;
  }

  // Districts command
  if (command === "districts") {
    const districts = getDistricts();
    return formatDistricts(districts);
  }

  // Items command: items <district>
  if (command === "items") {
    const district = parts.slice(1).join(" ");
    if (!district) {
      return `❌ District batao.\n\nExample: *items lahore*`;
    }
    if (!districtExists(district)) {
      return formatError("district_not_found");
    }
    const items = getItemsByDistrict(district);
    if (items.length === 0) {
      return formatError("item_not_found");
    }
    return formatItems(district, items);
  }

  // Rate command: rate <item> <district>
  if (command === "rate") {
    if (parts.length < 3) {
      return `❌ Item aur district dono batao.\n\nExample: *rate tomato lahore*`;
    }

    // Last word is district, everything in between is item
    const district = parts[parts.length - 1];
    const item = parts.slice(1, -1).join(" ");

    if (!districtExists(district)) {
      return formatError("district_not_found");
    }

    const results = findRate(item, district);
    if (results.length === 0) {
      return formatError("item_not_found");
    }

    if (results.length === 1) {
      return formatRate(results[0]);
    }

    return formatMultipleRates(results, `${item} - ${district}`);
  }

  // Top command: top <district>
  if (command === "top") {
    const district = parts.slice(1).join(" ");
    if (!district) {
      return `❌ District batao.\n\nExample: *top lahore*`;
    }
    if (!districtExists(district)) {
      return formatError("district_not_found");
    }
    const topItems = getTopSavings(district, 5);
    return formatTop(district, topItems);
  }

  // Not a price command
  return null;
}
