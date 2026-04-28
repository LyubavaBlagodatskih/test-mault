#!/usr/bin/env node
/**
 * Test runner wrapper — discovers all tests/**\/*.test.js files and invokes
 * `node --test` with explicit paths. Ignores any extra args (e.g., --forceExit
 * from Jest-flavored verify scripts) so it remains compatible with tooling
 * that targets multiple runners.
 */
const { spawnSync } = require('child_process');
const { readdirSync } = require('fs');
const path = require('path');

function findTests(dir) {
    let result = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result = result.concat(findTests(full));
        } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
            result.push(full);
        }
    }
    return result;
}

function main() {
    const root = process.argv[2] || 'tests';
    let files;
    try {
        files = findTests(root);
    } catch {
        console.error(`No test directory: ${root}`);
        process.exit(1);
    }
    if (files.length === 0) {
        console.error(`No *.test.js files in ${root}`);
        process.exit(1);
    }
    const result = spawnSync(process.execPath, ['--test', ...files], {
        stdio: 'inherit'
    });
    process.exit(result.status ?? 1);
}

main();
