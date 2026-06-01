import fs from 'fs';
import path from 'path';

const CHECKPOINT_FILE = '.checkpoint.json';

/**
 * Loads the checkpoint file from the output directory.
 * Returns parsed checkpoint data or a fresh default if missing/invalid.
 * @param {string} outputDir - Absolute path to the output directory
 * @returns {{ endpoints: Record<string, { status: number, recordCount: number, completedAt: string }> }}
 */
export function loadCheckpoint(outputDir) {
  const filePath = path.join(outputDir, CHECKPOINT_FILE);
  const fresh = { endpoints: {} };

  try {
    if (!fs.existsSync(filePath)) {
      return fresh;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    if (!content.trim()) {
      console.warn(`[checkpoint] Warning: ${CHECKPOINT_FILE} is empty, starting fresh run.`);
      return fresh;
    }

    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object' || !parsed.endpoints) {
      console.warn(`[checkpoint] Warning: ${CHECKPOINT_FILE} has unexpected structure, starting fresh run.`);
      return fresh;
    }

    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.warn(`[checkpoint] Warning: ${CHECKPOINT_FILE} contains invalid JSON, starting fresh run.`);
    } else {
      console.warn(`[checkpoint] Warning: Could not load ${CHECKPOINT_FILE}: ${err.message}`);
    }
    return fresh;
  }
}

/**
 * Saves/updates a checkpoint entry for a completed endpoint.
 * @param {string} outputDir - Absolute path to the output directory
 * @param {string} endpoint - The endpoint URL that was completed
 * @param {{ status: number, recordCount: number }} result - The result of fetching the endpoint
 */
export function saveCheckpoint(outputDir, endpoint, result) {
  const filePath = path.join(outputDir, CHECKPOINT_FILE);

  try {
    // Load existing checkpoint or start fresh
    const checkpoint = loadCheckpoint(outputDir);

    checkpoint.endpoints[endpoint] = {
      status: result.status,
      recordCount: result.recordCount,
      completedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[checkpoint] Error: Failed to write ${CHECKPOINT_FILE}: ${err.message}`);
  }
}

/**
 * Determines if an endpoint should be skipped based on checkpoint data.
 * Returns true if the endpoint was completed less than maxAgeMinutes ago.
 * @param {{ endpoints: Record<string, { completedAt: string }> }} checkpoint - The checkpoint data
 * @param {string} endpoint - The endpoint URL to check
 * @param {number} [maxAgeMinutes=60] - Maximum age in minutes before re-fetching
 * @returns {boolean}
 */
export function shouldSkip(checkpoint, endpoint, maxAgeMinutes = 60) {
  const entry = checkpoint?.endpoints?.[endpoint];

  if (!entry || !entry.completedAt) {
    return false;
  }

  const completedAt = new Date(entry.completedAt);

  // Invalid date check
  if (isNaN(completedAt.getTime())) {
    return false;
  }

  const now = new Date();
  const ageMinutes = (now.getTime() - completedAt.getTime()) / (1000 * 60);

  return ageMinutes < maxAgeMinutes;
}
