// BAD: Extracting object properties one by one
const user = { firstName: "John", role: "Admin" };
// const firstName = user.firstName;
// const role = user.role;

// GOOD: Object destructuring
const { firstName, role } = user;

console.log(`User ${firstName} logged in as ${role}.`);