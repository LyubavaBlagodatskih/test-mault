#!/usr/bin/env node
/** Adversarial Mock Scan — block mocking of "reality". */
const fs = require('fs');
const path = require('path');

const FORBIDDEN = [
    /jest\.spyOn\s*\(\s*process\s*,\s*['"]cwd['"]\s*\)/,
    /jest\.spyOn\s*\(\s*Date\s*,\s*['"]now['"]\s*\)/,
    /jest\.spyOn\s*\(\s*Math\s*,\s*['"]random['"]\s*\)/,
    /mock\s*\(\s*['"]__dirname['"]/,
    /mock\s*\(\s*['"]__filename['"]/
];

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

let violations = 0;
for (const t of listTests('tests')) {
    const content = fs.readFileSync(t, 'utf8');
    for (const re of FORBIDDEN) {
        if (re.test(content)) {
            console.error(`Adversarial mock detected in ${t}: ${re.source}`);
            violations++;
        }
    }
}

if (violations > 0) {
    console.error('Rule 7: Don\'t Mock the Truth.');
    process.exit(1);
}
console.log('Adversarial Mock Scan OK');
