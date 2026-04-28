#!/usr/bin/env node
/**
 * Iron Dome Ratchet — `any` usage in source.
 * For vanilla JS this counts implicit-any patterns (untyped function parameters
 * with `any` markers in JSDoc). Baseline can only go DOWN.
 */
const fs = require('fs');
const path = require('path');

const BASELINE = path.join(__dirname, 'baselines/any-baseline.json');
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

function countAny(file) {
    const content = fs.readFileSync(file, 'utf8');
    return (content.match(/\bany\b/g) || []).length;
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

const total = listSrc('src').reduce((sum, f) => sum + countAny(f), 0);
if (total > baseline.threshold) {
    console.error(`Iron Dome violated: any count ${total} > baseline ${baseline.threshold}`);
    process.exit(1);
}
console.log(`Iron Dome OK: any count ${total} (baseline ${baseline.threshold})`);
