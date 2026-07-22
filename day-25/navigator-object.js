console.log("Browser Info (User Agent):", navigator.userAgent);
console.log("Browser Language:", navigator.language);
console.log("Is user online?", navigator.onLine);

if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log("Latitude:", position.coords.latitude);
            console.log("Longitude:", position.coords.longitude);
        },
        (error) => {
            console.error("Geolocation error:", error.message);
        }
    );
} else {
    console.log("Geolocation is not supported by this browser.");
}