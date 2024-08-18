const sqlite3 = require('sqlite3').verbose();

// Open the database connection
let db = new sqlite3.Database('./nifty.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the nifty.db database.');
    }
});

// Create the OPTIONHEDGE table
db.run(`CREATE TABLE IF NOT EXISTS OPTIONHEDGE (
    timestamp TEXT NOT NULL,
    call_premium REAL,
    put_premium REAL,
    bear_spread REAL,
    bull_spread REAL,
    atm_straddle REAL,
    atm_minus_1_straddle REAL,
    atm_minus_2_straddle REAL,
    atm_plus_1_straddle REAL,
    atm_plus_2_straddle REAL,
    date_inserted TEXT,
    expiry TEXT
)`, (err) => {
    if (err) {
        console.error('Error creating OPTIONHEDGE table:', err.message);
    } else {
        console.log('OPTIONHEDGE table created successfully.');
    }
});

// Close the database connection
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database connection closed.');
    }
});