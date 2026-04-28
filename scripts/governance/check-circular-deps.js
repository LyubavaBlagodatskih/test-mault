#!/usr/bin/env node
/** Dependency Health — detect circular requires in src/. */
const fs = require('fs');
const path = require('path');

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

const graph = new Map();
const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const f of listJs('src')) {
    const content = fs.readFileSync(f, 'utf8');
    const deps = [...content.matchAll(REQUIRE_RE)]
        .map(m => m[1])
        .filter(d => d.startsWith('.'))
        .map(d => path.normalize(path.join(path.dirname(f), d)) + (d.endsWith('.js') ? '' : '.js'));
    graph.set(f, deps);
}

function hasCycle(node, visited = new Set(), stack = new Set()) {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const dep of (graph.get(node) || [])) {
        if (hasCycle(dep, visited, stack)) return true;
    }
    stack.delete(node);
    return false;
}

let cycles = 0;
for (const node of graph.keys()) {
    if (hasCycle(node, new Set(), new Set())) {
        console.error(`Cycle detected involving ${node}`);
        cycles++;
        break;
    }
}

if (cycles > 0) process.exit(1);
console.log(`Dependency Health OK: ${graph.size} module(s), no cycles`);
