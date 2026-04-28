#!/usr/bin/env node
/** Perception Check — perception-critical files need behavioral tests. */
const fs = require('fs');

const PERCEPTION_DIRS = ['src/detectors', 'src/formatters', 'src/renderers'];
let missing = 0;

for (const dir of PERCEPTION_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
        const behavioral = `tests/behavioral/${f.replace('.js', '.behavioral.test.js')}`;
        if (!fs.existsSync(behavioral)) {
            console.error(`Behavioral missing for ${dir}/${f}`);
            missing++;
        }
    }
}

if (missing > 0) process.exit(1);
console.log('Perception Check OK (no perception-critical files in this project)');
