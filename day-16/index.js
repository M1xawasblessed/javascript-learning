const mainContainer = document.createElement("div");
mainContainer.id = "app-container";
document.body.appendChild(mainContainer);

const newParagraph = document.createElement("p");
newParagraph.textContent = "This paragraph was created using JavaScript.";
newParagraph.classList.add("text-style", "highlight");

mainContainer.appendChild(newParagraph);

const alertBox = document.createElement("div");
alertBox.textContent = "Warning: Action required!";
alertBox.classList.add("alert");
mainContainer.appendChild(alertBox);

alertBox.classList.remove("alert");
alertBox.classList.toggle("hidden");

const actionButton = document.createElement("button");
actionButton.textContent = "Click Me";
mainContainer.appendChild(actionButton);

newParagraph.remove();