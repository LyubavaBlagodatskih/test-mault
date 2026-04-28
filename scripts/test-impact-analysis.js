#!/usr/bin/env node
/**
 * Test Impact Analysis — runs only tests related to changed files locally.
 * In CI (CI=true), runs the full suite as a safety latch.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const { readdirSync } = require('fs');

const IS_CI = process.env.CI === 'true' || process.env.CI === true;

function getChangedSrcFiles() {
    try {
        const out = execSync('git diff --name-only origin/main...HEAD', {
            encoding: 'utf8'
        });
        return out.trim().split('\n').filter(Boolean);
    } catch {
        try {
            return execSync('git diff --name-only HEAD', {
                encoding: 'utf8'
            }).trim().split('\n').filter(Boolean);
        } catch {
            return [];
        }
    }
}

function findRelatedTests(changed) {
    const srcChanged = changed.filter(f =>
        f.startsWith('src/') && f.endsWith('.js') && !f.endsWith('.test.js')
    );
    if (srcChanged.length === 0) return [];

    const allTests = findTestsRecursive('tests');
    return allTests.filter(testFile => {
        return srcChanged.some(src => {
            const baseName = path.basename(src, '.js');
            return testFile.includes(baseName);
        });
    });
}

function findTestsRecursive(dir) {
    let result = [];
    try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                result = result.concat(findTestsRecursive(full));
            } else if (entry.name.endsWith('.test.js')) {
                result.push(full);
            }
        }
    } catch { /* dir not found */ }
    return result;
}

function runAll() {
    const result = spawnSync('npm', ['test'], { stdio: 'inherit', shell: true });
    process.exit(result.status ?? 1);
}

function runSpecific(files) {
    const result = spawnSync(process.execPath, ['--test', ...files], {
        stdio: 'inherit'
    });
    process.exit(result.status ?? 1);
}

if (IS_CI) {
    console.log('CI Safety Latch: running ALL tests');
    runAll();
} else {
    const related = findRelatedTests(getChangedSrcFiles());
    if (related.length === 0) {
        console.log('No source changes detected — running full suite');
        runAll();
    } else {
        console.log(`TIA: running ${related.length} related test(s)`);
        related.forEach(f => console.log(`  ${f}`));
        runSpecific(related);
    }
}
