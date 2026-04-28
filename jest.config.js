// Jest config stub — present for Mault tooling compatibility.
// Actual test runner is node:test (via npm scripts), coverage via c8.
// The coverageThreshold below documents the project floor (enforced by c8).
module.exports = {
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
