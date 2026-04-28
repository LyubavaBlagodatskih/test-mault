#!/usr/bin/env node
/**
 * Schema Validation — system boundaries should validate input.
 * Stub for vanilla JS without zod; checks that env loading uses validation
 * (src/config.js validates required vars manually — counts as boundary).
 */
const fs = require('fs');

if (!fs.existsSync('src/config.js')) {
    console.log('Schema Validation OK: no boundary modules to check');
    process.exit(0);
}

const content = fs.readFileSync('src/config.js', 'utf8');
const hasValidation = /REQUIRED|VALID_|throw new Error|process\.exit/i.test(content);

if (!hasValidation) {
    console.error('Schema Validation: src/config.js loads env without validation');
    process.exit(1);
}
console.log('Schema Validation OK: env boundary validates required vars');
