import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeData } from "../utils/normalize.js";
import { resolveItem, resolveDistrict } from "../utils/aliases.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the scraped data file
const DATA_FILE = path.resolve(__dirname, "../../../output/prices_latest.json");

let cachedData = [];
let lastModified = 0;

/**
 * Load price data from file. Uses cache and checks file mtime for auto-reload.
 */
export function loadPriceData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log("⚠️ Price data file not found:", DATA_FILE);
      cachedData = [];
      return false;
    }

    const stat = fs.statSync(DATA_FILE);
    const mtime = stat.mtimeMs;

    // Only reload if file has been modified
    if (mtime > lastModified) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      cachedData = normalizeData(parsed);
      lastModified = mtime;
      console.log(`✅ Price data loaded: ${cachedData.length} records`);
    }

    return true;
  } catch (err) {
    console.error("❌ Error loading price data:", err.message);
    cachedData = [];
    return false;
  }
}

/**
 * Check if data is available
 */
export function hasData() {
  return cachedData.length > 0;
}

/**
 * Get all unique districts from the data
 */
export function getDistricts() {
  const districts = [...new Set(cachedData.map((d) => d.district))];
  return districts.sort();
}

/**
 * Get all items for a specific district
 */
export function getItemsByDistrict(districtQuery) {
  const resolved = resolveDistrict(districtQuery);
  const items = cachedData.filter(
    (d) => d.district.toLowerCase() === resolved
  );

  // Deduplicate by item name
  const seen = new Set();
  return items.filter((item) => {
    const key = item.itemName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Search for a specific item in a specific district
 */
export function findRate(itemQuery, districtQuery) {
  const resolvedItem = resolveItem(itemQuery);
  const resolvedDistrict = resolveDistrict(districtQuery);

  return cachedData.filter((d) => {
    const matchDistrict = d.district.toLowerCase() === resolvedDistrict;
    const matchItem =
      d.itemName.toLowerCase() === resolvedItem ||
      d.itemName.toLowerCase().includes(resolvedItem) ||
      resolvedItem.includes(d.itemName.toLowerCase());
    return matchDistrict && matchItem;
  });
}

/**
 * Get top N items where PSBA is cheaper than DC rate for a district
 */
export function getTopSavings(districtQuery, limit = 5) {
  const resolved = resolveDistrict(districtQuery);
  return cachedData
    .filter((d) => d.district.toLowerCase() === resolved && d.difference > 0)
    .sort((a, b) => b.difference - a.difference)
    .slice(0, limit);
}

/**
 * Check if a district exists in the data
 */
export function districtExists(districtQuery) {
  const resolved = resolveDistrict(districtQuery);
  return cachedData.some((d) => d.district.toLowerCase() === resolved);
}
