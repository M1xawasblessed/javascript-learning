// BAD: Deeply nested if statements
// function processPayment(amount) { if (amount > 0) { console.log("Processing..."); } else { console.log("Error"); } }

// GOOD: Guard clauses (Early returns)
function processPayment(amount) {
    if (amount <= 0) {
        console.log("Error: Invalid payment amount.");
        return; 
    }
    
    console.log(`Processing payment of $${amount} successfully.`);
}

processPayment(-5);
processPayment(100);