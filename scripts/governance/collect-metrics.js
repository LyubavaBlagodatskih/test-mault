#!/usr/bin/env node
/** Governance metrics collector — aggregates ratchet baselines. */
const fs = require('fs');
const path = require('path');

const baselines = ['any-baseline', 'silent-catches-baseline', 'eslint-disable-baseline', 'duplication-baseline'];
const metrics = {};

for (const name of baselines) {
    const p = path.join(__dirname, 'baselines', `${name}.json`);
    if (fs.existsSync(p)) {
        metrics[name] = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
}

const out = path.join(__dirname, 'baselines/metrics.json');
fs.writeFileSync(out, JSON.stringify({ collectedAt: new Date().toISOString(), metrics }, null, 2));
console.log(`Metrics written: ${out}`);
