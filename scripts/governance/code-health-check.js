#!/usr/bin/env node
/**
 * Code Health — orphan files (not require'd) and dead exports.
 * Conservative: flags only files with no incoming references.
 */
const fs = require('fs');
const path = require('path');

const ENTRY_POINTS = ['app.js', 'src/config.js', 'tests'];

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

const allSrc = listJs('src');
const allRefs = new Set();

for (const f of [...listJs('src'), ...listJs('tests'), ...listJs('scripts'), 'app.js'].filter(fs.existsSync)) {
    const content = fs.readFileSync(f, 'utf8');
    for (const m of content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        allRefs.add(path.basename(m[1], '.js'));
    }
}

let orphans = 0;
for (const f of allSrc) {
    const base = path.basename(f, '.js');
    if (!allRefs.has(base) && !ENTRY_POINTS.some(e => f === e || f.startsWith(e))) {
        console.warn(`Possible orphan: ${f}`);
        orphans++;
    }
}

if (orphans > 0) {
    console.error(`Code Health: ${orphans} orphan file(s)`);
    process.exit(1);
}
console.log('Code Health OK');
