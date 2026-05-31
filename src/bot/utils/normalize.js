/**
 * Normalize raw price data from prices_latest.json into a consistent internal format.
 * Handles field mapping, type coercion, and invalid row filtering.
 */
export function normalizeData(rawData) {
  if (!Array.isArray(rawData)) return [];

  return rawData
    .filter((row) => {
      // Skip rows without essential fields
      if (!row) return false;
      if (!row.product && !row.itemName) return false;
      if (!row.district) return false;
      return true;
    })
    .map((row) => {
      const dcRate = toNumber(row.marketPrice ?? row.dcRate ?? 0);
      const psbaRate = toNumber(row.psbaPrice ?? row.psbaRate ?? 0);

      return {
        id: row.id || row._id || "",
        date: row.date || "",
        district: cleanString(row.district),
        itemName: cleanString(row.product || row.itemName || "Unknown"),
        category: cleanString(row.category || ""),
        unit: cleanString(row.unit || ""),
        image: row.image || "",
        dcRate,
        psbaRate,
        difference: dcRate - psbaRate,
        status: row.status || "unknown",
      };
    })
    .filter((row) => row.dcRate > 0 || row.psbaRate > 0); // Remove zero-price rows
}

function toNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function cleanString(val) {
  if (!val) return "";
  return String(val).trim().replace(/\s+/g, " ");
}
