const actionButton = document.createElement("button");
actionButton.textContent = "Click Me";
document.body.appendChild(actionButton);

actionButton.addEventListener("click", () => {
    console.log("Button was clicked!");
    actionButton.style.backgroundColor = "green";
    actionButton.style.color = "white";
});

const textInput = document.createElement("input");
textInput.setAttribute("type", "text");
textInput.setAttribute("placeholder", "Type something...");
document.body.appendChild(textInput);

textInput.addEventListener("input", (event) => {
    console.log("Current input value:", event.target.value);
});

const sampleForm = document.createElement("form");
const submitButton = document.createElement("button");
submitButton.textContent = "Submit";
sampleForm.appendChild(submitButton);
document.body.appendChild(sampleForm);

sampleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    console.log("Form submitted, page reload prevented.");
});