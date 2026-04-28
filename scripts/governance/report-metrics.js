#!/usr/bin/env node
/** Generate human-readable governance report. */
const fs = require('fs');
const path = require('path');

const metricsPath = path.join(__dirname, 'baselines/metrics.json');
if (!fs.existsSync(metricsPath)) {
    console.log('No metrics yet. Run collect-metrics.js first.');
    process.exit(0);
}

const data = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
console.log(`# Governance Metrics — ${data.collectedAt}\n`);
for (const [name, m] of Object.entries(data.metrics)) {
    console.log(`- **${name}**: threshold=${m.threshold}`);
}
