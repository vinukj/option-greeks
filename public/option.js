document.addEventListener('DOMContentLoaded', function () {
    const indexSelect = document.getElementById('index-select');
    const dateSelect = document.getElementById('date-select');
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
    

    let a, b, c, d, e, f;

    // Set today's date in the date picker by default
    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;

    // Update tables and charts when a new index or date is selected
    indexSelect.addEventListener('change', updateData);
    dateSelect.addEventListener('change', updateData);

    function updateData() {
        fetchInitialValues().then(() => {
            fetchLastLiveValues();  // Fetch last live values right after initial values
        });
        fetchData();
    }

    async function fetchData() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/straddle-data?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            tableBody.innerHTML = ''; // Clear the table

            if (data && data.length) {
                data.forEach((row, index) => {
                    const tr = document.createElement('tr');
                    const valueChangeHtml = generateValueChangeHtml(row.value, row.changePercentage);
                    const trend = calculateTrend(data); // Calculate trend based on the rules
                    tr.innerHTML = `
                        <td>${row.strike}</td>
                        <td>${valueChangeHtml}</td>
                        <td>${index === 2 ? trend : ''}</td> <!-- Show trend only for the ATM row -->
                    `;
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
                e = data.e;
                f = data.f;
                g = data.bull_spread_ema;
                h = data.bear_spread_ema;

                valueE.textContent = e.toFixed(2);
                valueF.textContent = f.toFixed(2);
                bullSpreadEMA.textContent = g.toFixed(2);
                bearSpreadEMA.textContent = h.toFixed(2);

                const signal = calculateSignal(a, b, c, d, g,h);
                signalCell.textContent = signal;
            } else {
                valueE.textContent = 'N/A';
                valueF.textContent = 'N/A';
                signalCell.textContent = 'N/A';
                bullSpreadEMA.textContent = 'N/A';
                bearSpreadEMA.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching last live values:', error);
        }
    }
    function generateValueChangeHtml(value, changePercentage) {
        const isPositive = changePercentage && parseFloat(changePercentage) > 0;
        const changeClass = isPositive ? 'change-positive' : 'change-negative';
        const iconClass = isPositive ? 'icon-up' : 'icon-down';
        const icon = isPositive ? '⬆️' : '⬇️';

        return `
            <div class="value-container">
                ${value.toFixed(2)}
                <span class="${changeClass}">(${changePercentage})</span>
                <span class="${iconClass}">${icon}</span>
            </div>
        `;
    }


    let lastSignal = "";  // Store the last signal to detect changes    
    function calculateSignal(a, b, c, d, g, h) {
        let newSignal;

        if (g > a && h < d) {
            newSignal = "Bullish. Buy CE";
        } else if (h > c && g < b) {
            newSignal = "Bearish. Buy PE";
        } else {
            newSignal = "No Trend/Momentum";
        }
    
        // Check if the signal has changed and send an alert
        if (newSignal !== lastSignal) {
            lastSignal = newSignal;
            
            if (newSignal === "Bullish. Buy CE" || newSignal === "Bearish. Buy PE") {
                sendTelegramAlert(`Signal changed to: ${newSignal}`);
                io.emit('signalChanged', newSignal);  // Emit a socket event for the frontend
            }
        }
    
        return newSignal;
    }



    function calculateTrend(data) {
        // Assume the data is sorted as ATM-2, ATM-1, ATM, ATM+1, ATM+2

        const trends = [];

        if (data[0].changePercentage > 0 && data[1].changePercentage > 0 && data[2].changePercentage > 0 && data[3].changePercentage > 0 && data[4].changePercentage > 0) {
            trends.push("Higher Volatility, Watch for Breakout");
        } else if (data[0].changePercentage < 0 && data[1].changePercentage < 0 && data[2].changePercentage < 0 && data[3].changePercentage < 0 && data[4].changePercentage < 0) {
            trends.push("Consolidation, Range Bound Movement");
        } else if (data[0].changePercentage < 0 && data[1].changePercentage < 0 && data[2].changePercentage < 0) {
            trends.push("Bearish Trend");
        } else if (data[2].changePercentage < 0 && data[3].changePercentage < 0 && data[4].changePercentage < 0) {
            trends.push("Bullish Trend");
        }

        if (data[4].changePercentage > 0) {
            trends.push("Bullish Bias, Expect Upward Move");
        }
        if (data[0].changePercentage > 0) {
            trends.push("Bearish Bias, Expect Downward Move");
        }

        return trends.join(', ');
    }

//Function to send telegram message alerts
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
