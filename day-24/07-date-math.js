const today = new Date();
const futureDate = new Date(today);
futureDate.setDate(today.getDate() + 7);
console.log("Today:", today.toDateString());
console.log("Next week:", futureDate.toDateString());