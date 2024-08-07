const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('banknifty.db');

// Function to handle the deletion with retry logic
const deleteRowsAfterTime = (db, tableName, time, maxRetries = 5) => {
    let attempt = 0;

    const executeDelete = () => {
        db.serialize(() => {
            const deleteQuery = `DELETE FROM ${tableName} WHERE time(timestamp) > ?`;

            db.run(deleteQuery, [time], function(err) {
                if (err) {
                    if (err.code === 'SQLITE_BUSY' && attempt < maxRetries) {
                        attempt++;
                        console.log(`Database is locked, retrying attempt ${attempt}/${maxRetries}...`);
                        setTimeout(executeDelete, 200); // Wait 200ms before retrying
                    } else {
                        return console.error('Error deleting rows:', err.message);
                    }
                } else {
                    console.log(`Rows deleted: ${this.changes}`);
                }
            });
        });
    };

    executeDelete();
};

// Execute the deletion
db.serialize(() => {
    deleteRowsAfterTime(db, 'BANKNIFTY', '3:35:00 PM');
});

// Close the database connection
db.close((err) => {
    if (err) {
        return console.error('Error closing the database:', err.message);
    }
    console.log('Close the database connection.');
});