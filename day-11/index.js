async function fetchUserData() {
    try {
        console.log("Fetching user data...");
        
        const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
        
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        
        const user = await response.json();
        console.log("User Data Received:", user);
        console.log(`Name: ${user.name}, City: ${user.address.city}`);
        
    } catch (error) {
        console.log("Error:", error.message);
    } finally {
        console.log("Fetch operation completed.");
    }
}

fetchUserData();