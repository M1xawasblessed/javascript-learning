// BAD: Handling defaults inside the function body
// function greet(name) { name = name || "Guest"; ... }

// GOOD: Setting default parameters directly in the signature
const greet = (name = "Guest") => {
    console.log(`Welcome to our platform, ${name}.`);
};

greet(); 
greet("Ayhan");