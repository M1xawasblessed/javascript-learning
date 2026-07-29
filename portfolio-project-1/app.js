import { properties } from './data.js';

// DOM Elements
const container = document.getElementById('property-container');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const zoneFilter = document.getElementById('zone-filter');
const priceSlider = document.getElementById('price-slider');
const priceDisplay = document.getElementById('price-display');
const resetBtn = document.getElementById('reset-filters');

// Render function
function renderProperties(data) {
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<div class="no-results">No properties match your exact criteria.</div>`;
        return;
    }

    data.forEach(property => {
        const card = document.createElement('div');
        card.className = 'property-card';
        const typeClass = property.type === 'Co-living' ? 'badge-coliving' : 'badge-apartment';

        card.innerHTML = `
            <h2>${property.title}</h2>
            <p><strong>Location:</strong> ${property.location}</p>
            <p><strong>Price:</strong> €${property.price} / month</p>
            <div style="margin-top: 15px;">
                <span class="badge ${typeClass}">${property.type}</span>
                <span class="badge badge-transit">${property.transitZone}</span>
            </div>
            <p style="font-size: 14px; color: #555; margin-top: 15px;">
                🚆 ${property.transitDetail}
            </p>
        `;
        container.appendChild(card);
    });
}

// Master filter function
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedType = typeFilter.value;
    const selectedZone = zoneFilter.value;
    const maxPrice = parseInt(priceSlider.value, 10);

    const filteredData = properties.filter(property => {
        // 1. Text Search (checks both title and location)
        const matchesSearch = property.title.toLowerCase().includes(searchTerm) || 
                              property.location.toLowerCase().includes(searchTerm);
        
        // 2. Dropdown Match (if 'All' is selected, condition is true)
        const matchesType = selectedType === 'All' || property.type === selectedType;
        const matchesZone = selectedZone === 'All' || property.transitZone === selectedZone;
        
        // 3. Price Range Match
        const matchesPrice = property.price <= maxPrice;

        // Return true only if ALL conditions are met
        return matchesSearch && matchesType && matchesZone && matchesPrice;
    });

    renderProperties(filteredData);
}

// Event Listeners for Filters
searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
zoneFilter.addEventListener('change', applyFilters);

// Update slider display value dynamically and filter
priceSlider.addEventListener('input', (event) => {
    priceDisplay.textContent = event.target.value;
    applyFilters();
});

// Reset Functionality
resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    typeFilter.value = 'All';
    zoneFilter.value = 'All';
    priceSlider.value = 1500;
    priceDisplay.textContent = '1500';
    renderProperties(properties);
});

// Initial Render
renderProperties(properties);