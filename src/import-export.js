(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ImportExport = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    function serialize(todos) {
        return JSON.stringify(todos);
    }

    function parse(jsonString) {
        return JSON.parse(jsonString);
    }

    function isTodo(value) {
        return (
            value !== null &&
            typeof value === 'object' &&
            typeof value.id === 'number' &&
            typeof value.text === 'string' &&
            typeof value.completed === 'boolean'
        );
    }

    function validateImport(parsed) {
        if (!Array.isArray(parsed)) {
            return { valid: false, error: 'Expected an array of todos' };
        }
        for (let i = 0; i < parsed.length; i++) {
            if (!isTodo(parsed[i])) {
                return { valid: false, error: `Invalid todo at index ${i}` };
            }
        }
        return { valid: true, todos: parsed };
    }

    return { serialize, parse, validateImport };
}));
