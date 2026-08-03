const defaultTasks = [
    { id: "1", title: "Setup Repository", description: "Initialize git repository.", status: "done", priority: "high" },
    { id: "2", title: "Design Schema", description: "Draft data models.", status: "in-progress", priority: "medium" }
];

let tasks = JSON.parse(localStorage.getItem("kanban_tasks")) || defaultTasks;

const todoList = document.getElementById("todo-list");
const inProgressList = document.getElementById("in-progress-list");
const doneList = document.getElementById("done-list");

const todoCount = document.getElementById("todo-count");
const inProgressCount = document.getElementById("in-progress-count");
const doneCount = document.getElementById("done-count");

const modal = document.getElementById("task-modal");
const addTaskBtn = document.getElementById("add-task-btn");
const cancelBtn = document.getElementById("cancel-btn");
const taskForm = document.getElementById("task-form");

function saveTasks() {
    localStorage.setItem("kanban_tasks", JSON.stringify(tasks));
}

function renderBoard() {
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

// Modal Handlers
addTaskBtn.addEventListener("click", () => modal.classList.remove("hidden"));
cancelBtn.addEventListener("click", () => modal.classList.add("hidden"));

taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("task-title").value;
    const description = document.getElementById("task-desc").value;
    const priority = document.getElementById("task-priority").value;

    const newTask = {
        id: Date.now().toString(),
        title,
        description,
        status: "todo",
        priority
    };

    tasks.push(newTask);
    saveTasks();
    renderBoard();

    taskForm.reset();
    modal.classList.add("hidden");
});

renderBoard();