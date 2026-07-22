const stationDatabase = [
    { id: 1, name: "Placa Catalunya", zone: 1 },
    { id: 2, name: "Gracia", zone: 1 },
    { id: 3, name: "Volpelleres", zone: 2 },
    { id: 4, name: "Sabadell Parc del Nord", zone: 2 },
    { id: 5, name: "Terrassa Estacio", zone: 3 }
];

const userTicket = {
    type: "T-usual",
    validZones: [1] 
};

function fetchStationData(stationName) {
    return new Promise((resolve, reject) => {
        console.log(`Connecting to transport server to find ${stationName}...`);
        
        setTimeout(() => {
            const station = stationDatabase.find(s => s.name.toLowerCase() === stationName.toLowerCase());
            if (station) {
                resolve(station);
            } else {
                reject(new Error("Station not found in the network."));
            }
        }, 1500); 
    });
}

async function validateTicket(stationName) {
    try {
        const station = await fetchStationData(stationName);
        console.log(`Station: ${station.name} is in Zone ${station.zone}.`);
        
        if (userTicket.validZones.includes(station.zone)) {
            console.log(`✅ Access Granted. Your ${userTicket.type} is valid for this zone.`);
        } else {
            console.log(`❌ Access Denied. Your ${userTicket.type} is only valid for Zone(s): ${userTicket.validZones.join(", ")}.`);
        }
    } catch (error) {
        console.error("System Error:", error.message);
    } finally {
        console.log("Transaction completed.\n");
    }
}

async function runSystem() {
    console.log("--- Transport Validation System ---");
    await validateTicket("Gracia");
    await validateTicket("Volpelleres");
    await validateTicket("Fake Station");
}

runSystem();