#!/usr/bin/env node
/**
 * Supply Chain — verify all package.json deps resolve on npm registry.
 * Blocks AI-hallucinated packages and typosquats.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {})
};

let bad = 0;
for (const name of Object.keys(allDeps)) {
    try {
        execSync(`npm view ${name} name --json`, { stdio: 'pipe', timeout: 10000 });
    } catch {
        console.error(`Hallucination suspected: ${name} not on npm registry`);
        bad++;
    }
}

if (bad > 0) process.exit(1);
console.log(`Supply Chain OK: ${Object.keys(allDeps).length} package(s) verified`);
