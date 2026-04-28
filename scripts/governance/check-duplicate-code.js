#!/usr/bin/env node
/**
 * DRY Enforcement — flag near-identical 6+ line blocks across src/.
 * Uses simple substring hashing; sufficient for small projects.
 */
const fs = require('fs');
const path = require('path');

const BASELINE = path.join(__dirname, 'baselines/duplication-baseline.json');
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const BLOCK_LINES = 6;

function listJs(dir) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files = files.concat(listJs(p));
        else if (p.endsWith('.js')) files.push(p);
    }
    return files;
}

const blocks = new Map();
for (const f of listJs('src')) {
    const lines = fs.readFileSync(f, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
    for (let i = 0; i + BLOCK_LINES <= lines.length; i++) {
        const block = lines.slice(i, i + BLOCK_LINES).join('\n');
        blocks.set(block, (blocks.get(block) || 0) + 1);
    }
}

let duplicates = 0;
for (const count of blocks.values()) {
    if (count > 1) duplicates++;
}

if (duplicates > baseline.threshold) {
    console.error(`Duplication: ${duplicates} duplicate blocks > baseline ${baseline.threshold}`);
    process.exit(1);
}
console.log(`Duplication OK: ${duplicates} block(s) (baseline ${baseline.threshold})`);
