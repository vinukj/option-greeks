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
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    const valueChangeHtml = generateValueChangeHtml(row.value, row.changePercentage);
                    tr.innerHTML = `
                        <td>${row.strike}</td>
                        <td>${valueChangeHtml}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            } else {
                tableBody.innerHTML = '<tr><td colspan="2">No data available</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            tableBody.innerHTML = '<tr><td colspan="2">Error fetching data</td></tr>';
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

                valueE.textContent = e.toFixed(2);
                valueF.textContent = f.toFixed(2);

                const signal = calculateSignal(a, b, c, d, e, f);
                signalCell.textContent = signal;
            } else {
                valueE.textContent = 'N/A';
                valueF.textContent = 'N/A';
                signalCell.textContent = 'N/A';
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

    function calculateSignal(a, b, c, d, e, f) {
        if (e > a && f < d) {
            return "Bullish. Buy CE";
        } else if (f > c && e < b) {
            return "Bearish. Buy PE";
        } else {
            return "No Trend/Momentum";
        }
    }

    // Fetch data and initial values when the page loads
    updateData();

    // Poll live values every minute
    setInterval(fetchLastLiveValues, 60000);
});