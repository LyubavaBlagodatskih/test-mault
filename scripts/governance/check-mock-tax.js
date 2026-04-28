#!/usr/bin/env node
/**
 * Rising Tide — Mock Tax (2x rule).
 * If a unit test is >2x larger than its source, reject and require
 * conversion to integration test.
 */
const fs = require('fs');
const path = require('path');

const MAX_RATIO = 2.0;
const MIN_SOURCE_LINES = 15;

function loc(file) {
    return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
}

function listTests(dir) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files = files.concat(listTests(p));
        else if (p.endsWith('.test.js')) files.push(p);
    }
    return files;
}

function mapToSrc(testFile) {
    const base = path.basename(testFile, '.test.js');
    const candidate = path.join('src', `${base}.js`);
    return fs.existsSync(candidate) ? candidate : null;
}

let violations = 0;
for (const t of listTests('tests/unit')) {
    const src = mapToSrc(t);
    if (!src) continue;
    const srcLines = loc(src);
    if (srcLines < MIN_SOURCE_LINES) continue;
    const testLines = loc(t);
    const ratio = testLines / srcLines;
    if (ratio > MAX_RATIO) {
        console.error(`Mock Tax violated: ${t} ${testLines} LOC vs ${src} ${srcLines} LOC (${ratio.toFixed(1)}x)`);
        violations++;
    }
}

if (violations > 0) {
    console.error('Solution: Delete unit test, write Integration Test instead.');
    process.exit(1);
}
console.log('Mock Tax OK: all unit tests within 2x ratio');
