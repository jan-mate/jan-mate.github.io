document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map', {
        worldCopyJump: true,
        continuousWorld: true
    }).setView([0, 0], 2);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    // Set your default birthdate and age
    const birthDateString = '2004-02-25 13:55:00 UTC+01:00';
    const defaultAge = 21;

    // Initial map load with default age 21
    plotMap(birthDateString, defaultAge, map);

    // Add event listener to the button
    document.getElementById('birthdayAgeButton').addEventListener('click', () => {
        const age = parseInt(document.getElementById('birthdayAge').value);
        plotMap(birthDateString, age, map);
    });
});

let legend = null;  // Variable to store the current legend

function plotMap(birthDateString, age, map) {
    // Fetch and process the GeoJSON data
    fetch('combined_simplified.json')
        .then(response => response.json())
        .then(geojsonData => {
            const futureDateTime = calculateFutureDate(birthDateString, age);

            // Remove existing GeoJSON layers if any
            map.eachLayer(layer => {
                if (layer instanceof L.GeoJSON) {
                    map.removeLayer(layer);
                }
            });

            const daysPresent = new Set();

            // Add the GeoJSON layer to the map
            L.geoJSON(geojsonData, {
                style: feature => {
                    if (!feature.geometry) return {}; // Skip invalid features
                    const timezone = feature.properties.tzid;
                    const day = calculateLocalDay(futureDateTime, timezone);
                    daysPresent.add(day);
                    return {
                        fillColor: getColorForDay(day),
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    };
                }
            }).addTo(map);

            // Remove any existing legend
            if (legend) {
                map.removeControl(legend);
            }

            // Add legend with dynamic days
            legend = addLegend(map, Array.from(daysPresent));
        })
        .catch(error => console.error('Error loading GeoJSON:', error));
}

function calculateFutureDate(birthDateString, age) {
    const dateTimeMatch = birthDateString.match(/(.*)\sUTC([+-]\d{2}):(\d{2})/);
    if (!dateTimeMatch) {
        console.error("Invalid date format");
        return null;
    }

    const dateTimePart = dateTimeMatch[1];
    const timezoneOffsetHours = parseInt(dateTimeMatch[2], 10);
    const timezoneOffsetMinutes = parseInt(dateTimeMatch[3], 10);
    const timezoneOffsetTotalMinutes = timezoneOffsetHours * 60 + Math.sign(timezoneOffsetHours) * timezoneOffsetMinutes;

    const birthDateTime = new Date(dateTimePart.replace(' ', 'T') + 'Z');
    const adjustedBirthDateTime = new Date(birthDateTime.getTime() - timezoneOffsetTotalMinutes * 60 * 1000);

    const secondsInYear = 365.2425 * 24 * 60 * 60; // seconds in a Gregorian year
    const millisecondsInYear = secondsInYear * 1000;

    return new Date(adjustedBirthDateTime.getTime() + age * millisecondsInYear);
}

function calculateLocalDay(date, timezone) {
    try {
        const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
        return localDate.getDate();  // Get the day of the month
    } catch (error) {
        console.error(`Error calculating local day for timezone ${timezone}:`, error);
        return null;
    }
}

function getColorForDay(day) {
    const colors = [
        'rgb(255, 0, 0)',  // Red
        'rgb(0, 255, 0)',  // Green
        'rgb(0, 0, 255)',  // Blue
        'rgb(255, 255, 0)', // Yellow
        'rgb(0, 255, 255)'  // Cyan
    ];
    return colors[day % colors.length] || 'rgb(128, 128, 128)'; // Default to gray if out of range
}

function addLegend(map, daysPresent) {
    const newLegend = L.control({ position: 'bottomright' });

    newLegend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        const colors = [
            'rgb(255, 0, 0)',  // Red
            'rgb(0, 255, 0)',  // Green
            'rgb(0, 0, 255)',  // Blue
            'rgb(255, 255, 0)', // Yellow
            'rgb(0, 255, 255)'  // Cyan
        ];

        daysPresent.sort().forEach(day => {
            const color = getColorForDay(day);
            div.innerHTML += `<i style="background:${color};"></i>${day}<br>`;
        });

        return div;
    };

    newLegend.addTo(map);
    return newLegend;  // Return the new legend control
}