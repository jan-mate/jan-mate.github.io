const lifeExpectancy = 85;
let timezoneOffsetTotalMinutes;

let birthdayChartUTC, birthdayChartOriginal; // Declare the chart variables outside to allow updating

function calculateFutureDates() {
    const birthDateString = document.getElementById('birthDate').value;
    const minAge = parseInt(document.getElementById('minAge').value);
    const maxAge = parseInt(document.getElementById('maxAge').value);

    if (isNaN(minAge) || isNaN(maxAge) || minAge < 0 || maxAge < 0 || minAge > maxAge) {
        alert("Please enter valid minimum and maximum ages. Minimum age must be 0 or greater and less than or equal to maximum age.");
        return;
    }

    const dateTimeMatch = birthDateString.match(/(.*)\sUTC([+-]\d{2}):(\d{2})/);

    if (!dateTimeMatch) {
        alert("Please enter the datetime in the correct ISO format (YYYY-MM-DD HH:MM:SS UTC±hh:mm).");
        return;
    }

    const dateTimePart = dateTimeMatch[1];
    const timezoneOffsetHours = parseInt(dateTimeMatch[2], 10);
    const timezoneOffsetMinutes = parseInt(dateTimeMatch[3], 10);
    timezoneOffsetTotalMinutes = timezoneOffsetHours * 60 + Math.sign(timezoneOffsetHours) * timezoneOffsetMinutes;

    const birthDateTime = new Date(dateTimePart.replace(' ', 'T') + 'Z');
    const adjustedBirthDateTime = new Date(birthDateTime.getTime() - timezoneOffsetTotalMinutes * 60 * 1000);

    if (isNaN(adjustedBirthDateTime.getTime())) {
        alert("Please enter a valid ISO format datetime (YYYY-MM-DD HH:MM:SS).");
        return;
    }

    const secondsInYear = 365.2425 * 24 * 60 * 60; // seconds in a Gregorian year
    const futureDatesTable = document.getElementById('futureDatesTable').getElementsByTagName('tbody')[0];
    futureDatesTable.innerHTML = ''; // Clear previous results

    const datesUTC = [];
    const datesOriginal = [];
    const ages = [];
    let minDay = Number.MAX_SAFE_INTEGER;
    let maxDay = Number.MIN_SAFE_INTEGER;

    for (let age = minAge; age <= maxAge; age++) {
        let futureDateTime;

        if (age === 0) {
            futureDateTime = new Date(adjustedBirthDateTime.getTime());
        } else {
            const totalMillisecondsToAdd = age * secondsInYear * 1000;
            futureDateTime = new Date(adjustedBirthDateTime.getTime() + totalMillisecondsToAdd);
        }

        let futureDateFormattedUTC = futureDateTime.toISOString().replace('T', ' ').split('.')[0];

        const futureDateInOriginalOffset = new Date(futureDateTime.getTime() + timezoneOffsetTotalMinutes * 60 * 1000);
        let futureDateFormattedOriginal = futureDateInOriginalOffset.toISOString().replace('T', ' ').split('.')[0];

        const dateParts = futureDateFormattedOriginal.split(' ');
        const datePart = dateParts[0].split('-');
        const day = parseInt(datePart[2], 10);
        minDay = Math.min(minDay, day);
        maxDay = Math.max(maxDay, day);
        datePart[2] = `<span class="underline">${day.toString().padStart(2, '0')}</span>`;
        futureDateFormattedOriginal = datePart.join('-') + ' ' + dateParts[1];

        const newRow = futureDatesTable.insertRow();
        const cellAge = newRow.insertCell(0);
        const cellDateUTC = newRow.insertCell(1);
        const cellDateOriginal = newRow.insertCell(2);

        cellAge.textContent = age;
        cellDateUTC.innerHTML = `${futureDateFormattedUTC} UTC`;
        cellDateOriginal.innerHTML = `${futureDateFormattedOriginal} UTC${dateTimeMatch[2]}:${dateTimeMatch[3]}`;

        datesUTC.push(parseInt(futureDateFormattedUTC.split(' ')[0].split('-')[2], 10));
        datesOriginal.push(day);
        ages.push(age);
    }

    if (birthdayChartUTC) {
        birthdayChartUTC.destroy();
    }
    if (birthdayChartOriginal) {
        birthdayChartOriginal.destroy();
    }

    plotBirthdaysUTC(ages, datesUTC, minDay, maxDay);
    plotBirthdaysOriginal(ages, datesOriginal, minDay, maxDay);
    calculateFrequencies(datesUTC, datesOriginal, minAge, maxAge, adjustedBirthDateTime);
}

function plotBirthdaysUTC(ages, dates, minDay, maxDay) {
    const ctx = document.getElementById('birthdayChartUTC').getContext('2d');
    birthdayChartUTC = new Chart(ctx, {
        type: 'scatter',
        data: {
            labels: ages,
            datasets: [{
                data: ages.map((age, index) => ({ x: age, y: dates[index] })),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                showLine: false,
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Birthdays in UTC',
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Day of Month'
                    },
                    ticks: {
                        stepSize: 1
                    },
                    min: minDay,
                    max: maxDay
                },
                x: {
                    title: {
                        display: true,
                        text: 'Age'
                    },
                    type: 'linear',
                    min: Math.min(...ages),
                    max: Math.max(...ages)
                }
            }
        }
    });
}

function plotBirthdaysOriginal(ages, dates, minDay, maxDay) {
    const ctx = document.getElementById('birthdayChartOriginal').getContext('2d');
    birthdayChartOriginal = new Chart(ctx, {
        type: 'scatter',
        data: {
            labels: ages,
            datasets: [{
                data: ages.map((age, index) => ({ x: age, y: dates[index] })),
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
                showLine: false,
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: `Birthdays in ${document.getElementById('birthDate').value.split(' ')[2]}`,
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Day of Month'
                    },
                    ticks: {
                        stepSize: 1
                    },
                    min: minDay,
                    max: maxDay
                },
                x: {
                    title: {
                        display: true,
                        text: 'Age'
                    },
                    type: 'linear',
                    min: Math.min(...ages),
                    max: Math.max(...ages)
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    calculateFutureDates();
});

function calculateFrequencies(datesUTC, datesOriginal, minAge, maxAge, birthDateTime) {
    const modularFrequencyUTC = calculateFrequency(datesUTC);
    const lifeExpectancyDatesUTC = generateDates(birthDateTime, lifeExpectancy);
    const lifeExpectancyFrequencyUTC = calculateFrequency(lifeExpectancyDatesUTC);
    const years400DatesUTC = generateDates(birthDateTime, 400);
    const years400FrequencyUTC = calculateFrequency(years400DatesUTC);

    const modularFrequencyLocal = calculateFrequency(datesOriginal);
    const lifeExpectancyDatesLocal = generateDates(birthDateTime, lifeExpectancy, true);
    const lifeExpectancyFrequencyLocal = calculateFrequency(lifeExpectancyDatesLocal);
    const years400DatesLocal = generateDates(birthDateTime, 400, true);
    const years400FrequencyLocal = calculateFrequency(years400DatesLocal);

    displayFrequencyTable(modularFrequencyUTC, 'frequencyTableUTCModular', minAge, maxAge);
    displayFrequencyTable(lifeExpectancyFrequencyUTC, 'frequencyTableUTCLifeExpectancy', 0, lifeExpectancy);
    displayFrequencyTable(years400FrequencyUTC, 'frequencyTableUTC400Years', 0, 400);

    displayFrequencyTable(modularFrequencyLocal, 'frequencyTableLocalModular', minAge, maxAge);
    displayFrequencyTable(lifeExpectancyFrequencyLocal, 'frequencyTableLocalLifeExpectancy', 0, lifeExpectancy);
    displayFrequencyTable(years400FrequencyLocal, 'frequencyTableLocal400Years', 0, 400);
}

function generateDates(birthDateTime, years, isLocal = false) {
    const dates = [];
    const secondsInYear = 365.2425 * 24 * 60 * 60;

    for (let age = 0; age <= years; age++) {
        const totalSecondsToAdd = age * secondsInYear;
        const futureDateTime = new Date(birthDateTime.getTime() + totalSecondsToAdd * 1000);

        let futureDateFormatted;
        if (isLocal) {
            const futureDateInOriginalOffset = new Date(futureDateTime.getTime() + timezoneOffsetTotalMinutes * 60 * 1000);
            futureDateFormatted = futureDateInOriginalOffset.toISOString().split('T')[0];
        } else {
            futureDateFormatted = futureDateTime.toISOString().split('T')[0];
        }

        const day = parseInt(futureDateFormatted.split('-')[2], 10);
        dates.push(day);
    }

    return dates;
}

function calculateFrequency(dates) {
    return dates.reduce((acc, day) => {
        acc[day] = (acc[day] || 0) + 1;
        return acc;
    }, {});
}

function displayFrequencyTable(dayCounts, tableId, startAge, endAge) {
    const frequencyTable = document.getElementById(tableId);
    frequencyTable.innerHTML = ''; // Clear any existing content

    const caption = frequencyTable.createCaption();
    caption.innerHTML = `<strong>Frequency Table for Ages ${startAge} to ${endAge}</strong>`;

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Day</th>
            <th>Frequency</th>
        </tr>`;
    frequencyTable.appendChild(thead);

    const tbody = document.createElement('tbody');
    let totalDays = 0;
    let totalCount = 0;

    for (let day = 1; day <= 31; day++) {
        const count = dayCounts[day] || 0;
        if (count > 0) {  // Only display rows where the count is greater than 0
            const newRow = tbody.insertRow();
            const cellDay = newRow.insertCell(0);
            const cellCount = newRow.insertCell(1);

            cellDay.innerHTML = `${day}`;
            cellCount.textContent = count;

            totalDays += day * count;
            totalCount += count;
        }
    }

    const averageDay = (totalCount > 0) ? (totalDays / totalCount).toFixed(2) : 0;

    const averageRow = tbody.insertRow();
    const averageCellDay = averageRow.insertCell(0);
    const averageCellCount = averageRow.insertCell(1);
    averageCellDay.textContent = 'Average';
    averageCellCount.textContent = averageDay;

    frequencyTable.appendChild(tbody);
}