document.addEventListener('DOMContentLoaded', () => {
    const indexSelect = document.getElementById('index-select');
    const dateSelect = document.getElementById('date-select');
    const messageContainer = document.createElement('div'); // Container for messages
    document.body.appendChild(messageContainer);

    let vegaChart, thetaChart, gammaChart, ltpChart, refVegaChart, refThetaChart, refGammaChart;

    // Set today's date in the date picker by default
    const today = new Date().toISOString().split('T')[0];
    dateSelect.value = today;

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

        return {
            filteredTimestamps,
            filteredData
        };
    }

    const fetchDataAndUpdateCharts = async (index, date) => {
        try {
            const response = await fetch(`/api/data?name=${index}&date=${date}`);
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            if (data.timestamps.length === 0) {
                throw new Error('No data available for the selected date.');
            }

            const timestamps = data.timestamps.map(ts => convertTimeFormat(ts));
            const vegaCE = data.vega_ce_sums;
            const vegaPE = data.vega_pe_sums;
            const thetaCE = data.theta_ce_sums;
            const thetaPE = data.theta_pe_sums;
            const gammaCE = data.gamma_ce_sums;
            const gammaPE = data.gamma_pe_sums;
            const ltpCE = data.ltp_ce_sums;
            const ltpPE = data.ltp_pe_sums;
            const diffVegaCE = data.diff_vega_ce_sums;
            const diffVegaPE = data.diff_vega_pe_sums;
            const diffThetaCE = data.diff_theta_ce_sums;
            const diffThetaPE = data.diff_theta_pe_sums;
            const diffGammaCE = data.diff_gamma_ce_sums;
            const diffGammaPE = data.diff_gamma_pe_sums;

            const {
                filteredTimestamps,
                filteredData
            } = filterDataByTimeRange(
                timestamps,
                [vegaCE, vegaPE, thetaCE, thetaPE, gammaCE, gammaPE, ltpCE, ltpPE, diffVegaCE, diffVegaPE, diffThetaCE, diffThetaPE, diffGammaCE, diffGammaPE]
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
                vegaChart = createChart("#vegaChart", [{
                        name: 'Vega CE Sum',
                        data: filteredVegaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Vega PE Sum',
                        data: filteredVegaPE,
                        color: '#F5004F'
                    }
                ], 'Vega Sums');
                if (vegaChart) vegaChart.render();
            } else {
                updateChart(vegaChart, [{
                        name: 'Vega CE Sum',
                        data: filteredVegaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Vega PE Sum',
                        data: filteredVegaPE,
                        color: '#F5004F'
                    }
                ]);
            }

            if (!thetaChart) {
                thetaChart = createChart("#thetaChart", [{
                        name: 'Theta CE Sum',
                        data: filteredThetaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Theta PE Sum',
                        data: filteredThetaPE,
                        color: '#F5004F'
                    }
                ], 'Theta Sums');
                if (thetaChart) thetaChart.render();
            } else {
                updateChart(thetaChart, [{
                        name: 'Theta CE Sum',
                        data: filteredThetaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Theta PE Sum',
                        data: filteredThetaPE,
                        color: '#F5004F'
                    }
                ]);
            }

            if (!gammaChart) {
                gammaChart = createChart("#gammaChart", [{
                        name: 'Gamma CE Sum',
                        data: filteredGammaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Gamma PE Sum',
                        data: filteredGammaPE,
                        color: '#F5004F'
                    }
                ], 'Gamma Sums');
                if (gammaChart) gammaChart.render();
            } else {
                updateChart(gammaChart, [{
                        name: 'Gamma CE Sum',
                        data: filteredGammaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Gamma PE Sum',
                        data: filteredGammaPE,
                        color: '#F5004F'
                    }
                ]);
            }

            if (!ltpChart) {
                ltpChart = createChart("#ltpChart", [{
                        name: 'LTP CE',
                        data: filteredLtpCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'LTP PE',
                        data: filteredLtpPE,
                        color: '#F5004F'
                    }
                ], 'LTP View');
                if (ltpChart) ltpChart.render();
            } else {
                updateChart(ltpChart, [{
                        name: 'LTP CE Sum',
                        data: filteredLtpCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'LTP PE Sum',
                        data: filteredLtpPE,
                        color: '#F5004F'
                    }
                ]);
            }

            if (!refVegaChart) {
                refVegaChart = createChart("#ref_vegaChart", [{
                        name: 'Vega CE Diff Sum',
                        data: filteredDiffVegaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Vega PE Diff Sum',
                        data: filteredDiffVegaPE,
                        color: '#F5004F'
                    }
                ], 'Reference Vega Sums');
                if (refVegaChart) refVegaChart.render();
            } else {
                updateChart(refVegaChart, [{
                        name: 'Vega CE Diff Sum',
                        data: filteredDiffVegaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Vega PE Diff Sum',
                        data: filteredDiffVegaPE,
                        color: '#F5004F'
                    }
                ]);
            }

            if (!refThetaChart) {
                refThetaChart = createChart("#ref_thetaChart", [{
                        name: 'Theta CE Diff Sum',
                        data: filteredDiffThetaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Theta PE Diff Sum',
                        data: filteredDiffThetaPE,
                        color: '#F5004F'
                    }
                ], 'Reference Theta Sums');
                if (refThetaChart) refThetaChart.render();
            } else {
                updateChart(refThetaChart, [{
                        name: 'Theta CE Diff Sum',
                        data: filteredDiffThetaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Theta PE Diff Sum',
                        data: filteredDiffThetaPE,
                        color: '#F5004F'
                    }
                ]);
            }

            if (!refGammaChart) {
                refGammaChart = createChart("#ref_gammaChart", [{
                        name: 'Gamma CE Diff Sum',
                        data: filteredDiffGammaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Gamma PE Diff Sum',
                        data: filteredDiffGammaPE,
                        color: '#F5004F'
                    }
                ], 'Reference Gamma Sums');
                if (refGammaChart) refGammaChart.render();
            } else {
                updateChart(refGammaChart, [{
                        name: 'Gamma CE Diff Sum',
                        data: filteredDiffGammaCE,
                        color: '#88D66C'
                    },
                    {
                        name: 'Gamma PE Diff Sum',
                        data: filteredDiffGammaPE,
                        color: '#F5004F'
                    }
                ]);
            }

            messageContainer.innerHTML = ''; // Clear any existing messages

        } catch (error) {
            console.error('Error fetching data:', error);
            if (date > today) {
                messageContainer.innerHTML = `<p>No data available for the future date: ${date}. Please select a valid date.</p>`;
            } else {
                messageContainer.innerHTML = `<p>No data available for the selected date: ${date}. Please select a different date.</p>`;
            }
        }
    };

    // Update charts when the index or date is changed
    indexSelect.addEventListener('change', () => {
        fetchDataAndUpdateCharts(indexSelect.value, dateSelect.value);
    });

    dateSelect.addEventListener('change', () => {
        fetchDataAndUpdateCharts(indexSelect.value, dateSelect.value);
    });

    // Initial load
    fetchDataAndUpdateCharts(indexSelect.value, dateSelect.value);

    // Refresh the charts every 30 seconds
    setInterval(() => {
        fetchDataAndUpdateCharts(indexSelect.value, dateSelect.value);
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

    // Export data
    document.getElementById('export-button').addEventListener('click', () => {
        const index = indexSelect.value;
        const date = dateSelect.value;

        if (!date) {
            alert('Please select a date.');
            return;
        }

        const url = `/api/export-data?index=${index}&date=${date}`;
        window.location.href = url;
    });

    // Get references to the modals
    const settingsModal = document.getElementById("settings-modal");
    const restartNotification = document.getElementById('restart-notification');

    // Show modal
    document.getElementById('settings-button').addEventListener('click', () => {
        loadSettings(); // Load the settings when the modal is opened
        settingsModal.style.display = 'block';
    });

    // Close modal
    document.querySelector('.close').addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // Close the modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Handle Settings form submission and restart
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const settings = {};
        formData.forEach((value, key) => {
            settings[key] = value;
        });

        // Send settings update to the server
        const response = await fetch('/update-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            // Close the settings modal
            settingsModal.style.display = 'none';

            // Show the restart notification
            restartNotification.style.display = 'block';

            // Trigger the server stop
            const stopResponse = await fetch('/stop-server', {
                method: 'POST'
            });

            if (stopResponse.ok) {
                // Keep the notification visible for 5 seconds, then hide it
                setTimeout(async () => {
                    // Trigger the server start
                    const startResponse = await fetch('/start-server', {
                        method: 'POST'
                    });

                    if (startResponse.ok) {
                        restartNotification.style.display = 'none';
                        alert('Server restarted successfully');
                    } else {
                        alert('Failed to start the server');
                        restartNotification.style.display = 'none';
                    }
                }, 5000); // 5-second delay before attempting to start the server again
            } else {
                alert('Failed to stop the server');
                restartNotification.style.display = 'none';
            }
        } else {
            alert('Failed to save settings');
        }
    });
    // Function to populate the settings form with default values
    const loadSettings = async () => {
        try {
            const response = await fetch('/api/get-settings');
            if (!response.ok) throw new Error('Failed to load settings');
            const settings = await response.json();

            document.getElementById('accessToken').value = settings.accessToken;
            document.getElementById('wsToken').value = settings.wsToken;
            document.getElementById('daysToExpire').value = settings.daysToExpire;
            document.getElementById('nifty').value = settings.nifty;
            document.getElementById('bankNifty').value = settings.bankNifty;
            document.getElementById('finnifty').value = settings.finnifty;
            document.getElementById('midcpNifty').value = settings.midcpNifty;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };
});