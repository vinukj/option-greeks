const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const dotenv = require('dotenv');
const { exec } = require('child_process');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const YOUR_ACCESS_TOKEN = process.env.accessToken;
const AUTHBEARERTOKEN = "Bearer " + process.env.accessToken;
const YOUR_WS_TOKEN = process.env.wsToken;
const DAYS_TO_EXPIRE = parseFloat(process.env.daysToExpire);

const port = 3005;
app.use(express.json());
app.use(express.static(__dirname + '/public'));

let firstPrintDone = {
    NIFTY: false,
    BANKNIFTY: false,
    FINNIFTY: false,
    MIDCPNIFTY: false
};

if (!isNaN(DAYS_TO_EXPIRE)) {
    console.log(`Days to expire: ${DAYS_TO_EXPIRE}`);
} else {
    console.error('Invalid number for daysToExpire');
}

const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

const getFiveMinutesAgoTimestamp = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - 5);
    return now.toISOString().split('T')[1];
};

let baseline = {
    NIFTY: {
        baseline_vega_ce: 0,
        baseline_vega_pe: 0,
        baseline_theta_ce: 0,
        baseline_theta_pe: 0,
        baseline_gamma_ce: 0,
        baseline_gamma_pe: 0
    },
    BANKNIFTY: {
        baseline_vega_ce: 0,
        baseline_vega_pe: 0,
        baseline_theta_ce: 0,
        baseline_theta_pe: 0,
        baseline_gamma_ce: 0,
        baseline_gamma_pe: 0
    },
    FINNIFTY: {
        baseline_vega_ce: 0,
        baseline_vega_pe: 0,
        baseline_theta_ce: 0,
        baseline_theta_pe: 0,
        baseline_gamma_ce: 0,
        baseline_gamma_pe: 0
    },
    MIDCPNIFTY: {
        baseline_vega_ce: 0,
        baseline_vega_pe: 0,
        baseline_theta_ce: 0,
        baseline_theta_pe: 0,
        baseline_gamma_ce: 0,
        baseline_gamma_pe: 0
    }
};

const parseBaselineStartTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const baselineTime = new Date();
    baselineTime.setHours(hours, minutes, 0, 0);
    return baselineTime;
};

const baselineStartTime = parseBaselineStartTime(process.env.BASELINE_START_TIME);

const insertData = (db, tableName, dataToInsert) => {
    const {
        timestamp,
        vega_ce_sum,
        vega_pe_sum,
        theta_ce_sum,
        theta_pe_sum,
        gamma_ce_sum,
        gamma_pe_sum,
        ltp_ce_sum,
        ltp_pe_sum,
        baseline_vega_ce,
        baseline_vega_pe,
        baseline_theta_ce,
        baseline_theta_pe,
        baseline_gamma_ce,
        baseline_gamma_pe,
        diff_vega_ce,
        diff_vega_pe,
        diff_theta_ce,
        diff_theta_pe,
        diff_gamma_ce,
        diff_gamma_pe,
        expiry,
        date_inserted
    } = dataToInsert;

    db.run(`INSERT INTO ${tableName} (
        timestamp, vega_ce_sum, vega_pe_sum, theta_ce_sum, theta_pe_sum, gamma_ce_sum,
        gamma_pe_sum, ltp_ce_sum, ltp_pe_sum, baseline_vega_ce, baseline_vega_pe,
        baseline_theta_ce, baseline_theta_pe, baseline_gamma_ce, baseline_gamma_pe,
        diff_vega_ce, diff_vega_pe, diff_theta_ce, diff_theta_pe, diff_gamma_ce,
        diff_gamma_pe, expiry, date_inserted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        timestamp, vega_ce_sum, vega_pe_sum, theta_ce_sum, theta_pe_sum, gamma_ce_sum,
        gamma_pe_sum, ltp_ce_sum, ltp_pe_sum, baseline_vega_ce, baseline_vega_pe,
        baseline_theta_ce, baseline_theta_pe, baseline_gamma_ce, baseline_gamma_pe,
        diff_vega_ce, diff_vega_pe, diff_theta_ce, diff_theta_pe, diff_gamma_ce,
        diff_gamma_pe, expiry, date_inserted
    ]);
};

const insertOptionData = (db, tableName, optiondataToInsert) => {
    const {
        timestamp,
        call_premium,
        put_premium,
        bear_spread,
        bull_spread,
        atm_straddle,
        atm_plus_1_straddle,
        atm_plus_2_straddle,
        atm_minus_1_straddle,
        atm_minus_2_straddle,
        date_inserted,
        expiry
    } = optiondataToInsert;

    db.run(`INSERT INTO ${tableName} (
        timestamp, call_premium, put_premium, bear_spread, bull_spread,
        atm_straddle, atm_plus_1_straddle, atm_plus_2_straddle,
        atm_minus_1_straddle, atm_minus_2_straddle, date_inserted, expiry
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        timestamp, call_premium, put_premium, bear_spread, bull_spread,
        atm_straddle, atm_plus_1_straddle, atm_plus_2_straddle,
        atm_minus_1_straddle, atm_minus_2_straddle, date_inserted, expiry
    ]);
};


//Fetching data from Aliceblue 1ly api 
// Corrected portion of the fetchOptionsData function:
const fetchOptionsData = async (name, expiry) => {
    try {
        const startTimeString = process.env.TRADING_START_TIME || '09:14';
        const endTimeString = process.env.TRADING_END_TIME || '23:32';

        const [startHour, startMinute] = startTimeString.split(':').map(Number);
        const [endHour, endMinute] = endTimeString.split(':').map(Number);

        const now = new Date();

        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);

        if (now < startTime || now > endTime) {
            console.log(`Current time ${now} is outside trading hours for ${name}`);
            return;
        }

        // Define the requestData object before using it
        const requestData = {
            name: name,
            expiry: expiry,
            limit: process.env.STRIKES,
            exchange: process.env.EXCHANGE,
            access_token: process.env.accessToken,
            days_to_expire: DAYS_TO_EXPIRE,
            user_id: process.env.USERID,
            ws_token: process.env.wsToken
        };

        const response = await axios.post('https://beta.inuvest.tech/backtest/getComputedValue/', requestData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': AUTHBEARERTOKEN
            }
        });        

        const strikeList = response.data.strike_list;
        const atmvalue = response.data.atm_values.strike_price;
        const vegaCE = response.data.greeks.vega_ce;
        const vegaPE = response.data.greeks.vega_pe;
        const gammaCE = response.data.greeks.gamma_ce;
        const gammaPE = response.data.greeks.gamma_pe;
        const thetaCE = response.data.greeks.theta_ce;
        const thetaPE = response.data.greeks.theta_pe;
        const ltpCE = response.data.ltp_ce_list;
        const ltpPE = response.data.ltp_pe_list;

        console.log("ATM Value ", atmvalue);
        // Ensure helper functions are defined before usage
        function findAtmPosition(strikeList, atmvalue) {
            const index = strikeList.findIndex(strike => strike === atmvalue);
            return index !== -1 ? index : 'ATM value not found in strike list';
        }


        function sumFromStartPosition(array, startPosition) {
            if (startPosition < 0 || startPosition >= array.length) {
                throw new Error('Invalid start position');
            }
            return array.slice(startPosition).reduce((acc, curr) => acc + curr, 0);
        }

        function sumToPosition(array, position) {
            if (position < 0 || position >= array.length) {
                throw new Error('Invalid position');
            }
            return array.slice(0, position + 1).reduce((acc, curr) => acc + curr, 0);
        }

        function calculateAverage(position, count, array, direction) {
            if (position < 0 || position >= array.length || count <= 0) {
                throw new Error('Invalid position or count');
            }

            let sum = 0;
            let elements = [];

            if (direction === 'downwards') {
                for (let i = position; i < position + count && i < array.length; i++) {
                    elements.push(array[i]);
                    sum += array[i];
                }
            } else if (direction === 'upwards') {
                for (let i = position; i > position - count && i >= 0; i--) {
                    elements.push(array[i]);
                    sum += array[i];
                }
            } else {
                throw new Error('Invalid direction specified. Use "downwards" or "upwards".');
            }

            return Math.round(sum / elements.length);
        }

        // Function to calculate Bull Spread
        function BullSpread(ltpCE, position) {
            if (position + 4 < ltpCE.length) {
                return Math.round(ltpCE[position] - ltpCE[position + 4]);
            } else {
                throw new Error('Position + 5 exceeds the length of ltpCE array');
            }
        }

        // Function to calculate Bear Spread    
        function BearSpread(ltpPE, position) {
            if (position - 5 >= 0) {
                return Math.round(ltpPE[position - 1] - ltpPE[position - 5]);
            } else {
                throw new Error('Position - 5 is less than 0 in ltpPE array');
            }
        }

        // Function to calculate Straddle values
        function Straddle(ltpCE, ltpPE, position) {
            if (position - 3 >= 0 && position + 3 < ltpCE.length && position + 3 < ltpPE.length) {
                return {
                    atm_straddle: Math.round(ltpCE[position] + ltpPE[position]),
                    atm_plus_1_straddle: Math.round(ltpCE[position + 1] + ltpPE[position + 1]),
                    atm_plus_2_straddle: Math.round(ltpCE[position + 2] + ltpPE[position + 2]),
                    atm_minus_1_straddle: Math.round(ltpCE[position - 1] + ltpPE[position - 1]),
                    atm_minus_2_straddle: Math.round(ltpCE[position - 2] + ltpPE[position - 2]),
                    atm_plus_3_straddle: Math.round(ltpCE[position + 3] + ltpPE[position + 3]),
                    atm_minus_3_straddle: Math.round(ltpCE[position - 3] + ltpPE[position - 3]),

                };
            } else {
                throw new Error('Position out of bounds for calculating straddles');
            }
        }

        const position = findAtmPosition(strikeList, atmvalue);

        const vega_ce_sum = sumFromStartPosition(vegaCE, position - 1);
        const vega_pe_sum = sumToPosition(vegaPE, position);
        const theta_ce_sum = sumFromStartPosition(thetaCE, position - 1);
        const theta_pe_sum = sumToPosition(thetaPE, position);
        const gamma_ce_sum = sumFromStartPosition(gammaCE, position - 1);
        const gamma_pe_sum = sumToPosition(gammaPE, position);

        const ltp_ce_sum = calculateAverage(position - 1, 5, ltpCE, 'downwards');
        const ltp_pe_sum = calculateAverage(position + 1, 5, ltpPE, 'upwards');

        const timestamp = new Date().toLocaleTimeString();
        const date_inserted = getTodayDate();
        
        const bull_spread = BullSpread(ltpCE, position);
        const bear_spread = BearSpread(ltpPE, position);
        const straddleValues = Straddle(ltpCE, ltpPE, position);
        
        // Calculate EMA for bull_spread and bear_spread
        const db = new sqlite3.Database(`${name}.db`);
        let bull_spread_ema = await calculateEMA(db, 'OPTIONHEDGE', 'bull_spread', bull_spread);
        let bear_spread_ema = await calculateEMA(db, 'OPTIONHEDGE', 'bear_spread', bear_spread);

        // Log calculated EMA values for debugging
       // console.log(`Calculated EMA - Bull Spread EMA: ${bull_spread_ema}, Bear Spread EMA: ${bear_spread_ema}`);

        // If EMA calculation fails or has no previous values, use the last value
        bull_spread_ema = bull_spread_ema || bull_spread;
        bear_spread_ema = bear_spread_ema || bear_spread;

        if (!firstPrintDone[name] && now >= baselineStartTime) {
            // Set baseline values
            baseline[name] = {
                baseline_vega_ce: vega_ce_sum,
                baseline_vega_pe: vega_pe_sum,
                baseline_theta_ce: theta_ce_sum,
                baseline_theta_pe: theta_pe_sum,
                baseline_gamma_ce: gamma_ce_sum,
                baseline_gamma_pe: gamma_pe_sum
            };
            firstPrintDone[name] = true;
        }

        const diff_vega_ce = baseline[name].baseline_vega_ce !== 0 ? vega_ce_sum - baseline[name].baseline_vega_ce : 0;
        const diff_vega_pe = baseline[name].baseline_vega_pe !== 0 ? vega_pe_sum - baseline[name].baseline_vega_pe : 0;
        const diff_theta_ce = baseline[name].baseline_theta_ce !== 0 ? theta_ce_sum - baseline[name].baseline_theta_ce : 0;
        const diff_theta_pe = baseline[name].baseline_theta_pe !== 0 ? theta_pe_sum - baseline[name].baseline_theta_pe : 0;
        const diff_gamma_ce = baseline[name].baseline_gamma_ce !== 0 ? gamma_ce_sum - baseline[name].baseline_gamma_ce : 0;
        const diff_gamma_pe = baseline[name].baseline_gamma_pe !== 0 ? gamma_pe_sum - baseline[name].baseline_gamma_pe : 0;

        // Data to insert to the main table
        const dataToInsert = {
            timestamp,
            vega_ce_sum,
            vega_pe_sum,
            theta_ce_sum,
            theta_pe_sum,
            gamma_ce_sum,
            gamma_pe_sum,
            ltp_ce_sum,
            ltp_pe_sum,
            baseline_vega_ce: baseline[name].baseline_vega_ce,
            baseline_vega_pe: baseline[name].baseline_vega_pe,
            baseline_theta_ce: baseline[name].baseline_theta_ce,
            baseline_theta_pe: baseline[name].baseline_theta_pe,
            baseline_gamma_ce: baseline[name].baseline_gamma_ce,
            baseline_gamma_pe: baseline[name].baseline_gamma_pe,
            diff_vega_ce,
            diff_vega_pe,
            diff_theta_ce,
            diff_theta_pe,
            diff_gamma_ce,
            diff_gamma_pe,
            expiry,
            date_inserted
        };

        // Data to insert into the OPTIONHEDGE table
        const optiondataToInsert = {
            timestamp,
            call_premium: ltp_ce_sum,
            put_premium: ltp_pe_sum,
            bear_spread,
            bull_spread,
            bear_spread_ema,
            bull_spread_ema,
            atm_straddle: straddleValues.atm_straddle,
            atm_plus_1_straddle: straddleValues.atm_plus_1_straddle,
            atm_plus_2_straddle: straddleValues.atm_plus_2_straddle,
            atm_minus_1_straddle: straddleValues.atm_minus_1_straddle,
            atm_minus_2_straddle: straddleValues.atm_minus_2_straddle,
            atm_plus_3_straddle: straddleValues.atm_plus_3_straddle,
            atm_minus_3_straddle: straddleValues.atm_minus_3_straddle,
            date_inserted,
            expiry
        };

        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS ${name} (
                    timestamp TEXT,
                    vega_ce_sum REAL,
                    vega_pe_sum REAL,
                    theta_ce_sum REAL,
                    theta_pe_sum REAL,
                    gamma_ce_sum REAL,
                    gamma_pe_sum REAL,
                    ltp_ce_sum REAL,
                    ltp_pe_sum REAL,
                    baseline_vega_ce REAL,
                    baseline_vega_pe REAL,
                    baseline_theta_ce REAL,
                    baseline_theta_pe REAL,
                    baseline_gamma_ce REAL,
                    baseline_gamma_pe REAL,
                    diff_vega_ce REAL,
                    diff_vega_pe REAL,
                    diff_theta_ce REAL,
                    diff_theta_pe REAL,
                    diff_gamma_ce REAL,
                    diff_gamma_pe REAL,
                    expiry TEXT,
                    date_inserted TEXT
                )
            `);
            insertData(db, name, dataToInsert);
        });


// Inserting data into the OPTIONHEDGE table
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS OPTIONHEDGE (
                    timestamp TEXT,
                    call_premium REAL,
                    put_premium REAL,
                    bear_spread REAL,
                    bear_spread_ema REAL,
                    bull_spread REAL,
                    bull_spread_ema REAL,
                    atm_straddle REAL,
                    atm_plus_1_straddle REAL,
                    atm_plus_2_straddle REAL,
                    atm_minus_1_straddle REAL,
                    atm_minus_2_straddle REAL,
                    atm_plus_3_straddle REAL,
                    atm_minus_3_straddle REAL,
                    date_inserted TEXT,
                    expiry TEXT
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating OPTIONHEDGE table:', err.message);
                }
            });

            // Insert data into OPTIONHEDGE table
            db.run(`
                INSERT INTO OPTIONHEDGE (
                    timestamp, call_premium, put_premium, bear_spread, bear_spread_ema,
                    bull_spread, bull_spread_ema, atm_straddle, atm_plus_1_straddle,
                    atm_plus_2_straddle, atm_minus_1_straddle, atm_minus_2_straddle,atm_plus_3_straddle,
                    atm_minus_3_straddle,
                    date_inserted, expiry
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)
            `, [
                optiondataToInsert.timestamp,
                optiondataToInsert.call_premium,
                optiondataToInsert.put_premium,
                optiondataToInsert.bear_spread,
                optiondataToInsert.bear_spread_ema,
                optiondataToInsert.bull_spread,
                optiondataToInsert.bull_spread_ema,
                optiondataToInsert.atm_straddle,
                optiondataToInsert.atm_plus_1_straddle,
                optiondataToInsert.atm_plus_2_straddle,
                optiondataToInsert.atm_minus_1_straddle,
                optiondataToInsert.atm_minus_2_straddle,
                optiondataToInsert.atm_plus_3_straddle,
                optiondataToInsert.atm_minus_3_straddle,
                optiondataToInsert.date_inserted,
                optiondataToInsert.expiry
            ], (err) => {
                if (err) {
                    console.error('Error inserting data into OPTIONHEDGE table:', err.message);
                } else {
                // console.log('EMA values successfully inserted into OPTIONHEDGE table');
                }
            });
        });

        db.close();
        console.log(`Data inserted successfully into ${name}.db`);

    } catch (error) {
        console.error(`Error fetching options data for ${name}:`, error);
    }
};

// Function to calculate EMA for a given column
async function calculateEMA(db, tableName, columnName, latestValue) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT ${columnName} FROM ${tableName} ORDER BY timestamp DESC LIMIT 4`, [], (err, rows) => {
            if (err) {
                return reject(err);
            }

            const alpha = 2 / (5 + 1); // EMA period of 5

            if (rows.length === 0) {
                // No previous data, return the latest value as the EMA
                return resolve(latestValue);
            }

            // Calculate EMA
            let previousEMA = rows.reduce((acc, row, index) => {
                if (index === 0) {
                    return row[columnName]; // The first value in the series
                }
                return alpha * row[columnName] + (1 - alpha) * acc;
            }, latestValue);

            let currentEMA = alpha * latestValue + (1 - alpha) * previousEMA;
          //  console.log(`EMA Calculated for ${columnName}:`, currentEMA);
            resolve(currentEMA);
        });
    });
}

// Function to calculate EMA for a given column
async function calculateEMA(db, tableName, columnName, latestValue) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT ${columnName} FROM ${tableName} ORDER BY timestamp DESC LIMIT 4`, [], (err, rows) => {
            if (err) {
                return reject(err);
            }

            const alpha = 2 / (5 + 1); // EMA period of 5

            if (rows.length === 0) {
                // No previous data, return the latest value as the EMA
                return resolve(latestValue);
            }

            // Calculate EMA
            let previousEMA = rows.reduce((acc, row, index) => {
                if (index === 0) {
                    return row[columnName]; // The first value in the series
                }
                return alpha * row[columnName] + (1 - alpha) * acc;
            }, latestValue);

            let currentEMA = alpha * latestValue + (1 - alpha) * previousEMA;
           // console.log(`EMA Calculated for ${columnName}:`, Math.round(currentEMA));
            resolve(Math.round(currentEMA));
        });
    });
}

const isPastCutoffTime = () => {
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(15, 35, 0, 0); // 3:35 PM
    return now >= cutoffTime;
};

const startFetchingData = (name, expiry) => {
    const now = new Date();

    // Use the values from the .env file
    const [startHour, startMinute] = process.env.TRADING_START_TIME.split(':').map(Number);
    const [endHour, endMinute] = process.env.TRADING_END_TIME.split(':').map(Number);

    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0, 0); // Set the start time

    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0, 0); // Set the end time

    const timeUntilStart = startTime - now;
    const intervalDuration = 30000; // 30 seconds

    if (timeUntilStart > 0) {
        console.log(`Waiting until ${process.env.TRADING_START_TIME} to start fetching data for ${name}`);
        setTimeout(() => {
            const intervalId = setInterval(() => {
                if (isPastCutoffTime(endTime)) {
                    clearInterval(intervalId);
                    console.log(`Stopped fetching data for ${name}`);
                } else {
                    fetchOptionsData(name, expiry);
                }
            }, intervalDuration);
            fetchOptionsData(name, expiry); // Fetch immediately at the start time
        }, timeUntilStart);
    } else {
        const intervalId = setInterval(() => {
            if (isPastCutoffTime(endTime)) {
                clearInterval(intervalId);
                console.log(`Stopped fetching data for ${name}`);
            } else {
                fetchOptionsData(name, expiry);
            }
        }, intervalDuration);
        fetchOptionsData(name, expiry); // Fetch immediately if the current time is past the start time
    }
};

// Function to calculate EMA for a given column
async function calculateEMA(db, tableName, columnName, latestValue) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT ${columnName} FROM ${tableName} ORDER BY timestamp DESC LIMIT 4`, [], (err, rows) => {
            if (err) {
                return reject(err);
            }

            const alpha = 2 / (5 + 1); // EMA period of 5

            if (rows.length === 0) {
                // No previous data, return the latest value as the EMA
                return resolve(latestValue);
            }

            // Calculate EMA
            let previousEMA = rows.reduce((acc, row, index) => {
                if (index === 0) {
                    return row[columnName]; // The first value in the series
                }
                return alpha * row[columnName] + (1 - alpha) * acc;
            }, latestValue);

            let currentEMA = alpha * latestValue + (1 - alpha) * previousEMA;
           // console.log("Ema" , Math.round(currentEMA));
            resolve(Math.round(currentEMA));
        });
    });
}

// Function to calculate percentage change
function calculatePercentageChange(currentValue, previousValue) {
    if (previousValue !== null && previousValue !== undefined && currentValue !== null && currentValue !== undefined) {
        const change = ((currentValue - previousValue) / previousValue) * 100;
        return `${change.toFixed(2)}%`;
    } else {
        return '0.00%'; // No previous data available, assume no change
    }
}

// Function to send notifications via Telegram and to the frontend
function sendNotification(signal) {
    // Sending notification to Telegram
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (telegramBotToken && telegramChatId) {
        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        const message = `Trading Signal Alert: ${signal}`;
        axios.post(telegramUrl, {
            chat_id: telegramChatId,
            text: message
        }).then(() => {
            console.log('Telegram notification sent.');
        }).catch((err) => {
            console.error('Error sending Telegram notification:', err.message);
        });
    }

    // Sending notification to the frontend
    io.emit('signal-update', { signal });
}

// Variable to store the previous signal
let previousSignal = '';

function evaluateAndNotify(a, b, c, d, bull_spread_ema, bear_spread_ema) {
    const signal = calculateSignal(a, b, c, d, bull_spread_ema, bear_spread_ema);

    // Check if the signal has changed
    if (signal !== previousSignal) {
        // Send notifications when the signal changes
        sendNotification(signal);
        previousSignal = signal;
    }

    return signal;
}

// Start fetching data for each index with the respective expiry
startFetchingData('NIFTY', process.env.nifty);
startFetchingData('BANKNIFTY', process.env.bankNifty);
startFetchingData('FINNIFTY', process.env.finnifty);
startFetchingData('MIDCPNIFTY', process.env.midcpNifty);

// Update .env file with new settings
app.post('/update-settings', (req, res) => {
    const newSettings = req.body;
    const envPath = path.join(__dirname, '.env');

    // Load current .env file
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    // Update settings
    for (const key in newSettings) {
        if (newSettings.hasOwnProperty(key)) {
            envConfig[key] = newSettings[key];
        }
    }

    // Write updated settings back to .env file
    const envContent = Object.keys(envConfig)
        .map(key => `${key}=${envConfig[key]}`)
        .join('\n');

    fs.writeFileSync(envPath, envContent);

    res.send('Settings updated successfully');
});

app.post('/stop-server', (req, res) => {
    res.send('Stopping server...');
    console.log('Server is stopping...');

    // Delay the stop slightly to ensure the response is sent first
    setTimeout(() => {
        process.exit(0); // Stops the server
    }, 1000); // 1-second delay
});

app.post('/start-server', (req, res) => {
    console.log('Starting server...');

    // Execute the command to start the server
    exec('npm run restart', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting server: ${error.message}`);
            return res.status(500).send('Failed to start the server');
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).send('Failed to start the server');
        }
        console.log(`stdout: ${stdout}`);
        res.send('Server started successfully');
    });
});

// Get settings from the .env file
app.get('/api/get-settings', (req, res) => {
    const settings = {
        accessToken: process.env.accessToken || '',
        wsToken: process.env.wsToken || '',
        daysToExpire: process.env.daysToExpire || '',
        nifty: process.env.nifty || '',
        bankNifty: process.env.bankNifty || '',
        finnifty: process.env.finnifty || '',
        midcpNifty: process.env.midcpNifty || '',
    };
    res.json(settings);
});

app.post('/options', (req, res) => {
    const {
         name, 
         expiry 
        } = req.body;
    if (!name || !expiry) {
        return res.status(400).send('Name and expiry are required.');
    }
    startFetchingData(name, expiry);
    res.send(`Started fetching data for ${name} with expiry ${expiry}`);
});

app.get('/api/data', (req, res) => {
    const { name, date } = req.query;

    if (!name) {
        return res.status(400).send('Invalid or missing name parameter.');
    }

    const db = new sqlite3.Database(`${name}.db`);
    const selectedDate = date || getTodayDate();

    db.all(`SELECT * FROM ${name} WHERE date_inserted = ? ORDER BY rowid ASC`, [selectedDate], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred while fetching data.');
            return;
        }

        if (rows.length === 0) {
            console.log(`No data found for ${name} on ${selectedDate}`);
            res.status(404).send('No data found for the selected date.');
            return;
        }

        const data = {
            timestamps: rows.map(row => row.timestamp),
            vega_ce_sums: rows.map(row => row.vega_ce_sum),
            vega_pe_sums: rows.map(row => row.vega_pe_sum),
            theta_ce_sums: rows.map(row => row.theta_ce_sum),
            theta_pe_sums: rows.map(row => row.theta_pe_sum),
            gamma_ce_sums: rows.map(row => row.gamma_ce_sum),
            gamma_pe_sums: rows.map(row => row.gamma_pe_sum),
            ltp_ce_sums: rows.map(row => row.ltp_ce_sum),
            ltp_pe_sums: rows.map(row => row.ltp_pe_sum),
            diff_vega_ce_sums: rows.map(row => row.diff_vega_ce),
            diff_vega_pe_sums: rows.map(row => row.diff_vega_pe),
            diff_theta_ce_sums: rows.map(row => row.diff_theta_ce),
            diff_theta_pe_sums: rows.map(row => row.diff_theta_pe),
            diff_gamma_ce_sums: rows.map(row => row.diff_gamma_ce),
            diff_gamma_pe_sums: rows.map(row => row.diff_gamma_pe),
        };

        res.json(data);
    });

    db.close();
});

app.get('/api/expiry-dates', (req, res) => {
    res.json({
        NIFTY: process.env.nifty,
        BANKNIFTY: process.env.bankNifty,
        FINNIFTY: process.env.finnifty,
        MIDCPNIFTY: process.env.midcpNifty
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// API route to fetch straddle data with percentage changes
app.get('/api/straddle-data', (req, res) => {
    const { index, date } = req.query;
    if (!index || !date) {
        return res.status(400).send('Invalid or missing parameters.');
    }

    const db = new sqlite3.Database(`${index}.db`);

    db.all(`SELECT * FROM OPTIONHEDGE WHERE date_inserted = ? ORDER BY rowid DESC LIMIT 11`, [date], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('An error occurred while fetching data.');
        }

        if (!rows || rows.length === 0) {
            return res.status(404).send('No data available for the selected date.');
        }

        const currentRow = rows[0]; // Most recent entry
        const previousRow = rows[10] || rows[rows.length - 1]; // Row from 5 minutes ago or the oldest row available (if less than 11 rows)

        const result = [
            {
                strike: 'S-3',
                value: currentRow.atm_minus_3_straddle,
                changePercentage: calculatePercentageChange(currentRow.atm_minus_3_straddle, previousRow.atm_minus_3_straddle)
            },
            {
                strike: 'S-2',
                value: currentRow.atm_minus_2_straddle,
                changePercentage: calculatePercentageChange(currentRow.atm_minus_2_straddle, previousRow.atm_minus_2_straddle)
            },
            {
                strike: 'S-1',
                value: currentRow.atm_minus_1_straddle,
                changePercentage: calculatePercentageChange(currentRow.atm_minus_1_straddle, previousRow.atm_minus_1_straddle)
            },
            {
                strike: 'S0',
                value: currentRow.atm_straddle,
                changePercentage: calculatePercentageChange(currentRow.atm_straddle, previousRow.atm_straddle)
            },
            {
                strike: 'S+1',
                value: currentRow.atm_plus_1_straddle,
                changePercentage: calculatePercentageChange(currentRow.atm_plus_1_straddle, previousRow.atm_plus_1_straddle)
            },
            {
                strike: 'S+2',
                value: currentRow.atm_plus_2_straddle,
                changePercentage: calculatePercentageChange(currentRow.atm_plus_2_straddle, previousRow.atm_plus_2_straddle)
            },
            {
                strike: 'S+3',
                value: currentRow.atm_plus_3_straddle,
                changePercentage: calculatePercentageChange(currentRow.atm_plus_3_straddle, previousRow.atm_plus_3_straddle)
            }
        ];

        res.json(result);
    });

    db.close();
});



//API route to fetch initial vlaues for the straddle data
app.get('/api/initial-values', (req, res) => {
    const { index, date } = req.query;

    if (!index || !date) {
        return res.status(400).send('Invalid or missing parameters.');
    }

    const db = new sqlite3.Database(`${index}.db`);

    // Adjust the query to select any row with a timestamp between 09:20:00 and 09:21:00
    db.get(`
        SELECT * 
        FROM OPTIONHEDGE 
        WHERE date_inserted = ? 
        AND timestamp >= '9:20:00' 
        AND timestamp < '9:22:00'
        LIMIT 1
    `, [date], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('An error occurred while fetching initial values.');
        }

        if (!row) {
            return res.status(404).send('No data found between 09:20 AM and 09:21 AM.');
        }

        const a = row.bull_spread * 1.15;
        const b = row.bull_spread * 0.85;
        const c = row.bear_spread * 1.15;
        const d = row.bear_spread * 0.85;

        res.json({
            a,
            b,
            c,
            d
        });
    });

    db.close();
});


// Route to fetch last live values
app.get('/api/live-values', (req, res) => {
    const { index, date } = req.query;
    if (!index || !date) {
        return res.status(400).send('Invalid or missing parameters.');
    }

    const db = new sqlite3.Database(`${index}.db`);
    db.get(`SELECT * FROM OPTIONHEDGE WHERE date_inserted = ? ORDER BY rowid DESC LIMIT 1`, [date], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('An error occurred while fetching live values.');
        }

        if (!row) {
            return res.status(404).send('No live data found for the selected date.');
        }
        //console.log("ROWSSS",row);
        const e = row.bull_spread;
        const f = row.bear_spread;
        const bull_spread_ema = row.bull_spread_ema;
        const bear_spread_ema = row.bear_spread_ema;

        res.json({ e, f, bull_spread_ema, bear_spread_ema });
    });

    db.close();
});

// Export data to excel
app.get('/api/export-data', async (req, res) => {
    const {
        index,
        date
    } = req.query;

    if (!index || !date) {
        return res.status(400).send('Index and date are required.');
    }

    const db = new sqlite3.Database(`${index}.db`);

    db.all(`SELECT * FROM ${index} WHERE date_inserted = ?`, [date], async (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred while fetching data.');
            return;
        }

        if (rows.length === 0) {
            console.log(`No data found for ${index} on ${date}`);
            return res.status(404).send('No data found for the selected date.');
        }

        // Create a new workbook and add a worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Data');

        // Add column headers
        worksheet.columns = Object.keys(rows[0]).map(key => ({
            header: key,
            key
        }));

        // Add rows
        rows.forEach(row => {
            worksheet.addRow(row);
        });

        // Write to a buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Set headers and send the buffer as a file
        res.setHeader('Content-Disposition', `attachment; filename=${index}-${date}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    });

    db.close();
});

app.post('/restart', (req, res) => {
    res.send('Server is restarting...');

    console.log('Restarting server...');

    // Delay the restart slightly to ensure the response is sent first
    setTimeout(() => {
        exec('npm run restart', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error restarting server: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    }, 1000); // 1-second delay
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

io.on('connection', (socket) => {
    console.log('a user connected');
});