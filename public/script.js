document.addEventListener('DOMContentLoaded', () => {
    const indexSelect = document.getElementById('index-select');
    let vegaChart, thetaChart, gammaChart, ltpChart, ref_vegaChart, ref_gammaChart, ref_thetaChart, ref_ltpChart;

    // Function to convert timestamps to desired format
    function convertTimeFormat(timestamp) {
        const [time, modifier] = timestamp.split(' ');
        let [hours, minutes, seconds] = time.split(':');

        if (hours === '12') {
            hours = '00';
        }
        if (modifier === 'PM' && hours !== '12') {
            hours = parseInt(hours, 10) + 12;
        }

        hours = hours.toString().padStart(2, '0');
        minutes = minutes.toString().padStart(2, '0');
        seconds = seconds.toString().padStart(2, '0');

        return `${hours}:${minutes}:${seconds}`;
    }

    // Function to filter data within the specified time range
    function filterDataByTimeRange(timestamps, data, startTime = '09:15:00', endTime = '15:30:00') {
        const filteredTimestamps = [];
        const filteredData = data.map(() => []);

        timestamps.forEach((timestamp, index) => {
            if (timestamp >= startTime && timestamp <= endTime) {
                filteredTimestamps.push(timestamp);
                data.forEach((series, seriesIndex) => {
                    filteredData[seriesIndex].push(series[index]);
                });
            }
        });

        return { filteredTimestamps, filteredData };
    }

    const fetchDataAndUpdateCharts = async (index) => {
        try {
            const response = await fetch(`/api/data?name=${index}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            const timestamps = data.timestamps.map(ts => convertTimeFormat(ts));
            const vegaCE = data.vega_ce_sums;
            const vegaPE = data.vega_pe_sums;
            const thetaCE = data.theta_ce_sums;
            const thetaPE = data.theta_pe_sums;
            const gammaCE = data.gamma_ce_sums;
            const gammaPE = data.gamma_pe_sums;
            const ltpCE = data.ltp_ce_sums;
            const ltpPE = data.ltp_pe_sums;
            const diff_vega_ce = data.diff_vega_ce_sums;
            const diff_vega_pe = data.diff_vega_pe_sums;
            const diff_theta_ce = data.diff_theta_ce_sums;
            const diff_theta_pe = data.diff_theta_pe_sums;
            const diff_gamma_ce = data.diff_gamma_ce_sums;
            const diff_gamma_pe = data.diff_gamma_pe_sums;

            const { filteredTimestamps, filteredData } = filterDataByTimeRange(
                timestamps,
                [vegaCE, vegaPE, thetaCE, thetaPE, gammaCE, gammaPE, ltpCE, ltpPE, diff_vega_ce, diff_vega_pe, diff_theta_ce, diff_theta_pe, diff_gamma_ce, diff_gamma_pe]
            );

            const [
                filteredVegaCE, filteredVegaPE, filteredThetaCE, filteredThetaPE, filteredGammaCE, filteredGammaPE,
                filteredLtpCE, filteredLtpPE, filteredDiffVegaCE, filteredDiffVegaPE, filteredDiffThetaCE, filteredDiffThetaPE,
                filteredDiffGammaCE, filteredDiffGammaPE
            ] = filteredData;

            const commonOptions = {
                chart: {
                    type: 'line',
                    height: 400,
                    zoom: {
                        enabled: true
                    },
                    animations: {
                        enabled: false // Disable animations
                    }
                },
                dataLabels: {
                    enabled: false
                },
                xaxis: {
                    categories: filteredTimestamps,
                    title: {
                        text: 'Time'
                    },
                    tickAmount: 20, // Adjust number of ticks
                },
                yaxis: {
                    labels: {
                        formatter: function (val) {
                            return val.toFixed(0);
                        }
                    },
                    title: {
                        text: 'Sum Values'
                    },
                    min: function (min) {
                        return min < 0 ? min : 0;
                    } // Ensure negative scale when values are negative
                },
                tooltip: {
                    shared: true,
                    y: {
                        formatter: function (val) {
                            return val.toFixed(2);
                        }
                    }
                },
                stroke: {
                    curve: 'smooth',
                    width: 2, // Adjust line thickness
                    colors: ['#88D66C', '#F5004F'], // Line colors
                },
            };

            const createChart = (selector, series, titleText) => {
                const chartElement = document.querySelector(selector);
                if (!chartElement) {
                    console.error(`Element not found: ${selector}`);
                    return null;
                }
                return new ApexCharts(chartElement, {
                    ...commonOptions,
                    series: series,
                    title: {
                        text: titleText,
                        align: 'left'
                    }
                });
            };

            const updateChart = (chart, series) => {
                if (chart) {
                    chart.updateSeries(series, true);
                }
            };

            if (!vegaChart) {
                vegaChart = createChart("#vegaChart", [
                    { name: 'Vega CE Sum', data: filteredVegaCE, color: '#88D66C' },
                    { name: 'Vega PE Sum', data: filteredVegaPE, color: '#F5004F' }
                ], 'Vega Sums');
                if (vegaChart) vegaChart.render();
            } else {
                updateChart(vegaChart, [
                    { name: 'Vega CE Sum', data: filteredVegaCE, color: '#88D66C' },
                    { name: 'Vega PE Sum', data: filteredVegaPE, color: '#F5004F' }
                ]);
            }

            if (!thetaChart) {
                thetaChart = createChart("#thetaChart", [
                    { name: 'Theta CE Sum', data: filteredThetaCE, color: '#88D66C' },
                    { name: 'Theta PE Sum', data: filteredThetaPE, color: '#F5004F' }
                ], 'Theta Sums');
                if (thetaChart) thetaChart.render();
            } else {
                updateChart(thetaChart, [
                    { name: 'Theta CE Sum', data: filteredThetaCE, color: '#88D66C' },
                    { name: 'Theta PE Sum', data: filteredThetaPE, color: '#F5004F' }
                ]);
            }

            if (!gammaChart) {
                gammaChart = createChart("#gammaChart", [
                    { name: 'Gamma CE Sum', data: filteredGammaCE, color: '#88D66C' },
                    { name: 'Gamma PE Sum', data: filteredGammaPE, color: '#F5004F' }
                ], 'Gamma Sums');
                if (gammaChart) gammaChart.render();
            } else {
                updateChart(gammaChart, [
                    { name: 'Gamma CE Sum', data: filteredGammaCE, color: '#88D66C' },
                    { name: 'Gamma PE Sum', data: filteredGammaPE, color: '#F5004F' }
                ]);
            }

            if (!ltpChart) {
                ltpChart = createChart("#ltpChart", [
                    { name: 'LTP CE Sum', data: filteredLtpCE, color: '#88D66C' },
                    { name: 'LTP PE Sum', data: filteredLtpPE, color: '#F5004F' }
                ], 'LTP Sums');
                if (ltpChart) ltpChart.render();
            } else {
                updateChart(ltpChart, [
                    { name: 'LTP CE Sum', data: filteredLtpCE, color: '#88D66C' },
                    { name: 'LTP PE Sum', data: filteredLtpPE, color: '#F5004F' }
                ]);
            }

            if (!ref_vegaChart) {
                ref_vegaChart = createChart("#ref_vegaChart", [
                    { name: 'Vega CE Sum', data: filteredDiffVegaCE, color: '#88D66C' },
                    { name: 'Vega PE Sum', data: filteredDiffVegaPE, color: '#F5004F' }
                ], 'Vega Sums');
                if (ref_vegaChart) ref_vegaChart.render();
            } else {
                updateChart(ref_vegaChart, [
                    { name: 'Vega CE Sum', data: filteredDiffVegaCE, color: '#88D66C' },
                    { name: 'Vega PE Sum', data: filteredDiffVegaPE, color: '#F5004F' }
                ]);
            }

            if (!ref_thetaChart) {
                ref_thetaChart = createChart("#ref_thetaChart", [
                    { name: 'Theta CE Sum', data: filteredDiffThetaCE, color: '#88D66C' },
                    { name: 'Theta PE Sum', data: filteredDiffThetaPE, color: '#F5004F' }
                ], 'Theta Sums');
                if (ref_thetaChart) ref_thetaChart.render();
            } else {
                updateChart(ref_thetaChart, [
                    { name: 'Theta CE Sum', data: filteredDiffThetaCE, color: '#88D66C' },
                    { name: 'Theta PE Sum', data: filteredDiffThetaPE, color: '#F5004F' }
                ]);
            }

            if (!ref_gammaChart) {
                ref_gammaChart = createChart("#ref_gammaChart", [
                    { name: 'Gamma CE Sum', data: filteredDiffGammaCE, color: '#88D66C' },
                    { name: 'Gamma PE Sum', data: filteredDiffGammaPE, color: '#F5004F' }
                ], 'Gamma Sums');
                if (ref_gammaChart) ref_gammaChart.render();
            } else {
                updateChart(ref_gammaChart, [
                    { name: 'Gamma CE Sum', data: filteredDiffGammaCE, color: '#88D66C' },
                    { name: 'Gamma PE Sum', data: filteredDiffGammaPE, color: '#F5004F' }
                ]);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    indexSelect.addEventListener('change', () => {
        fetchDataAndUpdateCharts(indexSelect.value);
    });

    // Initial load
    fetchDataAndUpdateCharts(indexSelect.value);

    // Refresh the charts every 30 seconds
    setInterval(() => {
        fetchDataAndUpdateCharts(indexSelect.value);
    }, 30000);

    // Function to format date and time
    const formatDateTime = () => {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        return now.toLocaleDateString('en-GB', options).replace(',', '');
    };

    // Update the date and time in the header
    const updateDateTime = () => {
        const dateTimeElement = document.getElementById('current-date-time');
        dateTimeElement.textContent = formatDateTime();
    };

    // Initialize the date and time on page load
    updateDateTime();
    // Update the date and time every second
    setInterval(updateDateTime, 1000);

    const expiryDateSpan = document.getElementById('expiry-date');

    // Fetch expiry dates from the server
    const fetchExpiryDates = async () => {
        try {
            const response = await fetch('/api/expiry-dates');
            if (!response.ok) throw new Error('Network response was not ok');
            const expiryDates = await response.json();
            return expiryDates;
        } catch (error) {
            console.error('Error fetching expiry dates:', error);
        }
    };

    const updateExpiryDate = (expiryDates) => {
        const selectedIndex = indexSelect.value;
        expiryDateSpan.textContent = `Expiry: ${expiryDates[selectedIndex]}`;
    };

    fetchExpiryDates().then(expiryDates => {
        if (expiryDates) {
            // Set initial expiry date
            updateExpiryDate(expiryDates);

            // Update expiry date on index change
            indexSelect.addEventListener('change', () => {
                updateExpiryDate(expiryDates);
            });
        }
    });
});


//Export data
document.getElementById('export-button').addEventListener('click', () => {
    const index = document.getElementById('index-select').value;
    const date = document.getElementById('date-select').value;

    if (!date) {
        alert('Please select a date.');
        return;
    }

    const url = `/api/export-data?index=${index}&date=${date}`;
    window.location.href = url;
});