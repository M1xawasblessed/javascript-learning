console.log("--- Day 3: if/else Conditions ---");

// 1. Simple if/else (Age check)
let age = 16;

if (age >= 18) {
    console.log("You can vote!");
} else {
    console.log("Too young to vote.");
}

// 2. if / else if / else (Temperature check)
let temp = 25;

if (temp > 30) {
    console.log("It is very hot, wear a t-shirt.");
} else if (temp > 20) {
    console.log("The weather is nice, dress lightly.");
} else {
    console.log("It is cold, wear a jacket.");
}