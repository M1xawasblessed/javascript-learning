class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

function processData(data) {
    if (!data) {
        throw new Error("Data is missing.");
    }
    if (typeof data !== "string") {
        throw new TypeError("Data must be a string format.");
    }
    if (data.length < 3) {
        throw new ValidationError("Data string is too short.");
    }
    
    return `Successfully processed: ${data}`;
}

try {
    console.log("Execution started...");
    
    const result = processData("Ab"); 
    console.log(result);
    
} catch (error) {
    if (error instanceof ValidationError) {
        console.error("Validation Error Caught:", error.message);
    } else if (error instanceof TypeError) {
        console.error("Type Error Caught:", error.message);
    } else {
        console.error("General Error Caught:", error.message);
    }
} finally {
    console.log("Execution finished. Cleanup can happen here.");
}