const STORAGE_KEY = 'todo-test-items';

let todos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currentFilter = 'all';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const countEl = document.getElementById('count');
const clearBtn = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filter-btn');

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function addTodo(text) {
    todos.push({
        id: Date.now(),
        text: text.trim(),
        completed: false
    });
    save();
    render();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        save();
        render();
    }
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    save();
    render();
}

function clearCompleted() {
    todos = todos.filter(t => !t.completed);
    save();
    render();
}

function getFilteredTodos() {
    if (currentFilter === 'active') return todos.filter(t => !t.completed);
    if (currentFilter === 'completed') return todos.filter(t => t.completed);
    return todos;
}

function pluralize(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} задача`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} задачи`;
    return `${n} задач`;
}

function render() {
    const filtered = getFilteredTodos();
    list.innerHTML = '';

    if (filtered.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty';
        empty.textContent = todos.length === 0
            ? 'Список пуст. Добавьте первую задачу!'
            : 'Нет задач для этого фильтра';
        list.appendChild(empty);
    } else {
        filtered.forEach(todo => {
            const li = document.createElement('li');
            li.className = 'todo-item' + (todo.completed ? ' completed' : '');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.addEventListener('change', () => toggleTodo(todo.id));

            const span = document.createElement('span');
            span.textContent = todo.text;

            const del = document.createElement('button');
            del.className = 'delete-btn';
            del.textContent = '✕';
            del.addEventListener('click', () => deleteTodo(todo.id));

            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(del);
            list.appendChild(li);
        });
    }

    const active = todos.filter(t => !t.completed).length;
    countEl.textContent = pluralize(active);
}

form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
        addTodo(text);
        input.value = '';
    }
});

clearBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

render();
