const spanishWords = [
    { es: "Hola", en: "Hello" },
    { es: "Adiós", en: "Goodbye" },
    { es: "Por favor", en: "Please" },
    { es: "Gracias", en: "Thank you" },
    { es: "Agua", en: "Water" }
];

const appContainer = document.createElement("div");
appContainer.id = "flashcard-app";

const wordDisplay = document.createElement("h2");
const answerInput = document.createElement("input");
answerInput.setAttribute("type", "text");
answerInput.setAttribute("placeholder", "Enter English translation...");

const submitButton = document.createElement("button");
submitButton.textContent = "Check Answer";

const scoreDisplay = document.createElement("p");
const statusMessage = document.createElement("p");

let currentIndex = 0;
let currentScore = parseInt(localStorage.getItem("spanishScore")) || 0;

scoreDisplay.textContent = `Score: ${currentScore}`;

appContainer.appendChild(wordDisplay);
appContainer.appendChild(answerInput);
appContainer.appendChild(submitButton);
appContainer.appendChild(scoreDisplay);
appContainer.appendChild(statusMessage);
document.body.appendChild(appContainer);

function loadNextWord() {
    wordDisplay.textContent = spanishWords[currentIndex].es;
    answerInput.value = "";
    statusMessage.textContent = "";
}

submitButton.addEventListener("click", () => {
    const userAnswer = answerInput.value.trim().toLowerCase();
    const correctAnswer = spanishWords[currentIndex].en.toLowerCase();

    if (userAnswer === correctAnswer) {
        currentScore++;
        localStorage.setItem("spanishScore", currentScore);
        scoreDisplay.textContent = `Score: ${currentScore}`;
        statusMessage.textContent = "Correct! Moving to next word...";
        statusMessage.style.color = "green";
        
        currentIndex = (currentIndex + 1) % spanishWords.length;
        setTimeout(loadNextWord, 1000);
    } else {
        statusMessage.textContent = "Incorrect. Try again!";
        statusMessage.style.color = "red";
    }
});

loadNextWord();