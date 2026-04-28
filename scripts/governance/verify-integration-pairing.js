#!/usr/bin/env node
/** Buddy System — every src/ feature module needs an integration test. */
const fs = require('fs');
const path = require('path');

const EXEMPTIONS_PATH = path.join(__dirname, 'baselines/integration-exemptions.json');
const exemptions = fs.existsSync(EXEMPTIONS_PATH)
    ? JSON.parse(fs.readFileSync(EXEMPTIONS_PATH, 'utf8')).exempt
    : [];

function listSrc(dir) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) files = files.concat(listSrc(p));
        else if (p.endsWith('.js')) files.push(p);
    }
    return files;
}

let missing = 0;
for (const f of listSrc('src')) {
    const base = path.basename(f, '.js');
    if (exemptions.includes(f)) continue;
    const integrationCandidates = [
        `tests/integration/${base}.test.js`,
        `tests/integration/${base}-roundtrip.test.js`,
        `tests/integration/${base}-flow.test.js`
    ];
    if (!integrationCandidates.some(c => fs.existsSync(c))) {
        console.error(`Buddy missing for ${f}: expected ${integrationCandidates.join(' OR ')}`);
        missing++;
    }
}

if (missing > 0) {
    console.error(`${missing} feature(s) missing integration test. Add to integration-exemptions.json if grandfathered.`);
    process.exit(1);
}
console.log('Buddy System OK: all features have integration tests');
