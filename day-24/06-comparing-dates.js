const date1 = new Date("2026-07-21");
const date2 = new Date("2026-12-31");
console.log("Is date1 earlier than date2?", date1 < date2);
console.log("Are they exactly the same?", date1.getTime() === date2.getTime());