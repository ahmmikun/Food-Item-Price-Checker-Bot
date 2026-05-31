# Implementation Plan: PSBA Bazaar Scraper

## Overview

The implementation follows a pipeline architecture: HTTP Client → Checkpoint → Transform → Output → Main Orchestrator → Integration. Each module is built incrementally, with earlier tasks providing foundations for later ones. The scraper uses ESM module format (`import`/`export`) consistent with the project's existing conventions.

## Tasks

- [ ] 1. Create HTTP Client with Stealth Headers and Retry Logic
  - Create `src/scraper/lib/httpClient.js`
  - Define a pool of 5+ User-Agent strings (Chrome, Firefox, Safari, Edge, Opera with realistic version numbers)
  - Implement `fetchJSON(url, options?)` function that sends GET requests via `axios`
  - Add User-Agent rotation: track last-used UA per endpoint, select a different one for each new endpoint
  - Set 30-second timeout on all requests
  - Implement retry logic: retry up to 3 times on timeout, 5xx, 429, or connection errors
  - Use exponential backoff delays: 2s, 4s, 8s between retries
  - On same-endpoint retry, reuse the same User-Agent
  - Always include `Accept: application/json` header
  - Return `{ data, status, error }` object — never throw on HTTP errors
  - Log retry attempts with endpoint URL and attempt number
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3_

- [ ] 2. Create Checkpoint Manager
  - Create `src/scraper/lib/checkpoint.js`
  - Implement `loadCheckpoint(outputDir)` — reads `.checkpoint.json` from output dir, returns parsed object or empty default
  - Handle missing/empty/invalid JSON gracefully: log warning, return fresh checkpoint
  - Implement `saveCheckpoint(outputDir, endpoint, result)` — writes/updates checkpoint entry with URL, status, recordCount, completedAt (ISO 8601)
  - Implement `shouldSkip(checkpoint, endpoint, maxAgeMinutes=60)` — returns true if endpoint was completed less than 60 minutes ago
  - Handle filesystem write errors: log error, don't crash
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 3. Create Data Transformer
  - Create `src/scraper/lib/transform.js`
  - Implement `transformBazaars(rawBazaars, divisions, tehsils)` function
  - Map raw fields to normalized schema: id, name, address, district, division, tehsil, latitude, longitude, status, fetchDate
  - Trim all string fields and collapse consecutive whitespace to single space
  - Truncate: name to 200 chars, address to 500 chars, district/division/tehsil to 100 chars
  - Parse latitude/longitude as floats with 6 decimal precision; set to `null` if unparseable
  - Exclude records missing `name` or `district` — log warning with record index/id
  - Resolve division ID → name using divisions lookup; keep raw ID if not found (log warning)
  - Resolve tehsil ID → name using tehsils lookup; keep raw ID if not found (log warning)
  - If division/tehsil dataset is empty, skip enrichment and log single warning
  - Set `fetchDate` to current ISO 8601 date string
  - Preserve original source order in output array
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4_

- [ ] 4. Create Output Writer
  - Create `src/scraper/lib/output.js`
  - Implement `writeJSON(data, filename, outputDir)` — writes 2-space indented UTF-8 JSON
  - Implement `writeCSV(data, filename, outputDir)` — writes UTF-8 CSV with proper escaping
  - CSV header order: `id,name,address,district,division,tehsil,latitude,longitude,status,fetchDate`
  - Enclose fields containing commas or quotes in double-quotes; escape embedded `"` as `""`
  - Create output directory (including parents) if it doesn't exist
  - Overwrite existing files with same name
  - If zero records, write CSV with header row only
  - Return the absolute file path of the written file
  - On filesystem error: log error and exit with non-zero code
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 5. Implement Bazaar Scraper Main Module
  - Create `src/scraper/bazaar.js`
  - Import httpClient, checkpoint, transform, and output modules
  - Implement `fetchBazaars()` — GET `/api/bazaars/all-public`, return parsed array or empty
  - Implement `fetchDivisions()` — GET `/api/divisions`, return parsed array or empty
  - Implement `fetchTehsils()` — GET `/api/tehsils`, return parsed array or empty
  - Implement `fetchUnderConstruction()` — GET `/api/under-construction-bazaars/public/all`, return parsed array or empty
  - Save raw API responses as backup JSON before transformation
  - On non-2xx: log status + body, continue with empty dataset
  - On invalid JSON: log parsing error, continue with empty dataset
  - Implement `main()` orchestrator: (1) Load checkpoint, (2) Fetch all endpoints (skip if checkpoint says recent), (3) Transform and enrich data, (4) Write output files: `bazaars_YYYY-MM-DD.json`, `bazaars_YYYY-MM-DD.csv`, `bazaars_latest.json`, `bazaars_latest.csv`, `bazaars_under_construction_latest.json`, (5) Update checkpoint, (6) Print execution summary (counts, file paths, failures)
  - Export core functions via named exports for programmatic reuse
  - Handle `--scrape-pages` flag check (delegate to pageScraper if present)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 12.1, 12.2, 12.3, 14.5_

- [ ] 6. Implement Page Scraper (Optional)
  - Create `src/scraper/lib/pageScraper.js`
  - Implement `scrapePages(maxPages=50)` — fetch HTML from `https://psba.gop.pk/our-bazaars`
  - Follow pagination links sequentially up to maxPages
  - Extract bazaar name, address, district from HTML structure
  - Discard entries missing name or district
  - Implement `mergeWithAPI(apiData, pageData)` — deduplicate by name+district (case-insensitive), API takes priority
  - On page fetch failure after 3 retries: log and return empty array
  - Add `cheerio` as optional dependency in package.json (only needed for this feature)
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 7. Add npm Script and Module Integration
  - Add `"bazaar": "node src/scraper/bazaar.js"` script to root `package.json`
  - Verify output goes to same `/output` directory as price scraper
  - Verify the module uses ESM format (`import`/`export`) consistent with the project's `"type": "module"` setting in `package.json`
  - Ensure all source files use `import`/`export` syntax (no `require()`/`module.exports`)
  - Test that `npm run bazaar` executes successfully
  - Ensure unrecoverable errors exit with non-zero code
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 8. End-to-End Testing
  - Run `npm run bazaar` — confirm it fetches data and writes output files
  - Verify `output/bazaars_latest.json` contains valid normalized records
  - Verify `output/bazaars_latest.csv` has correct headers and escaped fields
  - Verify `output/bazaars_under_construction_latest.json` contains only under-construction records
  - Verify `.checkpoint.json` is created in output directory
  - Run again within 60 minutes — verify checkpoint skips already-fetched endpoints
  - Test with network disconnected — verify graceful error handling and summary output
  - Verify execution summary prints correct counts and file paths
  - _Requirements: All_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2", "3", "4"] },
    { "id": 1, "tasks": ["5", "6"] },
    { "id": 2, "tasks": ["7"] },
    { "id": 3, "tasks": ["8"] }
  ]
}
```

## Notes

- All modules use ESM format (`import`/`export`) consistent with the project's `"type": "module"` setting in `package.json`
- Tasks 1–4 are independent foundation modules that can be built in parallel
- Task 5 (main orchestrator) depends on Tasks 1–4
- Task 6 (page scraper) is optional and only activated via `--scrape-pages` CLI flag
- Task 7 (integration) wires everything together and verifies the npm script works
- Task 8 (end-to-end testing) validates the complete pipeline after all modules are integrated
- The scraper uses `axios` as the HTTP client, consistent with the existing price scraper
- Checkpoint resilience allows interrupted runs to resume without re-fetching completed endpoints
