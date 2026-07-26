// BAD: Using standard for-loops for simple array transformations
const numbers = [1, 2, 3, 4, 5];
// const doubled = [];
// for (let i = 0; i < numbers.length; i++) { doubled.push(numbers[i] * 2); }

// GOOD: Using array methods like map or filter
const doubledNumbers = numbers.map(num => num * 2);

console.log("Doubled array values:", doubledNumbers);