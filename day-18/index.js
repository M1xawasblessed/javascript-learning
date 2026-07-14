const parentDiv = document.createElement("div");
parentDiv.id = "parent";
parentDiv.style.padding = "30px";
parentDiv.style.backgroundColor = "lightblue";

const childBtn = document.createElement("button");
childBtn.id = "child";
childBtn.textContent = "Click Me";

parentDiv.appendChild(childBtn);
document.body.appendChild(parentDiv);

parentDiv.addEventListener("click", () => {
    console.log("Parent DIV clicked! (Bubbling)");
});

childBtn.addEventListener("click", (event) => {
    console.log("Child BUTTON clicked!");
    event.stopPropagation();
});

const listContainer = document.createElement("ul");

for (let i = 1; i <= 4; i++) {
    const listItem = document.createElement("li");
    listItem.textContent = `List Item ${i}`;
    listContainer.appendChild(listItem);
}

document.body.appendChild(listContainer);

listContainer.addEventListener("click", (event) => {
    if (event.target.tagName === "LI") {
        console.log("Event Delegation - Clicked on:", event.target.textContent);
    }
});