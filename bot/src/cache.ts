import fs from 'fs';
import path from 'path';

const cachePath = path.resolve(__dirname, '../ingested.json');

export function loadCache(): Set<string> {
  try {
    const data = fs.readFileSync(cachePath, 'utf-8');
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

export function saveCache(ids: Set<string>) {
  try {
    fs.writeFileSync(cachePath, JSON.stringify(Array.from(ids), null, 2));
  } catch (err) {
    console.error('Failed to write cache', err);
  }
}
