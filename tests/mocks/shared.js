/**
 * Shared test fixtures (Gold Standard).
 *
 * RULES:
 *   1. SINGLE SOURCE OF TRUTH for shared mocks/factories
 *   2. Never inline ad-hoc mocks in test files — extend this module instead
 *   3. Tests reset state in beforeEach using fresh factory output
 */

function makeTodo(overrides = {}) {
    return {
        id: 1,
        text: 'sample',
        completed: false,
        ...overrides
    };
}

function makeTodoList(count) {
    return Array.from({ length: count }, (_, i) =>
        makeTodo({ id: i + 1, text: `task ${i + 1}` })
    );
}

module.exports = { makeTodo, makeTodoList };
