// Initial Data State
const defaultTasks = [
    {
        id: "1",
        title: "Setup Repository",
        description: "Initialize git repository and setup project folders.",
        status: "done",
        priority: "high"
    },
    {
        id: "2",
        title: "Design Database Schema",
        description: "Draft data models for tasks and categories.",
        status: "in-progress",
        priority: "medium"
    },
    {
        id: "3",
        title: "Implement Drag and Drop",
        description: "Add HTML5 drag and drop API listeners.",
        status: "todo",
        priority: "high"
    }
];

let tasks = JSON.parse(localStorage.getItem("kanban_tasks")) || defaultTasks;

// DOM Elements
const todoList = document.getElementById("todo-list");
const inProgressList = document.getElementById("in-progress-list");
const doneList = document.getElementById("done-list");

const todoCount = document.getElementById("todo-count");
const inProgressCount = document.getElementById("in-progress-count");
const doneCount = document.getElementById("done-count");

function saveTasks() {
    localStorage.setItem("kanban_tasks", JSON.stringify(tasks));
}

function renderBoard() {
    // Clear lists
    todoList.innerHTML = "";
    inProgressList.innerHTML = "";
    doneList.innerHTML = "";

    let counts = { todo: 0, "in-progress": 0, done: 0 };

    tasks.forEach(task => {
        counts[task.status]++;

        const card = document.createElement("div");
        card.className = `task-card priority-${task.priority}`;
        card.setAttribute("draggable", "true");
        card.setAttribute("data-id", task.id);

        card.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description}</p>
            <div class="card-footer">
                <span class="badge badge-${task.priority}">${task.priority.toUpperCase()}</span>
                <button class="delete-btn" data-id="${task.id}">&times;</button>
            </div>
        `;

        if (task.status === "todo") todoList.appendChild(card);
        else if (task.status === "in-progress") inProgressList.appendChild(card);
        else if (task.status === "done") doneList.appendChild(card);
    });

    todoCount.textContent = counts.todo;
    inProgressCount.textContent = counts["in-progress"];
    doneCount.textContent = counts.done;
}

renderBoard();