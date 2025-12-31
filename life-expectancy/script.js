const birthdayInput = document.getElementById('birthday');
const ageInput = document.getElementById('age');
const deathAgeInput = document.getElementById('deathAge');
const discountInput = document.getElementById('discount');
const lifeRemainingText = document.getElementById('lifeRemaining');
const tablesContainer = document.getElementById('tables-container');
const footnoteList = document.getElementById('footnote-list');

let selectedAge = 20;
let plotCache = { 20: null, 60: null };

const STUDY_LE = {
    20: { w: 62.5, m: 57.8 },
    60: { w: 25.3, m: 22.4 }
};

const BASELINES = {
    relationship: { w: 31.13, m: 25.49 },
    sleep: { w: 54.3, m: 47.5 }
};

const sources = [
    { text: 'Wikipedia <a href="https://en.wikipedia.org/w/index.php?title=Microlife&oldid=1326290960">Microlife</a>.' },
    { text: "PLOS Med 2022 — Fadnes et al.: <a href=\"https://doi.org/10.1371/journal.pmed.1003889\">Estimating impact of food choices on life expectancy</a>." },
    { text: 'Wikipedia <a href="https://en.wikipedia.org/w/index.php?title=Micromort&oldid=1323026465">Micromort</a>.' },
    { text: 'Wikipedia <a href="https://en.wikipedia.org/w/index.php?title=Travel&oldid=1304716333#Safety">Travel</a>.' },
    { text: "J. Demogr. Econ 2023 — K. Lamb et al.: <a href=\"https://doi.org/10.1017/dem.2023.10\">The effect of marital status on life expectancy: Is cohabitation as protective as marriage?</a>." },
    { text: "QJM 2024 — Li et al.: <a href=\"https://doi.org/10.1093/qjmed/hcad237\">Association of healthy sleep patterns with risk of mortality and life expectancy at age of 30 years: a population-based cohort study</a>." },
    { text: 'AQLI / Ebenstein et al. (2017): <a href="https://doi.org/10.1073/pnas.1616784114">Huai River Study</a>.<br> <a href=\"https://aqli.epic.uchicago.edu/indexMap?selectedRegion=null&years=%5B2023%5D&typeDataStandard=%22pm%22\">Find the air pollution levels for your location.</a>.' },
    { text: 'Omni Calculator: <a href="https://www.omnicalculator.com/health/addiction">Addiction Calculator</a>.' },
    { text: 'Activesafe / McIntosh et al. (2008): <a href="https://activesafe.ca/wp-content/uploads/2018/04/Hiking.pdf">Hiking & Mountaineering Evidence Summary</a>.' },
    { text: 'Gatterer et al. (2019): <a href="https://www.researchgate.net/publication/336585782_Mortality_in_Different_Mountain_Sports_Activities_Primarily_Practiced_in_the_Summer_Season-A_Narrative_Review">Mortality in Different Mountain Sports Activities</a>.<br>Based on Austrian hikers and an estimated 7 hiking days per year. Acute mortality risk only; health benefits of exercise are not accounted for.' },
];

const categories = [
    {
        title: "Lifestyle",
        subtitle: "Based on estimated life expectancy effects for adults aged 35 years.",
        type: "microlife",
        rows: [
            { name: "2h watching TV", w: -30, m: -30, note: 1 },
            { name: "Exercise (first 20 min)", w: 60, m: 60, note: 1 },
            { name: "Exercise (subsequent 40 min)", w: 15, m: 30, note: 1 },
            { name: "Taking a statin", w: 30, m: 30, note: 1 },
            { name: "BMI above 22.5 (per 5 unit increase)", w: -90, m: -90, note: 1 },
        ]
    },
    {
        title: "Food",
        subtitle: "Life expectancy gained per day relative to typical Western diet if sustained from selected age.",
        type: "food",
        rows: [
            { group: "Legumes", shift: "0g → 200g", w20: { y: 2.2, ui: [1.1, 3.4] }, m20: { y: 2.5, ui: [1.1, 3.9] }, w60: { y: 1.6, ui: [0.8, 2.4] }, m60: { y: 1.6, ui: [0.8, 2.5] }, note: 2 },
            { group: "Whole grains", shift: "50g → 225g", w20: { y: 2.0, ui: [1.3, 2.7] }, m20: { y: 2.3, ui: [1.6, 3.0] }, w60: { y: 1.4, ui: [0.9, 1.8] }, m60: { y: 1.5, ui: [1.0, 2.0] }, note: 2 },
            { group: "Nuts", shift: "0g → 25g", w20: { y: 1.7, ui: [1.5, 2.0] }, m20: { y: 2.0, ui: [1.7, 2.3] }, w60: { y: 1.2, ui: [1.1, 1.4] }, m60: { y: 1.3, ui: [1.1, 1.5] }, note: 2 },
            { group: "Fish", shift: "50g → 200g", w20: { y: 0.5, ui: [-0.2, 1.2] }, m20: { y: 0.6, ui: [-0.3, 1.5] }, w60: { y: 0.4, ui: [-0.1, 0.9] }, m60: { y: 0.4, ui: [-0.2, 1.0] }, note: 2 },
            { group: "Fruit", shift: "200g → 400g", w20: { y: 0.4, ui: [-0.1, 0.9] }, m20: { y: 0.4, ui: [-0.2, 1.0] }, w60: { y: 0.3, ui: [-0.1, 0.7] }, m60: { y: 0.3, ui: [-0.1, 0.7] }, note: 2 },
            { group: "Vegetables", shift: "250g → 400g", w20: { y: 0.3, ui: [-0.7, 1.3] }, m20: { y: 0.4, ui: [-0.8, 1.6] }, w60: { y: 0.2, ui: [-0.6, 1.0] }, m60: { y: 0.2, ui: [-0.6, 1.0] }, note: 2 },
            { group: "White meat", shift: "75g → 50g", w20: { y: 0, ui: [-1.9, 1.9] }, m20: { y: 0, ui: [-2.4, 2.4] }, w60: { y: 0, ui: [-1.5, 1.5] }, m60: { y: 0, ui: [-1.6, 1.6] }, note: 2 },
            { group: "Milk/dairy", shift: "300g → 200g", w20: { y: 0.1, ui: [-0.2, 0.3] }, m20: { y: 0.1, ui: [-0.3, 0.5] }, w60: { y: 0.1, ui: [-0.1, 0.3] }, m60: { y: 0.1, ui: [-0.1, 0.3] }, note: 2 },
            { group: "Eggs", shift: "50g → 25g", w20: { y: 0.7, ui: [-0.3, 1.7] }, m20: { y: 0.8, ui: [-0.3, 1.9] }, w60: { y: 0.5, ui: [-0.2, 1.2] }, m60: { y: 0.5, ui: [-0.2, 1.2] }, note: 2 },
            { group: "Refined grains", shift: "150g → 50g", w20: { y: 0.7, ui: [-0.4, 2.2] }, m20: { y: 1.1, ui: [-0.4, 2.6] }, w60: { y: 0.7, ui: [-0.2, 1.6] }, m60: { y: 0.7, ui: [-0.2, 1.6] }, note: 2 },
            { group: "Sugary Beverages", shift: "500g → 0g", w20: { y: 1.1, ui: [0.4, 1.9] }, m20: { y: 1.3, ui: [0.4, 2.2] }, w60: { y: 0.8, ui: [0.3, 1.4] }, m60: { y: 0.8, ui: [0.2, 1.4] }, note: 2 },
            { group: "Red meat", shift: "100g → 0g", w20: { y: 1.6, ui: [1.5, 1.8] }, m20: { y: 1.9, ui: [1.7, 2.1] }, w60: { y: 1.2, ui: [1.1, 1.3] }, m60: { y: 1.2, ui: [1.1, 1.3] }, note: 2 },
            { group: "Processed meat", shift: "50g → 0g", w20: { y: 1.6, ui: [1.5, 1.8] }, m20: { y: 1.9, ui: [1.7, 2.1] }, w60: { y: 1.2, ui: [1.1, 1.3] }, m60: { y: 1.2, ui: [1.1, 1.3] }, note: 2 }
        ]
    },
    {
        title: "Travel",
        subtitle: "Expected minutes lost based on probability of death for distance or time.<br>Based on US historical data (pre-2000).<br>Acute risk only. Excludes exercise benefits, sedentary harms, and risk to others.",
        type: "micromort",
        rows: [
            { name: "Motorcycle", km: 10.9, hr: 4.84, note: 4 },
            { name: "Walking", km: 5.4, hr: 0.22, note: 4 },
            { name: "Bicycle", km: 4.5, hr: 0.55, note: 4 },
            { name: "Car", km: 0.31, hr: 0.13, note: 4 },
            { name: "Van", km: 0.12, hr: 0.06, note: 4 },
            { name: "Ship", km: 0.26, hr: 0.05, note: 4 },
            { name: "Rail", km: 0.06, hr: 0.03, note: 4 },
            { name: "Bus", km: 0.04, hr: 0.0111, note: 4 },
            { name: "Air", km: 0.005, hr: 0.0308, note: 4 }
        ]
    },
    {
        title: "Relationships & Housing",
        subtitle: "Minutes of life gained per day compared to living alone (Never Married), based on 50-year-old Danish cohort (2015-2019 data).",
        type: "years-to-mins",
        baselineGroup: "relationship",
        rows: [
            { name: "Married", w: 36.39, m: 33.55, note: 5 },
            { name: "Widowed-cohabitation", w: 37.38, m: 34.85, note: 5 },
            { name: "Never Married-cohabitation", w: 33.94, m: 32.45, note: 5 },
            { name: "Divorced-cohabitation", w: 34.86, m: 32.80, note: 5 },
            { name: "Widowed", w: 32.75, m: 27.39, note: 5 },
            { name: "Divorced", w: 31.91, m: 26.66, note: 5 },
            { name: "Never married (Baseline)", w: 31.13, m: 25.49, note: 5 }
        ]
    },
    {
        title: "Sleep Habits",
        subtitle: "Minutes earned per day based on the number of healthy habits maintained, compared to poor sleep (0-1 habits). Based on 30-year-old US adults.<br>The healthy habits:",
        numberedList: [
            "Sleep duration of 7–8 hours per day",
            "Difficulty falling asleep ≤ 2 times per week",
            "Trouble staying asleep ≤ 2 times per week",
            "No use of any sleep medication",
            "Waking up feeling well rested ≥ 5 days per week"
        ],
        type: "years-to-mins",
        baselineGroup: "sleep",
        rows: [
            { name: "5 Healthy Sleep Habits", w: 56.7, m: 52.2, note: 6 },
            { name: "4 Healthy Sleep Habits", w: 55.7, m: 50.7, note: 6 },
            { name: "3 Healthy Sleep Habits", w: 55.4, m: 49.7, note: 6 },
            { name: "2 Healthy Sleep Habits", w: 55.3, m: 48.9, note: 6 },
            { name: "0-1 Sleep Habits (Baseline)", w: 54.3, m: 47.5, note: 6 }
        ]
    },
    {
        title: "Chronic Substance Use",
        subtitle: "Time shortened per dose on average IF you are a chronic user.",
        type: "static-impact",
        rows: [
            { name: "Heroin", unit: "per injection", val: -1440, note: 8 },
            { name: "Methadone", unit: "per pill", val: -882, note: 8 },
            { name: "Methamphetamine", unit: "per hit", val: -552, note: 8 },
            { name: "Cocaine", unit: "per dose, ≈166mg", val: -396, note: 8 },
            { name: "Alcohol", unit: "per 14g alcohol", val: -390, note: 8 },
            { name: "Cigarettes", unit: "per cigarette", val: -14.1, note: 8 }
        ]
    },
    {
        title: "Other",
        subtitle: "Acute risks only. This calculation excludes the long-term benefits of these actions, such as protection from disease via vaccination or the life-extending social effects of having children.",
        type: "micromort",
        rows: [
            { name: "Mt. Everest ascent", rate: 37932, unit: "per successful ascent", note: 3 },
            { name: "Matterhorn ascent", rate: 2840, unit: "per attempted ascent", note: 3 },
            { name: "Mountaineering", rate: 130, unit: "per hour", note: 9 },
            { name: "Mountain Hiking in Austria", rate: 5.7 / 2, unit: "per hour", note: 10 },

            { name: "BASE jumping", rate: 430, unit: "per jump", note: 3 },
            { name: "Paragliding", rate: 74, unit: "per launch", note: 3 },

            { name: "Skydiving", rate: 8, unit: "per jump", note: 3 },
            { name: "Hang gliding", rate: 8, unit: "per flight", note: 3 },
            { name: "Scuba diving (BSAC/DAN)", rate: 5, unit: "per dive", note: 3 },
            { name: "Scuba diving (non-BSAC UK)", rate: 10, unit: "per dive", note: 3 },
            { name: "Skiing", rate: 0.7, unit: "per day", note: 3 },
            { name: "Giving birth (Caesarean)", rate: 170, unit: "per event", note: 3 },
            { name: "Giving birth (Vaginal)", rate: 120, unit: "per event", note: 3 },
            
            { name: "Homicide and non-negligent manslaughter (US)", rate: 0.1314, unit: "per day", note: 3 },
            { name: "Homicide (Canada)", rate: 0.0411, unit: "per day", note: 3 },
            { name: "Homicide (England and Wales)", rate: 0.0274, unit: "per day", note: 3 },
            
            
            { name: "AstraZeneca Covid-19 vaccination", rate: 2.9, unit: "per dose", note: 3 },
            
            { name: "Air Pollution (for every +10µg/m³ PM₂.₅ above 5µg/m³)", aqli: 0.98, unit: "per day", note: 7 },
            
        ]
    }
];

function formatISO(num) {
    let rounded = Math.round(Math.abs(num));
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
}

function getDiscountedMins(years, ratePercent) {
    if (ratePercent <= 0) return years * 525949.2;
    const r = ratePercent / 100;
    return 525949.2 * (1 - Math.pow(1 + r, -years)) / Math.log(1 + r);
}

async function loadPlot(age) {
    const target = document.getElementById('food-plot');
    if (!target) return;
    if (plotCache[age]) {
        Bokeh.embed.embed_item(plotCache[age], "food-plot");
        return;
    }
    try {
        const response = await fetch(`plot_${age}.json`);
        const data = await response.json();
        plotCache[age] = data;
        Bokeh.embed.embed_item(data, "food-plot");
    } catch (e) {
        target.innerHTML = `<p style="color:red; padding:20px;">Error loading plot. Ensure you are using a web server.</p>`;
    }
}

function update() {
    const age = parseFloat(ageInput.value) || 0;
    const dAge = parseFloat(deathAgeInput.value) || 0;
    const disc = parseFloat(discountInput.value) || 0;
    const yearsLeft = Math.max(0, dAge - age);
    const discountedPool = getDiscountedMins(yearsLeft, disc);
    lifeRemainingText.textContent = formatISO(discountedPool);
    render(discountedPool);
}

function render(minsPool) {
    tablesContainer.innerHTML = '';
    footnoteList.innerHTML = '';
    
    sources.forEach((s, i) => {
        const li = document.createElement('li');
        li.id = `fn-${i + 1}`;
        li.innerHTML = s.text;
        footnoteList.appendChild(li);
    });

    categories.forEach(cat => {
        const div = document.createElement('div');
        let html = `<h2>${cat.title}</h2>`;
        if (cat.subtitle) html += `<p class="sub-text">${cat.subtitle}</p>`;

        if (cat.numberedList) {
            html += `<ol style="font-size: 13px; color: var(--muted); margin: 0 0 20px 0; line-height: 1.6; padding-left: 1.2em;">`;
            cat.numberedList.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += `</ol>`;
        }

        if (cat.type === "food") {
            html += `
                <div style="margin-bottom: 20px; display: flex; gap: 10px; padding-left: 4px;">
                    <button id="btn-20" style="padding: 6px 16px; cursor: pointer; background: ${selectedAge === 20 ? '#222' : '#000'}; color: white; border: 1px solid #333; border-radius: 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Starting at Age 20</button>
                    <button id="btn-60" style="padding: 6px 16px; cursor: pointer; background: ${selectedAge === 60 ? '#222' : '#000'}; color: white; border: 1px solid #333; border-radius: 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Starting at Age 60</button>
                </div>
            `;
        }

        html += `<div class="table-card"><table><thead>`;
        const getSup = (note) => note ? `<sup><a href="#fn-${note}">${note}</a></sup>` : '';

        if (cat.type === "micromort") {
            if (cat.title === "Travel") {
                html += `<tr><th>Mode</th><th class="num-col">100 km (min)</th><th class="num-col">1 hour (min)</th></tr></thead><tbody>`;
                cat.rows.forEach(r => {
                    const lostKm = (r.km / 1000000) * minsPool;
                    const lostHr = (r.hr / 1000000) * minsPool;
                    html += `<tr>
                        <td>${r.name}${getSup(r.note)}</td>
                        <td class="num-col val-red">-${formatISO(lostKm)}</td>
                        <td class="num-col val-red">-${formatISO(lostHr)}</td>
                    </tr>`;
                });
            } else {
                html += `<tr><th>Factor</th><th class="num-col">Min Lost</th></tr></thead><tbody>`;
                cat.rows.forEach(r => {
                    let lost;
                    if (r.aqli) {
                        const yLeft = (parseFloat(deathAgeInput.value) || 0) - (parseFloat(ageInput.value) || 0);
                        const minsPerDayAvg = yLeft > 0 ? (minsPool / yLeft / 365.25) : 0;
                        lost = (r.aqli / 76.2) * minsPerDayAvg;
                    } else {
                        lost = (r.rate / 1000000) * minsPool;
                    }
                    html += `<tr><td>${r.name} <small style="color:var(--muted)">(${r.unit})</small>${getSup(r.note)}</td><td class="num-col val-red">-${formatISO(lost)}</td></tr>`;
                });
            }
        }
        else if (cat.type === "static-impact") {
            html += `<tr><th>Factor</th><th class="num-col">Min Lost</th></tr></thead><tbody>`;
            cat.rows.forEach(r => {
                html += `<tr>
                    <td>${r.name} <small style="color:var(--muted)">(${r.unit})</small>${getSup(r.note)}</td>
                    <td class="num-col val-red">${formatISO(r.val)}</td>
                </tr>`;
            });
        }
        else if (cat.type === "microlife" || cat.type === "years-to-mins") {
            html += `<tr><th>Factor</th><th class="num-col">Women (min)</th><th class="num-col">Men (min)</th></tr></thead><tbody>`;
            cat.rows.forEach(r => {
                let wVal, mVal;
                
                if (cat.type === "years-to-mins") {
                    const base = BASELINES[cat.baselineGroup];
                    wVal = ((r.w - base.w) / base.w) * 1440;
                    mVal = ((r.m - base.m) / base.m) * 1440;
                } else {
                    wVal = r.w;
                    mVal = r.m;
                }

                const wClass = wVal < 0 ? 'val-red' : (wVal > 0 ? 'val-green' : '');
                const mClass = mVal < 0 ? 'val-red' : (mVal > 0 ? 'val-green' : '');
                const wSign = wVal < 0 ? '-' : (wVal > 0 ? '+' : '');
                const mSign = mVal < 0 ? '-' : (mVal > 0 ? '+' : '');

                html += `<tr>
                    <td>${r.name}${getSup(r.note)}</td>
                    <td class="num-col ${wClass}">${wSign}${formatISO(wVal)}</td>
                    <td class="num-col ${mClass}">${mSign}${formatISO(mVal)}</td>
                </tr>`;
            });
        } 
        else if (cat.type === "food") {
            html += `<tr><th>Factor (${selectedAge}yo)</th><th class="num-col">Women (min) [95% UI]</th><th class="num-col">Men (min) [95% UI]</th></tr></thead><tbody>`;
            const remW = STUDY_LE[selectedAge].w;
            const remM = STUDY_LE[selectedAge].m;
            cat.rows.forEach(r => {
                const dataW = selectedAge === 20 ? r.w20 : r.w60;
                const dataM = selectedAge === 20 ? r.m20 : r.m60;
                const valW = (dataW.y * 1440) / remW;
                const uiW = [(dataW.ui[0] * 1440) / remW, (dataW.ui[1] * 1440) / remW];
                const valM = (dataM.y * 1440) / remM;
                const uiM = [(dataM.ui[0] * 1440) / remM, (dataM.ui[1] * 1440) / remM];
                html += `<tr><td>${r.group} <small style="color:var(--muted)">(${r.shift})</small>${getSup(r.note)}</td><td class="num-col"><span class="val-green">+${valW.toFixed(1)}</span><br><small style="color:#666; font-size:10px;">[${uiW[0].toFixed(1)}, ${uiW[1].toFixed(1)}]</small></td><td class="num-col"><span class="val-green">+${valM.toFixed(1)}</span><br><small style="color:#666; font-size:10px;">[${uiM[0].toFixed(1)}, ${uiM[1].toFixed(1)}]</small></td></tr>`;
            });
        }
        html += `</tbody></table></div>`;

        if (cat.type === "food") {
            html += `
                <p style="font-size: 13px; color: var(--muted); margin: 20px 0 8px 4px; font-style: italic;">
                    Tip: Hover over the dots in the chart below to see exact numbers and uncertainty intervals.
                </p>
                <div id="food-plot" class="plot-container"></div>
            `;
        }

        div.innerHTML = html;
        tablesContainer.appendChild(div);

        if (cat.type === "food") {
            document.getElementById('btn-20').onclick = () => { selectedAge = 20; update(); };
            document.getElementById('btn-60').onclick = () => { selectedAge = 60; update(); };
            loadPlot(selectedAge);
        }
    });
}

birthdayInput.addEventListener('input', () => {
    const birth = new Date(birthdayInput.value);
    if (!isNaN(birth.getTime())) {
        ageInput.value = ((new Date() - birth) / 31556952000).toFixed(6);
        update();
    }
});

ageInput.addEventListener('input', () => {
    const age = parseFloat(ageInput.value) || 0;
    const birth = new Date(new Date() - age * 31556952000);
    birthdayInput.value = birth.toISOString().split('T')[0];
    update();
});

[deathAgeInput, discountInput].forEach(el => el.addEventListener('input', update));

function init() {
    const age = parseFloat(ageInput.value) || 35;
    const birth = new Date(new Date() - age * 31556952000);
    birthdayInput.value = birth.toISOString().split('T')[0];
    update();
}

init();