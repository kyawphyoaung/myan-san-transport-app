// backend/server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5001;

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
    db.serialize(() => {
      // Trips Table (driver_name column ကို ပြင်ဆင်ပါ)
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating trips table:", err.message);
        else {
          console.log("Trips table created or already exists.");
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
          });
        }
      });

      // Car Maintenance Log Table (existing)
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

      // Fuel Logs Table (existing)
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
      });

      // Drivers Table (existing)
      db.run(`
        CREATE TABLE IF NOT EXISTS drivers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          monthly_salary INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating drivers table:", err.message);
        else console.log("Drivers table created or already exists.");
      });

      // Settings Table (existing)
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
          db.run(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
            ['overnight_dayover_combined_charge', '110000', 'Combined charge for overnight stay with cargo AND day over/delayed']);
          db.run(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
            ['gep_overnight_charge', '40000', 'Overnight charge for GEP gate cars']);
          db.run(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)`,
            ['9k_overnight_charge', '30000', 'Overnight charge for 9K gate cars']);
        }
      });

      // Route Charges Versioning Table (existing)
      db.run(`
        CREATE TABLE IF NOT EXISTS route_charges_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          effective_date TEXT NOT NULL,
          route_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error("Error creating route_charges_versions table:", err.message);
        else console.log("Route_charges_versions table created or already exists.");

        try {
            const initialRouteCharges = require(path.resolve(__dirname, '../myan-san/src/data/routeCharges.json'));
            const initialRouteData = JSON.stringify(initialRouteCharges);
            const today = new Date().toISOString().split('T')[0];

            db.get(`SELECT COUNT(*) AS count FROM route_charges_versions WHERE effective_date = ?`, [today], (err, row) => {
              if (err) {
                console.error("Error checking existing route charges version:", err.message);
                return;
              }
              if (row.count === 0) {
                db.run(`INSERT INTO route_charges_versions (effective_date, route_data) VALUES (?, ?)`,
                  [today, initialRouteData],
                  function(err) {
                    if (err) {
                      console.error("Error inserting initial route charges version:", err.message);
                    } else {
                      console.log(`Initial route charges version inserted with ID: ${this.lastID}`);
                    }
                  }
                );
              } else {
                console.log(`Route charges version for ${today} already exists.`);
              }
            });
        } catch (e) {
            console.error("Could not load initial route charges from JSON. Ensure path is correct and file exists.", e);
        }
      });

      // Car Driver Assignments Table (New Table)
      db.run(`
        CREATE TABLE IF NOT EXISTS car_driver_assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          car_no TEXT NOT NULL UNIQUE,
          driver_name TEXT NOT NULL,
          assigned_date TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (car_no) REFERENCES trips(car_no), -- Optional: Link to trips or a future cars table
          FOREIGN KEY (driver_name) REFERENCES drivers(name)
        )
      `, (err) => {
        if (err) console.error("Error creating car_driver_assignments table:", err.message);
        else console.log("Car_driver_assignments table created or already exists.");
      });
    });
  }
});

// ... (existing API endpoints for /, /api/trips GET, /api/trips POST, /api/route-charges, /api/settings, /api/unique-car-numbers, /api/car-maintenance, /api/fuel-logs, /api/drivers, /api/driver-names) ...

// API endpoint to assign/update a driver to a car
app.post('/api/car-driver-assignments', (req, res) => {
  const { carNo, driverName, assignedDate } = req.body;
  if (!carNo || !driverName || !assignedDate) {
    return res.status(400).json({ error: "Missing required assignment fields (carNo, driverName, assignedDate)." });
  }

  // Check if assignment already exists for this car_no
  db.get(`SELECT * FROM car_driver_assignments WHERE car_no = ?`, [carNo], (err, row) => {
    if (err) {
      console.error("Error checking existing car assignment:", err.message);
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      // Update existing assignment
      db.run(`UPDATE car_driver_assignments SET driver_name = ?, assigned_date = ?, created_at = CURRENT_TIMESTAMP WHERE car_no = ?`,
        [driverName, assignedDate, carNo],
        function(err) {
          if (err) {
            console.error("Error updating car assignment:", err.message);
            return res.status(500).json({ error: err.message });
          }
          res.json({
            message: "Car-driver assignment updated successfully",
            id: row.id
          });
        }
      );
    } else {
      // Insert new assignment
      const stmt = db.prepare(`
        INSERT INTO car_driver_assignments (car_no, driver_name, assigned_date)
        VALUES (?, ?, ?)
      `);
      stmt.run(carNo, driverName, assignedDate, function(err) {
        if (err) {
          console.error("Error inserting car assignment:", err.message);
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          message: "Car-driver assignment added successfully",
          id: this.lastID
        });
      });
      stmt.finalize();
    }
  });
});

// API endpoint to get all car-driver assignments
app.get('/api/car-driver-assignments', (req, res) => {
  db.all("SELECT * FROM car_driver_assignments", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});