const test = require('node:test');
const assert = require('node:assert/strict');
const { serialize, parse, validateImport } = require('../../src/import-export');

const sample = [
    { id: 1, text: 'a', completed: false },
    { id: 2, text: 'b', completed: true },
];

test('serialize produces JSON parseable back to the same array', () => {
    const out = serialize(sample);
    assert.equal(typeof out, 'string');
    assert.deepEqual(JSON.parse(out), sample);
});

test('serialize produces "[]" for an empty array', () => {
    assert.equal(serialize([]), '[]');
});

test('parse returns the parsed value for valid JSON', () => {
    assert.deepEqual(parse('[{"id":1,"text":"a","completed":false}]'), [
        { id: 1, text: 'a', completed: false },
    ]);
});

test('parse throws on invalid JSON', () => {
    assert.throws(() => parse('{not json'));
});

test('validateImport accepts a well-formed todo array', () => {
    const result = validateImport(sample);
    assert.equal(result.valid, true);
    assert.deepEqual(result.todos, sample);
});

test('validateImport rejects non-array input', () => {
    const result = validateImport({ id: 1, text: 'a', completed: false });
    assert.equal(result.valid, false);
    assert.ok(result.error);
});

test('validateImport rejects items missing required fields', () => {
    const result = validateImport([{ id: 1, text: 'a' }]);
    assert.equal(result.valid, false);
    assert.ok(result.error);
});

test('validateImport rejects items with wrong field types', () => {
    const result = validateImport([{ id: 'x', text: 'a', completed: 'no' }]);
    assert.equal(result.valid, false);
    assert.ok(result.error);
});
