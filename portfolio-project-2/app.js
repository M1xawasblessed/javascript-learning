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

// Load tasks from LocalStorage or fallback to defaults
let tasks = JSON.parse(localStorage.getItem("kanban_tasks")) || defaultTasks;

console.log("Initial tasks loaded:", tasks);