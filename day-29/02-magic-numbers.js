// BAD: Using numbers without context
// if (status === 1) { ... }

// GOOD: Assigning magic numbers to constant variables
const STATUS_ACTIVE = 1;
let currentAccountStatus = 1;

if (currentAccountStatus === STATUS_ACTIVE) {
    console.log("The user account is currently active.");
}