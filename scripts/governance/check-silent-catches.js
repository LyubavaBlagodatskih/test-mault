#!/usr/bin/env node
/**
 * Iron Dome Ratchet — silent catches.
 * Catch blocks that swallow errors without log/throw must be marked with
 * `// SILENT_CATCH: <reason>` or counted toward baseline.
 */
const fs = require('fs');
const path = require('path');

const BASELINE = path.join(__dirname, 'baselines/silent-catches-baseline.json');
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

const SILENT_RE = /catch\s*\([^)]*\)\s*\{\s*\}/g;

function countSilent(file) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(SILENT_RE) || [];
    return matches.filter(_m => !content.includes('SILENT_CATCH:')).length;
}

function listSrc(dir) {
    let files = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files = files.concat(listSrc(p));
        else if (e.isFile() && p.endsWith('.js')) files.push(p);
    }
    return files;
}

const total = listSrc('src').reduce((sum, f) => sum + countSilent(f), 0);
if (total > baseline.threshold) {
    console.error(`Iron Dome violated: silent catches ${total} > baseline ${baseline.threshold}`);
    process.exit(1);
}
console.log(`Iron Dome OK: silent catches ${total} (baseline ${baseline.threshold})`);
