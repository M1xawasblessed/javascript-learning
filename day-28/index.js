const appContainer = document.createElement("div");
appContainer.id = "user-generator-app";
appContainer.style.fontFamily = "Arial, sans-serif";
appContainer.style.textAlign = "center";
document.body.appendChild(appContainer);

const title = document.createElement("h1");
title.textContent = "Random User Generator";
appContainer.appendChild(title);

const generateBtn = document.createElement("button");
generateBtn.textContent = "Get Random User";
generateBtn.style.padding = "10px 20px";
generateBtn.style.fontSize = "16px";
generateBtn.style.cursor = "pointer";
appContainer.appendChild(generateBtn);

const userCard = document.createElement("div");
userCard.style.marginTop = "30px";
appContainer.appendChild(userCard);

async function fetchRandomUser() {
    try {
        userCard.innerHTML = "<p>Loading user data...</p>";
        
        const response = await fetch("https://randomuser.me/api/");
        if (!response.ok) {
            throw new Error("Failed to fetch data from the API");
        }
        
        const data = await response.json();
        const user = data.results[0];
        
        const profileImage = user.picture.large;
        const fullName = `${user.name.first} ${user.name.last}`;
        const email = user.email;
        const location = `${user.location.city}, ${user.location.country}`;
        
        userCard.innerHTML = `
            <img src="${profileImage}" alt="${fullName}" style="border-radius: 50%; border: 3px solid #ddd;">
            <h2>${fullName}</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Location:</strong> ${location}</p>
        `;
    } catch (error) {
        userCard.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

generateBtn.addEventListener("click", fetchRandomUser);

// Load an initial user as soon as the page opens
fetchRandomUser();