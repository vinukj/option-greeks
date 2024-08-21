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

    // Function to apply conditional formatting
    function applyConditionalFormatting() {
        // Check if value-e > value-a
        if (parseFloat(bullSpreadEMA.textContent) > parseFloat(valueA.textContent)) {
            bullSpreadEMA.classList.add('highlight');
        } else {
            bullSpreadEMA.classList.remove('highlight');
        }

        // Check if value-f > value-c
        if (parseFloat(bearSpreadEMA.textContent) > parseFloat(valueC.textContent)) {
            bearSpreadEMA.classList.add('highlight');
        } else {
            bearSpreadEMA.classList.remove('highlight');
        }
    }

    // Apply formatting on load
    applyConditionalFormatting();

    if (!tableBody || !valueA || !valueB || !valueC || !valueD || !valueE || !valueF || !signalCell || !bullSpreadEMA || !bearSpreadEMA || !trendCell) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;

    indexSelect.addEventListener('change', updateData);
    dateSelect.addEventListener('change', updateData);

    async function updateData() {
        fetchCombinedValues();
        fetchData();
    }

    async function fetchCombinedValues() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/combined-values?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            if (data && data.initialValues && data.latestValues) {
                const { initialValues, latestValues, signal } = data;

                // Update initial values
                valueA.textContent = initialValues.a.toFixed(2);
                valueB.textContent = initialValues.b.toFixed(2);
                valueC.textContent = initialValues.c.toFixed(2);
                valueD.textContent = initialValues.d.toFixed(2);

                // Update live values
                const e = parseFloat(latestValues.e);
                const f = parseFloat(latestValues.f);
                const g = parseFloat(latestValues.bull_spread_ema);
                const h = parseFloat(latestValues.bear_spread_ema);

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

                // Display the signal
                signalCell.textContent = signal;
            } else {
                valueA.textContent = 'N/A';
                valueB.textContent = 'N/A';
                valueC.textContent = 'N/A';
                valueD.textContent = 'N/A';
                valueE.textContent = 'N/A';
                valueF.textContent = 'N/A';
                bullSpreadEMA.textContent = 'N/A';
                bearSpreadEMA.textContent = 'N/A';
                signalCell.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching combined values:', error);
        }

        applyConditionalFormatting();
    }

    async function fetchData() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/straddle-data?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            tableBody.innerHTML = '';

            if (data && data.straddles && data.straddles.length) {
                data.straddles.forEach((row, index) => {
                    const tr = document.createElement('tr');
                    const valueChangeHtml = generateValueChangeHtml(row.value, row.changePercentage);

                    tr.innerHTML = `
                        <td>${row.strike}</td>
                        <td>${valueChangeHtml}</td>
                        ${index === 2 ? `<td>${data.signal}</td>` : '<td></td>'}
                    `;

                    if (index === 2) {
                        trendCell.textContent = data.signal; // Set signal in the merged cell
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

    // Fetch data and initial values when the page loads
    updateData();

    // Poll live values every minute
    setInterval(fetchCombinedValues, 60000);
});