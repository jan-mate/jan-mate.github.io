"use strict";
function calculateAge() {
    const birthDate = new Date('2004-02-05T13:55:00');
    const now = new Date();
    const ageInMilliseconds = now.getTime() - birthDate.getTime();
    // Convert milliseconds to years
    const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.2425);
    // Display the age with many decimals
    const ageElement = document.getElementById('age');
    if (ageElement) {
        ageElement.textContent = ageInYears.toFixed(10) + " yo";
    }
}
// Function to set the rainbow text
function setRainbowText() {
    const text = "rainbow";
    const rainbowElement = document.getElementById('rainbow-text');
    if (rainbowElement) {
        rainbowElement.innerHTML = text.split('').map((char, index) => {
            return `<span>${char}</span>`;
        }).join('');
    }
}
setInterval(calculateAge, 10); // Update the age every 10 milliseconds
calculateAge(); // Initial call to display age immediately
setRainbowText(); // Set the rainbow text once on load
