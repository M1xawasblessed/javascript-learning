const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const email = "test@example.com";
console.log(emailPattern.test(email));