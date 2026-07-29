import { properties } from './data.js';

const container = document.getElementById('property-container');

function renderProperties(data) {
    // Clear the container before rendering
    container.innerHTML = '';

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

// Initial render when the script loads
renderProperties(properties);