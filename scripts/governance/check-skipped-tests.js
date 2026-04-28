#!/usr/bin/env node
/** Test Discipline — max 5% skipped tests. */
const fs = require('fs');
const path = require('path');

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

let total = 0;
let skipped = 0;
for (const f of listTests('tests')) {
    const content = fs.readFileSync(f, 'utf8');
    total += (content.match(/\btest\s*\(/g) || []).length;
    skipped += (content.match(/\b(test|it)\.skip\s*\(|describe\.skip\s*\(/g) || []).length;
}

if (total === 0) {
    console.log('Test Discipline: no tests yet');
    process.exit(0);
}
const ratio = (skipped / total) * 100;
if (ratio > 5) {
    console.error(`Test Discipline: ${skipped}/${total} skipped (${ratio.toFixed(1)}%) exceeds 5%`);
    process.exit(1);
}
console.log(`Test Discipline OK: ${skipped}/${total} skipped (${ratio.toFixed(1)}%)`);
