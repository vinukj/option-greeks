document.addEventListener('DOMContentLoaded', function () {
    const indexSelect = document.getElementById('index-select');
    const dateSelect = document.getElementById('date-select');

    if (!indexSelect || !dateSelect) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    const bullUC = document.getElementById('bull-uc');
    const bullES = document.getElementById('bull-es');
    const bullDelta = document.getElementById('bull-delta');
    const bullGamma = document.getElementById('bull-gamma');
    const bearUC = document.getElementById('bear-uc');
    const bearES = document.getElementById('bear-es');
    const bearDelta = document.getElementById('bear-delta');
    const bearGamma = document.getElementById('bear-gamma');
    const marketSignalCell = document.getElementById('market-signal');

    const valS3 = document.getElementById('val-s-3');
    const valS2 = document.getElementById('val-s-2');
    const valS1 = document.getElementById('val-s-1');
    const valS0 = document.getElementById('val-s0');
    const valS1Plus = document.getElementById('val-s+1');
    const valS2Plus = document.getElementById('val-s+2');
    const valS3Plus = document.getElementById('val-s+3');
    const changeS3 = document.getElementById('change-s-3');
    const changeS2 = document.getElementById('change-s-2');
    const changeS1 = document.getElementById('change-s-1');
    const changeS0 = document.getElementById('change-s0');
    const changeS1Plus = document.getElementById('change-s+1');
    const changeS2Plus = document.getElementById('change-s+2');
    const changeS3Plus = document.getElementById('change-s+3');
    const strikeSignalCell = document.getElementById('strike-signal');

    let previousValueE = null;
    let previousValueF = null;

    // Function to apply conditional formatting
    function applyConditionalFormatting() {
        // Implement any conditional formatting logic needed
    }

    if (!bullUC || !bullES || !bullDelta || !bullGamma || !bearUC || !bearES || !bearDelta || !bearGamma || !marketSignalCell ||
        !valS3 || !valS2 || !valS1 || !valS0 || !valS1Plus || !valS2Plus || !valS3Plus ||
        !changeS3 || !changeS2 || !changeS1 || !changeS0 || !changeS1Plus || !changeS2Plus || !changeS3Plus || !strikeSignalCell) {
        console.error('One or more required elements are missing in the DOM.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;

    indexSelect.addEventListener('change', updateData);
    dateSelect.addEventListener('change', updateData);

    async function updateData() {
        fetchCombinedValues();
        fetchStraddleData();
    }

    async function fetchCombinedValues() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/combined-values?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            if (data && data.initialValues && data.latestValues) {
                const { initialValues, latestValues, signal } = data;

                // Update initial values for Bull and Bear
                bullUC.textContent = initialValues.a.toFixed(2);
                bearUC.textContent = initialValues.c.toFixed(2);
                bullES.textContent = latestValues.bull_spread_ema;
                bearES.textContent = latestValues.bear_spread_ema;

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
                bullDelta.textContent = latestValues.delta_e;
                bearDelta.textContent = latestValues.delta_f;

                // Apply color logic
                bullGamma.textContent = latestValues.gamma_e;
                bearGamma.textContent =latestValues.gamma_f;

                // Display the signal
                marketSignalCell.textContent = signal;
            } else {
                bullUC.textContent = 'N/A';
                bearUC.textContent = 'N/A';
                bullES.textContent = 'N/A';
                bearES.textContent = 'N/A';
                bullDelta.textContent = 'N/A';
                bearDelta.textContent = 'N/A';
                bullGamma.textContent = 'N/A';
                bearGamma.textContent = 'N/A';
                marketSignalCell.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching combined values:', error);
        }

        applyConditionalFormatting();
    }

    async function fetchStraddleData() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;

        try {
            const response = await fetch(`/api/straddle-data?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();

            if (data && data.straddles && data.straddles.length) {
                data.straddles.forEach((row, index) => {
                    switch (row.strike) {
                        case 'S-3':
                            valS3.textContent = row.value.toFixed(2);
                            changeS3.textContent = row.changePercentage;
                            break;
                        case 'S-2':
                            valS2.textContent = row.value.toFixed(2);
                            changeS2.textContent = row.changePercentage;
                            break;
                        case 'S-1':
                            valS1.textContent = row.value.toFixed(2);
                            changeS1.textContent = row.changePercentage;
                            break;
                        case 'S0':
                            valS0.textContent = row.value.toFixed(2);
                            changeS0.textContent = row.changePercentage;
                            break;
                        case 'S+1':
                            valS1Plus.textContent = row.value.toFixed(2);
                            changeS1Plus.textContent = row.changePercentage;
                            break;
                        case 'S+2':
                            valS2Plus.textContent = row.value.toFixed(2);
                            changeS2Plus.textContent = row.changePercentage;
                            break;
                        case 'S+3':
                            valS3Plus.textContent = row.value.toFixed(2);
                            changeS3Plus.textContent = row.changePercentage;
                            break;
                    }
                });

                strikeSignalCell.textContent = data.signal;
            } else {
                valS3.textContent = 'N/A';
                changeS3.textContent = 'N/A';
                valS2.textContent = 'N/A';
                changeS2.textContent = 'N/A';
                valS1.textContent = 'N/A';
                changeS1.textContent = 'N/A';
                valS0.textContent = 'N/A';
                changeS0.textContent = 'N/A';
                valS1Plus.textContent = 'N/A';
                changeS1Plus.textContent = 'N/A';
                valS2Plus.textContent = 'N/A';
                changeS2Plus.textContent = 'N/A';
                valS3Plus.textContent = 'N/A';
                changeS3Plus.textContent = 'N/A';
                strikeSignalCell.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching straddle data:', error);
        }
    }

    // Fetch data and initial values when the page loads
    updateData();

    // Poll live values every minute
    setInterval(fetchCombinedValues, 60000);
});