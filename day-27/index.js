const appContainer = document.createElement("div");
appContainer.id = "weather-app";
appContainer.style.fontFamily = "Arial, sans-serif";
document.body.appendChild(appContainer);

const title = document.createElement("h1");
title.textContent = "Weather Forecast App";
appContainer.appendChild(title);

const inputField = document.createElement("input");
inputField.setAttribute("type", "text");
inputField.setAttribute("placeholder", "Enter city name...");
appContainer.appendChild(inputField);

const searchButton = document.createElement("button");
searchButton.textContent = "Get Weather";
searchButton.style.marginLeft = "10px";
appContainer.appendChild(searchButton);

const resultContainer = document.createElement("div");
resultContainer.style.marginTop = "20px";
appContainer.appendChild(resultContainer);

async function fetchWeather(city) {
    try {
        resultContainer.textContent = "Loading...";
        resultContainer.style.color = "black";
        
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Please check the spelling.");
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const weatherData = await weatherResponse.json();

        const temperature = weatherData.current_weather.temperature;
        const windspeed = weatherData.current_weather.windspeed;

        resultContainer.innerHTML = `
            <h2>${name}, ${country}</h2>
            <p><strong>Temperature:</strong> ${temperature}°C</p>
            <p><strong>Wind Speed:</strong> ${windspeed} km/h</p>
        `;
    } catch (error) {
        resultContainer.textContent = `Error: ${error.message}`;
        resultContainer.style.color = "red";
    }
}

searchButton.addEventListener("click", () => {
    const city = inputField.value.trim();
    if (city !== "") {
        fetchWeather(city);
    } else {
        resultContainer.textContent = "Please enter a city name before searching.";
        resultContainer.style.color = "red";
    }
});