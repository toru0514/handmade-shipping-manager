import { promises as fsPromises } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Returns the first non-empty trimmed string from the given values, or null.
 */
export function pickFirstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Parses a string into an integer (rounded). Returns null for invalid input.
 */
export function parseInteger(value: string | null | undefined): number | null {
  if (!value) return null;
  const sanitized = value.replace(/[^0-9.+-]/g, '');
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

/**
 * Splits a newline/comma-separated string of image URLs into an array.
 */
export function parseImageUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Normalizes an ID string: trims whitespace, returns null if empty.
 */
export function normalizeId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * Downloads images from URLs to temp files. Returns array of local file paths.
 */
export async function downloadImages(urls: string[], prefix = 'image'): Promise<string[]> {
  const results: string[] = [];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[${prefix}] image download failed`, url, response.status);
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const ext = (() => {
        try {
          const pathname = new URL(url).pathname;
          const candidate = path.extname(pathname);
          return candidate || '.jpg';
        } catch {
          return '.jpg';
        }
      })();
      const tempPath = path.join(os.tmpdir(), `${prefix}-${randomUUID()}${ext}`);
      await fsPromises.writeFile(tempPath, Buffer.from(arrayBuffer));
      console.log(`[${prefix}] image saved`, url, tempPath, arrayBuffer.byteLength);
      results.push(tempPath);
    } catch (error) {
      console.warn(`[${prefix}] image download failed`, url, error);
    }
  }
  return results;
}

/**
 * Removes temporary files, logging warnings on failure.
 */
export async function cleanupTempFiles(files: string[], prefix = 'cleanup'): Promise<void> {
  await Promise.all(
    files.map((file) =>
      fsPromises.unlink(file).catch((error) => {
        console.warn(`[${prefix}] temp file cleanup failed`, file, error);
      }),
    ),
  );
}
