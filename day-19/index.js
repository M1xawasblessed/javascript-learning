localStorage.setItem("username", "Ayhan");
localStorage.setItem("theme", "dark");

const savedUser = localStorage.getItem("username");
console.log("User from LocalStorage:", savedUser);

localStorage.removeItem("theme");

sessionStorage.setItem("sessionID", "123456xyz");
const currentSession = sessionStorage.getItem("sessionID");
console.log("Session ID:", currentSession);

sessionStorage.clear();

const userPreferences = {
    language: "en",
    notifications: true
};

localStorage.setItem("preferences", JSON.stringify(userPreferences));

const storedPreferences = JSON.parse(localStorage.getItem("preferences"));
console.log("Parsed Object from LocalStorage:", storedPreferences.language);