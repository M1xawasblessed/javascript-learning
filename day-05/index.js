console.log("--- Day 5: Objects ---");


let wordCard = {
    spanish: "Desarrollador",
    english: "Developer",
    targetLevel: "B1",
    isMemorized: false
};

console.log("My Vocabulary Card:", wordCard);


console.log("Spanish word:", wordCard.spanish);
console.log("Target level:", wordCard.targetLevel);


wordCard.isMemorized = true;
console.log("Is it memorized now?", wordCard.isMemorized);


wordCard.dailyStudyHours = 2;
console.log("Updated Card:", wordCard);