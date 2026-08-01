import { properties } from './data.js';

// DOM Elements
const container = document.getElementById('property-container');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const zoneFilter = document.getElementById('zone-filter');
const priceSlider = document.getElementById('price-slider');
const priceDisplay = document.getElementById('price-display');
const resetBtn = document.getElementById('reset-filters');
const toggleFavBtn = document.getElementById('toggle-favorites');

// Modal DOM Elements
const modalOverlay = document.getElementById('property-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalBody = document.getElementById('modal-body');

// State Management
let favorites = JSON.parse(localStorage.getItem('saved_properties')) || [];
let showFavoritesOnly = false;

// Function to handle saving/removing from favorites
function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(favId => favId !== id);
    } else {
        favorites.push(id);
    }
    
    localStorage.setItem('saved_properties', JSON.stringify(favorites));
    applyFilters(); 
}

// Function to open modal and display property details
function openModal(id) {
    const property = properties.find(p => p.id === id);
    if (!property) return;

    const typeClass = property.type === 'Co-living' ? 'badge-coliving' : 'badge-apartment';
    
    const amenitiesHTML = property.amenities.map(amenity => `<li>✔️ ${amenity}</li>`).join('');

    modalBody.innerHTML = `
        <h2 style="margin-top: 0;">${property.title}</h2>
        <p><strong>Location:</strong> ${property.location}</p>
        <p><strong>Price:</strong> €${property.price} / month</p>
        <div style="margin-bottom: 20px;">
            <span class="badge ${typeClass}">${property.type}</span>
            <span class="badge badge-transit">${property.transitZone}</span>
        </div>
        <p style="font-size: 16px; line-height: 1.5; color: #444;">${property.description}</p>
        <h3 style="margin-bottom: 10px;">Amenities</h3>
        <ul class="amenities-list">
            ${amenitiesHTML}
        </ul>
        <button class="view-details-btn" style="margin-top: 20px;" onclick="alert('Contact feature coming soon!')">Contact Owner</button>
    `;

    modalOverlay.classList.remove('hidden');
}

// Function to close modal
function closeModal() {
    modalOverlay.classList.add('hidden');
}

// Event listeners for closing modal
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
        closeModal();
    }
});

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
        const isFav = favorites.includes(property.id);

        card.innerHTML = `
            <div class="card-header">
                <h2>${property.title}</h2>
                <button class="heart-btn" data-id="${property.id}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
            </div>
            <p><strong>Location:</strong> ${property.location}</p>
            <p><strong>Price:</strong> €${property.price} / month</p>
            <div style="margin-top: 15px; margin-bottom: 15px;">
                <span class="badge ${typeClass}">${property.type}</span>
                <span class="badge badge-transit">${property.transitZone}</span>
            </div>
            <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
                🚆 ${property.transitDetail}
            </p>
            <button class="view-details-btn" data-id="${property.id}">View Details</button>
        `;

        // Add event listener to the individual heart button
        const heartBtn = card.querySelector('.heart-btn');
        heartBtn.addEventListener('click', () => toggleFavorite(property.id));

        // Add event listener to the view details button
        const detailsBtn = card.querySelector('.view-details-btn');
        detailsBtn.addEventListener('click', () => openModal(property.id));

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
        const matchesSearch = property.title.toLowerCase().includes(searchTerm) || 
                              property.location.toLowerCase().includes(searchTerm);
        const matchesType = selectedType === 'All' || property.type === selectedType;
        const matchesZone = selectedZone === 'All' || property.transitZone === selectedZone;
        const matchesPrice = property.price <= maxPrice;
        const matchesFavorites = showFavoritesOnly ? favorites.includes(property.id) : true;

        return matchesSearch && matchesType && matchesZone && matchesPrice && matchesFavorites;
    });

    renderProperties(filteredData);
}

// Event Listeners for Filters
searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
zoneFilter.addEventListener('change', applyFilters);
priceSlider.addEventListener('input', (event) => {
    priceDisplay.textContent = event.target.value;
    applyFilters();
});

// Toggle Favorites Only View
toggleFavBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    toggleFavBtn.classList.toggle('active');
    applyFilters();
});

// Reset Functionality
resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    typeFilter.value = 'All';
    zoneFilter.value = 'All';
    priceSlider.value = 1500;
    priceDisplay.textContent = '1500';
    
    showFavoritesOnly = false;
    toggleFavBtn.classList.remove('active');
    
    applyFilters();
});

// Initial Render
applyFilters();