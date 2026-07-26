// BAD: Bulky if-else for simple assignments
const age = 20;
// let access;
// if (age >= 18) { access = "Granted"; } else { access = "Denied"; }

// GOOD: Using the ternary operator
const access = age >= 18 ? "Granted" : "Denied";

console.log(`System Access: ${access}`);