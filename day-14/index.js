const uniqueNumbers = new Set([1, 2, 2, 3, 3, 4, 5]);
console.log("Set (Unique Values):", uniqueNumbers);

uniqueNumbers.add(6);
uniqueNumbers.add(6); 
uniqueNumbers.delete(2);

console.log("After Add/Delete:", uniqueNumbers);
console.log("Has number 4?:", uniqueNumbers.has(4));


const userMap = new Map();

userMap.set("name", "Ayhan");
userMap.set("role", "Developer");
userMap.set(1, "Number Key");
userMap.set({ theme: "dark" }, "Object Key"); 

console.log("Map Size:", userMap.size);
console.log("Get Name:", userMap.get("name"));

console.log("--- Map Entries ---");
userMap.forEach((value, key) => {
    console.log(`Key:`, key, `| Value:`, value);
});