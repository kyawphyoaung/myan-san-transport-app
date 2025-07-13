// backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5001; // သင်ပြောင်းလဲထားသော Port နံပါတ်ကို သေချာစစ်ဆေးပါ။

// Middleware
app.use(cors());
app.use(express.json());

// Database initialization
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Enable foreign key constraints
    db.run("PRAGMA foreign_keys = ON;", (pragmaErr) => {
      if (pragmaErr) {
        console.error("Error enabling foreign keys:", pragmaErr.message);
      } else {
        console.log("Foreign key constraints enabled.");
      }
    });

    // Database tables များကို ဖန်တီးပါ။
    db.serialize(() => {
      // Trips Table (Re-added updated_at column)
      db.run(`
        CREATE TABLE IF NOT EXISTS trips (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          car_no TEXT NOT NULL,
          from_location TEXT NOT NULL,
          to_location TEXT NOT NULL,
          route_charge INTEGER,
          empty_pickup_charge INTEGER,
          empty_dropoff_charge INTEGER,
          overnight_status TEXT,
          day_over_status TEXT,
          remarks TEXT,
          total_charge INTEGER,
          km_travelled INTEGER,
          fuel_amount REAL DEFAULT 0,
          fuel_cost INTEGER DEFAULT 0,
          driver_name TEXT DEFAULT 'N/A',
          is_manual_edited INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- Re-added updated_at for trips table
        )
      `, (err) => {
        if (err) console.error("Error creating trips table:", err.message);
        else {
          console.log("Trips table created or already exists.");
          // Add driver_name column if it doesn't exist (for existing databases)
          db.all(`PRAGMA table_info(trips)`, (err, columns) => {
            if (err) {
              console.error("Error checking table info for trips:", err.message);
              return;
            }
            const driverNameExists = columns.some(col => col.name === 'driver_name');
            if (!driverNameExists) {
              db.run(`ALTER TABLE trips ADD COLUMN driver_name TEXT DEFAULT 'N/A'`, (err) => {
                if (err) console.error("Error adding driver_name column to trips:", err.message);
                else console.log("Added driver_name column to trips table.");
              });
            }
            // Add updated_at column if it doesn't exist (for existing databases)
            const updatedAtExists = columns.some(col => col.name === 'updated_at');
            if (!updatedAtExists) {
              db.run(`ALTER TABLE trips ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
                if (err) console.error("Error adding updated_at column to trips:", err.message);
                else console.log("Added updated_at column to trips table.");
              });
            }
          });
        }
      });

      // Car Maintenance Log Table
      db.run(`
        CREATE TABLE IF NOT EXISTS car_maintenance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL,
          maintenance_date TEXT NOT NULL,
          description TEXT NOT NULL,
          cost INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating car_maintenance table:", err.message);
        else console.log("Car_maintenance table created or already exists.");
      });

      // Fuel Logs Table (for CarManagementPage - fuel fill-up records)
      db.run(`
        CREATE TABLE IF NOT EXISTS fuel_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL,
          log_date TEXT NOT NULL,
          fuel_amount REAL NOT NULL,
          fuel_cost INTEGER NOT NULL,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating fuel_logs table:", err.message);
        else console.log("Fuel_logs table created or already exists.");
        // Check for and remove trip_id, reading_date, reading_time, fuel_gauge_reading if they exist
        db.all(`PRAGMA table_info(fuel_logs)`, (err, columns) => {
          if (err) {
            console.error("Error checking table info for fuel_logs:", err.message);
            return;
          }
          const columnNames = columns.map(col => col.name);
          const columnsToRemove = ['trip_id', 'reading_date', 'reading_time', 'fuel_gauge_reading'];
          columnsToRemove.forEach(col => {
            if (columnNames.includes(col)) {
              console.warn(`Column '${col}' found in fuel_logs. Manual intervention might be needed to remove it if it contains data, as SQLite does not support DROP COLUMN directly without recreating the table.`);
            }
          });
        });
      });

      // NEW: Fuel Readings Table (for FuelConsumptionPage - consumption per trip)
      db.run(`
        CREATE TABLE IF NOT EXISTS fuel_readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL,
          trip_id INTEGER UNIQUE, -- Each trip can have only one fuel reading
          reading_date TEXT NOT NULL,
          reading_time TEXT NOT NULL,
          fuel_gauge_reading REAL NOT NULL,
          previous_fuel_gauge_reading REAL,
          fuel_consumed_gallons REAL,
          km_for_this_trip REAL,
          km_per_gallon REAL,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
        );
      `, (err) => {
        if (err) console.error("Error creating fuel_readings table:", err.message);
        else console.log("Fuel_readings table created or already exists.");
      });


      // Drivers Table (for storing driver names and salaries)
      db.run(`
        CREATE TABLE IF NOT EXISTS drivers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          monthly_salary INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating drivers table:", err.message);
        else console.log("Drivers table created or already exists.");
      });

      // Settings Table (for configurable amounts like overnight/dayover charges)
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT NOT NULL UNIQUE,
          setting_value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating settings table:", err.message);
        else {
          console.log("Settings table created or already exists.");
          // Default settings (only insert if not exists)
          db.run(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
            ['overnight_dayover_combined_charge', '110000', 'Combined charge for overnight stay with cargo AND day over/delayed']);
          db.run(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
            ['gep_overnight_charge', '40000', 'Overnight charge for GEP gate cars']);
          db.run(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
            ['9k_overnight_charge', '30000', 'Overnight Charge for 9K gate cars']);
        }
      });

      // Route Charges Versioning Table
      db.run(`
        CREATE TABLE IF NOT EXISTS route_charges_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          effective_date TEXT NOT NULL, -- YYYY-MM-DD format
          route_data TEXT NOT NULL, -- JSON string of the routeCharges array
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating route_charges_versions table:", err.message);
        else console.log("Route_charges_versions table created or already exists.");

        // Initial insert of route charges from the static JSON data
        // This assumes src/data/routeCharges.json is the initial version
        try {
          const initialRouteCharges = require(path.resolve(__dirname, '../myan-san/src/data/routeCharges.json'));
          console.log("Successfully loaded initial route charges from JSON."); // Add this log
          const initialRouteData = JSON.stringify(initialRouteCharges);
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

          // Check if ANY route charges exist in the table. If not, insert the initial data.
          // This is more robust for a fresh database setup.
          db.get(`SELECT COUNT(*) AS count FROM route_charges_versions`, [], (err, row) => {
            if (err) {
              console.error("Error checking route charges versions table count:", err.message);
              return;
            }
            if (row.count === 0) { // If table is completely empty, insert
              db.run(`INSERT INTO route_charges_versions (effective_date, route_data) VALUES (?, ?)`,
                [today, initialRouteData],
                function (err) {
                  if (err) {
                    console.error("Error inserting initial route charges version (empty table):", err.message);
                  } else {
                    console.log(`Initial route charges version inserted into empty table with ID: ${this.lastID}`);
                  }
                }
              );
            } else {
              // If table is not empty, check if today's version exists
              db.get(`SELECT COUNT(*) AS count FROM route_charges_versions WHERE effective_date = ?`, [today], (err, rowToday) => {
                if (err) {
                  console.error("Error checking today's route charges version:", err.message);
                  return;
                }
                if (rowToday.count === 0) { // If today's version doesn't exist, insert it
                  db.run(`INSERT INTO route_charges_versions (effective_date, route_data) VALUES (?, ?)`,
                    [today, initialRouteData],
                    function (err) {
                      if (err) {
                        console.error("Error inserting today's route charges version:", err.message);
                      } else {
                        console.log(`Today's route charges version inserted with ID: ${this.lastID}`);
                      }
                    }
                  );
                } else {
                  console.log(`Route charges version for ${today} already exists.`);
                }
              });
            }
          });
        } catch (e) {
          console.error("Could not load initial route charges from JSON. Ensure path is correct and file exists. Error:", e.message); // Improved error log
        }
      });

      // Car Driver Assignments Table
      db.run(`
        CREATE TABLE IF NOT EXISTS car_driver_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL UNIQUE,
          driver_name TEXT NOT NULL,
          assigned_date TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driver_name) REFERENCES drivers(name) ON UPDATE CASCADE ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error("Error creating car_driver_assignments table:", err.message);
        else console.log("Car_driver_assignments table created or already exists.");
      });

      // General Expenses Table
      db.run(`
        CREATE TABLE IF NOT EXISTS general_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL,
          expense_date TEXT NOT NULL,
          description TEXT NOT NULL,
          cost INTEGER NOT NULL,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating general_expenses table:", err.message);
        else console.log("General_expenses table created or already exists.");
      });
    });
  }
});

// Helper function to run database queries as promises
const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const dbGet = (query, params = []) => { // New helper for single row queries
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};


// Test API Endpoint
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// API endpoint to get all trips
app.get('/api/trips', async (req, res) => {
  try {
    const trips = await dbAll("SELECT * FROM trips ORDER BY date DESC");
    res.json({
      message: "success",
      data: trips
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to add a new trip
app.post('/api/trips', async (req, res) => {
  const {
    date, carNo, from_location, to_location, routeCharge,
    empty_pickup_charge, empty_dropoff_charge, overnight_status, day_over_status,
    remarks, total_charge, km_travelled, is_manual_edited, driverName
  } = req.body;

  if (!date || !carNo || !from_location || !to_location || !driverName) {
    return res.status(400).json({ error: "Missing required trip fields (date, carNo, from, to, driverName)." });
  }

  try {
    const result = await dbRun(`
      INSERT INTO trips (
        date, car_no, from_location, to_location, route_charge,
        empty_pickup_charge, empty_dropoff_charge, overnight_status, day_over_status,
        remarks, total_charge, km_travelled, fuel_amount, fuel_cost, driver_name, is_manual_edited
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      date, carNo, from_location, to_location, routeCharge,
      empty_pickup_charge, empty_dropoff_charge, overnight_status, day_over_status,
      remarks, total_charge, km_travelled, 0, 0, driverName, is_manual_edited
    ]);
    res.status(201).json({
      message: "Trip added successfully",
      tripId: result.id
    });
  } catch (err) {
    console.error("Error inserting trip:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to update a trip (PUT /api/trips/:id)
app.put('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  const {
    date, carNo, from_location, to_location, routeCharge,
    empty_pickup_charge, empty_dropoff_charge, overnight_status, day_over_status,
    remarks, total_charge, km_travelled, is_manual_edited, driverName
  } = req.body;

  if (!date || !carNo || !from_location || !to_location || !driverName) {
    return res.status(400).json({ error: "Missing required trip fields for update." });
  }

  try {
    const result = await dbRun(`
      UPDATE trips SET
        date = ?, car_no = ?, from_location = ?, to_location = ?, route_charge = ?,
        empty_pickup_charge = ?, empty_dropoff_charge = ?, overnight_status = ?, day_over_status = ?,
        remarks = ?, total_charge = ?, km_travelled = ?, fuel_amount = ?, fuel_cost = ?, driver_name = ?,
        is_manual_edited = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      date, carNo, from_location, to_location, routeCharge,
      empty_pickup_charge, empty_dropoff_charge, overnight_status, day_over_status,
      remarks, total_charge, km_travelled, 0, 0, driverName, is_manual_edited, id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Trip not found." });
    }
    res.json({
      message: "Trip updated successfully",
      tripId: id
    });
  } catch (err) {
    console.error("Error updating trip:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to delete a trip (DELETE /api/trips/:id)
app.delete('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await dbRun(`DELETE FROM trips WHERE id = ?`, id);
    if (result.changes === 0) {
      return res.status(404).json({ message: "Trip not found." });
    }
    res.json({
      message: "Trip deleted successfully",
      tripId: id
    });
  } catch (err) {
    console.error("Error deleting trip:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to get the latest route charges version
app.get('/api/route-charges', async (req, res) => {
  try {
    const row = await dbGet(`SELECT route_data FROM route_charges_versions ORDER BY effective_date DESC, created_at DESC LIMIT 1`);
    if (row) {
      try {
        const routeCharges = JSON.parse(row.route_data);
        res.json({
          message: "success",
          data: routeCharges
        });
      } catch (parseErr) {
        res.status(500).json({ error: "Failed to parse route charges data." });
      }
    } else {
      res.status(404).json({ message: "No route charges data found." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await dbAll("SELECT setting_key, setting_value FROM settings");
    const settings = rows.reduce((acc, current) => {
      acc[current.setting_key] = current.setting_value;
      return acc;
    }, {});
    res.json({
      message: "success",
      data: settings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get all unique car numbers from trips, maintenance, fuel_logs, and assignments
app.get('/api/unique-car-numbers', async (req, res) => {
  try {
    const uniqueCarNumbers = new Set();
    const tripRows = await dbAll("SELECT DISTINCT car_no FROM trips");
    tripRows.forEach(row => uniqueCarNumbers.add(row.car_no));

    const maintenanceRows = await dbAll("SELECT DISTINCT car_no FROM car_maintenance");
    maintenanceRows.forEach(row => uniqueCarNumbers.add(row.car_no));

    const fuelLogsRows = await dbAll("SELECT DISTINCT car_no FROM fuel_logs"); // Corrected to fuel_logs
    fuelLogsRows.forEach(row => uniqueCarNumbers.add(row.car_no));

    const assignmentRows = await dbAll("SELECT DISTINCT car_no FROM car_driver_assignments");
    assignmentRows.forEach(row => uniqueCarNumbers.add(row.car_no));

    const fuelReadingsRows = await dbAll("SELECT DISTINCT car_no FROM fuel_readings"); // Added fuel_readings
    fuelReadingsRows.forEach(row => uniqueCarNumbers.add(row.car_no));


    const sortedCarNumbers = Array.from(uniqueCarNumbers).sort();
    res.json({
      message: "success",
      data: sortedCarNumbers
    });
  } catch (err) {
    console.error("Error fetching unique car numbers:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to add a new car maintenance record
app.post('/api/car-maintenance', async (req, res) => {
  const { carNo, maintenanceDate, description, cost } = req.body;
  if (!carNo || !maintenanceDate || !description || !cost) {
    return res.status(400).json({ error: "Missing required car maintenance fields." });
  }

  try {
    const result = await dbRun(`
      INSERT INTO car_maintenance (car_no, maintenance_date, description, cost)
      VALUES (?, ?, ?, ?)
    `, [carNo, maintenanceDate, description, cost]);
    res.status(201).json({
      message: "Car maintenance record added successfully",
      id: result.id
    });
  } catch (err) {
    console.error("Error inserting car maintenance record:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get car maintenance records for a specific car
app.get('/api/car-maintenance/:carNo', async (req, res) => {
  const { carNo } = req.params;
  try {
    const rows = await dbAll("SELECT * FROM car_maintenance WHERE car_no = ? ORDER BY maintenance_date DESC", [carNo]);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to add a new fuel log (for CarManagementPage)
app.post('/api/fuel-logs', async (req, res) => {
  const { carNo, logDate, fuelAmount, fuelCost, remarks } = req.body;
  if (!carNo || !logDate || !fuelAmount || !fuelCost) {
    return res.status(400).json({ error: "Missing required fuel log fields." });
  }

  try {
    const result = await dbRun(`
      INSERT INTO fuel_logs (car_no, log_date, fuel_amount, fuel_cost, remarks)
      VALUES (?, ?, ?, ?, ?)
    `, [carNo, logDate, fuelAmount, fuelCost, remarks]);
    res.status(201).json({
      message: "Fuel log added successfully",
      id: result.id
    });
  } catch (err) {
    console.error("Error inserting fuel log:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get fuel logs for a specific car (for CarManagementPage)
app.get('/api/fuel-logs/:carNo', async (req, res) => {
  const { carNo } = req.params;
  try {
    const rows = await dbAll("SELECT * FROM fuel_logs WHERE car_no = ? ORDER BY log_date DESC", [carNo]);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to add a new fuel reading (for FuelConsumptionPage)
app.post('/api/fuel-readings', async (req, res) => {
  const { carNo, tripId, readingDate, readingTime, fuelGaugeReading, remarks } = req.body;
  if (!carNo || !tripId || !readingDate || !readingTime || fuelGaugeReading === undefined) {
    return res.status(400).json({ error: "Missing required fuel reading fields." });
  }

  try {
    const result = await dbRun(`
      INSERT INTO fuel_readings (car_no, trip_id, reading_date, reading_time, fuel_gauge_reading, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [carNo, tripId, readingDate, readingTime, fuelGaugeReading, remarks]);

    res.status(201).json({
      message: "Fuel reading added successfully",
      id: result.id
    });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed: fuel_readings.trip_id")) {
      return res.status(409).json({ error: "This trip already has a fuel reading." });
    }
    console.error("Error inserting fuel reading:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get all fuel readings with trip details (for FuelConsumptionPage)
app.get('/api/fuel-readings', async (req, res) => {
  try {
    const query = `
      SELECT
        fr.id,
        fr.car_no,
        fr.trip_id,
        fr.reading_date,
        fr.reading_time,
        fr.fuel_gauge_reading,
        fr.remarks,
        t.date AS trip_date,
        t.from_location,
        t.to_location,
        t.km_travelled
      FROM fuel_readings fr
      LEFT JOIN trips t ON fr.trip_id = t.id
      ORDER BY fr.reading_date DESC, fr.reading_time DESC;
    `;
    const rows = await dbAll(query);

    // Calculate previous_fuel_gauge_reading, fuel_consumed_gallons, km_per_gallon
    const processedReadings = [];
    const carReadings = {}; // To store readings per car for previous value calculation

    // Group readings by car_no and sort them by date/time for calculation
    rows.forEach(reading => {
      if (!carReadings[reading.car_no]) {
        carReadings[reading.car_no] = [];
      }
      carReadings[carNo].push(reading); // Changed from carReadings[carNo].push(reading); to carReadings[carNo].push(reading);
    });

    for (const carNo in carReadings) {
      // Sort readings for each car by date and time in ascending order to calculate consumption
      carReadings[carNo].sort((a, b) => {
        const dateA = new Date(`${a.reading_date}T${a.reading_time}`);
        const dateB = new Date(`${b.reading_date}T${b.reading_time}`);
        return dateA - dateB;
      });

      for (let i = 0; i < carReadings[carNo].length; i++) {
        const current = carReadings[carNo][i];
        const previous = i > 0 ? carReadings[carNo][i - 1] : null;

        current.previous_fuel_gauge_reading = previous ? previous.fuel_gauge_reading : null;
        current.fuel_consumed_gallons = previous ? (previous.fuel_gauge_reading - current.fuel_gauge_reading) : null;
        current.km_per_gallon = (current.fuel_consumed_gallons > 0 && current.km_travelled > 0)
          ? (current.km_travelled / current.fuel_consumed_gallons)
          : null;

        processedReadings.push(current);
      }
    }

    // Sort the final array in descending order for display (latest first)
    processedReadings.sort((a, b) => {
      const dateA = new Date(`${a.reading_date}T${a.reading_time}`);
      const dateB = new Date(`${b.reading_date}T${b.reading_time}`);
      return dateB - dateA; // Descending order
    });


    res.json({
      message: "success",
      data: processedReadings
    });
  } catch (err) {
    console.error("Error fetching fuel readings:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get a single fuel reading by ID (for FuelConsumptionPage edit logic)
app.get('/api/fuel-readings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT
        fr.id,
        fr.car_no,
        fr.trip_id,
        fr.reading_date,
        fr.reading_time,
        fr.fuel_gauge_reading,
        fr.remarks,
        t.date AS trip_date,
        t.from_location,
        t.to_location,
        t.km_travelled
      FROM fuel_readings fr
      LEFT JOIN trips t ON fr.trip_id = t.id
      WHERE fr.id = ?;
    `;
    const row = await dbGet(query, [id]);
    if (row) {
      res.json({ message: "success", data: row });
    } else {
      res.status(404).json({ message: "Fuel reading not found." });
    }
  } catch (err) {
    console.error("Error fetching single fuel reading:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to update a fuel reading (for FuelConsumptionPage)
app.put('/api/fuel-readings/:id', async (req, res) => {
  const { id } = req.params;
  const { carNo, tripId, readingDate, readingTime, fuelGaugeReading, remarks } = req.body;

  if (!carNo || !readingDate || !readingTime || fuelGaugeReading === undefined) {
    return res.status(400).json({ error: "Missing required fuel reading fields for update." });
  }

  try {
    const result = await dbRun(`
      UPDATE fuel_readings SET
        car_no = ?,
        trip_id = ?,
        reading_date = ?,
        reading_time = ?,
        fuel_gauge_reading = ?,
        remarks = ?
      WHERE id = ?
    `, [carNo, tripId, readingDate, readingTime, fuelGaugeReading, remarks, id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Fuel reading not found." });
    }
    res.json({
      message: "Fuel reading updated successfully",
      id: id
    });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed: fuel_readings.trip_id")) {
      return res.status(409).json({ error: "This trip already has a fuel reading assigned to another record." });
    }
    console.error("Error updating fuel reading:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to delete a fuel reading (for FuelConsumptionPage)
app.delete('/api/fuel-readings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await dbRun(`DELETE FROM fuel_readings WHERE id = ?`, id);
    if (result.changes === 0) {
      return res.status(404).json({ message: "Fuel reading not found." });
    }
    res.json({
      message: "Fuel reading deleted successfully",
      id: id
    });
  } catch (err) {
    console.error("Error deleting fuel reading:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get trips that do not have a fuel reading yet for a specific car (for FuelConsumptionPage)
app.get('/api/trips-without-fuel-reading/:carNo', async (req, res) => {
  const { carNo } = req.params;
  try {
    const trips = await dbAll(`
      SELECT t.*
      FROM trips t
      LEFT JOIN fuel_readings fr ON t.id = fr.trip_id
      WHERE t.car_no = ? AND fr.trip_id IS NULL
      ORDER BY t.date DESC;
    `, [carNo]);
    res.json({ message: "success", data: trips });
  } catch (err) {
    console.error("Error fetching trips without fuel reading:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get a single trip by ID (needed for FuelConsumptionPage edit logic)
app.get('/api/trips/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await dbGet(`SELECT * FROM trips WHERE id = ?`, [id]);
    if (trip) {
      res.json({ message: "success", data: trip });
    } else {
      res.status(404).json({ message: "Trip not found." });
    }
  } catch (err) {
    console.error("Error fetching single trip:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to add a new driver
app.post('/api/drivers', async (req, res) => {
  const { name, monthly_salary } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Driver name is required." });
  }

  try {
    const result = await dbRun(`
      INSERT INTO drivers (name, monthly_salary)
      VALUES (?, ?)
    `, [name, monthly_salary]);
    res.status(201).json({
      message: "Driver added successfully",
      id: result.id
    });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed: drivers.name")) {
      return res.status(409).json({ error: "Driver with this name already exists." });
    }
    console.error("Error inserting driver:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get all drivers
app.get('/api/drivers', async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM drivers ORDER BY name ASC");
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to update a driver
app.put('/api/drivers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, monthly_salary } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Driver name is required." });
  }

  try {
    const result = await dbRun(`UPDATE drivers SET name = ?, monthly_salary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, monthly_salary, id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ message: "Driver not found." });
    }
    res.json({
      message: "Driver updated successfully",
      id: id
    });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed: drivers.name")) {
      return res.status(409).json({ error: "Driver with this name already exists." });
    }
    console.error("Error updating driver:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to delete a driver
app.delete('/api/drivers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Before deleting a driver, optionally delete their assignments
    await dbRun('DELETE FROM car_driver_assignments WHERE driver_name = (SELECT name FROM drivers WHERE id = ?)', [id]);

    const result = await dbRun(`DELETE FROM drivers WHERE id = ?`, id);
    if (result.changes === 0) {
      return res.status(404).json({ message: "Driver not found." });
    }
    res.json({
      message: "Driver deleted successfully",
      id: id
    });
  } catch (err) {
    console.error("Error deleting driver:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get all driver names (for dropdowns)
app.get('/api/driver-names', async (req, res) => {
  try {
    const rows = await dbAll("SELECT name FROM drivers ORDER BY name ASC");
    const driverNames = rows.map(row => row.name);
    res.json({
      message: "success",
      data: driverNames
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to assign/update a driver to a car
app.post('/api/car-driver-assignments', async (req, res) => {
  const { carNo, driverName, assignedDate } = req.body;
  if (!carNo || !driverName || !assignedDate) {
    return res.status(400).json({ error: "Missing required assignment fields (carNo, driverName, assignedDate)." });
  }

  try {
    // Check if assignment already exists for this car_no
    const row = await dbGet(`SELECT * FROM car_driver_assignments WHERE car_no = ?`, [carNo]);
    if (row) {
      // Update existing assignment
      const result = await dbRun(`UPDATE car_driver_assignments SET driver_name = ?, assigned_date = ?, created_at = CURRENT_TIMESTAMP WHERE car_no = ?`,
        [driverName, assignedDate, carNo]
      );
      res.json({
        message: "Car-driver assignment updated successfully",
        id: row.id
      });
    } else {
      // Insert new assignment
      const result = await dbRun(`
        INSERT INTO car_driver_assignments (car_no, driver_name, assigned_date)
        VALUES (?, ?, ?)
      `, [carNo, driverName, assignedDate]);
      res.status(201).json({
        message: "Car-driver assignment added successfully",
        id: result.id
      });
    }
  } catch (err) {
    console.error("Error assigning car to driver:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to delete a car-driver assignment by car_no
app.delete('/api/car-driver-assignments/:carNo', async (req, res) => {
  const { carNo } = req.params;
  try {
    const result = await dbRun('DELETE FROM car_driver_assignments WHERE car_no = ?', [carNo]);
    if (result.changes === 0) {
      return res.status(404).json({ message: "error", error: "Car assignment not found for this car number." });
    }
    res.json({ message: "success", changes: result.changes });
  } catch (err) {
    res.status(500).json({ message: "error", error: err.message });
  }
});


// API endpoint to get all car-driver assignments
app.get('/api/car-driver-assignments', async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM car_driver_assignments");
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get trips for a specific driver within a month
app.get('/api/driver-trips/:driverName/:year/:month', async (req, res) => {
  const { driverName, year, month } = req.params;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  // Calculate end date for the month
  const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0];

  try {
    // First, find the car assigned to this driver
    const assignment = await dbGet('SELECT car_no FROM car_driver_assignments WHERE driver_name = ?', [driverName]);

    if (!assignment) { // If no car is assigned to this driver
      return res.json({ message: "success", data: [], total_charge: 0 });
    }

    const carNo = assignment.car_no;
    const trips = await dbAll(
      'SELECT * FROM trips WHERE car_no = ? AND driver_name = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
      [carNo, driverName, startDate, endDate]
    );
    const totalCharge = trips.reduce((sum, trip) => sum + trip.total_charge, 0);

    res.json({ message: "success", data: trips, total_charge: totalCharge });
  } catch (err) {
    console.error("Error fetching driver trips:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get trips for a specific driver within a year
app.get('/api/driver-trips-yearly/:driverName/:year', async (req, res) => {
  const { driverName, year } = req.params;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    const assignment = await dbGet('SELECT car_no FROM car_driver_assignments WHERE driver_name = ?', [driverName]);

    if (!assignment) {
      return res.json({ message: "success", data: [], total_charge: 0 });
    }

    const carNo = assignment.car_no;
    const trips = await dbAll(
      'SELECT * FROM trips WHERE car_no = ? AND driver_name = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
      [carNo, driverName, startDate, endDate]
    );
    const totalCharge = trips.reduce((sum, trip) => sum + trip.total_charge, 0);

    res.json({ message: "success", data: trips, total_charge: totalCharge });
  } catch (err) {
    console.error("Error fetching yearly driver trips:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to get maintenance costs for a specific car within a month
app.get('/api/car-maintenance-monthly/:carNo/:year/:month', async (req, res) => {
  const { carNo, year, month } = req.params;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0];

  try {
    const row = await dbGet(
      'SELECT SUM(cost) AS total_cost FROM car_maintenance WHERE car_no = ? AND maintenance_date BETWEEN ? AND ?',
      [carNo, startDate, endDate]
    );
    const totalCost = row ? (row.total_cost || 0) : 0;
    res.json({ message: "success", total_cost: totalCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get maintenance costs for a specific car within a year
app.get('/api/car-maintenance-yearly/:carNo/:year', async (req, res) => {
  const { carNo, year } = req.params;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    const row = await dbGet(
      'SELECT SUM(cost) AS total_cost FROM car_maintenance WHERE car_no = ? AND maintenance_date BETWEEN ? AND ?',
      [carNo, startDate, endDate]
    );
    const totalCost = row ? (row.total_cost || 0) : 0;
    res.json({ message: "success", total_cost: totalCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to get fuel costs for a specific car within a month (for CarManagementPage)
app.get('/api/fuel-logs-monthly/:carNo/:year/:month', async (req, res) => {
  const { carNo, year, month } = req.params;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0];

  try {
    const row = await dbGet(
      'SELECT SUM(fuel_cost) AS total_fuel_cost FROM fuel_logs WHERE car_no = ? AND log_date BETWEEN ? AND ?',
      [carNo, startDate, endDate]
    );
    const totalFuelCost = row ? (row.total_fuel_cost || 0) : 0;
    res.json({ message: "success", total_fuel_cost: totalFuelCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get fuel costs for a specific car within a year (for DriverManagementPage)
app.get('/api/fuel-logs-yearly/:carNo/:year', async (req, res) => {
  const { carNo, year } = req.params;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    const row = await dbGet(
      'SELECT SUM(fuel_cost) AS total_fuel_cost FROM fuel_logs WHERE car_no = ? AND log_date BETWEEN ? AND ?',
      [carNo, startDate, endDate]
    );
    const totalFuelCost = row ? (row.total_fuel_cost || 0) : 0;
    res.json({ message: "success", total_fuel_cost: totalFuelCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to add a new general expense record
app.post('/api/general-expenses', async (req, res) => {
  const { carNo, expenseDate, description, cost, remarks } = req.body;
  if (!carNo || !expenseDate || !description || !cost) {
    return res.status(400).json({ error: "Missing required general expense fields (carNo, expenseDate, description, cost)." });
  }

  try {
    const result = await dbRun(`
      INSERT INTO general_expenses (car_no, expense_date, description, cost, remarks)
      VALUES (?, ?, ?, ?, ?)
    `, [carNo, expenseDate, description, cost, remarks]);
    res.status(201).json({
      message: "General expense record added successfully",
      id: result.id
    });
  } catch (err) {
    console.error("Error inserting general expense record:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get general expenses for a specific car
// (Optional: You might want to add pagination or date range filtering later)
app.get('/api/general-expenses/:carNo', async (req, res) => {
  const { carNo } = req.params;
  try {
    const rows = await dbAll("SELECT * FROM general_expenses WHERE car_no = ? ORDER BY expense_date DESC", [carNo]);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    console.error("Error fetching general expenses:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to get general expenses for a specific car within a month
app.get('/api/general-expenses-monthly/:carNo/:year/:month', async (req, res) => {
  const { carNo, year, month } = req.params;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0];

  try {
    const row = await dbGet(
      'SELECT SUM(cost) AS total_general_cost FROM general_expenses WHERE car_no = ? AND expense_date BETWEEN ? AND ?',
      [carNo, startDate, endDate]
    );
    const totalGeneralCost = row ? (row.total_general_cost || 0) : 0;
    res.json({ message: "success", total_general_cost: totalGeneralCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get general expenses for a specific car within a year
app.get('/api/general-expenses-yearly/:carNo/:year', async (req, res) => {
  const { carNo, year } = req.params;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    const row = await dbGet(
      'SELECT SUM(cost) AS total_general_cost FROM general_expenses WHERE car_no = ? AND expense_date BETWEEN ? AND ?',
      [carNo, startDate, endDate]
    );
    const totalGeneralCost = row ? (row.total_general_cost || 0) : 0;
    res.json({ message: "success", total_general_cost: totalGeneralCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint for data backup
app.get('/api/backup', async (req, res) => {
  try {
    // Get all table names from the database
    const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'SQLITE_%'");
    const backupData = {};

    // For each table, fetch all its data
    for (const table of tables) {
      const tableName = table.name;
      backupData[tableName] = await dbAll(`SELECT * FROM ${tableName}`);
    }

    res.json(backupData);
  } catch (err) {
    console.error('Backup error:', err.message);
    res.status(500).json({ error: 'Failed to create backup: ' + err.message });
  }
});

// NEW: API endpoint for data restore
app.post('/api/restore', async (req, res) => {
  const restoreData = req.body; // Data sent from the frontend

  try {
    // Start a transaction to ensure atomicity
    await dbRun('BEGIN TRANSACTION');

    // Define table names in an order that respects foreign key constraints for deletion (children first)
    const deleteOrderTableNames = [
      'fuel_readings',             // Depends on trips
      'car_driver_assignments',    // Depends on drivers
      'trips',
      'drivers',
      'car_maintenance',
      'fuel_logs',
      'general_expenses',
      'settings',
      'route_charges_versions'
    ];

    // Clear existing data from tables in the defined order
    for (const tableName of deleteOrderTableNames) {
      await dbRun(`DELETE FROM ${tableName}`);
    }

    // Define table names in an order that respects foreign key constraints for insertion (parents first)
    const insertOrderTableNames = [
      'trips',
      'drivers',
      'car_maintenance',
      'fuel_logs',
      'general_expenses',
      'settings',
      'route_charges_versions',
      'car_driver_assignments',    // Depends on drivers
      'fuel_readings'              // Depends on trips
    ];

    // Insert new data into tables in the correct order
    for (const tableName of insertOrderTableNames) {
      const records = restoreData[tableName];
      if (records && records.length > 0) {
        for (const record of records) {
          const columns = Object.keys(record).join(', ');
          const placeholders = Object.keys(record).map(() => '?').join(', ');
          const values = Object.values(record);

          // Use INSERT OR REPLACE to handle cases where IDs might conflict if manually provided
          // This also helps in cases where the data might contain existing IDs that need to be preserved.
          await dbRun(`INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`, values);
        }
      }
    }

    await dbRun('COMMIT'); // Commit the transaction
    res.json({ message: "success" });
  } catch (err) {
    await dbRun('ROLLBACK'); // Rollback on error
    console.error('Restore error:', err.message);
    res.status(500).json({ error: 'Failed to restore data: ' + err.message });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
