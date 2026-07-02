console.log("--- Day 6: For Loops ---");

// 1. A simple loop counting from 1 to 5
console.log("Counting:");
for (let i = 1; i <= 5; i++) {
    console.log("Day " + i + " of learning JavaScript!");
}

// 2. Looping through an array
let spanishWords = ["Hola", "Gracias", "Por favor", "Desarrollador"];
console.log("\nMy Spanish Vocabulary List:");

for (let i = 0; i < spanishWords.length; i++) {
    // This will run for each item in the array
    console.log("- " + spanishWords[i]);
}