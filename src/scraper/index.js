import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = "https://psba.gop.pk:3000/api/public/prices";
const OUTPUT_DIR = path.resolve(__dirname, "../../output");

async function fetchPrices() {
  console.log("Fetching prices from PSBA API...");

  const response = await axios.get(API_URL, {
    headers: {
      "User-Agent": "PSBA-Price-Monitor/1.0",
      Accept: "application/json",
    },
    timeout: 30000,
  });

  return response.data;
}

function transformData(raw) {
  return raw.map((item) => ({
    id: item._id,
    product: item.product?.name || "Unknown",
    category: item.product?.category || "Unknown",
    unit: item.product?.unit || "",
    image: item.product?.image || "",
    district: item.district?.name || "Unknown",
    marketPrice: item.marketPrice,
    psbaPrice: item.psbaPrice,
    difference: item.marketPrice - item.psbaPrice,
    status: item.status,
    date: item.date,
  }));
}

function saveJSON(data, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`JSON saved: ${filePath} (${data.length} records)`);
}

function saveCSV(data, filename) {
  if (data.length === 0) {
    console.log("No data to save as CSV.");
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h] == null ? "" : String(row[h]);
        return val.includes(",") ? `"${val}"` : val;
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, csv, "utf-8");
  console.log(`CSV saved: ${filePath} (${data.length} records)`);
}

function printSummary(data) {
  const districts = [...new Set(data.map((d) => d.district))];
  const categories = [...new Set(data.map((d) => d.category))];

  console.log("\n--- PSBA Price Summary ---");
  console.log(`Total records: ${data.length}`);
  console.log(
    `Districts: ${districts.length} (${districts.slice(0, 5).join(", ")}${districts.length > 5 ? "..." : ""})`
  );
  console.log(`Categories: ${categories.join(", ")}`);
  console.log(
    `Date range: ${data[data.length - 1]?.date?.slice(0, 10)} to ${data[0]?.date?.slice(0, 10)}`
  );
  console.log("--------------------------\n");
}

async function main() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const raw = await fetchPrices();
    console.log(`Received ${raw.length} raw records from API.`);

    const data = transformData(raw);

    printSummary(data);

    const today = new Date().toISOString().slice(0, 10);
    saveJSON(data, `prices_${today}.json`);
    saveCSV(data, `prices_${today}.csv`);

    // Also save a latest snapshot
    saveJSON(data, "prices_latest.json");
    saveCSV(data, "prices_latest.csv");

    console.log("Done.");
  } catch (err) {
    console.error("Error fetching prices:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    }
    process.exit(1);
  }
}

main();
