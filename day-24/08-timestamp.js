const start = Date.now();
for (let i = 0; i < 1000000; i++) {} 
const end = Date.now();
console.log("Execution time in milliseconds:", end - start);