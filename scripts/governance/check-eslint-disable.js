#!/usr/bin/env node
/** Escape Hatch Gate — block new eslint-disable directives. */
const fs = require('fs');
const path = require('path');

const BASELINE = path.join(__dirname, 'baselines/eslint-disable-baseline.json');
const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const RE = /\/\*\s*eslint-disable|\/\/\s*eslint-disable/g;

function listJs(dir) {
    let files = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files = files.concat(listJs(p));
        else if (e.isFile() && p.endsWith('.js')) files.push(p);
    }
    return files;
}

let total = 0;
for (const dir of ['src', 'tests', 'scripts']) {
    if (fs.existsSync(dir)) {
        for (const f of listJs(dir)) {
            const content = fs.readFileSync(f, 'utf8');
            total += (content.match(RE) || []).length;
        }
    }
}

if (total > baseline.threshold) {
    console.error(`Escape Hatch violated: eslint-disable ${total} > baseline ${baseline.threshold}`);
    process.exit(1);
}
console.log(`Escape Hatch OK: eslint-disable ${total} (baseline ${baseline.threshold})`);
