document.addEventListener('DOMContentLoaded', function () {
    const indexSelect = document.getElementById('index-select');
    const dateSelect = document.getElementById('date-select');

    if (!indexSelect || !dateSelect) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    const tableBody = document.querySelector('#straddle-table tbody');
    const valueA = document.getElementById('value-a');
    const valueB = document.getElementById('value-b');
    const valueC = document.getElementById('value-c');
    const valueD = document.getElementById('value-d');
    const valueE = document.getElementById('value-e');
    const valueF = document.getElementById('value-f');
    const signalCell = document.getElementById('signal');
    const bullSpreadEMA = document.getElementById('bull-spread-ema');
    const bearSpreadEMA = document.getElementById('bear-spread-ema');
    const trendCell = document.getElementById('trend');

    let previousValueE = null;
    let previousValueF = null;

    if (!tableBody || !valueA || !valueB || !valueC || !valueD || !valueE || !valueF || !signalCell || !bullSpreadEMA || !bearSpreadEMA || !trendCell) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    let a, b, c, d, e, f, g, h;

    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;

    indexSelect.addEventListener('change', updateData);
    dateSelect.addEventListener('change', updateData);

    function updateData() {
        fetchInitialValues().then(() => {
            fetchLastLiveValues();
        });
        fetchData();
    }

    async function fetchData() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/straddle-data?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            tableBody.innerHTML = ''; 

            if (data && data.length) {
                data.forEach((row, index) => {
                    const tr = document.createElement('tr');
                    const valueChangeHtml = generateValueChangeHtml(row.value, row.changePercentage);

                    tr.innerHTML = `
                        <td>${row.strike}</td>
                        <td>${valueChangeHtml}</td>
                        ${index === 2 ? `<td>${calculateTrend(data)}</td>` : '<td></td>'}
                    `;

                    if (index === 2) {
                        trendCell.textContent = calculateTrend(data); // Set trend in the merged cell
                    }

                    tableBody.appendChild(tr);
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="3">No data available</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = '<tr><td colspan="3">Error fetching data</td></tr>';
        }
    }

    async function fetchInitialValues() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/initial-values?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            if (data) {
                a = data.a;
                b = data.b;
                c = data.c;
                d = data.d;

                valueA.textContent = a.toFixed(2);
                valueB.textContent = b.toFixed(2);
                valueC.textContent = c.toFixed(2);
                valueD.textContent = d.toFixed(2);
            } else {
                valueA.textContent = 'N/A';
                valueB.textContent = 'N/A';
                valueC.textContent = 'N/A';
                valueD.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching initial values:', error);
        }
    }

    async function fetchLastLiveValues() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/live-values?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            if (data) {
                e = parseFloat(data.e);
                f = parseFloat(data.f);
                g = parseFloat(data.bull_spread_ema);
                h = parseFloat(data.bear_spread_ema);

                // Calculate percentage changes from previous values
                const percentageChangeE = previousValueE !== null ? ((e - previousValueE) / previousValueE) * 100 : 0;
                const percentageChangeF = previousValueF !== null ? ((f - previousValueF) / previousValueF) * 100 : 0;

                // Update previous values for the next comparison
                previousValueE = e;
                previousValueF = f;

                // Update the text content and percentage change
                valueE.textContent = `${e.toFixed(2)} (${percentageChangeE.toFixed(2)}%)`;
                valueF.textContent = `${f.toFixed(2)} (${percentageChangeF.toFixed(2)}%)`;

                // Apply color logic
                valueE.style.color = e > g ? 'green' : 'red';
                valueF.style.color = f > h ? 'green' : 'red';

                // Update EMA values
                bullSpreadEMA.textContent = g.toFixed(2);
                bearSpreadEMA.textContent = h.toFixed(2);

                // Calculate and display the signal
                const signal = calculateSignal(a, b, c, d, e, f, g, h);
                signalCell.textContent = signal;
            } else {
                valueE.textContent = 'N/A';
                valueF.textContent = 'N/A';
                bullSpreadEMA.textContent = 'N/A';
                bearSpreadEMA.textContent = 'N/A';
                signalCell.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching last live values:', error);
        }
    }

    function generateValueChangeHtml(value, changePercentage) {
        const isPositive = changePercentage && parseFloat(changePercentage) > 0;
        const changeClass = isPositive ? 'change-positive' : 'change-negative';
        const icon = isPositive ? '⬆️' : '⬇️';

        return `
            <div class="value-container">
                ${value.toFixed(2)}
                <span class="${changeClass}">(${changePercentage})</span>
                <span>${icon}</span>
            </div>
        `;
    }

    function calculateSignal(a, b, c, d, e, f, g, h) {
        let newSignal;
    
        if (e > a && e > g && f < d && f < h) {
            newSignal = "Trending Buy CE";
        } else if (f > c && f > g && e < b && e < g) {
            newSignal = "Trending Buy PE";
        } else if (e > a && e > g) {
            newSignal = "Buy CE";
        } else if (f > c && f > g) {
            newSignal = "Buy PE";
        } else if (a < e && e < b && c < f && f < d) {
            newSignal = "Range Bound";
        } else if (e < b && e < g && f < d && f < h) {
            newSignal = "No Momentum";
        } else {
            newSignal = "No Clear Direction";
        }
    
        return newSignal;
    }

    function calculateTrend(data) {
        const atmMinus2 = data[0].changePercentage;
        const atmMinus1 = data[1].changePercentage;
        const atm = data[2].changePercentage;  // ATM (S0) is typically the "current" strike
        const atmPlus1 = data[3].changePercentage;
        const atmPlus2 = data[4].changePercentage;
    
        // All premiums rising
        if (atmMinus2 > 0 && atmMinus1 > 0 && atmPlus1 > 0 && atmPlus2 > 0) {
            return "Higher Volatility; Watch for Breakout";
        }
    
        // All premiums decreasing
        if (atmMinus2 < 0 && atmMinus1 < 0 && atmPlus1 < 0 && atmPlus2 < 0) {
            return "Consolidation or Range Bound Movement";
        }
    
        // Bearish trend
        if (atmMinus2 < 0 && atmMinus1 < 0) {
            return "Bearish Trend";
        }
    
        // Bullish trend
        if (atmPlus1 < 0 && atmPlus2 < 0) {
            return "Bullish Trend";
        }
    
        // Bullish bias
        if (atmPlus2 > 0) {
            return "Bullish Bias; Expect Upward Move";
        }
    
        // Bearish bias
        if (atmMinus2 > 0) {
            return "Bearish Bias; Expect Downward Move";
        }
    
        // Default condition
        return "No Clear Trend";
    }

    // Function to send telegram message alerts
    const sendTelegramAlert = (message) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

        axios.post(url, {
            chat_id: chatId,
            text: message
        })
        .then(response => {
            console.log('Message sent to Telegram');
        })
        .catch(error => {
            console.error('Error sending message to Telegram:', error);
        });
    };

    // Fetch data and initial values when the page loads
    updateData();

    // Poll live values every minute
    setInterval(fetchLastLiveValues, 60000);
});