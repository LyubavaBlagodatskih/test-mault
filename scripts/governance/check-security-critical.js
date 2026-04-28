#!/usr/bin/env node
/**
 * Security Review Gatekeeper — files marked `@security-critical` require
 * a corresponding human-review entry in the review log.
 * No-op when no security-critical files present.
 */
const fs = require('fs');
const path = require('path');

const REVIEW_LOG = path.join(__dirname, 'baselines/security-reviews.json');
const reviews = fs.existsSync(REVIEW_LOG)
    ? JSON.parse(fs.readFileSync(REVIEW_LOG, 'utf8')).reviewed
    : [];

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

let unreviewed = 0;
for (const f of listJs('src')) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('@security-critical') && !reviews.includes(f)) {
        console.error(`Security review required for ${f} — add to security-reviews.json after human review`);
        unreviewed++;
    }
}

if (unreviewed > 0) process.exit(1);
console.log('Security Gate OK');
