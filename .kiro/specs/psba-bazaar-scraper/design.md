# Technical Design Document

## Overview

The PSBA Bazaar Scraper extends the existing unified project (`price-scraper`) by adding a new scraper module at `src/scraper/bazaar.js`. It follows the same architectural patterns as the existing price scraper: direct API calls via `axios`, data transformation into normalized objects, and persistence to the `/output` directory as JSON and CSV.

The module is structured as a pipeline: Fetch → Transform → Enrich → Persist → Summarize.

## Architecture

### Pipeline Design

The scraper operates as a sequential pipeline with parallel fetch capability:

```
┌─────────────────────────────────────────────────────────────┐
│                     Execution Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Load Checkpoint                                          │
│     ↓                                                        │
│  2. Fetch (parallel where possible)                          │
│     ├── /api/bazaars/all-public                              │
│     ├── /api/divisions                                       │
│     ├── /api/tehsils                                         │
│     └── /api/under-construction-bazaars/public/all           │
│     ↓                                                        │
│  3. Save raw responses (backup)                              │
│     ↓                                                        │
│  4. Transform & Normalize                                    │
│     ├── Field mapping & type coercion                        │
│     ├── Division/Tehsil enrichment (ID → name lookup)        │
│     └── Validation (exclude invalid records)                 │
│     ↓                                                        │
│  5. Persist Output                                           │
│     ├── bazaars_YYYY-MM-DD.json / .csv                       │
│     ├── bazaars_latest.json / .csv                           │
│     └── bazaars_under_construction_latest.json               │
│     ↓                                                        │
│  6. Update Checkpoint                                        │
│     ↓                                                        │
│  7. Print Summary                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/scraper/
├── index.js              # Existing price scraper (unchanged)
├── bazaar.js             # Bazaar scraper entry point
└── lib/
    ├── httpClient.js     # HTTP client with stealth + retry
    ├── checkpoint.js     # Checkpoint load/save
    ├── transform.js      # Data normalization
    ├── output.js         # JSON/CSV writer
    └── pageScraper.js    # Optional HTML page scraper
```

### Integration with Existing Project

- **package.json** adds script: `"bazaar": "node src/scraper/bazaar.js"`
- **Output directory**: Same `/output` folder used by price scraper
- **Dependencies**: Uses existing `axios` — no new dependencies required (unless `--scrape-pages` needs `cheerio`)
- **Module format**: ESM (`import`/`export`) consistent with the project's `"type": "module"` setting in `package.json`

## Components and Interfaces

### 1. HTTP Client Layer (`src/scraper/lib/httpClient.js`)

Responsible for all outbound HTTP requests with stealth headers, timeout, and retry logic.

**Key behaviors:**
- Maintains a pool of 5+ User-Agent strings (Chrome, Firefox, Safari, Edge, Opera)
- Rotates User-Agent per unique endpoint URL
- 30-second timeout on all requests
- Exponential backoff retry: 3 attempts with 2s, 4s, 8s delays
- Retries on: timeout, 5xx, 429, connection errors

**Interface:**
```javascript
export async function fetchJSON(url, options?) → { data, status, error? }
```

### 2. Bazaar Scraper Module (`src/scraper/bazaar.js`)

Main orchestrator that coordinates fetching from multiple endpoints, transforms data, and writes output.

**Endpoints:**
| Endpoint | Purpose |
|----------|---------|
| `/api/bazaars/all-public` | All operational bazaars |
| `/api/divisions` | Division reference data |
| `/api/tehsils` | Tehsil reference data |
| `/api/under-construction-bazaars/public/all` | Under-construction bazaars |

**Interface:**
```javascript
export async function fetchBazaars() → Array<RawBazaar>
export async function fetchDivisions() → Array<Division>
export async function fetchTehsils() → Array<Tehsil>
export async function fetchUnderConstruction() → Array<RawBazaar>
export function transformBazaars(raw, divisions, tehsils) → Array<NormalizedBazaar>
export function saveBazaarData(data, underConstruction) → { files: string[] }
export async function main() → void
```

### 3. Checkpoint Manager (`src/scraper/lib/checkpoint.js`)

Handles progress persistence for resumable runs.

**Interface:**
```javascript
export function loadCheckpoint(outputDir) → CheckpointData
export function saveCheckpoint(outputDir, endpoint, result) → void
export function shouldSkip(checkpoint, endpoint, maxAgeMinutes=60) → boolean
```

**Storage format (`.checkpoint.json`):**
```json
{
  "endpoints": {
    "https://psba.gop.pk:3000/api/bazaars/all-public": {
      "status": 200,
      "recordCount": 150,
      "completedAt": "2026-05-31T10:00:00.000Z"
    }
  }
}
```

### 4. Data Transformer (`src/scraper/lib/transform.js`)

Normalizes raw API responses into a consistent schema.

**Interface:**
```javascript
export function transformBazaar(raw, divisionLookup, tehsilLookup) → NormalizedBazaar | null
export function transformAll(rawArray, divisions, tehsils) → Array<NormalizedBazaar>
```

**Validation rules:**
- Records missing `name` or `district` are excluded with a warning log
- Coordinates that fail `parseFloat()` are set to `null`
- All string fields: trim + collapse whitespace
- String field length limits enforced (name: 200, address: 500, district/division/tehsil: 100)

### 5. Output Writer (`src/scraper/lib/output.js`)

Handles JSON and CSV file writing with proper encoding and escaping.

**Interface:**
```javascript
export function writeJSON(data, filename, outputDir) → string
export function writeCSV(data, filename, outputDir) → string
```

**CSV rules:**
- Header order: `id,name,address,district,division,tehsil,latitude,longitude,status,fetchDate`
- Fields with commas or quotes are double-quoted
- Embedded quotes escaped as `""`

### 6. Page Scraper (Optional, `src/scraper/lib/pageScraper.js`)

Activated via `--scrape-pages` CLI flag. Fetches HTML from `https://psba.gop.pk/our-bazaars` and extracts bazaar data from DOM structure.

**Interface:**
```javascript
export async function scrapePages(maxPages=50) → Array<PageBazaar>
export function mergeWithAPI(apiData, pageData) → Array<NormalizedBazaar>
```

**Deduplication:** Match on `name + district` (case-insensitive). API records take priority.

## Data Models

### NormalizedBazaar

The primary output schema for all bazaar records:

```javascript
{
  id: String,          // Source _id or generated UUID
  name: String,        // Max 200 chars, trimmed, whitespace-collapsed
  address: String,     // Max 500 chars, trimmed, whitespace-collapsed
  district: String,    // Max 100 chars, trimmed, whitespace-collapsed
  division: String,    // Max 100 chars, resolved from division lookup or raw ID
  tehsil: String,      // Max 100 chars, resolved from tehsil lookup or raw ID
  latitude: Number,    // Up to 6 decimal places, or null if unparseable
  longitude: Number,   // Up to 6 decimal places, or null if unparseable
  status: String,      // "operational" | "under-construction" | other
  fetchDate: String    // ISO 8601 date string (e.g., "2026-05-31T00:00:00.000Z")
}
```

### Division

Reference data for administrative divisions:

```javascript
{
  _id: String,         // Division identifier from API
  name: String         // Division display name
}
```

### Tehsil

Reference data for sub-district administrative units:

```javascript
{
  _id: String,         // Tehsil identifier from API
  name: String,        // Tehsil display name
  district: String     // Parent district reference identifier
}
```

### CheckpointData

Progress state for resumable execution:

```javascript
{
  endpoints: {
    [url: String]: {
      status: Number,          // HTTP status code (200)
      recordCount: Number,     // Number of records returned
      completedAt: String      // ISO 8601 timestamp
    }
  }
}
```

### RawBazaar

Raw API response structure (before transformation):

```javascript
{
  _id: String,
  name: String,
  address: String,
  district: String | { _id: String, name: String },
  division: String | { _id: String, name: String },
  tehsil: String | { _id: String, name: String },
  latitude: String | Number,
  longitude: String | Number,
  status: String,
  constructionProgress: Number  // Only for under-construction
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Completeness

*For any* valid JSON array returned by the API containing N records where each record has both a `name` and `district` field, the transformation output SHALL contain exactly N normalized records — no valid records are silently dropped.

**Validates: Requirements 1.2, 7.5, 7.6**

### Property 2: Schema Conformance

*For any* raw bazaar record with valid `name` and `district` fields, the transformation SHALL produce a normalized object containing exactly the fields `id`, `name`, `address`, `district`, `division`, `tehsil`, `latitude`, `longitude`, `status`, and `fetchDate`, where all string fields are trimmed with collapsed whitespace and coordinate fields are either a number with up to 6 decimal places or null.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 3: Enrichment Integrity

*For any* bazaar record with a division or tehsil identifier, if that identifier exists in the corresponding lookup table then the normalized record's field SHALL contain the resolved name; if the identifier does not exist in the lookup table then the field SHALL contain the raw identifier value (never an empty string).

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 4: Output Idempotency

*For any* set of normalized bazaar data, writing the dated file and the latest file SHALL produce byte-identical content for both JSON and CSV outputs.

**Validates: Requirements 9.2, 10.2**

### Property 5: CSV Encoding Correctness

*For any* normalized bazaar record where string fields contain commas, double-quote characters, or newlines, the CSV output SHALL properly enclose those fields in double quotes and escape embedded double quotes by doubling them, such that parsing the CSV output reproduces the original field values.

**Validates: Requirements 10.3**

### Property 6: User-Agent Rotation

*For any* sequence of HTTP requests to distinct endpoint URLs within a single execution run, each request SHALL use a User-Agent string from the predefined pool of 5+ browser strings, and consecutive requests to different URLs SHALL use different User-Agent strings.

**Validates: Requirements 5.1, 5.3**

### Property 7: Retry User-Agent Consistency

*For any* request that is retried due to timeout, 5xx, 429, or connection error, all retry attempts to the same endpoint SHALL use the same User-Agent string as the original request.

**Validates: Requirements 5.4**

### Property 8: Checkpoint Skip Logic

*For any* checkpoint entry with a `completedAt` timestamp less than 60 minutes old, the scraper SHALL skip fetching that endpoint; for any entry older than 60 minutes or missing entirely, the scraper SHALL fetch the endpoint.

**Validates: Requirements 11.2**

### Property 9: Merge Deduplication with API Priority

*For any* pair of API-sourced and page-scraped datasets containing records with matching `name + district` (case-insensitive), the merged output SHALL contain exactly one record per unique name+district combination, and that record SHALL be the API-sourced version.

**Validates: Requirements 13.4**

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Network timeout | Retry 3x with exponential backoff (2s, 4s, 8s), then log and continue |
| 5xx / 429 response | Retry 3x with exponential backoff, then log and continue |
| Non-2xx response (4xx) | Log HTTP status and response body, continue with empty dataset |
| Invalid JSON response | Log warning, continue with empty dataset |
| Missing required fields (name/district) | Exclude record, log warning with record identifier |
| Unresolved division/tehsil ID | Retain raw ID in field, log warning |
| Filesystem write error (output) | Log error, exit with non-zero code |
| Filesystem write error (checkpoint) | Log error, continue execution |
| Checkpoint file corrupted | Log warning, discard file, start fresh run |
| Page scraper failure (after 3 retries) | Log failure, proceed with API-only data |

## Testing Strategy

### Property-Based Testing

The scraper's pure transformation and logic functions are well-suited for property-based testing. We will use [fast-check](https://github.com/dubzzz/fast-check) as the PBT library for JavaScript/ESM.

**Configuration:**
- Minimum 100 iterations per property test
- Each property test references its design document property
- Tag format: `Feature: psba-bazaar-scraper, Property N: <property text>`

**Properties to test with PBT:**
1. **Completeness** — generate random arrays of raw bazaar records, verify all valid records appear in output
2. **Schema Conformance** — generate random raw records, verify normalized output matches schema exactly
3. **Enrichment Integrity** — generate random records + lookup tables, verify resolution or raw ID preservation
4. **Output Idempotency** — generate random normalized data, verify dated and latest files are byte-identical
5. **CSV Encoding Correctness** — generate random strings with special characters, verify round-trip through CSV encode/parse
6. **User-Agent Rotation** — generate random endpoint URL sequences, verify rotation from pool
7. **Retry User-Agent Consistency** — generate random retry scenarios, verify same UA across retries
8. **Checkpoint Skip Logic** — generate random timestamps, verify skip/fetch decision based on 60-minute threshold
9. **Merge Deduplication** — generate random overlapping datasets, verify API priority deduplication

### Unit Tests (Example-Based)

Unit tests cover specific scenarios, edge cases, and error conditions:

- Error responses (4xx, 5xx) log correctly and return empty datasets
- Network failures (timeout, DNS, connection refused) trigger retry logic
- Invalid JSON responses are handled gracefully
- Empty response arrays produce header-only CSV
- Checkpoint file missing/corrupted triggers fresh run
- Summary output includes all required metrics
- `--scrape-pages` flag activates page scraper
- Filesystem write errors cause non-zero exit

### Integration Tests

Integration tests verify end-to-end behavior with mocked HTTP responses:

- Full pipeline execution with mocked API responses
- Checkpoint resume behavior (skip recent, fetch stale)
- Output file naming conventions (`bazaars_YYYY-MM-DD.json`, `bazaars_latest.json`)
- npm script `bazaar` executes successfully
