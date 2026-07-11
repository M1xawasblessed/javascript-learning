const mainTitle = document.getElementById("title");
console.log(mainTitle);

const listItems = document.getElementsByClassName("item");
console.log(listItems);

const firstParagraph = document.querySelector("p");
const allButtons = document.querySelectorAll(".btn");

allButtons.forEach(button => {
    console.log("Button found:", button);
});

if (mainTitle) {
    mainTitle.textContent = "JavaScript DOM Basics";
    mainTitle.style.color = "blue";
}