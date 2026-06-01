import { randomUUID } from "crypto";

/**
 * Trim leading/trailing whitespace and collapse consecutive whitespace to single space.
 * @param {*} value
 * @returns {string}
 */
function normalizeString(value) {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

/**
 * Truncate a string to a maximum length.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

/**
 * Parse a coordinate value to a float with 6 decimal precision.
 * Returns null if the value is not a valid number.
 * @param {*} value
 * @returns {number|null}
 */
function parseCoordinate(value) {
  if (value == null || value === "") return null;
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return null;
  return parseFloat(num.toFixed(6));
}

/**
 * Resolve a field that may be an object with { _id, name } or a plain string ID.
 * If it's an object with .name, return the name.
 * If it's a string ID, look it up in the lookup map.
 * @param {*} rawField - The raw field value (object or string)
 * @param {Map} lookupMap - Map of _id → name
 * @param {string} fieldType - "division" or "tehsil" (for logging)
 * @param {string} bazaarName - Bazaar name for log context
 * @returns {string}
 */
function resolveField(rawField, lookupMap, fieldType, bazaarName) {
  if (rawField == null) return "";

  // If it's an object with a name property, use it directly
  if (typeof rawField === "object" && rawField.name) {
    return normalizeString(rawField.name);
  }

  // Extract the ID (from object._id or plain string)
  const id = typeof rawField === "object" ? rawField._id : String(rawField);

  if (!id) return "";

  // Look up in the map
  if (lookupMap && lookupMap.size > 0) {
    const resolved = lookupMap.get(id);
    if (resolved) {
      return normalizeString(resolved);
    }
    console.warn(
      `[transform] Warning: ${fieldType} ID "${id}" not found in lookup for bazaar "${bazaarName}"`
    );
    return normalizeString(id);
  }

  // Lookup map is empty — return raw ID
  return normalizeString(id);
}

/**
 * Extract the district name from a raw district field.
 * The district field can be an object { _id, name } or a plain string.
 * @param {*} rawDistrict
 * @returns {string}
 */
function extractDistrict(rawDistrict) {
  if (rawDistrict == null) return "";
  if (typeof rawDistrict === "object" && rawDistrict.name) {
    return normalizeString(rawDistrict.name);
  }
  return normalizeString(typeof rawDistrict === "object" ? rawDistrict._id || "" : rawDistrict);
}

/**
 * Transform an array of raw bazaar records into normalized schema.
 *
 * @param {Array} rawBazaars - Raw bazaar records from API
 * @param {Array} divisions - Division reference data [{ _id, name }, ...]
 * @param {Array} tehsils - Tehsil reference data [{ _id, name, district }, ...]
 * @returns {Array} Normalized bazaar records
 */
export function transformBazaars(rawBazaars, divisions = [], tehsils = []) {
  if (!Array.isArray(rawBazaars)) {
    console.warn("[transform] Warning: rawBazaars is not an array, returning empty result");
    return [];
  }

  // Build lookup maps
  const divisionMap = new Map();
  const tehsilMap = new Map();

  if (Array.isArray(divisions) && divisions.length > 0) {
    for (const div of divisions) {
      if (div && div._id && div.name) {
        divisionMap.set(div._id, div.name);
      }
    }
  } else {
    console.warn("[transform] Warning: Division dataset is empty — skipping division enrichment");
  }

  if (Array.isArray(tehsils) && tehsils.length > 0) {
    for (const teh of tehsils) {
      if (teh && teh._id && teh.name) {
        tehsilMap.set(teh._id, teh.name);
      }
    }
  } else {
    console.warn("[transform] Warning: Tehsil dataset is empty — skipping tehsil enrichment");
  }

  const fetchDate = new Date().toISOString();
  const results = [];

  for (let i = 0; i < rawBazaars.length; i++) {
    const raw = rawBazaars[i];

    if (!raw || typeof raw !== "object") {
      console.warn(`[transform] Warning: Record at index ${i} is not a valid object — skipping`);
      continue;
    }

    // Extract name
    const name = normalizeString(raw.name);
    if (!name) {
      console.warn(
        `[transform] Warning: Record at index ${i} (id: ${raw._id || "unknown"}) missing required field "name" — excluding`
      );
      continue;
    }

    // Extract district
    const district = extractDistrict(raw.district);
    if (!district) {
      console.warn(
        `[transform] Warning: Record at index ${i} (id: ${raw._id || "unknown"}) missing required field "district" — excluding`
      );
      continue;
    }

    // Resolve division
    const division = resolveField(raw.division, divisionMap, "division", name);

    // Resolve tehsil
    const tehsil = resolveField(raw.tehsil, tehsilMap, "tehsil", name);

    const normalized = {
      id: raw._id ? String(raw._id) : randomUUID(),
      name: truncate(name, 200),
      address: truncate(normalizeString(raw.address), 500),
      district: truncate(district, 100),
      division: truncate(division, 100),
      tehsil: truncate(tehsil, 100),
      latitude: parseCoordinate(raw.latitude),
      longitude: parseCoordinate(raw.longitude),
      status: normalizeString(raw.status),
      fetchDate,
    };

    results.push(normalized);
  }

  return results;
}
