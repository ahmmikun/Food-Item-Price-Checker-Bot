import axios from "axios";
import { resolveItem, resolveDistrict } from "../utils/aliases.js";

const DISTRICTS_API = "https://psba.gop.pk:3000/api/districts?forPrices=true";
const PRICES_API = "https://psba.gop.pk:3000/api/public/prices";
const TIMEOUT = 30000;

// Cache: district list and per-district prices
let districtCache = []; // [{ id, name }]
let priceCache = new Map(); // Map<districtName, { data: [...], fetchedAt: timestamp }>
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch all districts from the PSBA API.
 * Caches for CACHE_TTL duration.
 */
export async function loadDistricts() {
  try {
    if (districtCache.length > 0) return true;

    console.log("Fetching districts from PSBA API...");
    const response = await axios.get(DISTRICTS_API, {
      headers: { "User-Agent": "PSBA-Price-Bot/1.0", Accept: "application/json" },
      timeout: TIMEOUT,
    });

    const raw = response.data;
    if (!Array.isArray(raw)) {
      console.error("❌ Districts API did not return an array");
      return false;
    }

    districtCache = raw.map((d) => ({
      id: d._id,
      name: d.name || d.district || "Unknown",
    }));

    console.log(`✅ Loaded ${districtCache.length} districts`);
    return true;
  } catch (err) {
    console.error("❌ Failed to fetch districts:", err.message);
    return false;
  }
}

/**
 * Fetch prices for a specific district by its ID.
 * Returns normalized items array.
 */
async function fetchPricesForDistrict(districtId, districtName) {
  try {
    const url = `${PRICES_API}?district=${districtId}`;
    const response = await axios.get(url, {
      headers: { "User-Agent": "PSBA-Price-Bot/1.0", Accept: "application/json" },
      timeout: TIMEOUT,
    });

    const raw = response.data;
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => ({
        id: item._id || "",
        date: item.date || "",
        district: districtName,
        itemName: cleanString(item.product?.name || "Unknown"),
        category: cleanString(item.product?.category || ""),
        unit: cleanString(item.product?.unit || ""),
        image: item.product?.image || "",
        dcRate: toNumber(item.marketPrice),
        psbaRate: toNumber(item.psbaPrice),
        difference: toNumber(item.marketPrice) - toNumber(item.psbaPrice),
        status: item.status || "unknown",
      }))
      .filter((row) => row.dcRate > 0 || row.psbaRate > 0);
  } catch (err) {
    console.error(`❌ Failed to fetch prices for ${districtName}:`, err.message);
    return [];
  }
}

/**
 * Get prices for a district (with caching).
 * Fetches from API if cache is stale or missing.
 */
async function getPricesForDistrict(districtName) {
  const cached = priceCache.get(districtName.toLowerCase());
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
    return cached.data;
  }

  // Find district ID
  const district = districtCache.find(
    (d) => d.name.toLowerCase() === districtName.toLowerCase()
  );
  if (!district) return [];

  const data = await fetchPricesForDistrict(district.id, district.name);
  priceCache.set(districtName.toLowerCase(), { data, fetchedAt: Date.now() });
  return data;
}

/**
 * Initialize: load districts on startup.
 */
export async function initPriceService() {
  await loadDistricts();
}

/**
 * Check if district data is available
 */
export function hasData() {
  return districtCache.length > 0;
}

/**
 * Get all district names
 */
export function getDistricts() {
  return districtCache.map((d) => d.name).sort();
}

/**
 * Check if a district exists
 */
export function districtExists(districtQuery) {
  const resolved = resolveDistrict(districtQuery);
  return districtCache.some(
    (d) => d.name.toLowerCase() === resolved
  );
}

/**
 * Get district name resolved from query (handles aliases)
 */
function resolveDistrictName(districtQuery) {
  const resolved = resolveDistrict(districtQuery);
  const match = districtCache.find(
    (d) => d.name.toLowerCase() === resolved
  );
  return match ? match.name : null;
}

/**
 * Get all items for a specific district
 */
export async function getItemsByDistrict(districtQuery) {
  const resolved = resolveDistrict(districtQuery);
  const items = await getPricesForDistrict(resolved);

  // Deduplicate by item name — keeps first (API returns latest)
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
export async function findRate(itemQuery, districtQuery) {
  const resolvedItem = resolveItem(itemQuery);
  const resolved = resolveDistrict(districtQuery);
  const allItems = await getPricesForDistrict(resolved);

  const results = allItems.filter((d) => {
    const matchItem =
      d.itemName.toLowerCase() === resolvedItem ||
      d.itemName.toLowerCase().includes(resolvedItem) ||
      resolvedItem.includes(d.itemName.toLowerCase());
    return matchItem;
  });

  // Deduplicate by item name
  const seen = new Set();
  return results.filter((item) => {
    const key = item.itemName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get top N items where PSBA is cheaper than DC rate for a district
 */
export async function getTopSavings(districtQuery, limit = 5) {
  const resolved = resolveDistrict(districtQuery);
  const allItems = await getPricesForDistrict(resolved);

  return allItems
    .filter((d) => d.difference > 0)
    .sort((a, b) => b.difference - a.difference)
    .slice(0, limit);
}

// Helpers
function toNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function cleanString(val) {
  if (!val) return "";
  return String(val).trim().replace(/\s+/g, " ");
}
