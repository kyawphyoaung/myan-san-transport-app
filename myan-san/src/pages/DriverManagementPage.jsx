// myan-san/src/pages/DriverManagementPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    CircularProgress,
    Alert
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import carNumbersData from '../data/carNumbers.json'; // Import carNumbers.json
import { formatMMK } from '../utils/currencyFormatter'; // Import formatMMK

const API_BASE_URL = 'http://localhost:5001/api';

const DriverManagementPage = () => {
    const [drivers, setDrivers] = useState([]);
    const [driverName, setDriverName] = useState('');
    const [monthlySalary, setMonthlySalary] = useState('');
    const [editingDriverId, setEditingDriverId] = useState(null);
    const [editDriverName, setEditDriverName] = useState('');
    const [editMonthlySalary, setEditMonthlySalary] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // State for Tabs
    const [activeTab, setActiveTab] = useState('incomeCalculation'); // 'incomeCalculation', 'driverList', 'addDriver'

    // State for Car-Driver Assignment (for ADD NEW Driver form)
    const [newDriverAssignedCarNo, setNewDriverAssignedCarNo] = useState('');
    const [newDriverAssignedDate, setNewDriverAssignedDate] = useState(new Date().toISOString().split('T')[0]);

    // State for Car-Driver Assignment (for EDIT Driver form)
    const [carNumbers, setCarNumbers] = useState([]); // All unique car numbers from backend (DB)
    const [carAssignments, setCarAssignments] = useState([]);
    const [assignedCarNo, setAssignedCarNo] = useState(''); // Car assigned to the driver being edited/viewed
    const [assignedDriverName, setAssignedDriverName] = useState(''); // Driver assigned to the car being edited/viewed
    const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today's date

    // State for Monthly Income Calculation
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' for all months, or 1-12 for specific month
    const [selectedDriverForIncome, setSelectedDriverForIncome] = useState(''); // New state for driver dropdown
    const [monthlyIncomeData, setMonthlyIncomeData] = useState({}); // { driverName: { totalTripsIncome, totalMaintenanceCost, totalFuelCost, totalGeneralCost, netIncome, assignedCarNo, month } }

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i); // Current year +/- 2 years
    }, []);

    const months = useMemo(() => [
        { value: 'all', label: 'လ အားလုံး' }, // New option for all months
        { value: 1, label: 'ဇန်နဝါရီ' },
        { value: 2, label: 'ဖေဖော်ဝါရီ' },
        { value: 3, label: 'မတ်' },
        { value: 4, label: 'ဧပြီ' },
        { value: 5, label: 'မေ' },
        { value: 6, label: 'ဇွန်' },
        { value: 7, label: 'ဇူလိုင်' },
        { value: 8, label: 'သြဂုတ်' },
        { value: 9, label: 'စက်တင်ဘာ' },
        { value: 10, label: 'အောက်တိုဘာ' },
        { value: 11, label: 'နိုဝင်ဘာ' },
        { value: 12, label: 'ဒီဇင်ဘာ' },
    ], []);


    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/drivers`);
            setDrivers(response.data.data);
            // Set default selected driver for income calculation if not already set
            if (response.data.data.length > 0 && !selectedDriverForIncome) {
                setSelectedDriverForIncome(''); // Default to 'All Drivers'
            }
        } catch (err) {
            setError('ယာဉ်မောင်းစာရင်းများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('Error fetching drivers:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedDriverForIncome]);

    const fetchCarNumbers = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/unique-car-numbers`);
            const backendCarNumbers = response.data.data;

            // Combine with static carNumbersData
            const allCarNumbersSet = new Set();
            carNumbersData.forEach(car => allCarNumbersSet.add(car.number)); // Add from static JSON
            backendCarNumbers.forEach(car => allCarNumbersSet.add(car)); // Add from backend (DB)

            setCarNumbers(Array.from(allCarNumbersSet).sort());
        } catch (err) {
            setError('ကားနံပါတ်များကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('Error fetching unique car numbers:', err);
            // Fallback to only static car numbers if backend fetch fails
            const allCarNumbersSet = new Set();
            carNumbersData.forEach(car => allCarNumbersSet.add(car.number));
            setCarNumbers(Array.from(allCarNumbersSet).sort());
        }
    }, []);

    const fetchCarAssignments = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/car-driver-assignments`);
            setCarAssignments(response.data.data);
        } catch (err) {
            setError('ကားချိတ်ဆက်မှုများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('Error fetching car assignments:', err);
        }
    }, []);

    const fetchMonthlyIncome = useCallback(async () => {
        const newMonthlyIncomeData = {};
        const driversToFetch = selectedDriverForIncome ? drivers.filter(d => d.name === selectedDriverForIncome) : drivers;

        for (const driver of driversToFetch) {
            let totalTripsIncome = 0;
            let totalMaintenanceCost = 0;
            let totalFuelCost = 0;
            let totalGeneralCost = 0; // General Expenses
            let assignedCarForPeriod = null;

            // Simplified Logic: Find the current assignment for the driver (assuming one car per driver at any time)
            const currentAssignment = carAssignments.find(assign => assign.driver_name === driver.name);

            if (currentAssignment) {
                assignedCarForPeriod = currentAssignment.car_no;

                // Fetch trip income (using the API that queries based on assigned car)
                try {
                    const tripResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/driver-trips-yearly/${driver.name}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/driver-trips/${driver.name}/${selectedYear}/${selectedMonth}`);
                    totalTripsIncome = tripResponse.data.total_charge || 0;
                } catch (err) {
                    console.error(`Error fetching trip income for ${driver.name} for period ${selectedYear}-${selectedMonth}:`, err);
                    totalTripsIncome = 0;
                }

                // Fetch maintenance costs for the assigned car
                try {
                    const maintenanceResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/car-maintenance-yearly/${assignedCarForPeriod}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/car-maintenance-monthly/${assignedCarForPeriod}/${selectedYear}/${selectedMonth}`);
                    totalMaintenanceCost = maintenanceResponse.data.total_cost || 0;
                } catch (err) {
                    console.error(`Error fetching maintenance cost for ${assignedCarForPeriod} for period ${selectedYear}-${selectedMonth}:`, err);
                    totalMaintenanceCost = 0;
                }

                // Fetch fuel costs for the assigned car
                try {
                    const fuelResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/fuel-logs-yearly/${assignedCarForPeriod}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/fuel-logs-monthly/${assignedCarForPeriod}/${selectedYear}/${selectedMonth}`);
                    totalFuelCost = fuelResponse.data.total_fuel_cost || 0;
                } catch (err) {
                    console.error(`Error fetching fuel cost for ${assignedCarForPeriod} for period ${selectedYear}-${selectedMonth}:`, err);
                    totalFuelCost = 0;
                }

                // Fetch general expenses for the assigned car
                try {
                    const generalExpenseResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/general-expenses-yearly/${assignedCarForPeriod}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/general-expenses-monthly/${assignedCarForPeriod}/${selectedYear}/${selectedMonth}`);
                    totalGeneralCost = generalExpenseResponse.data.total_general_cost || 0;
                } catch (err) {
                    console.error(`Error fetching general expense for ${assignedCarForPeriod} for period ${selectedYear}-${selectedMonth}:`, err);
                    totalGeneralCost = 0;
                }
            }

            const monthlySalary = driver.monthly_salary || 0;
            // Calculate Net Income: Total Trips Income - Total Maintenance Cost - Total Fuel Cost - Total General Cost - Monthly Salary
            const netIncome = totalTripsIncome - totalMaintenanceCost - totalFuelCost - totalGeneralCost - monthlySalary;

            newMonthlyIncomeData[driver.name] = {
                totalTripsIncome,
                totalMaintenanceCost,
                totalFuelCost,
                totalGeneralCost,
                monthlySalary,
                netIncome,
                assignedCarNo: assignedCarForPeriod || 'N/A',
                month: selectedMonth === 'all' ? 'All Months' : months.find(m => m.value === selectedMonth)?.label,
            };
        }
        setMonthlyIncomeData(newMonthlyIncomeData);
    }, [drivers, carAssignments, selectedYear, selectedMonth, selectedDriverForIncome, months]);


    useEffect(() => {
        fetchDrivers();
        fetchCarNumbers();
        fetchCarAssignments();
    }, [fetchDrivers, fetchCarNumbers, fetchCarAssignments]);

    useEffect(() => {
        if (drivers.length > 0 && carAssignments.length > 0) {
            fetchMonthlyIncome();
        }
    }, [drivers, carAssignments, selectedYear, selectedMonth, selectedDriverForIncome, fetchMonthlyIncome]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        if (!driverName || monthlySalary === '') {
            setError('ယာဉ်မောင်းအမည်နှင့် လစာပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
            return;
        }

        try {
            // 1. Add new driver
            await axios.post(`${API_BASE_URL}/drivers`, { name: driverName, monthly_salary: parseFloat(monthlySalary) });

            // 2. If car assignment details are provided, add the assignment
            if (newDriverAssignedCarNo && newDriverAssignedDate) {
                await axios.post(`${API_BASE_URL}/car-driver-assignments`, {
                    carNo: newDriverAssignedCarNo,
                    driverName: driverName, // Use the newly added driver's name
                    assignedDate: newDriverAssignedDate
                });
            }

            setSuccessMessage('ယာဉ်မောင်းအသစ် ထည့်သွင်းပြီးပါပြီ။');
            setDriverName('');
            setMonthlySalary('');
            setNewDriverAssignedCarNo(''); // Clear new assignment fields
            setNewDriverAssignedDate(new Date().toISOString().split('T')[0]); // Reset to today's date

            fetchDrivers(); // Refresh the driver list
            fetchCarAssignments(); // Refresh car assignments
        } catch (err) {
            if (err.response && err.response.status === 409) {
                setError('ဤယာဉ်မောင်းအမည် ရှိပြီးသားဖြစ်သည်။ အခြားအမည်တစ်ခု ထည့်ပါ။');
            } else {
                setError('ယာဉ်မောင်းအသစ် ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            }
            console.error('Error adding driver:', err);
        }
    };

    const handleEdit = (driver) => {
        setEditingDriverId(driver.id);
        setEditDriverName(driver.name);
        setEditMonthlySalary(driver.monthly_salary);

        // Find current assignment for this driver
        const currentAssignment = carAssignments.find(assignment => assignment.driver_name === driver.name);
        if (currentAssignment) {
            setAssignedCarNo(currentAssignment.car_no);
            setAssignedDriverName(currentAssignment.driver_name); // Set to current driver's name
            setAssignedDate(currentAssignment.assigned_date);
        } else {
            setAssignedCarNo('');
            setAssignedDriverName(driver.name); // Default to current driver's name for new assignment
            setAssignedDate(new Date().toISOString().split('T')[0]); // Set to today's date if no assignment
        }
    };

    const handleSaveEdit = async (id) => {
        setError(null);
        setSuccessMessage(null);
        if (!editDriverName || editMonthlySalary === '') {
            setError('ယာဉ်မောင်းအမည်နှင့် လစာ ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
            return;
        }

        try {
            // Find the original driver's data before updating
            const originalDriver = drivers.find(d => d.id === id);
            const originalAssignedCar = carAssignments.find(assign => assign.driver_name === originalDriver.name);
            const originalCarNo = originalAssignedCar ? originalAssignedCar.car_no : null;

            // 1. Update driver details (name and salary)
            await axios.put(`${API_BASE_URL}/drivers/${id}`, {
                name: editDriverName,
                monthly_salary: parseFloat(editMonthlySalary)
            });

            // 2. Handle Car-Driver Assignment changes
            if (assignedCarNo) { // If a car is selected for assignment (new or existing)
                if (originalCarNo && originalCarNo !== assignedCarNo) {
                    // Case 1: Car is changed (e.g., from 2K-7937 to 6G-8202)
                    // First, delete the old assignment for the old car number
                    try {
                        await axios.delete(`${API_BASE_URL}/car-driver-assignments/${originalCarNo}`);
                        console.log(`Successfully unassigned old car: ${originalCarNo}`);
                    } catch (deleteErr) {
                        console.warn(`Could not delete old assignment for car ${originalCarNo}:`, deleteErr);
                        // If deletion fails, it might be because the assignment didn't exist or was already gone.
                        // We proceed to create the new one.
                    }
                }
                // Then, create/update the new assignment for the selected car
                // The backend POST endpoint handles both insert and update based on carNo
                await axios.post(`${API_BASE_URL}/car-driver-assignments`, {
                    carNo: assignedCarNo,
                    driverName: editDriverName, // Use the potentially new driver name
                    assignedDate: assignedDate
                });
            } else if (originalCarNo) {
                // Case 2: Car is unassigned (assignedCarNo is cleared, but there was an original assignment)
                try {
                    await axios.delete(`${API_BASE_URL}/car-driver-assignments/${originalCarNo}`);
                    console.log(`Successfully unassigned car: ${originalCarNo}`);
                } catch (deleteErr) {
                    console.warn(`Could not delete assignment for car ${originalCarNo}:`, deleteErr);
                }
            }
            // Case 3: No car assigned originally and no car selected now (do nothing)

            setSuccessMessage('ယာဉ်မောင်း အချက်အလက်နှင့် ကားချိတ်ဆက်မှုများ ပြင်ဆင်ပြီးပါပြီ။');
            setEditingDriverId(null);
            setEditDriverName('');
            setEditMonthlySalary('');
            setAssignedCarNo('');
            setAssignedDriverName('');
            setAssignedDate(new Date().toISOString().split('T')[0]); // Reset to today's date
            fetchDrivers(); // Refresh the driver list
            fetchCarAssignments(); // Refresh car assignments
        } catch (err) {
            if (err.response && err.response.status === 409) {
                setError('ဤယာဉ်မောင်းအမည် ရှိပြီးသားဖြစ်သည်။ အခြားအမည်တစ်ခု ထည့်ပါ။');
            } else if (err.response && err.response.status === 400 && err.response.data.error && err.response.data.error.includes('UNIQUE constraint failed: car_driver_assignments.car_no')) {
                setError(`ရွေးချယ်ထားသော ကားနံပါတ် "${assignedCarNo}" သည် အခြားယာဉ်မောင်းတစ်ဦးနှင့် ချိတ်ဆက်ထားပြီးဖြစ်သည်။`);
            } else {
                setError('ယာဉ်မောင်း အချက်အလက်များ ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            }
            console.error('Error saving driver edit:', err);
        }
    };

    const handleCancelEdit = () => {
        setEditingDriverId(null);
        setEditDriverName('');
        setEditMonthlySalary('');
        setAssignedCarNo('');
        setAssignedDriverName('');
        setAssignedDate(new Date().toISOString().split('T')[0]); // Reset to today's date
    };

    const handleDelete = (driver) => {
        setDriverToDelete(driver);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        setError(null);
        setSuccessMessage(null);
        try {
            await axios.delete(`${API_BASE_URL}/drivers/${driverToDelete.id}`);
            setSuccessMessage('ယာဉ်မောင်းကို ဖျက်ပစ်ပြီးပါပြီ။');
            fetchDrivers(); // Refresh the driver list
            fetchCarAssignments(); // Refresh car assignments (assignment will be deleted by backend logic)
        } catch (err) {
            setError('ယာဉ်မောင်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('Error deleting driver:', err);
        } finally {
            setDeleteConfirmOpen(false);
            setDriverToDelete(null);
        }
    };

    const handleCloseDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        setDriverToDelete(null);
    };

    const handleAssignedCarChange = (event) => {
        setAssignedCarNo(event.target.value);
    };

    // Filter available car numbers for assignment dropdown
    const availableCarNumbers = useMemo(() => {
        const assignedCars = new Set(carAssignments.map(a => a.car_no));
        // Combine static car numbers and backend car numbers
        const combinedCarNumbers = new Set([...carNumbersData.map(car => car.number), ...carNumbers]);

        return Array.from(combinedCarNumbers).filter(carNo => !assignedCars.has(carNo) || carNo === assignedCarNo).sort();
    }, [carNumbers, carAssignments, assignedCarNo]);


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                ယာဉ်မောင်း စီမံခန့်ခွဲမှု
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            {/* Tabs Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Button
                    variant={activeTab === 'incomeCalculation' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('incomeCalculation')}
                    sx={{ mr: 1, textTransform: 'none' }}
                >
                    လစဥ်ယာဉ်မောင်းတစ်ဦးချင်းစီ၏ အသားတင် ဝင်ငွေ ရှာပေးနိုင်မှု
                </Button>
                <Button
                    variant={activeTab === 'driverList' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('driverList')}
                    sx={{ mr: 1, textTransform: 'none' }}
                >
                    ယာဉ်မောင်းစာရင်း
                </Button>
                <Button
                    variant={activeTab === 'addDriver' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('addDriver')}
                    sx={{ textTransform: 'none' }}
                >
                    ယာဉ်မောင်းအသစ်ထည့်ရန်
                </Button>
            </Box>

            {/* Tab Content - Monthly Income Calculation */}
            {activeTab === 'incomeCalculation' && (
                <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
                    <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                        လစဥ်ယာဉ်မောင်းတစ်ဦးချင်းစီ၏ အသားတင် ဝင်ငွေ ရှာပေးနိုင်မှု
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <FormControl fullWidth>
                            <InputLabel>နှစ် ရွေးချယ်ပါ</InputLabel>
                            <Select
                                value={selectedYear}
                                label="နှစ် ရွေးချယ်ပါ"
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {years.map((year) => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>လ ရွေးချယ်ပါ</InputLabel>
                            <Select
                                value={selectedMonth}
                                label="လ ရွေးချယ်ပါ"
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                {months.map((month) => (
                                    <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>ယာဉ်မောင်း ရွေးချယ်ပါ</InputLabel>
                            <Select
                                value={selectedDriverForIncome}
                                label="ယာဉ်မောင်း ရွေးချယ်ပါ"
                                onChange={(e) => setSelectedDriverForIncome(e.target.value)}
                            >
                                <MenuItem value="">
                                    <em>ယာဉ်မောင်း အားလုံး</em>
                                </MenuItem>
                                {drivers.map((driver) => (
                                    <MenuItem key={driver.id} value={driver.name}>{driver.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#e0e0e0' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ယာဉ်မောင်း</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ကားနံပါတ်</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>လ</TableCell> {/* New Month Column */}
                                    <TableCell sx={{ fontWeight: 'bold' }}>ခရီးစဉ်ဝင်ငွေစုစုပေါင်း</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ကားထိန်းသိမ်းစရိတ်စုစုပေါင်း</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>ဆီဖိုးစုစုပေါင်း</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>အထွေထွေအသုံးစာရိတ်</TableCell> {/* New Column */}
                                    <TableCell sx={{ fontWeight: 'bold' }}>ယာဉ်မောင်းလစာ</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>အသားတင်ဝင်ငွေ</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(monthlyIncomeData).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            ဒေတာများ မရှိသေးပါ။
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    Object.keys(monthlyIncomeData).map((driverName) => {
                                        const incomeData = monthlyIncomeData[driverName] || {};
                                        return (
                                            <TableRow key={`income-${driverName}`}>
                                                <TableCell>{driverName}</TableCell>
                                                <TableCell>{incomeData.assignedCarNo || 'N/A'}</TableCell>
                                                <TableCell>{incomeData.month || 'N/A'}</TableCell> {/* Display Month */}
                                                <TableCell>{(incomeData.totalTripsIncome || 0).toLocaleString()} MMK</TableCell>
                                                <TableCell>{(incomeData.totalMaintenanceCost || 0).toLocaleString()} MMK</TableCell>
                                                <TableCell>{(incomeData.totalFuelCost || 0).toLocaleString()} MMK</TableCell>
                                                <TableCell>{(incomeData.totalGeneralCost || 0).toLocaleString()} MMK</TableCell> {/* Display General Cost */}
                                                <TableCell>{(incomeData.monthlySalary || 0).toLocaleString()} MMK</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', color: incomeData.netIncome < 0 ? 'error.main' : 'success.main' }}>
                                                    {(incomeData.netIncome || 0).toLocaleString()} MMK
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* Tab Content - Driver List */}
            {activeTab === 'driverList' && (
                <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
                    <Typography variant="h5" gutterBottom>
                        ယာဉ်မောင်းစာရင်း
                    </Typography>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>အမည်</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>လစဉ်လစာ</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>ကားနံပါတ်</TableCell> {/* Changed from "ချိတ်ဆက်ထားသော ကားနံပါတ်" */}
                                        <TableCell sx={{ fontWeight: 'bold' }}>ချိတ်ဆက်သည့်နေ့စွဲ</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>လုပ်ဆောင်ချက်များ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {drivers.map((driver) => {
                                        const assignedCar = carAssignments.find(assign => assign.driver_name === driver.name);
                                        const displayCarNo = assignedCar ? assignedCar.car_no : 'N/A';
                                        const displayAssignedDate = assignedCar ? assignedCar.assigned_date : 'N/A';

                                        const isEditing = editingDriverId === driver.id;
                                        return (
                                            <TableRow key={driver.id}>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <TextField
                                                            value={editDriverName}
                                                            onChange={(e) => setEditDriverName(e.target.value)}
                                                            size="small"
                                                            sx={{ width: '120px' }}
                                                        />
                                                    ) : (
                                                        driver.name
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <TextField
                                                            type="text" // Changed to text for currency formatting
                                                            value={editMonthlySalary}
                                                            onChange={(e) => {
                                                                const rawValue = e.target.value.replace(/,/g, '');
                                                                if (!isNaN(rawValue) || rawValue === '') {
                                                                    setEditMonthlySalary(rawValue);
                                                                }
                                                            }}
                                                            size="small"
                                                            sx={{ width: '100px' }}
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <Typography variant="body2" color="textSecondary">
                                                                        {editMonthlySalary && !isNaN(parseFloat(editMonthlySalary)) ? formatMMK(parseFloat(editMonthlySalary)) : ''}
                                                                    </Typography>
                                                                ),
                                                            }}
                                                        />
                                                    ) : (
                                                        (driver.monthly_salary || 0).toLocaleString()
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <FormControl size="small" sx={{ minWidth: 120 }}>
                                                            <InputLabel>ကားနံပါတ်</InputLabel>
                                                            <Select
                                                                value={assignedCarNo}
                                                                onChange={handleAssignedCarChange}
                                                                label="ကားနံပါတ်"
                                                            >
                                                                <MenuItem value="">
                                                                    <em>မရွေးချယ်ပါ</em>
                                                                </MenuItem>
                                                                {availableCarNumbers.map((car) => (
                                                                    <MenuItem key={car} value={car}>{car}</MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    ) : (
                                                        displayCarNo
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <TextField
                                                            type="date"
                                                            value={assignedDate}
                                                            onChange={(e) => setAssignedDate(e.target.value)}
                                                            size="small"
                                                            sx={{ width: '140px' }}
                                                            InputLabelProps={{
                                                                shrink: true,
                                                            }}
                                                        />
                                                    ) : (
                                                        displayAssignedDate
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <Box>
                                                            <IconButton color="primary" onClick={() => handleSaveEdit(driver.id)}>
                                                                <SaveIcon />
                                                            </IconButton>
                                                            <IconButton color="secondary" onClick={handleCancelEdit}>
                                                                <CancelIcon />
                                                            </IconButton>
                                                        </Box>
                                                    ) : (
                                                        <Box>
                                                            <IconButton color="info" onClick={() => handleEdit(driver)}>
                                                                <EditIcon />
                                                            </IconButton>
                                                            <IconButton color="error" onClick={() => handleDelete(driver)}>
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Tab Content - Add New Driver */}
            {activeTab === 'addDriver' && (
                <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
                    <Typography variant="h5" gutterBottom>
                        ယာဉ်မောင်းအသစ်ထည့်ရန်
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            label="ယာဉ်မောင်းအမည်"
                            variant="outlined"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            required
                            sx={{ flex: '1 1 200px' }}
                        />
                        <TextField
                            label="လစဉ်လစာ"
                            variant="outlined"
                            type="text" // Changed to text for currency formatting
                            value={monthlySalary}
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/,/g, '');
                                if (!isNaN(rawValue) || rawValue === '') {
                                    setMonthlySalary(rawValue);
                                }
                            }}
                            required
                            sx={{ flex: '1 1 200px' }}
                            InputProps={{
                                endAdornment: (
                                    <Typography variant="body2" color="textSecondary">
                                        {monthlySalary && !isNaN(parseFloat(monthlySalary)) ? formatMMK(parseFloat(monthlySalary)) : ''}
                                    </Typography>
                                ),
                            }}
                        />
                        <FormControl sx={{ flex: '1 1 200px' }}>
                            <InputLabel>ချိတ်ဆက်ရန် ကားနံပါတ်</InputLabel>
                            <Select
                                value={newDriverAssignedCarNo}
                                onChange={(e) => setNewDriverAssignedCarNo(e.target.value)}
                                label="ချိတ်ဆက်ရန် ကားနံပါတ်"
                            >
                                <MenuItem value="">
                                    <em>မရွေးချယ်ပါ</em>
                                </MenuItem>
                                {availableCarNumbers.map((car) => (
                                    <MenuItem key={car} value={car}>{car}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="ချိတ်ဆက်သည့် ရက်စွဲ"
                            type="date"
                            variant="outlined"
                            value={newDriverAssignedDate}
                            onChange={(e) => setNewDriverAssignedDate(e.target.value)}
                            sx={{ flex: '1 1 200px' }}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ minWidth: { xs: 'auto', sm: 150 }, flex: '1 1 auto' }}
                        >
                            ထည့်သွင်းမည်
                        </Button>
                    </Box>
                </Paper>
            )}


            <Dialog
                open={deleteConfirmOpen}
                onClose={handleCloseDeleteConfirm}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"ယာဉ်မောင်းဖျက်သိမ်းခြင်း"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        " {driverToDelete?.name} " အမည်ရှိ ယာဉ်မောင်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။ ယာဉ်မောင်းနှင့်သက်ဆိုင်သော ကားချိတ်ဆက်မှုများလည်း ပျက်စီးသွားပါမည်။
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} color="primary">
                        မလုပ်တော့ပါ
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        ဖျက်သိမ်းမည်
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default DriverManagementPage;
