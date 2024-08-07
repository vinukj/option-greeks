const express = require('express');
const axios = require('axios');
require('dotenv').config();
const app = express();
const sqlite3 = require('sqlite3').verbose();

const YOUR_ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const AUTHBEARERTOKEN = "Bearer " + process.env.ACCESS_TOKEN;
const YOUR_WS_TOKEN = process.env.WS_TOKEN;

const port = 3005;
app.use(express.json());
app.use(express.static('public'));

let firstPrintDone = {
    NIFTY: false,
    BANKNIFTY: false,
    FINNIFTY: false,
    MIDCPNIFTY: false
};

const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
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

// Parse the baseline start time from the environment variable
const parseBaselineStartTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const baselineTime = new Date();
    baselineTime.setHours(hours, minutes, 0, 0);
    return baselineTime;
};

const baselineStartTime = parseBaselineStartTime(process.env.BASELINE_START_TIME);

// Insert Data into respective DB
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
    console.log(`Inserting data into ${tableName}:`, dataToInsert); // Debug log

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


// Function to fetch options data from the endpoint
const fetchOptionsData = async (name, expiry) => {
    try {
        const response = await axios.post('https://beta.inuvest.tech/backtest/getComputedValue/', {
            "name": name,
            "expiry": expiry,
            "limit": process.env.STRIKES,
            "exchange": process.env.EXCHANGE,
            "access_token": YOUR_ACCESS_TOKEN,
            "days_to_expire": 0.006213051877219686,
            "user_id": process.env.USERID,
            "ws_token": YOUR_WS_TOKEN
        }, {
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

        function findAtmPosition(strikeList, atmvalue) {
            const index = strikeList.findIndex(strike => strike === atmvalue);
            return index !== -1 ? index : 'ATM value not found in strike list';
        }

        const position = findAtmPosition(strikeList, atmvalue);

        function sumAll(numbers) {
            return numbers.reduce((acc, curr) => acc + curr, 0);
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

        const vega_ce_sum = sumFromStartPosition(vegaCE, position - 1);
        const vega_pe_sum = sumToPosition(vegaPE, position);
        const theta_ce_sum = sumFromStartPosition(thetaCE, position - 1);
        const theta_pe_sum = sumToPosition(thetaPE, position);
        const gamma_ce_sum = sumFromStartPosition(gammaCE, position - 1);
        const gamma_pe_sum = sumToPosition(gammaPE, position);
        const ltp_ce_sum = sumAll(ltpCE);
        const ltp_pe_sum = sumAll(ltpPE);

        const timestamp = new Date().toLocaleTimeString();
        const date_inserted = getTodayDate(); // Add this line to set the date_inserted

        // console.log(`ATM Value (${name}): `, atmvalue);
        // console.log(`Position of ATM value (${name}):`, position);
        // console.log(`Timestamp (${name}): `, timestamp);
        // console.log(`Vega CE Sum from ATM to OTM (${name}):`, vega_ce_sum);
        // console.log(`Vega PE Sum from ATM to OTM (${name}):`, vega_pe_sum);

        // Check if the current time is after 9:30 AM
        // const baseline_start_time = new Date();
        // baseline_start_time.setHours(11, 55, 0, 0);

        if (!firstPrintDone[name] && new Date() >= baselineStartTime) {
            console.log(`First Vega CE Sum after Baseline Time: ${vega_ce_sum} for ${name}`);
            console.log(`First Vega PE Sum after Baseline Time: ${vega_pe_sum} for ${name}`);
            console.log(`First Theta CE Sum after Baseline Time: ${theta_ce_sum} for ${name}`);
            console.log(`First Theta PE Sum after Baseline Time: ${theta_pe_sum} for ${name}`);
            console.log(`First Gamma CE Sum after Baseline Time: ${gamma_ce_sum} for ${name}`);
            console.log(`First Gamma PE Sum after Baseline Time: ${gamma_pe_sum} for ${name}`);

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

        const db = new sqlite3.Database(`${name}.db`);
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
        db.close();
        console.log(`Data inserted successfully into ${name}.db`);

    } catch (error) {
        console.error('Error fetching options data for ${name}:, error');
    }
};


const isPastCutoffTime = () => {
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(15, 40, 0, 0); // 3:40 PM
    return now >= cutoffTime;
};

const startFetchingData = (name, expiry) => {
    const intervalId = setInterval(() => {
        if (isPastCutoffTime()) {
            clearInterval(intervalId);
            console.log(`Stopped fetching data for ${name}`);
        } else {
            fetchOptionsData(name, expiry);
        }
    }, 30000);
    fetchOptionsData(name, expiry); // Fetch immediately
};

// const startFetchingData = (name, expiry) => {
//         setInterval(() => fetchOptionsData(name, expiry), 30000);
//         fetchOptionsData(name, expiry);
// };

// Start fetching data for each index with the respective expiry
// startFetchingData('NIFTY', process.env.INDEX_EXPIRY_NIFTY);
// startFetchingData('BANKNIFTY', process.env.INDEX_EXPIRY_BANKNIFTY);
// startFetchingData('FINNIFTY', process.env.INDEX_EXPIRY_FINNIFTY);
// startFetchingData('MIDCPNIFTY', process.env.INDEX_EXPIRY_MIDCPNIFTY);

app.post('/options', (req, res) => {
    const {
        name,
        expiry
    } = req.body;
    if (!name || !expiry) {
        return res.status(400).send('Name and expiry are required.');
    }
    startFetchingData(name, expiry);
    res.send('Started fetching data for ${name} with expiry ${expiry}');
});

app.get('/api/data', (req, res) => {
    const {
        name
    } = req.query;
    if (!name) {
        return res.status(400).send('Invalid or missing name parameter.');
    }
    const db = new sqlite3.Database(`${name}.db`);
    const today = getTodayDate();

    db.all(`SELECT * FROM ${name} WHERE date_inserted = ?`, [today], (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('An error occurred while fetching data.');
            return;
        }

        if (rows.length === 0) {
            console.log(`No data found for ${name} on ${today}`);
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
        NIFTY: process.env.INDEX_EXPIRY_NIFTY,
        BANKNIFTY: process.env.INDEX_EXPIRY_BANKNIFTY,
        FINNIFTY: process.env.INDEX_EXPIRY_FINNIFTY,
        MIDCPNIFTY: process.env.INDEX_EXPIRY_MIDCPNIFTY
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});