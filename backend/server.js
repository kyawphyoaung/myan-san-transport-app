// backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // For reading static JSON file if needed, though we'll primarily use DB

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
    db.run("PRAGMA foreign_keys = ON; ", (pragmaErr) => {
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
      // Modified to use log_datetime instead of log_date
      db.run(`
        CREATE TABLE IF NOT EXISTS fuel_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL,
          log_datetime TEXT NOT NULL, -- Changed from log_date to log_datetime
          fuel_amount REAL NOT NULL,
          fuel_cost INTEGER NOT NULL,
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating fuel_logs table:", err.message);
        else {
          console.log("Fuel_logs table created or already exists.");
          // Migration logic: If log_date exists but log_datetime doesn't, migrate data
          db.all(`PRAGMA table_info(fuel_logs)`, async (err, columns) => {
            if (err) {
              console.error("Error checking table info for fuel_logs:", err.message);
              return;
            }
            const columnNames = columns.map(col => col.name);
            const hasLogDate = columnNames.includes('log_date');
            const hasLogDatetime = columnNames.includes('log_datetime');

            if (hasLogDate && !hasLogDatetime) {
              console.log("Migrating fuel_logs data: Adding log_datetime column and populating it.");
              try {
                await dbRun(`ALTER TABLE fuel_logs ADD COLUMN log_datetime TEXT`);
                // Populate log_datetime using existing log_date (assuming time is 00:00:00 if not available)
                // For simplicity, we'll use '00:00' as default time if log_time was not present
                await dbRun(`UPDATE fuel_logs SET log_datetime = log_date || ' 00:00' WHERE log_datetime IS NULL`);
                // After migration, you might want to drop the old log_date column, but SQLite doesn't support it directly.
                // It would require recreating the table, copying data, and then dropping the old one.
                // For now, we'll leave log_date as is and ensure new operations use log_datetime.
                console.log("Fuel_logs migration to log_datetime completed.");
              } catch (migrateErr) {
                console.error("Error during fuel_logs migration:", migrateErr.message);
              }
            } else if (hasLogDatetime) {
              console.log("Fuel_logs table already has log_datetime.");
            }
          });
        }
      });

      // Fuel Readings Table (for FuelConsumptionPage - consumption per trip)
      db.run(`
        CREATE TABLE IF NOT EXISTS fuel_readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL,
          trip_id INTEGER UNIQUE, -- Each trip can have only one fuel reading
          reading_date TEXT NOT NULL,
          reading_time TEXT NOT NULL,
          fuel_gauge_reading REAL NOT NULL,
          previous_fuel_gauge_reading REAL, -- Manual or auto-calculated previous reading
          fuel_consumed_gallons REAL,       -- Calculated
          km_per_gallon REAL,               -- Calculated
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
        );
      `, (err) => {
        if (err) console.error("Error creating fuel_readings table:", err.message);
        else {
          console.log("Fuel_readings table created or already exists.");
          // Add new columns if they don't exist (for existing databases)
          db.all(`PRAGMA table_info(fuel_readings)`, (err, columns) => {
            if (err) {
              console.error("Error checking table info for fuel_readings:", err.message);
              return;
            }
            const existingColumns = new Set(columns.map(col => col.name));
            const newColumns = [
              { name: 'previous_fuel_gauge_reading', type: 'REAL' },
              { name: 'fuel_consumed_gallons', type: 'REAL' },
              { name: 'km_per_gallon', type: 'REAL' }
            ];

            newColumns.forEach(col => {
              if (!existingColumns.has(col.name)) {
                db.run(`ALTER TABLE fuel_readings ADD COLUMN ${col.name} ${col.type}`, (alterErr) => {
                  if (alterErr) console.error(`Error adding ${col.name} column to fuel_readings:`, alterErr.message);
                  else console.log(`Added ${col.name} column to fuel_readings table.`);
                });
              }
            });
          });
        }
      });


      // Drivers Table (for storing driver names and salaries)
      db.run(`
        CREATE TABLE IF NOT EXISTS drivers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          monthly_salary INTEGER, -- This will be the *current* effective salary, updated by salary history
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating drivers table:", err.message);
        else console.log("Drivers table created or already exists.");
      });

      // NEW: Driver Salary History Table
      db.run(`
        CREATE TABLE IF NOT EXISTS driver_salary_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          driver_id INTEGER NOT NULL,
          salary_amount INTEGER NOT NULL,
          effective_start_date TEXT NOT NULL, -- When this salary became effective (YYYY-MM-DD)
          effective_end_date TEXT,            -- When this salary ended (YYYY-MM-DD, null if current)
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
          UNIQUE (driver_id, effective_start_date) -- A driver can only have one salary start on a given date
        )
      `, (err) => {
        if (err) console.error("Error creating driver_salary_history table:", err.message);
        else console.log("Driver_salary_history table created or already exists.");
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
      // UPDATED: Added version_number and end_date columns. Removed UNIQUE(effective_date) if it existed.
      db.run(`
        CREATE TABLE IF NOT EXISTS route_charges_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          effective_date TEXT NOT NULL, -- YYYY-MM-DD format
          end_date TEXT,                -- YYYY-MM-DD format (NULL if currently active)
          version_number TEXT,          -- e.g., '1.0', '2.0'
          route_data TEXT NOT NULL,     -- JSON string of the routeCharges array
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating route_charges_versions table:", err.message);
        else {
          console.log("Route_charges_versions table created or already exists.");

          // Add new columns if they don't exist (for existing databases)
          db.all(`PRAGMA table_info(route_charges_versions)`, (err, columns) => {
            if (err) {
              console.error("Error checking table info for route_charges_versions:", err.message);
              return;
            }
            const existingColumnNames = new Set(columns.map(col => col.name));
            if (!existingColumnNames.has('version_number')) {
              db.run(`ALTER TABLE route_charges_versions ADD COLUMN version_number TEXT`, (alterErr) => {
                if (alterErr) console.error("Error adding version_number column to route_charges_versions:", alterErr.message);
                else console.log("Added version_number column to route_charges_versions table.");
              });
            }
            if (!existingColumnNames.has('end_date')) {
              db.run(`ALTER TABLE route_charges_versions ADD COLUMN end_date TEXT`, (alterErr) => {
                if (alterErr) console.error("Error adding end_date column to route_charges_versions:", alterErr.message);
                else console.log("Added end_date column to route_charges_versions table.");
              });
            }
            // Check if there's any data, if not, insert initial from static JSON
            db.get(`SELECT COUNT(*) AS count FROM route_charges_versions`, [], (err, row) => {
              if (err) {
                console.error("Error checking route charges versions table count:", err.message);
                return;
              }
              if (row.count === 0) { // If table is completely empty, insert initial data
                try {
                  const initialRouteCharges = require(path.resolve(__dirname, '../myan-san/src/data/routeCharges.json'));
                  const initialRouteData = JSON.stringify(initialRouteCharges);
                  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

                  db.run(`INSERT INTO route_charges_versions (effective_date, end_date, version_number, route_data) VALUES (?, ?, ?, ?)`,
                    [today, null, '1.0', initialRouteData], // Initial version is 1.0, active (end_date NULL)
                    function (err) {
                      if (err) {
                        console.error("Error inserting initial route charges version:", err.message);
                      } else {
                        console.log(`Initial route charges version inserted with ID: ${this.lastID} and Version: 1.0`);
                      }
                    }
                  );
                } catch (e) {
                  console.error("Could not load initial route charges from JSON. Ensure path is correct and file exists. Error:", e.message);
                }
              }
            });
          });
        }
      });


      // Car Driver Assignments Table
      // UPDATED: Removed UNIQUE(car_no, assigned_date) as requested.
      db.run(`
        CREATE TABLE IF NOT EXISTS car_driver_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL,
          driver_name TEXT NOT NULL,
          assigned_date TEXT NOT NULL,
          end_date TEXT, -- New column for end date of assignment (null if current)
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (driver_name) REFERENCES drivers(name) ON UPDATE CASCADE ON DELETE CASCADE
          -- Removed UNIQUE (car_no, assigned_date)
        )
      `, (err) => {
        if (err) console.error("Error creating car_driver_assignments table:", err.message);
        else {
          console.log("Car_driver_assignments table created or already exists.");
          // Add end_date column if it doesn't exist (for existing databases)
          db.all(`PRAGMA table_info(car_driver_assignments)`, (err, columns) => {
            if (err) {
              console.error("Error checking table info for car_driver_assignments:", err.message);
              return;
            }
            const endDateExists = columns.some(col => col.name === 'end_date');
            if (!endDateExists) {
              db.run(`ALTER TABLE car_driver_assignments ADD COLUMN end_date TEXT`, (err) => {
                if (err) console.error("Error adding end_date column to car_driver_assignments:", err.message);
                else console.log("Added end_date column to car_driver_assignments table.");
              });
            }
          });
        }
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
  // Added pagination, filtering, and sorting for trips
  const { page = 1, limit = 10, carNo, month, year, from, to, sortBy = 'date', sortOrder = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let params = [];

  if (carNo) {
    whereClauses.push('car_no = ?');
    params.push(carNo);
  }
  if (month && year) {
    whereClauses.push("strftime('%Y-%m', date) = ?");
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (year) {
    whereClauses.push("strftime('%Y', date) = ?");
    params.push(year);
  }
  if (from) {
    whereClauses.push('from_location LIKE ?');
    params.push(`%${from}%`);
  }
  if (to) {
    whereClauses.push('to_location LIKE ?');
    params.push(`%${to}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const validSortColumns = ['date', 'car_no', 'from_location', 'to_location', 'route_charge', 'km_travelled'];
  const orderBy = validSortColumns.includes(sortBy) ? sortBy : 'date';
  const order = (sortOrder && (sortOrder.toLowerCase() === 'asc' || sortOrder.toLowerCase() === 'desc')) ? sortOrder.toUpperCase() : 'DESC';

  try {
    const totalCountRow = await dbGet(`SELECT COUNT(*) as count FROM trips ${whereSql}`, params);
    const totalCount = totalCountRow.count;

    const trips = await dbAll(
      `SELECT * FROM trips ${whereSql} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ message: "success", data: trips, totalCount });
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


// API endpoint to get the latest route charges version (now gets the active one)
app.get('/api/route-charges', async (req, res) => {
  try {
    // This now fetches the *active* version, which has end_date IS NULL
    const row = await dbGet(`SELECT route_data FROM route_charges_versions WHERE end_date IS NULL ORDER BY effective_date DESC, created_at DESC LIMIT 1`);
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
      res.status(404).json({ message: "No active route charges data found." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW API: Get the current active route charges version with full details
app.get('/api/route-charges/active', async (req, res) => {
  try {
    const row = await dbGet(`
      SELECT id, effective_date, version_number, route_data
      FROM route_charges_versions
      WHERE end_date IS NULL
      ORDER BY effective_date DESC, created_at DESC
      LIMIT 1
    `);
    if (row) {
      try {
        const routeCharges = JSON.parse(row.route_data);
        res.json({
          message: "success",
          data: {
            id: row.id,
            effectiveDate: row.effective_date,
            versionNumber: row.version_number,
            routeCharges: routeCharges
          }
        });
      } catch (parseErr) {
        res.status(500).json({ error: "Failed to parse route charges data from active version." });
      }
    } else {
      res.status(404).json({ message: "No active route charges version found." });
    }
  } catch (err) {
    console.error("Error fetching active route charges version:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// NEW API: Create a new route charges version
app.post('/api/route-charges/new-version', async (req, res) => {
  const { effectiveDate, routeData } = req.body;

  if (!effectiveDate || !routeData) {
    return res.status(400).json({ error: "Effective date and route data are required." });
  }

  let parsedRouteData;
  try {
    parsedRouteData = JSON.parse(routeData);
    if (!Array.isArray(parsedRouteData)) {
      return res.status(400).json({ error: "Route data must be a JSON array string." });
    }
  } catch (parseErr) {
    return res.status(400).json({ error: "Invalid route data format. Must be a valid JSON string." });
  }

  try {
    // Start a transaction for atomicity
    await dbRun('BEGIN TRANSACTION');

    // 1. Find any existing active route charges version (end_date IS NULL)
    const existingActiveVersion = await dbGet(
      `SELECT id, effective_date, version_number FROM route_charges_versions WHERE end_date IS NULL ORDER BY effective_date DESC, created_at DESC LIMIT 1`
    );

    let newVersionNumber = '1.0'; // Default for the very first version

    // 2. If an active version exists, update its end_date and determine new version number
    if (existingActiveVersion) {
      // Validate new effectiveDate against existing active version's effective_date
      if (effectiveDate <= existingActiveVersion.effective_date) {
        await dbRun('ROLLBACK'); // Rollback transaction on error
        return res.status(400).json({
          error: `New effective date (${effectiveDate}) must be after the current active version's start date (${existingActiveVersion.effective_date}).`
        });
      }

      // Calculate end date for the old version (one day before new effectiveDate)
      const oldEndDate = new Date(effectiveDate);
      oldEndDate.setDate(oldEndDate.getDate() - 1);
      const formattedOldEndDate = oldEndDate.toISOString().split('T')[0];

      await dbRun(
        `UPDATE route_charges_versions SET end_date = ? WHERE id = ?`,
        [formattedOldEndDate, existingActiveVersion.id]
      );
      console.log(`Ended previous route charges version (ID: ${existingActiveVersion.id}) with end_date: ${formattedOldEndDate}`);

      // Increment version number (assuming X.0 format for simplicity for now)
      if (existingActiveVersion.version_number) {
        const currentMajorVersion = parseInt(existingActiveVersion.version_number.split('.')[0]);
        newVersionNumber = `${currentMajorVersion + 1}.0`;
      }
    }

    // 3. Insert the new route charges version
    const result = await dbRun(
      `INSERT INTO route_charges_versions (effective_date, end_date, version_number, route_data)
       VALUES (?, ?, ?, ?)`,
      [effectiveDate, null, newVersionNumber, routeData] // New version is active (end_date NULL)
    );

    await dbRun('COMMIT'); // Commit the transaction
    res.status(201).json({
      message: "New route charges version added successfully",
      id: result.id,
      versionNumber: newVersionNumber
    });

  } catch (err) {
    await dbRun('ROLLBACK'); // Rollback transaction on error
    console.error("Error adding new route charges version:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// NEW API: Get all historical route charges versions
app.get('/api/route-charges/history', async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT id, effective_date, end_date, version_number, created_at, route_data
      FROM route_charges_versions
      ORDER BY effective_date DESC, created_at DESC
    `);
    // Parse route_data for each row before sending
    const historyData = rows.map(row => ({
      ...row,
      route_data: JSON.parse(row.route_data) // Parse JSON string back to object
    }));
    res.json({
      message: "success",
      data: historyData
    });
  } catch (err) {
    console.error("Error fetching route charges history:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// NEW API: Update effective_date and end_date of a specific route charges version
app.put('/api/route-charges-versions/:id', async (req, res) => {
  const { id } = req.params;
  const { effectiveDate, endDate } = req.body; // endDate can be null

  if (!effectiveDate) {
    return res.status(400).json({ error: "Effective date is required for update." });
  }

  try {
    await dbRun('BEGIN TRANSACTION');

    // Get the version being updated
    const existingVersion = await dbGet(`SELECT * FROM route_charges_versions WHERE id = ?`, [id]);
    if (!existingVersion) {
      await dbRun('ROLLBACK');
      return res.status(404).json({ message: "Route charges version not found." });
    }

    // Validate dates: effectiveDate must be before endDate (if endDate is not null)
    if (endDate && effectiveDate > endDate) {
      await dbRun('ROLLBACK');
      return res.status(400).json({ error: "Effective date cannot be after end date." });
    }

    // Advanced validation for overlaps/gaps:
    // 1. Check for overlaps with previous version
    const prevVersion = await dbGet(`
      SELECT id, effective_date, end_date FROM route_charges_versions
      WHERE effective_date < ? AND id != ?
      ORDER BY effective_date DESC, created_at DESC LIMIT 1
    `, [effectiveDate, id]);

    if (prevVersion && prevVersion.end_date && effectiveDate <= prevVersion.end_date) {
      await dbRun('ROLLBACK');
      return res.status(400).json({ error: `New effective date (${effectiveDate}) overlaps with previous version (ends ${prevVersion.end_date}).` });
    }

    // 2. Check for overlaps with next version
    const nextVersion = await dbGet(`
      SELECT id, effective_date, end_date FROM route_charges_versions
      WHERE effective_date > ? AND id != ?
      ORDER BY effective_date ASC, created_at ASC LIMIT 1
    `, [endDate || '9999-12-31', id]); // If endDate is null, treat as very far future

    if (nextVersion && endDate && endDate >= nextVersion.effective_date) {
      await dbRun('ROLLBACK');
      return res.status(400).json({ error: `New end date (${endDate}) overlaps with next version (starts ${nextVersion.effective_date}).` });
    }
    // If next version exists and its effective_date is before current effectiveDate, but current end_date is null
    if (nextVersion && !endDate && nextVersion.effective_date <= effectiveDate) {
        await dbRun('ROLLBACK');
        return res.status(400).json({ error: `Cannot set this version as active, it overlaps with a future version starting ${nextVersion.effective_date}. Please set an end date for this version.` });
    }


    const result = await dbRun(`
      UPDATE route_charges_versions SET
        effective_date = ?,
        end_date = ?,
        created_at = CURRENT_TIMESTAMP -- Update timestamp to reflect modification
      WHERE id = ?
    `, [effectiveDate, endDate, id]);

    if (result.changes === 0) {
      await dbRun('ROLLBACK');
      return res.status(404).json({ message: "Route charges version not found or no changes made." });
    }

    await dbRun('COMMIT');
    res.json({
      message: "Route charges version dates updated successfully",
      id: id
    });
  } catch (err) {
    await dbRun('ROLLBACK');
    console.error("Error updating route charges version dates:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// NEW API: Activate a historical route charges version (creates a new active record)
app.post('/api/route-charges/activate-version', async (req, res) => {
  const { versionIdToActivate, newEffectiveDateForActivation } = req.body;

  if (!versionIdToActivate || !newEffectiveDateForActivation) {
    return res.status(400).json({ error: "Version ID to activate and new effective date are required." });
  }

  try {
    await dbRun('BEGIN TRANSACTION');

    // 1. Get the historical version data to be activated
    const historicalVersion = await dbGet(`SELECT route_data, version_number FROM route_charges_versions WHERE id = ?`, [versionIdToActivate]);
    if (!historicalVersion) {
      await dbRun('ROLLBACK');
      return res.status(404).json({ message: "Historical version not found." });
    }

    // 2. Find and end any current active version
    const existingActiveVersion = await dbGet(
      `SELECT id, effective_date FROM route_charges_versions WHERE end_date IS NULL ORDER BY effective_date DESC, created_at DESC LIMIT 1`
    );

    if (existingActiveVersion) {
      // Validate newEffectiveDateForActivation against existing active version's effective_date
      if (newEffectiveDateForActivation <= existingActiveVersion.effective_date) {
        await dbRun('ROLLBACK');
        return res.status(400).json({
          error: `New activation date (${newEffectiveDateForActivation}) must be after the current active version's start date (${existingActiveVersion.effective_date}).`
        });
      }

      const oldEndDate = new Date(newEffectiveDateForActivation);
      oldEndDate.setDate(oldEndDate.getDate() - 1);
      const formattedOldEndDate = oldEndDate.toISOString().split('T')[0];

      await dbRun(
        `UPDATE route_charges_versions SET end_date = ? WHERE id = ?`,
        [formattedOldEndDate, existingActiveVersion.id]
      );
      console.log(`Ended previous active version (ID: ${existingActiveVersion.id}) with end_date: ${formattedOldEndDate}`);
    }

    // 3. Determine the new version number
    const maxVersionRow = await dbGet(`SELECT MAX(CAST(SUBSTR(version_number, 1, INSTR(version_number, '.') - 1) AS INTEGER)) AS max_major_version FROM route_charges_versions`);
    const maxMajorVersion = maxVersionRow && maxVersionRow.max_major_version ? maxVersionRow.max_major_version : 0;
    const newVersionNumber = `${maxMajorVersion + 1}.0`;

    // 4. Insert the new active version based on the historical data
    const result = await dbRun(
      `INSERT INTO route_charges_versions (effective_date, end_date, version_number, route_data)
       VALUES (?, ?, ?, ?)`,
      [newEffectiveDateForActivation, null, newVersionNumber, historicalVersion.route_data]
    );

    await dbRun('COMMIT');
    res.status(201).json({
      message: `Version ${historicalVersion.version_number} activated as new version ${newVersionNumber} successfully.`,
      id: result.id,
      versionNumber: newVersionNumber
    });

  } catch (err) {
    await dbRun('ROLLBACK');
    console.error("Error activating historical route charges version:", err.message);
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

    // Changed to use log_datetime for fuel_logs
    const fuelLogsRows = await dbAll("SELECT DISTINCT car_no FROM fuel_logs");
    fuelLogsRows.forEach(row => uniqueCarNumbers.add(row.car_no));

    const assignmentRows = await dbAll("SELECT DISTINCT car_no FROM car_driver_assignments");
    assignmentRows.forEach(row => uniqueCarNumbers.add(row.car_no));

    const fuelReadingsRows = await dbAll("SELECT DISTINCT car_no FROM fuel_readings");
    fuelReadingsRows.forEach(row => uniqueCarNumbers.add(row.car_no));


    const sortedCarNumbers = Array.from(uniqueCarNumbers).sort();
    res.json({
      message: "success",
      data: sortedCarNumbers
    });
  }
  catch (err) {
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

// API endpoint to update a car maintenance record
app.put('/api/car-maintenance/:id', async (req, res) => {
  const { id } = req.params;
  const { carNo, maintenanceDate, description, cost } = req.body; // description will be the final description (e.g., "အခြား (Other)" or actual text)

  if (!carNo || !maintenanceDate || !description || !cost) {
    return res.status(400).json({ error: "Missing required car maintenance fields for update." });
  }

  try {
    const result = await dbRun(`
      UPDATE car_maintenance SET
        car_no = ?,
        maintenance_date = ?,
        description = ?,
        cost = ?
      WHERE id = ?
    `, [carNo, maintenanceDate, description, cost, id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Car maintenance record not found." });
    }
    res.json({
      message: "Car maintenance record updated successfully",
      id: id
    });
  } catch (err) {
    console.error("Error updating car maintenance record:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get car maintenance records for a specific car with filters
// Modified to include year, month, description, and otherDescription filters
app.get('/api/car-maintenance/:carNo', async (req, res) => {
  const { carNo } = req.params;
  const { year, month, description, otherDescription } = req.query;

  let whereClauses = ['car_no = ?'];
  let params = [carNo];

  if (year) {
    if (month) {
      whereClauses.push("strftime('%Y-%m', maintenance_date) = ?");
      params.push(`${year}-${String(month).padStart(2, '0')}`);
    } else { // Filter by year only if month is not provided (or is 'All')
      whereClauses.push("strftime('%Y', maintenance_date) = ?");
      params.push(`${year}`);
    }
  }

  if (description) {
    if (description === "အခြား (Other)" && otherDescription) {
      // If "Other" is selected and otherDescription is provided, filter by it
      whereClauses.push('description LIKE ?');
      params.push(`%${otherDescription}%`);
    } else if (description !== "အခြား (Other)") {
      // If a specific description (not "Other") is selected, filter by it
      whereClauses.push('description = ?');
      params.push(description);
    }
    // If description is "Other" but otherDescription is empty, it means "All other"
    // which is covered by not adding a description filter.
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  try {
    const rows = await dbAll(`SELECT * FROM car_maintenance ${whereSql} ORDER BY maintenance_date DESC`, params);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    console.error("Error fetching car maintenance records:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to add a new fuel log (for CarManagementPage)
// Modified to accept log_datetime
app.post('/api/fuel-logs', async (req, res) => {
  const { carNo, logDate, logTime, fuelAmount, fuelCost, remarks } = req.body;
  // Combine logDate and logTime into log_datetime
  const logDatetime = `${logDate} ${logTime}`;

  if (!carNo || !logDate || !logTime || fuelAmount === undefined || fuelAmount === null || fuelCost === undefined || fuelCost === null) {
    return res.status(400).json({ error: "Missing required fuel log fields (carNo, logDate, logTime, fuelAmount, fuelCost)." });
  }

  try {
    const result = await dbRun(`
      INSERT INTO fuel_logs (car_no, log_datetime, fuel_amount, fuel_cost, remarks)
      VALUES (?, ?, ?, ?, ?)
    `, [carNo, logDatetime, fuelAmount, fuelCost, remarks]);
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
// Modified to order by log_datetime and include year/month filters
app.get('/api/fuel-logs/:carNo', async (req, res) => {
  const { carNo } = req.params;
  const { year, month } = req.query; // Get year and month from query parameters

  let whereClauses = ['car_no = ?'];
  let params = [carNo];

  if (year) {
    if (month) {
      whereClauses.push("strftime('%Y-%m', log_datetime) = ?");
      params.push(`${year}-${String(month).padStart(2, '0')}`);
    } else {
      whereClauses.push("strftime('%Y', log_datetime) = ?");
      params.push(`${year}`);
    }
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  try {
    const rows = await dbAll(`SELECT * FROM fuel_logs ${whereSql} ORDER BY log_datetime DESC`, params);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Helper function to calculate the previous fuel gauge reading,
 * taking into account the last recorded fuel_reading and any intervening fuel_logs.
 * @param {string} carNo - The car number.
 * @param {string} currentReadingDate - The date of the current fuel reading (YYYY-MM-DD).
 * @param {string} currentReadingTime - The time of the current fuel reading (HH:MM).
 * @param {number|null} currentReadingId - The ID of the current reading being updated (null for new entries).
 * @returns {Promise<{calculatedPreviousReading: number|null}>}
 */
async function getCalculatedPreviousFuelReading(carNo, currentReadingDate, currentReadingTime, currentReadingId = null) {
  let lastFuelGaugeReading = null;
  let lastReadingDateTime = null; // Format: YYYY-MM-DD HH:MM

  // 1. Find the latest fuel_reading for the car before the current reading
  let prevReadingQuery = `
    SELECT fuel_gauge_reading, reading_date, reading_time
    FROM fuel_readings
    WHERE car_no = ? AND (reading_date < ? OR (reading_date = ? AND reading_time < ?))
  `;
  let prevReadingParams = [carNo, currentReadingDate, currentReadingDate, currentReadingTime];

  if (currentReadingId !== null) {
    prevReadingQuery += ` AND id != ?`; // Exclude the current record if it's an update
    prevReadingParams.push(currentReadingId);
  }
  prevReadingQuery += ` ORDER BY reading_date DESC, reading_time DESC LIMIT 1`;

  const lastRecordedReading = await dbGet(prevReadingQuery, prevReadingParams);

  if (lastRecordedReading) {
    lastFuelGaugeReading = lastRecordedReading.fuel_gauge_reading;
    lastReadingDateTime = `${lastRecordedReading.reading_date} ${lastRecordedReading.reading_time}`;
  }

  let calculatedPreviousReading = lastFuelGaugeReading; // Start with the last recorded gauge reading (can be null)

  // 2. Sum fuel_amount from fuel_logs between last_reading_datetime and current_reading_datetime
  // Now using log_datetime for more accurate time-based filtering
  let fuelLogsSumQuery;
  let fuelLogsSumParams = [carNo];
  const currentFuelReadingDateTime = `${currentReadingDate} ${currentReadingTime}`; // Full datetime string for current reading

  if (lastReadingDateTime) {
    // Sum fuel_logs that occurred AFTER the last fuel_reading's datetime
    // and BEFORE or AT the current fuel_reading's datetime
    fuelLogsSumQuery = `
      SELECT SUM(fuel_amount) AS total_fuel_added
      FROM fuel_logs
      WHERE car_no = ? AND
            log_datetime > ? AND
            log_datetime <= ?
    `;
    fuelLogsSumParams.push(lastReadingDateTime);
    fuelLogsSumParams.push(currentFuelReadingDateTime);
  } else {
    // If no previous fuel_reading, sum all fuel_logs up to the current reading datetime
    fuelLogsSumQuery = `
      SELECT SUM(fuel_amount) AS total_fuel_added
      FROM fuel_logs
      WHERE car_no = ? AND log_datetime <= ?
    `;
    fuelLogsSumParams.push(currentFuelReadingDateTime);
  }

  const fuelLogsSumResult = await dbGet(fuelLogsSumQuery, fuelLogsSumParams);
  const totalFuelAdded = fuelLogsSumResult ? (fuelLogsSumResult.total_fuel_added || 0) : 0;

  // Add the summed fuel logs to the previous gauge reading
  if (calculatedPreviousReading !== null) {
    calculatedPreviousReading += totalFuelAdded;
  } else {
    // If there was no previous fuel_reading, the calculated previous reading is just the total fuel added
    calculatedPreviousReading = totalFuelAdded;
  }

  console.log(`[getCalculatedPreviousFuelReading] CarNo: ${carNo}, CurrentDateTime: ${currentReadingDate} ${currentReadingTime}, CurrentReadingId: ${currentReadingId}`);
  console.log(`[getCalculatedPreviousFuelReading] Last Recorded Reading:`, lastRecordedReading);
  console.log(`[getCalculatedPreviousFuelReading] Last Fuel Gauge Reading: ${lastFuelGaugeReading}, Last Reading DateTime: ${lastReadingDateTime}`);
  console.log(`[getCalculatedPreviousFuelReading] Fuel Logs Sum Query: ${fuelLogsSumQuery}, Params:`, fuelLogsSumParams);
  console.log(`[getCalculatedPreviousFuelReading] Total Fuel Added from Logs:`, totalFuelAdded);
  console.log(`[getCalculatedPreviousFuelReading] Final Calculated Previous Reading:`, calculatedPreviousReading);

  return {
    calculatedPreviousReading: calculatedPreviousReading
  };
}


// API endpoint to add a new fuel reading (for FuelConsumptionPage)
app.post('/api/fuel-readings', async (req, res) => {
  const { carNo, tripId, readingDate, readingTime, fuelGaugeReading, previousFuelGaugeReading, remarks } = req.body;
  if (!carNo || !tripId || !readingDate || !readingTime || fuelGaugeReading === undefined || fuelGaugeReading === null) {
    return res.status(400).json({ error: "Required fields (carNo, tripId, readingDate, readingTime, fuelGaugeReading) cannot be empty." });
  }

  const currentReading = parseFloat(fuelGaugeReading);
  if (isNaN(currentReading)) {
    return res.status(400).json({ error: "Invalid fuelGaugeReading value." });
  }

  if (currentReading > 20) {
    return res.status(400).json({ error: "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ၂၀ ဂါလံထက် မများရပါ။" });
  }

  let actualPreviousFuelGaugeReading = null;

  // If previousFuelGaugeReading is explicitly provided in the request body (manual input)
  if (previousFuelGaugeReading !== undefined && previousFuelGaugeReading !== null && previousFuelGaugeReading !== '') {
    actualPreviousFuelGaugeReading = parseFloat(previousFuelGaugeReading);
    if (isNaN(actualPreviousFuelGaugeReading)) {
      return res.status(400).json({ error: "Invalid previousFuelGaugeReading value." });
    }
    if (currentReading > actualPreviousFuelGaugeReading) {
      return res.status(400).json({ error: "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ယခင်ဆီတိုင်းအမှတ် (ဂါလံ) ထက် မများရပါ။" });
    }
  } else {
    // Auto-fetch previous reading and sum fuel_logs if not provided manually
    const prevReadingData = await getCalculatedPreviousFuelReading(carNo, readingDate, readingTime, null); // Pass null for currentReadingId
    actualPreviousFuelGaugeReading = prevReadingData.calculatedPreviousReading;

    if (actualPreviousFuelGaugeReading !== null && currentReading > actualPreviousFuelGaugeReading) {
      return res.status(400).json({ error: "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ယခင်ဆီတိုင်းအမှတ် (ဂါလံ) ထက် မများရပါ။ (အလိုအလျောက် တွက်ချက်ထားသော)" });
    }
  }

  try {
    let fuelConsumedGallons = null;
    if (actualPreviousFuelGaugeReading !== null) {
      fuelConsumedGallons = actualPreviousFuelGaugeReading - currentReading;
    }

    // Fetch km_travelled for the current trip
    const trip = await dbGet(`SELECT km_travelled FROM trips WHERE id = ?`, [tripId]);
    const kmTravelled = trip ? trip.km_travelled : null; // Use km_travelled from trips

    let kmPerGallon = null;
    if (kmTravelled !== null && fuelConsumedGallons !== null && fuelConsumedGallons > 0) {
      kmPerGallon = kmTravelled / fuelConsumedGallons;
    }

    const result = await dbRun(`
      INSERT INTO fuel_readings (car_no, trip_id, reading_date, reading_time, fuel_gauge_reading,
                                 previous_fuel_gauge_reading, fuel_consumed_gallons,
                                 km_per_gallon, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [carNo, tripId, readingDate, readingTime, currentReading,
      actualPreviousFuelGaugeReading, fuelConsumedGallons,
      kmPerGallon, remarks]);

    res.status(201).json({
      message: "Fuel reading added successfully",
      id: result.id
    });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed: fuel_readings.trip_id")) {
      return res.status(409).json({ error: "ဤခရီးစဉ်အတွက် ဆီစားနှုန်းမှတ်တမ်း ရှိပြီးသားဖြစ်ပါသည်။" });
    }
    console.error("Error inserting fuel reading:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get all fuel readings with trip details (for FuelConsumptionPage)
app.get('/api/fuel-readings', async (req, res) => {
  const { page = 1, limit = 50, carNo, month, year, tripId, sortBy = 'reading_date', sortOrder = 'desc' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClauses = [];
  let params = [];

  // Filtering
  if (carNo) {
    whereClauses.push('fr.car_no = ?');
    params.push(carNo);
  }
  if (month && year) {
    whereClauses.push("strftime('%Y-%m', fr.reading_date) = ?");
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (year) {
    whereClauses.push("strftime('%Y', fr.reading_date) = ?");
    params.push(year);
  }
  if (tripId) {
    whereClauses.push('fr.trip_id = ?');
    params.push(tripId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Sorting - Ensure valid columns are used
  const validSortColumns = ['reading_date', 'car_no', 'km_travelled', 'fuel_consumed_gallons', 'km_per_gallon'];
  const orderBy = validSortColumns.includes(sortBy) ? sortBy : 'reading_date';
  const order = (sortOrder && (sortOrder.toLowerCase() === 'asc' || sortOrder.toLowerCase() === 'desc')) ? sortOrder.toUpperCase() : 'DESC';

  try {
    // Get total count for pagination
    const totalCountRow = await dbGet(`SELECT COUNT(*) as count FROM fuel_readings fr LEFT JOIN trips t ON fr.trip_id = t.id ${whereSql}`, params);
    const totalCount = totalCountRow ? totalCountRow.count : 0;

    // Fetch fuel readings with joined trip data, applying filtering, sorting, and pagination directly in SQL
    const readings = await dbAll(
      `SELECT
         fr.id,
         fr.car_no,
         fr.trip_id,
         fr.reading_date,
         fr.reading_time,
         fr.fuel_gauge_reading,
         fr.previous_fuel_gauge_reading, -- Directly fetch stored value
         fr.fuel_consumed_gallons,       -- Directly fetch stored value
         fr.km_per_gallon,               -- Directly fetch stored value
         fr.remarks,
         t.date AS trip_date,
         t.from_location,
         t.to_location,
         t.km_travelled
       FROM fuel_readings fr
       LEFT JOIN trips t ON fr.trip_id = t.id
       ${whereSql}
       ORDER BY ${orderBy} ${order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ message: "success", data: readings, totalCount: totalCount });
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
        fr.previous_fuel_gauge_reading, -- Include this for edit dialog pre-fill
        fr.fuel_consumed_gallons,
        fr.km_per_gallon,
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

// API endpoint to get the previous fuel reading for a specific car based on date and time
app.get('/api/fuel-readings-previous/:carNo', async (req, res) => {
  const { carNo } = req.params;
  const { readingDate, readingTime } = req.query; // Date and time of the *current* reading being entered

  if (!carNo || !readingDate || !readingTime) {
    return res.status(400).json({ error: "Car number, reading date, and reading time are required." });
  }

  try {
    const prevReadingData = await getCalculatedPreviousFuelReading(carNo, readingDate, readingTime, null); // Pass null for currentReadingId
    res.json({ message: "success", data: { fuel_gauge_reading: prevReadingData.calculatedPreviousReading } });
  } catch (err) {
    console.error("Error fetching previous fuel reading:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to update a fuel reading (for FuelConsumptionPage)
app.put('/api/fuel-readings/:id', async (req, res) => {
  const { id } = req.params;
  const { carNo, tripId, readingDate, readingTime, fuelGaugeReading, previousFuelGaugeReading, remarks } = req.body;

  if (!carNo || !readingDate || !readingTime || fuelGaugeReading === undefined || fuelGaugeReading === null) {
    return res.status(400).json({ error: "Required fields (carNo, readingDate, readingTime, fuelGaugeReading) cannot be empty." });
  }

  const currentReading = parseFloat(fuelGaugeReading);
  if (isNaN(currentReading)) {
    return res.status(400).json({ error: "Invalid fuelGaugeReading value." });
  }

  if (currentReading > 20) {
    return res.status(400).json({ error: "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ၂၀ ဂါလံထက် မများရပါ။" });
  }

  let actualPreviousFuelGaugeReading = null;

  // If previousFuelGaugeReading is explicitly provided in the request body (manual input)
  if (previousFuelGaugeReading !== undefined && previousFuelGaugeReading !== null && previousFuelGaugeReading !== '') {
    actualPreviousFuelGaugeReading = parseFloat(previousFuelGaugeReading);
    if (isNaN(actualPreviousFuelGaugeReading)) {
      return res.status(400).json({ error: "Invalid previousFuelGaugeReading value." });
    }
    if (currentReading > actualPreviousFuelGaugeReading) {
      return res.status(400).json({ error: "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ယခင်ဆီတိုင်းအမှတ် (ဂါလံ) ထက် မများရပါ။" });
    }
  } else {
    // Auto-fetch previous reading and sum fuel_logs if not provided manually
    const prevReadingData = await getCalculatedPreviousFuelReading(carNo, readingDate, readingTime, id); // Pass currentReadingId for update
    actualPreviousFuelGaugeReading = prevReadingData.calculatedPreviousReading;

    if (actualPreviousFuelGaugeReading !== null && currentReading > actualPreviousFuelGaugeReading) {
      return res.status(400).json({ error: "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ယခင်ဆီတိုင်းအမှတ် (ဂါလံ) ထက် မများရပါ။ (အလိုအလျောက် တွက်ချက်ထားသော)" });
    }
  }

  try {
    // Check if the new tripId is already associated with another reading (unless it's the current reading's tripId)
    if (tripId) { // Only check if tripId is provided
      const existingReadingForTrip = await dbGet('SELECT id FROM fuel_readings WHERE trip_id = ? AND id != ?', [tripId, id]);
      if (existingReadingForTrip) {
        return res.status(409).json({ error: "ရွေးချယ်ထားသော ခရီးစဉ်အတွက် ဆီစားနှုန်းမှတ်တမ်း ရှိပြီးသားဖြစ်ပါသည်။" });
      }
    }

    let fuelConsumedGallons = null;
    if (actualPreviousFuelGaugeReading !== null) {
      fuelConsumedGallons = actualPreviousFuelGaugeReading - currentReading;
    }

    // Fetch km_travelled for the current trip
    const trip = await dbGet(`SELECT km_travelled FROM trips WHERE id = ?`, [tripId]);
    const kmTravelled = trip ? trip.km_travelled : null; // Use km_travelled from trips

    let kmPerGallon = null;
    if (kmTravelled !== null && fuelConsumedGallons !== null && fuelConsumedGallons > 0) {
      kmPerGallon = kmTravelled / fuelConsumedGallons;
    }

    const result = await dbRun(`
      UPDATE fuel_readings SET
        car_no = ?,
        trip_id = ?,
        reading_date = ?,
        reading_time = ?,
        fuel_gauge_reading = ?,
        previous_fuel_gauge_reading = ?, -- Store the actual previous reading used
        fuel_consumed_gallons = ?,
        km_per_gallon = ?,
        remarks = ?
      WHERE id = ?
    `, [carNo, tripId, readingDate, readingTime, currentReading,
      actualPreviousFuelGaugeReading, fuelConsumedGallons,
      kmPerGallon, remarks, id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Fuel reading not found." });
    }
    res.json({
      message: "Fuel reading updated successfully",
      id: id
    });
  } catch (err) {
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

// NEW: API endpoint to get trips for a specific car, year, and month (for FuelConsumptionPage filter dropdown)
app.get('/api/trips-by-car-month/:carNo/:year/:month', async (req, res) => {
  const { carNo, year, month } = req.params;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0];

  try {
    const trips = await dbAll(
      `SELECT * FROM trips
       WHERE car_no = ? AND date BETWEEN ? AND ?
       ORDER BY date DESC`,
      [carNo, startDate, endDate]
    );
    res.json({ message: "success", data: trips });
  } catch (err) {
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
  const { name, monthly_salary, salaryEffectiveDate } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Driver name is required." });
  }

  // Validate and parse monthly_salary
  let parsedMonthlySalary = null;
  if (monthly_salary !== undefined && monthly_salary !== null && monthly_salary !== '') {
    parsedMonthlySalary = parseFloat(monthly_salary);
    if (isNaN(parsedMonthlySalary) || parsedMonthlySalary < 0) { // Ensure non-negative
      return res.status(400).json({ error: "Monthly salary must be a valid non-negative number." });
    }
  } else {
    // If monthly_salary is explicitly empty/null, treat as 0 or allow null depending on schema
    parsedMonthlySalary = 0; // Default to 0 if not provided
  }

  try {
    // Check if driver name already exists
    const existingDriver = await dbGet(`SELECT id FROM drivers WHERE name = ?`, [name]);
    if (existingDriver) {
      return res.status(409).json({ error: "Driver with this name already exists." });
    }

    const result = await dbRun(`
      INSERT INTO drivers (name, monthly_salary)
      VALUES (?, ?)
    `, [name, parsedMonthlySalary]); // Use parsedMonthlySalary here

    // Also add an initial salary record if a valid salary was provided (or default 0)
    if (parsedMonthlySalary !== null) { // This will always be true if parsedMonthlySalary is set to 0 or a number
      const today = new Date().toISOString().split('T')[0];
      await dbRun(`
        INSERT INTO driver_salary_history (driver_id, salary_amount, effective_start_date, effective_end_date)
        VALUES (?, ?, ?, NULL)
      `, [result.id, parsedMonthlySalary, salaryEffectiveDate]);
    }

    res.status(201).json({
      message: "Driver added successfully",
      id: result.id // Return 'id' as expected by frontend
    });
  } catch (err) {
    console.error("Error inserting driver:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get all drivers (now includes current monthly_salary from history)
app.get('/api/drivers', async (req, res) => {
  try {
    const query = `
      SELECT
          d.id,
          d.name,
          d.created_at,
          d.updated_at,
          (SELECT salary_amount FROM driver_salary_history
           WHERE driver_id = d.id AND effective_end_date IS NULL
           ORDER BY effective_start_date DESC LIMIT 1) AS monthly_salary
      FROM drivers d
      ORDER BY d.name ASC;
    `;
    const rows = await dbAll(query);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to update a driver (only name can be updated directly here)
app.put('/api/drivers/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body; // monthly_salary is now handled by salary history

  if (!name) {
    return res.status(400).json({ error: "Driver name is required." });
  }

  try {
    // Check for duplicate name if changing
    const existingDriver = await dbGet(`SELECT id FROM drivers WHERE name = ? AND id != ?`, [name, id]);
    if (existingDriver) {
      return res.status(409).json({ error: "Driver with this name already exists." });
    }

    const result = await dbRun(`UPDATE drivers SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ message: "Driver not found." });
    }
    res.json({
      message: "Driver updated successfully",
      id: id
    });
  } catch (err) {
    console.error("Error updating driver:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to delete a driver
app.delete('/api/drivers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // ON DELETE CASCADE will handle deleting related records in car_driver_assignments and driver_salary_history
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

// NEW: API endpoint to add a new salary history record for a driver
app.post('/api/driver-salary-history', async (req, res) => {
  const { driverId, salaryAmount, effectiveStartDate } = req.body;

  if (!driverId || effectiveStartDate === undefined || effectiveStartDate === null || effectiveStartDate === '') {
    return res.status(400).json({ error: "Driver ID and effective start date are required for salary history." });
  }

  let parsedSalaryAmount = null;
  if (salaryAmount !== undefined && salaryAmount !== null && salaryAmount !== '') {
    parsedSalaryAmount = parseFloat(salaryAmount);
    if (isNaN(parsedSalaryAmount) || parsedSalaryAmount < 0) { // Ensure non-negative
      return res.status(400).json({ error: "Salary amount must be a valid non-negative number." });
    }
  } else {
    return res.status(400).json({ error: "Salary amount is required." });
  }

  try {
    // Find any existing active salary record for this driver
    const existingActiveSalary = await dbGet(
      `SELECT id, effective_start_date FROM driver_salary_history WHERE driver_id = ? AND effective_end_date IS NULL`,
      [driverId]
    );

    // If an active salary record exists, update its effective_end_date
    // ONLY apply date validation if an existing active salary is found
    if (existingActiveSalary) {
      // Ensure new salary start date is not earlier than or equal to current active salary start date
      console.log("Existing active salary found:", existingActiveSalary);
      console.log("Effective start date for new salary:", existingActiveSalary.effect);
      console.log("Type : Effective start date for new salary:", typeof existingActiveSalary.effectiveStartDate);

      console.log("New effective start date:", effectiveStartDate);
      console.log("Type of New effective start date:", typeof effectiveStartDate);


      if (effectiveStartDate <= existingActiveSalary.effective_start_date) {
        return res.status(400).json({ error: "New salary effective date must be after the current active salary's start date." });
      }

      // Calculate end date for the old salary (one day before new effective start date)
      const oldEndDate = new Date(effectiveStartDate);
      oldEndDate.setDate(oldEndDate.getDate() - 1);
      const formattedOldEndDate = oldEndDate.toISOString().split('T')[0];

      await dbRun(
        `UPDATE driver_salary_history SET effective_end_date = ? WHERE id = ?`,
        [formattedOldEndDate, existingActiveSalary.id]
      );
    }

    // Insert the new salary record
    const result = await dbRun(
      `INSERT INTO driver_salary_history (driver_id, salary_amount, effective_start_date, effective_end_date)
       VALUES (?, ?, ?, NULL)`, // New record is current, so end_date is NULL
      [driverId, parsedSalaryAmount, effectiveStartDate] // Use parsedSalaryAmount here
    );

    // Update the monthly_salary in the main drivers table to reflect the new current salary
    await dbRun(`UPDATE drivers SET monthly_salary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [parsedSalaryAmount, driverId] // Use parsedSalaryAmount here
    );

    res.status(201).json({
      message: "Salary history record added successfully",
      id: result.id
    });
  } catch (err) {
    console.error("Error adding salary history record:", err.message);
    if (err.message.includes("UNIQUE constraint failed: driver_salary_history.driver_id, driver_salary_history.effective_start_date")) {
      return res.status(409).json({ error: "A salary record already exists for this driver starting on this date." });
    }
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get salary history for a specific driver
app.get('/api/driver-salary-history/:driverId', async (req, res) => {
  const { driverId } = req.params;
  try {
    const rows = await dbAll(
      `SELECT * FROM driver_salary_history WHERE driver_id = ? ORDER BY effective_start_date DESC`,
      [driverId]
    );
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    console.error("Error fetching driver salary history:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to assign/update a driver to a car
// This now handles inserting new assignments or ending previous ones
app.post('/api/car-driver-assignments', async (req, res) => {
  const { carNo, driverName, assignedDate } = req.body;
  if (!carNo || !driverName || !assignedDate) {
    return res.status(400).json({ error: "Missing required assignment fields (carNo, driverName, assignedDate)." });
  }

  try {
    // Find any existing active assignment for this car_no
    const existingActiveAssignment = await dbGet(`SELECT id, driver_name, assigned_date FROM car_driver_assignments WHERE car_no = ? AND end_date IS NULL`, [carNo]);

    // If an active assignment exists for this car
    if (existingActiveAssignment) {
      // If the car is being assigned to the SAME driver and the assignedDate is the same as current, it's a no-op
      if (existingActiveAssignment.driver_name === driverName && existingActiveAssignment.assigned_date === assignedDate) {
        return res.status(200).json({
          message: "Car is already actively assigned to this driver on this date.",
          id: existingActiveAssignment.id
        });
      }

      // If the car is assigned to a DIFFERENT driver, or same driver but new assignedDate,
      // we need to end the old assignment.
      // Calculate end date for the old assignment (one day before new assignedDate)
      const oldEndDate = new Date(assignedDate);
      oldEndDate.setDate(oldEndDate.getDate() - 1);
      const formattedOldEndDate = oldEndDate.toISOString().split('T')[0];

      // Ensure the old end date is not before its assigned_date
      if (formattedOldEndDate < existingActiveAssignment.assigned_date) {
        return res.status(400).json({ error: "New assignment date conflicts with existing active assignment. Please ensure the new assigned date is after the previous assignment's start date." });
      }

      await dbRun(`
        UPDATE car_driver_assignments
        SET end_date = ?
        WHERE id = ?
      `, [formattedOldEndDate, existingActiveAssignment.id]);
      console.log(`Ended previous assignment (ID: ${existingActiveAssignment.id}) for car ${carNo} before creating new one.`);
    }

    // Insert the new assignment
    const result = await dbRun(`
      INSERT INTO car_driver_assignments (car_no, driver_name, assigned_date, end_date)
      VALUES (?, ?, ?, NULL) -- New assignments are active, so end_date is NULL
    `, [carNo, driverName, assignedDate]);
    res.status(201).json({
      message: "Car-driver assignment added successfully",
      id: result.id
    });

  } catch (err) {
    console.error("Error assigning car to driver:", err.message);
    if (err.message.includes("UNIQUE constraint failed: car_driver_assignments.car_no, car_driver_assignments.assigned_date")) {
      return res.status(409).json({ error: "This car is already assigned on this specific date. Please choose a different date or update the existing assignment." });
    }
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to update the end_date of a car-driver assignment
app.put('/api/car-driver-assignments/end-date/:carNo', async (req, res) => {
  const { carNo } = req.params;
  const { endDate } = req.body;

  if (!endDate) {
    return res.status(400).json({ error: "End date is required for updating assignment." });
  }

  try {
    // Find the current active assignment for this car
    const currentAssignment = await dbGet(`SELECT id, assigned_date FROM car_driver_assignments WHERE car_no = ? AND end_date IS NULL`, [carNo]);

    if (!currentAssignment) {
      return res.status(404).json({ message: "No active assignment found for this car number." });
    }

    // Ensure end_date is not before assigned_date
    if (endDate < currentAssignment.assigned_date) {
      return res.status(400).json({ error: "End date cannot be before the assigned date." });
    }

    const result = await dbRun(`
      UPDATE car_driver_assignments
      SET end_date = ?
      WHERE id = ? AND end_date IS NULL
    `, [endDate, currentAssignment.id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Car assignment not found or no changes made (it might already have an end date)." });
    }
    res.json({ message: "Car-driver assignment end date updated successfully", id: currentAssignment.id });
  } catch (err) {
    console.error("Error updating car-driver assignment end date:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to delete a car-driver assignment by car_no
// This is now less frequently used as we prefer updating end_date for historical purposes
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


// API endpoint to get all CURRENT car-driver assignments (where end_date is NULL)
app.get('/api/car-driver-assignments', async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM car_driver_assignments WHERE end_date IS NULL");
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get car-driver assignment history for a specific car
app.get('/api/car-driver-assignments/history/:carNo', async (req, res) => {
  const { carNo } = req.params;
  try {
    const rows = await dbAll(`SELECT * FROM car_driver_assignments WHERE car_no = ? ORDER BY assigned_date DESC`, [carNo]);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get car-driver assignment history for a specific driver
app.get('/api/car-driver-assignments/history/by-driver/:driverId', async (req, res) => {
  const { driverId } = req.params;
  try {
    // First, get the driver's name from their ID
    const driver = await dbGet(`SELECT name FROM drivers WHERE id = ?`, [driverId]);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found." });
    }

    const rows = await dbAll(`SELECT * FROM car_driver_assignments WHERE driver_name = ? ORDER BY assigned_date DESC`, [driver.name]);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    console.error("Error fetching driver assignment history by driver ID:", err.message);
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
    // Find the car assigned to this driver during the specified period
    // This query tries to find an assignment that was active at any point within the month.
    const assignment = await dbGet(
      `SELECT car_no FROM car_driver_assignments
       WHERE driver_name = ?
       AND assigned_date <= ? -- Assignment started on or before the end of the month
       AND (end_date IS NULL OR end_date >= ?) -- Assignment ended on or after the start of the month (or is still active)
       ORDER BY assigned_date DESC LIMIT 1`, // Get the most recent relevant assignment
      [driverName, endDate, startDate]
    );

    if (!assignment) { // If no car is assigned to this driver for the period
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

// API endpoint to get trips for a specific driver within a year
app.get('/api/driver-trips-yearly/:driverName/:year', async (req, res) => {
  const { driverName, year } = req.params;
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  try {
    // Find the car assigned to this driver during the specified period
    const assignment = await dbGet(
      `SELECT car_no FROM car_driver_assignments
       WHERE driver_name = ?
       AND assigned_date <= ?
       AND (end_date IS NULL OR end_date >= ?)
       ORDER BY assigned_date DESC LIMIT 1`,
      [driverName, endDate, startDate]
    );

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

  console.log(`[car-maintenance-monthly] CarNo: ${carNo}, Year: ${year}, Month: ${month}, StartDate: ${startDate}, EndDate: ${endDate}`);
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

// API endpoint to get maintenance costs for a specific car within a year
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
// Modified to use log_datetime
app.get('/api/fuel-logs-monthly/:carNo/:year/:month', async (req, res) => {
  const { carNo, year, month } = req.params;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00`; // Include time for full datetime comparison
  const endDate = `${new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0]} 23:59`; // Include time for full datetime comparison

  try {
    const row = await dbGet(
      'SELECT SUM(fuel_cost) AS total_fuel_cost FROM fuel_logs WHERE car_no = ? AND log_datetime BETWEEN ? AND ?',
      [carNo, startDate, endDate]
    );
    const totalFuelCost = row ? (row.total_fuel_cost || 0) : 0;
    res.json({ message: "success", total_fuel_cost: totalFuelCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoint to get fuel costs for a specific car within a year (for DriverManagementPage)
// Modified to use log_datetime
app.get('/api/fuel-logs-yearly/:carNo/:year', async (req, res) => {
  const { carNo, year } = req.params;
  const startDate = `${year}-01-01 00:00`;
  const endDate = `${year}-12-31 23:59`;

  try {
    const row = await dbGet(
      'SELECT SUM(fuel_cost) AS total_fuel_cost FROM fuel_logs WHERE car_no = ? AND log_datetime BETWEEN ? AND ?',
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

// API endpoint to update a general expense record
app.put('/api/general-expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { carNo, expenseDate, description, cost, remarks } = req.body; // description will be the final description

  if (!carNo || !expenseDate || !description || cost === undefined || cost === null) { // Fixed: cost check
    return res.status(400).json({ error: "Missing required general expense fields for update." });
  }

  try {
    const result = await dbRun(`
      UPDATE general_expenses SET
        car_no = ?,
        expense_date = ?,
        description = ?,
        cost = ?,
        remarks = ?
      WHERE id = ?
    `, [carNo, expenseDate, description, cost, remarks, id]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "General expense record not found." });
    }
    res.json({
      message: "General expense record updated successfully",
      id: id
    });
  } catch (err) {
    console.error("Error updating general expense record:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to get general expenses for a specific car with filters
// Modified to include year, month, description, and otherDescription filters
app.get('/api/general-expenses/:carNo', async (req, res) => {
  const { carNo } = req.params;
  const { year, month, description, otherDescription } = req.query;

  let whereClauses = ['car_no = ?'];
  let params = [carNo];

  if (year) {
    if (month) {
      whereClauses.push("strftime('%Y-%m', expense_date) = ?");
      params.push(`${year}-${String(month).padStart(2, '0')}`);
    } else { // Filter by year only if month is not provided (or is 'All')
      whereClauses.push("strftime('%Y', expense_date) = ?");
      params.push(`${year}`);
    }
  }

  if (description) {
    if (description === "အခြား (Other)" && otherDescription) {
      // If "Other" is selected and otherDescription is provided, filter by it
      whereClauses.push('description LIKE ?');
      params.push(`%${otherDescription}%`);
    } else if (description !== "အခြား (Other)") {
      // If a specific description (not "Other") is selected, filter by it
      whereClauses.push('description = ?');
      params.push(description);
    }
    // If description is "Other" but otherDescription is empty, it means "All other"
    // which is covered by not adding a description filter.
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  try {
    const rows = await dbAll(`SELECT * FROM general_expenses ${whereSql} ORDER BY expense_date DESC`, params);
    res.json({
      message: "success",
      data: rows
    });
  } catch (err) {
    console.error("Error fetching general expenses:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// NEW: API endpoint to get general expenses for a specific car within a month
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


// API endpoint for data backup
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

// API endpoint for data restore
app.post('/api/restore', async (req, res) => {
  const restoreData = req.body; // Data sent from the frontend

  try {
    // Start a transaction to ensure atomicity
    await dbRun('BEGIN TRANSACTION');

    // Define table names in an order that respects foreign key constraints for deletion (children first)
    const deleteOrderTableNames = [
      'fuel_readings',             // Depends on trips
      'car_driver_assignments',    // Depends on drivers
      'driver_salary_history',     // Depends on drivers (NEW)
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
      'driver_salary_history',     // Depends on drivers (NEW)
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
