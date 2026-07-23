const appContainer = document.createElement("div");
appContainer.id = "todo-app";
document.body.appendChild(appContainer);

const title = document.createElement("h1");
title.textContent = "My To-Do List";
appContainer.appendChild(title);

const inputField = document.createElement("input");
inputField.setAttribute("type", "text");
inputField.setAttribute("placeholder", "Add a new task...");
appContainer.appendChild(inputField);

const addButton = document.createElement("button");
addButton.textContent = "Add Task";
appContainer.appendChild(addButton);

const taskList = document.createElement("ul");
appContainer.appendChild(taskList);

let tasks = JSON.parse(localStorage.getItem("todo_tasks")) || [];

function renderTasks() {
    taskList.innerHTML = "";
    
    tasks.forEach((task, index) => {
        const listItem = document.createElement("li");
        listItem.style.marginBottom = "10px";
        
        const taskText = document.createElement("span");
        taskText.textContent = task.text;
        taskText.style.marginRight = "15px";
        
        if (task.completed) {
            taskText.style.textDecoration = "line-through";
            taskText.style.color = "gray";
        }
        
        const toggleButton = document.createElement("button");
        toggleButton.textContent = task.completed ? "Undo" : "Complete";
        toggleButton.style.marginRight = "5px";
        
        toggleButton.addEventListener("click", () => {
            tasks[index].completed = !tasks[index].completed;
            saveAndRender();
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        
        deleteButton.addEventListener("click", () => {
            tasks.splice(index, 1);
            saveAndRender();
        });

        listItem.appendChild(taskText);
        listItem.appendChild(toggleButton);
        listItem.appendChild(deleteButton);
        taskList.appendChild(listItem);
    });
}

function saveAndRender() {
    localStorage.setItem("todo_tasks", JSON.stringify(tasks));
    renderTasks();
}

addButton.addEventListener("click", () => {
    const newTaskText = inputField.value.trim();
    if (newTaskText !== "") {
        tasks.push({ text: newTaskText, completed: false });
        inputField.value = "";
        saveAndRender();
    }
});

renderTasks();