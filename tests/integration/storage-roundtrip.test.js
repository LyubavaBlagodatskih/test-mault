const { test, describe } = require('node:test');
const assert = require('node:assert');
const { serialize, parse, validateImport } = require('../../src/import-export');
const { makeTodoList } = require('../mocks/shared');

describe('Import/Export round-trip integration', () => {
    test('serialize → parse → validateImport preserves data', () => {
        const original = makeTodoList(3);
        const json = serialize(original);
        const parsed = parse(json);
        const result = validateImport(parsed);

        assert.strictEqual(result.valid, true);
        assert.deepStrictEqual(result.todos, original);
    });

    test('round-trip handles empty list', () => {
        const json = serialize([]);
        const result = validateImport(parse(json));
        assert.strictEqual(result.valid, true);
        assert.deepStrictEqual(result.todos, []);
    });

    test('round-trip preserves completed status across serialize cycle', () => {
        const original = [
            { id: 1, text: 'done', completed: true },
            { id: 2, text: 'pending', completed: false }
        ];
        const result = validateImport(parse(serialize(original)));
        assert.strictEqual(result.todos[0].completed, true);
        assert.strictEqual(result.todos[1].completed, false);
    });

    test('mock factory produces conformant todos', () => {
        const todos = makeTodoList(2);
        const result = validateImport(todos);
        assert.strictEqual(result.valid, true);
    });
});
