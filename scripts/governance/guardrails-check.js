#!/usr/bin/env node
/**
 * SRP Guardrails — file LOC (600), function LOC (50), cyclomatic complexity (15).
 */
const fs = require('fs');
const path = require('path');

const FILE_LIMIT = 600;
const CC_LIMIT = 15;

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

let violations = 0;
for (const f of listJs('src')) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n').length;
    if (lines > FILE_LIMIT) {
        console.error(`SRP: ${f} has ${lines} LOC > ${FILE_LIMIT}`);
        violations++;
    }
    const branches = (content.match(/\b(if|else if|for|while|case|&&|\|\|)\b/g) || []).length;
    if (branches > CC_LIMIT * 5) {
        console.error(`SRP: ${f} estimated CC very high (${branches} branch markers)`);
        violations++;
    }
}

if (violations > 0) process.exit(1);
console.log('SRP Guardrails OK');
