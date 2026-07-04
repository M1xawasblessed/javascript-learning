const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(num => num * 2);
console.log("Doubled:", doubled);

const evenNumbers = numbers.filter(num => num % 2 === 0);
console.log("Even Numbers:", evenNumbers);

let sum = 0;
numbers.forEach(num => {
    sum += num;
});
console.log("Sum:", sum);

const fruits = ["apple", "banana", "orange"];
fruits.push("grape");
console.log("After push:", fruits);

fruits.pop();
console.log("After pop:", fruits);