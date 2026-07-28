const appContainer = document.createElement("div");
appContainer.id = "smart-home-panel";
appContainer.style.fontFamily = "Arial, sans-serif";
appContainer.style.maxWidth = "400px";
appContainer.style.margin = "0 auto";
appContainer.style.padding = "20px";
appContainer.style.border = "2px solid #333";
appContainer.style.borderRadius = "10px";
document.body.appendChild(appContainer);

const title = document.createElement("h1");
title.textContent = "Smart Home Dashboard";
title.style.textAlign = "center";
appContainer.appendChild(title);

const defaultState = {
    livingRoom: { lightOn: false, temperature: 22 },
    bedroom: { lightOn: false, temperature: 20 },
    kitchen: { lightOn: true, temperature: 24 }
};

let homeState = JSON.parse(localStorage.getItem("smart_home_state")) || defaultState;

function saveState() {
    localStorage.setItem("smart_home_state", JSON.stringify(homeState));
}

function createRoomPanel(roomName, roomKey) {
    const roomDiv = document.createElement("div");
    roomDiv.style.border = "1px solid #ccc";
    roomDiv.style.padding = "15px";
    roomDiv.style.marginBottom = "15px";
    roomDiv.style.borderRadius = "5px";
    roomDiv.style.backgroundColor = "#f9f9f9";

    const roomTitle = document.createElement("h3");
    roomTitle.textContent = roomName;
    roomTitle.style.marginTop = "0";
    roomDiv.appendChild(roomTitle);

    const lightBtn = document.createElement("button");
    const updateLightButton = () => {
        lightBtn.textContent = homeState[roomKey].lightOn ? "Turn Light OFF" : "Turn Light ON";
        lightBtn.style.backgroundColor = homeState[roomKey].lightOn ? "#ffd700" : "#ddd";
    };
    
    updateLightButton();
    lightBtn.style.padding = "8px 12px";
    lightBtn.style.marginRight = "15px";
    lightBtn.style.border = "none";
    lightBtn.style.borderRadius = "4px";
    lightBtn.style.cursor = "pointer";

    lightBtn.addEventListener("click", () => {
        homeState[roomKey].lightOn = !homeState[roomKey].lightOn;
        updateLightButton();
        saveState();
    });
    
    roomDiv.appendChild(lightBtn);

    const tempContainer = document.createElement("span");
    tempContainer.textContent = ` Temp: ${homeState[roomKey].temperature}°C `;
    tempContainer.style.fontWeight = "bold";
    roomDiv.appendChild(tempContainer);

    const tempUpBtn = document.createElement("button");
    tempUpBtn.textContent = "+";
    tempUpBtn.style.padding = "5px 10px";
    tempUpBtn.style.marginLeft = "10px";
    tempUpBtn.style.cursor = "pointer";
    
    tempUpBtn.addEventListener("click", () => {
        homeState[roomKey].temperature++;
        tempContainer.textContent = ` Temp: ${homeState[roomKey].temperature}°C `;
        saveState();
    });
    roomDiv.appendChild(tempUpBtn);

    const tempDownBtn = document.createElement("button");
    tempDownBtn.textContent = "-";
    tempDownBtn.style.padding = "5px 10px";
    tempDownBtn.style.marginLeft = "5px";
    tempDownBtn.style.cursor = "pointer";
    
    tempDownBtn.addEventListener("click", () => {
        homeState[roomKey].temperature--;
        tempContainer.textContent = ` Temp: ${homeState[roomKey].temperature}°C `;
        saveState();
    });
    roomDiv.appendChild(tempDownBtn);

    return roomDiv;
}

appContainer.appendChild(createRoomPanel("Living Room", "livingRoom"));
appContainer.appendChild(createRoomPanel("Bedroom", "bedroom"));
appContainer.appendChild(createRoomPanel("Kitchen", "kitchen"));

const resetBtn = document.createElement("button");
resetBtn.textContent = "Reset All Settings";
resetBtn.style.width = "100%";
resetBtn.style.padding = "12px";
resetBtn.style.marginTop = "10px";
resetBtn.style.backgroundColor = "#ff4d4d";
resetBtn.style.color = "white";
resetBtn.style.border = "none";
resetBtn.style.borderRadius = "5px";
resetBtn.style.cursor = "pointer";

resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset home settings to default?")) {
        localStorage.removeItem("smart_home_state");
        location.reload(); 
    }
});
appContainer.appendChild(resetBtn);