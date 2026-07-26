// BAD: String concatenation with plus operator
// const greeting = "Hello, " + userName + "!";

// GOOD: Template literals for readability
const userName = "Alice";
const greeting = `Hello, ${userName}!`;

console.log(greeting);