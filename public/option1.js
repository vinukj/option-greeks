document.addEventListener('DOMContentLoaded', function () {
    const indexSelect = document.getElementById('index-select');
    const dateSelect = document.getElementById('date-select');

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

    const ltpChartContainer = document.getElementById('ltpCharts');
    const spreadChartContainer = document.getElementById('spreadchart');

    let ltpChart, spreadChart;
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

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    }

    indexSelect.addEventListener('change', updateData);
    dateSelect.addEventListener('change', updateData);

    async function updateData() {
        await fetchCombinedValues();
        await fetchStraddleData();
        await fetchSpreadData();
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

                // Update the text content
                bullDelta.textContent = latestValues.delta_e;
                bearDelta.textContent = latestValues.delta_f;
                bullGamma.textContent = latestValues.gamma_e;
                bearGamma.textContent = latestValues.gamma_f;

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
                data.straddles.forEach((row) => {
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




    async function fetchSpreadData() {
        const selectedIndex = indexSelect.value;
        const selectedDate = dateSelect.value;
    
        try {
            const response = await fetch(`/api/spread-data?index=${selectedIndex}&date=${selectedDate}`);
            const data = await response.json();
    
            if (data && data.spreadData && data.ltpData) {
                const timestamps = data.spreadData.map(entry => convertTimeFormat(entry.timestamp));
    
                const spreadSeries = [
                    {
                        name: 'Bull Change (%)',
                        data: data.spreadData.map(entry => entry.bullSpreadChange)
                    },
                    {
                        name: 'Bear Change (%)',
                        data: data.spreadData.map(entry => entry.bearSpreadChange)
                    }
                ];
    
                const ltpSeries = [
                    {
                        name: 'Call Change (%)',
                        data: data.ltpData.map(entry => entry.callPremiumChange)
                    },
                    {
                        name: 'Put Change (%)',
                        data: data.ltpData.map(entry => entry.putPremiumChange)
                    }
                ];
    
                const commonOptions = {
                    chart: {
                        type: 'line',
                        height: 350
                    },
                    xaxis: {
                        categories: timestamps,
                        title: {
                            text: 'Time'
                        },
                        labels: {
                            rotate: -45,
                            rotateAlways: true,
                            formatter: function (value, timestampIndex) {
                                if (timestampIndex % 5 === 0) {
                                    return value;
                                } else {
                                    return '';
                                }
                            }
                        },
                    },
                    yaxis: {
                        title: {
                            text: 'Percentage Change (%)'
                        },
                        labels: {
                            formatter: function (val) {
                                return val !== null && !isNaN(val) ? val.toFixed(2) : ''; // Safely handle null/NaN values
                            }
                        },
                    },
                    stroke: {
                        curve: 'smooth',
                        width: 2
                    },
                    tooltip: {
                        x: {
                            formatter: function (val, { series, seriesIndex, dataPointIndex, w }) {
                                return timestamps[dataPointIndex];
                            }
                        }
                    }
                };
    
                // Ensure the containers exist in the DOM before attempting to render
                if (spreadChartContainer) {
                    if (!spreadChart) {
                        spreadChart = new ApexCharts(spreadChartContainer, {
                            ...commonOptions,
                            series: spreadSeries,
                            title: {
                                text: 'Momentum Changes',
                                align: 'left'
                            },
                            colors: ['#a3ff00', '#ff0000'],
                        });
                        spreadChart.render();
                    } else {
                        spreadChart.updateSeries(spreadSeries);
                    }
    
                    if (!ltpChart) {
                        ltpChart = new ApexCharts(ltpChartContainer, {
                            ...commonOptions,
                            series: ltpSeries,
                            title: {
                                text: 'LTP Changes',
                                align: 'left'
                            },
                            colors: ['#a3ff00', '#ff0000'],
                        });
                        ltpChart.render();
                    } else {
                        ltpChart.updateSeries(ltpSeries);
                    }
                } else {
                    console.error('Chart containers not found in the DOM.');
                }
            } else {
                console.error('No data available for the selected date.');
            }
        } catch (error) {
            console.error('Error fetching spread data:', error);
        }
    }
// Helper function to generate 5-minute intervals between two times
function generateTimeIntervals(startTime, endTime, intervalMinutes) {
    const intervals = [];
    let currentTime = new Date(`1970-01-01T${startTime}:00`);
    const endTimeDate = new Date(`1970-01-01T${endTime}:00`);

    while (currentTime <= endTimeDate) {
        intervals.push(currentTime.toTimeString().substring(0, 5)); // "HH:mm"
        currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
    }

    return intervals;
}

// Convert "hh:mm:ss AM/PM" to "HH:mm:ss" format
function convertTimeFormat(timestamp) {
    const [time, modifier] = timestamp.split(' ');
    let [hours, minutes, seconds] = time.split(':');

    if (hours === '12') {
        hours = '00';
    }
    if (modifier === 'PM' && hours !== '12') {
        hours = parseInt(hours, 10) + 12;
    }

    return `${hours}:${minutes}:${seconds}`;
}


    // Fetch data and initial values when the page loads
    updateData();

    // Poll live values every minute
    setInterval(updateData, 60000);
});