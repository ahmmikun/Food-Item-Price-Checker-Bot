# Requirements Document

## Introduction

The PSBA Bazaar Scraper is a harvester unit that synchronizes with the Punjab Sahulat Bazaar Authority (PSBA) public APIs to extract comprehensive bazaar location, division, tehsil, and construction-status metadata. Following the project's API Synthesis philosophy, the scraper targets known REST endpoints directly via `axios`, bypassing DOM interaction entirely. The extracted data is persisted as structured JSON/CSV in the `/output` folder, consistent with the existing price scraper's output conventions.

## Glossary

- **Scraper**: The Node.js module responsible for fetching, transforming, and persisting bazaar data from PSBA APIs
- **PSBA_API**: The set of public REST endpoints hosted at `https://psba.gop.pk:3000/api/`
- **Bazaar_Record**: A single bazaar entry containing location, status, and metadata fields
- **Division**: An administrative region grouping multiple districts in Punjab
- **Tehsil**: A sub-district administrative unit within a district
- **Checkpoint**: A JSON file storing progress state to enable resumption after interruption
- **Stealth_Signature**: A randomized User-Agent header used to emulate legitimate browser traffic
- **Output_Directory**: The `/output` folder where all scraped data files are persisted

## Requirements

### Requirement 1: Fetch All Public Bazaars

**User Story:** As a data analyst, I want to fetch all public bazaar records from the PSBA API, so that I have a complete dataset of operational bazaars across Punjab.

#### Acceptance Criteria

1. WHEN the Scraper is executed, THE Scraper SHALL send a GET request to `https://psba.gop.pk:3000/api/bazaars/all-public` with a request timeout of 30 seconds
2. WHEN the PSBA_API returns an HTTP 2xx status code with a valid JSON body, THE Scraper SHALL parse the response body and extract all Bazaar_Record entries into an in-memory collection
3. WHEN the PSBA_API returns an HTTP 2xx status code, THE Scraper SHALL store the raw response payload as a JSON file in the output directory before any transformation is applied
4. IF the PSBA_API returns a non-2xx HTTP status code, THEN THE Scraper SHALL log the HTTP status code and response body to the console, and continue execution without terminating the process
5. IF the Scraper encounters a network-level failure (connection refused, DNS resolution failure, or timeout exceeding 30 seconds), THEN THE Scraper SHALL log an error message indicating the failure type and continue execution without terminating the process
6. IF the PSBA_API returns an HTTP 2xx status code but the response body is not valid JSON, THEN THE Scraper SHALL log an error message indicating a malformed response and continue execution without terminating the process

### Requirement 2: Fetch Division Data

**User Story:** As a data analyst, I want to fetch all division records from the PSBA API, so that I can map bazaars to their administrative divisions.

#### Acceptance Criteria

1. WHEN the Scraper is executed, THE Scraper SHALL send a GET request to `https://psba.gop.pk:3000/api/divisions` with a request timeout of 30 seconds
2. WHEN the PSBA_API returns a successful response, THE Scraper SHALL parse the response body as JSON and extract each division record's identifier and name into an in-memory lookup structure usable for bazaar enrichment
3. IF the PSBA_API returns a non-2xx status code, THEN THE Scraper SHALL log the error including the status code and response body, and continue execution with an empty division dataset
4. IF the PSBA_API returns a response that is not valid JSON or does not contain an array of division records, THEN THE Scraper SHALL log a warning indicating the unexpected response format and continue execution with an empty division dataset

### Requirement 3: Fetch Tehsil Data

**User Story:** As a data analyst, I want to fetch all tehsil records from the PSBA API, so that I can map bazaars to their sub-district administrative units.

#### Acceptance Criteria

1. WHEN the Scraper is executed, THE Scraper SHALL send a GET request to `https://psba.gop.pk:3000/api/tehsils`
2. WHEN the PSBA_API returns a successful response with a valid JSON body, THE Scraper SHALL parse and store all tehsil records in memory, retaining each record's identifier, name, and parent district reference identifier for use by the enrichment step
3. IF the PSBA_API returns a non-2xx status code, THEN THE Scraper SHALL log the error including the HTTP status code and response body, and continue execution with an empty tehsil dataset
4. IF the PSBA_API returns a 2xx status code but the response body is not valid JSON or cannot be parsed as an array of tehsil records, THEN THE Scraper SHALL log a warning indicating the parsing failure and continue execution with an empty tehsil dataset
5. IF the PSBA_API returns a successful response containing zero tehsil records, THEN THE Scraper SHALL log a warning indicating the empty result and continue execution with an empty tehsil dataset

### Requirement 4: Fetch Under-Construction Bazaars

**User Story:** As a data analyst, I want to fetch all under-construction bazaar records, so that I can track upcoming bazaar locations and their construction status.

#### Acceptance Criteria

1. WHEN the Scraper is executed, THE Scraper SHALL send a GET request to `https://psba.gop.pk:3000/api/under-construction-bazaars/public/all`
2. WHEN the PSBA_API returns a successful response, THE Scraper SHALL parse the response body as JSON and store all under-construction bazaar records, extracting for each record: name, address, district, latitude, longitude, construction status, and construction progress percentage where available
3. IF the PSBA_API returns a non-2xx status code, THEN THE Scraper SHALL log the error including the status code and continue execution with an empty under-construction dataset
4. IF the PSBA_API response body cannot be parsed as valid JSON, THEN THE Scraper SHALL log a parsing error and continue execution with an empty under-construction dataset
5. IF an under-construction Bazaar_Record is missing required fields (name or district), THEN THE Scraper SHALL exclude that record from the stored dataset and log a warning indicating the skipped record

### Requirement 5: Stealth Request Headers

**User Story:** As a scraper operator, I want requests to use rotated User-Agent headers, so that the scraper avoids detection and rate-limiting by the target server.

#### Acceptance Criteria

1. WHEN the Scraper sends any HTTP request, THE Scraper SHALL include a User-Agent header selected from a predefined pool of at least 5 distinct, full-length browser User-Agent strings representing different browser families (e.g., Chrome, Firefox, Safari, Edge)
2. WHEN the Scraper sends any HTTP request, THE Scraper SHALL include an `Accept: application/json` header
3. WHEN the Scraper sends a request to a different API endpoint URL than the previous request within a single execution run, THE Scraper SHALL select a Stealth_Signature that differs from the one used in the immediately preceding request
4. IF the Scraper retries a failed request to the same endpoint (per timeout/retry logic), THEN THE Scraper SHALL use the same Stealth_Signature that was used in the original attempt for that endpoint

### Requirement 6: Request Timeout and Retry

**User Story:** As a scraper operator, I want requests to have timeouts and retry logic, so that transient network failures do not cause permanent data loss.

#### Acceptance Criteria

1. THE Scraper SHALL set a request timeout of 30 seconds for each HTTP request
2. IF a request times out, returns a 5xx status code, returns a 429 status code, or encounters a connection error (connection refused, DNS resolution failure, or socket timeout), THEN THE Scraper SHALL retry the request up to 3 times with exponential backoff delays of 2 seconds, 4 seconds, and 8 seconds between consecutive attempts
3. IF all 3 retry attempts fail, THEN THE Scraper SHALL log the failure including the request URL, the error type, and the number of attempts made, and continue to the next API endpoint without crashing

### Requirement 7: Data Transformation and Normalization

**User Story:** As a data consumer, I want bazaar data normalized into a consistent schema, so that downstream systems can process it without field-mapping logic.

#### Acceptance Criteria

1. WHEN bazaar data is fetched successfully, THE Scraper SHALL transform each Bazaar_Record into a normalized object containing exactly these fields: id (string), name (string, max 200 characters), address (string, max 500 characters), district (string, max 100 characters), division (string, max 100 characters), tehsil (string, max 100 characters), latitude (number), longitude (number), status (string), and fetchDate (ISO 8601 date string)
2. THE Scraper SHALL trim leading and trailing whitespace and collapse consecutive whitespace characters into a single space in all string fields of the normalized object
3. WHEN a Bazaar_Record contains latitude or longitude values, THE Scraper SHALL convert them to floating-point numbers with a precision of up to 6 decimal places
4. IF a Bazaar_Record latitude or longitude value cannot be parsed as a valid number, THEN THE Scraper SHALL set that coordinate field to null in the normalized object
5. IF a Bazaar_Record is missing a required field (name or district), THEN THE Scraper SHALL exclude that record from the normalized output and write a warning entry to the application log identifying the excluded record by its source index or id
6. WHEN transformation completes, THE Scraper SHALL return only the array of successfully normalized objects, preserving the original source order of records

### Requirement 8: Division and Tehsil Enrichment

**User Story:** As a data consumer, I want bazaar records enriched with division and tehsil names, so that I can perform geographic analysis without additional lookups.

#### Acceptance Criteria

1. WHEN bazaar data and division data are both available, THE Scraper SHALL resolve each bazaar's division identifier against the fetched division dataset and populate the normalized record's `division` field with the matched division name
2. WHEN bazaar data and tehsil data are both available, THE Scraper SHALL resolve each bazaar's tehsil identifier against the fetched tehsil dataset and populate the normalized record's `tehsil` field with the matched tehsil name
3. IF a bazaar references a division or tehsil identifier not found in the fetched reference data, THEN THE Scraper SHALL retain the raw identifier value in the respective field and log a warning that includes the bazaar name and the unresolved identifier value
4. IF the division or tehsil reference dataset is empty due to a prior fetch failure, THEN THE Scraper SHALL skip enrichment for that dataset, retain raw identifier values in all affected records, and log a single warning indicating enrichment was skipped due to unavailable reference data

### Requirement 9: JSON Output

**User Story:** As a data consumer, I want scraped bazaar data saved as JSON files, so that I can programmatically consume the data in downstream applications.

#### Acceptance Criteria

1. WHEN data transformation is complete, THE Scraper SHALL write a JSON file to the Output_Directory with the naming pattern `bazaars_YYYY-MM-DD.json` where YYYY-MM-DD is the current date in ISO 8601 format
2. WHEN data transformation is complete, THE Scraper SHALL write a `bazaars_latest.json` file to the Output_Directory containing byte-identical content to the dated file
3. WHEN under-construction data is available (records where the status field equals "under-construction"), THE Scraper SHALL write a separate `bazaars_under_construction_latest.json` file to the Output_Directory containing only those records
4. THE Scraper SHALL format JSON output with 2-space indentation and UTF-8 encoding
5. IF the Output_Directory does not exist at write time, THEN THE Scraper SHALL create the directory (including any missing parent directories) before writing files
6. IF a file with the same name already exists in the Output_Directory, THEN THE Scraper SHALL overwrite the existing file with the new data

### Requirement 10: CSV Output

**User Story:** As a data analyst, I want scraped bazaar data saved as CSV files, so that I can open and analyze the data in spreadsheet applications.

#### Acceptance Criteria

1. WHEN data transformation is complete, THE Scraper SHALL write a UTF-8 encoded CSV file to the Output_Directory with the naming pattern `bazaars_YYYY-MM-DD.csv`, where `YYYY-MM-DD` is the current system date at the time of execution
2. WHEN data transformation is complete, THE Scraper SHALL write a `bazaars_latest.csv` file to the Output_Directory containing byte-identical content to the dated file, overwriting any previously existing `bazaars_latest.csv`
3. THE Scraper SHALL enclose field values containing commas or double-quote characters in double quotes in the CSV output, and SHALL escape any embedded double-quote characters by replacing each `"` with `""`
4. THE Scraper SHALL use the normalized field names (`id`, `name`, `address`, `district`, `division`, `tehsil`, `latitude`, `longitude`, `status`, `fetchDate`) as the CSV header row in that exact order
5. IF data transformation produces zero records, THEN THE Scraper SHALL write a CSV file containing only the header row and no data rows
6. IF the Scraper cannot write to the Output_Directory due to a filesystem error, THEN THE Scraper SHALL log an error message indicating the failure reason and exit with a non-zero exit code without producing a partial file

### Requirement 11: Checkpoint Resilience

**User Story:** As a scraper operator, I want the scraper to save progress checkpoints, so that interrupted runs can resume without re-fetching already-completed endpoints.

#### Acceptance Criteria

1. WHEN the Scraper receives an HTTP 200 response with a valid JSON body from an API endpoint, THE Scraper SHALL write a checkpoint entry to `.checkpoint.json` in the Output_Directory containing the endpoint URL, the HTTP status code, the record count returned, and the completion timestamp in ISO 8601 format
2. WHEN the Scraper starts execution and a valid `.checkpoint.json` file exists, THE Scraper SHALL read the checkpoint file and skip any endpoint whose completion timestamp is less than 60 minutes old, proceeding to fetch only endpoints with no entry or entries older than 60 minutes
3. IF the `.checkpoint.json` file is missing, empty, or contains content that cannot be parsed as valid JSON, THEN THE Scraper SHALL log a warning message indicating the checkpoint could not be loaded, discard the existing file, start a fresh run fetching all endpoints, and create a new `.checkpoint.json` file upon the first successful fetch
4. IF the Scraper fails to write or update the `.checkpoint.json` file due to a filesystem error, THEN THE Scraper SHALL log an error message indicating the write failure and continue execution without interrupting the current scraping run

### Requirement 12: Execution Summary

**User Story:** As a scraper operator, I want a summary printed after execution, so that I can quickly verify the scrape completed successfully.

#### Acceptance Criteria

1. WHEN all API endpoints have been processed, THE Scraper SHALL print a summary to stdout containing the following labeled metrics each on a separate line: total bazaars fetched, total under-construction bazaars fetched, total divisions, total tehsils, and the absolute paths of all output files written during this execution
2. IF any endpoint fails after retries, THEN THE Scraper SHALL include in the summary a numeric failure count and the URL of each affected endpoint
3. IF all API endpoints fail after retries, THEN THE Scraper SHALL still print the summary to stdout with zero counts for data metrics and the failure details for every endpoint

### Requirement 13: Scrape All Pages from Web Target

**User Story:** As a data analyst, I want the scraper to also extract bazaar data from the PSBA website pages at `https://psba.gop.pk/our-bazaars`, so that I capture any data not available through the API endpoints.

#### Acceptance Criteria

1. WHEN the Scraper is executed with a `--scrape-pages` flag, THE Scraper SHALL fetch the HTML content from `https://psba.gop.pk/our-bazaars` and all paginated sub-pages, with a per-page request timeout of 30 seconds
2. WHEN paginated content is detected, THE Scraper SHALL follow pagination links sequentially until all pages are exhausted or a maximum of 50 pages have been fetched, whichever comes first
3. WHEN HTML content is fetched, THE Scraper SHALL extract bazaar names, addresses, and district information from the page structure, discarding any entry where bazaar name or district is missing
4. WHEN both page-scraped data and API-sourced data have been collected, THE Scraper SHALL merge the two datasets, deduplicating by bazaar name and district combination, with API-sourced records taking priority over page-scraped records when a duplicate is found
5. IF the web page is unreachable or returns an HTTP error status after 3 retry attempts with 2-second intervals, THEN THE Scraper SHALL log the failure including the URL and HTTP status code, and proceed with API-only data

### Requirement 14: Module Integration

**User Story:** As a developer, I want the bazaar scraper to follow the same patterns as the existing price scraper, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Scraper SHALL use `axios` as the HTTP client library, consistent with the existing price scraper
2. THE Scraper SHALL output files to the project-root `/output` directory using the same naming convention as the existing price scraper: a date-stamped file (`bazaars_YYYY-MM-DD.<ext>`) and a latest-snapshot file (`bazaars_latest.<ext>`)
3. THE Scraper SHALL be executable via an npm script defined in the project-root `package.json` as `"bazaar": "node src/scraper/bazaar.js"` (e.g., `npm run bazaar`)
4. THE Scraper SHALL use ESM module format (`import`/`export`) consistent with the project's `"type": "module"` setting in `package.json` and the existing price scraper at `src/scraper/index.js`
5. THE Scraper SHALL export its core functions (fetch, transform, save) via named exports for programmatic reuse by other modules
6. IF the scraper encounters an unrecoverable error during execution, THEN THE Scraper SHALL log the error to the console and exit with a non-zero process exit code, consistent with the existing price scraper's error handling pattern
