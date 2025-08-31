// myan-san/src/pages/DriverManagementPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
    Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import carNumbersData from '../data/carNumbers.json'; // carNumbers.json ကို import လုပ်ပါ။
import { formatMMK } from '../utils/currencyFormatter'; // formatMMK ကို import လုပ်ပါ။

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

function DriverManagementPage() {
    const [drivers, setDrivers] = useState([]);
    const [driverName, setDriverName] = useState('');
    const [monthlySalary, setMonthlySalary] = useState('');
    const [editingDriverId, setEditingDriverId] = useState(null);
    const [editDriverName, setEditDriverName] = useState('');
    // editMonthlySalary state ကို ဖယ်ရှားလိုက်ပါပြီ၊ လစာကို inline edit မလုပ်တော့ပါ။
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Tab များအတွက် State
    const [activeTab, setActiveTab] = useState('incomeCalculation'); // 'incomeCalculation', 'driverList', 'addDriver', 'assignmentHistory', 'salaryHistory'

    // ယာဉ်မောင်းအသစ်ထည့်ရန် Form အတွက် ကားချိတ်ဆက်မှု State များ
    const [newDriverAssignedCarNo, setNewDriverAssignedCarNo] = useState('');
    const [newDriverAssignedDate, setNewDriverAssignedDate] = useState(new Date().toISOString().split('T')[0]);

    // ယာဉ်မောင်းပြင်ဆင်ရန် Form အတွက် ကားချိတ်ဆက်မှု State များ
    const [carNumbers, setCarNumbers] = useState([]); // Backend (DB) မှ ရရှိသော ထူးခြားသည့် ကားနံပါတ်များအားလုံး
    const [carAssignments, setCarAssignments] = useState([]); // လက်ရှိ active ဖြစ်နေသော ကားချိတ်ဆက်မှုများ
    const [assignedCarNo, setAssignedCarNo] = useState(''); // ပြင်ဆင်နေသော/ကြည့်ရှုနေသော ယာဉ်မောင်းနှင့် ချိတ်ဆက်ထားသော ကားနံပါတ်
    // const [assignedDriverName, setAssignedDriverName] = useState(''); // ပြင်ဆင်နေသော/ကြည့်ရှုနေသော ကားနှင့် ချိတ်ဆက်ထားသော ယာဉ်မောင်းအမည်
    const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]); // Default အနေဖြင့် ယနေ့ရက်စွဲ

    // လစဉ်ဝင်ငွေတွက်ချက်မှုအတွက် State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' ဆိုလျှင် လအားလုံး၊ 1-12 ဆိုလျှင် သတ်မှတ်ထားသောလ
    const [selectedDriverForIncome, setSelectedDriverForIncome] = useState(''); // ယာဉ်မောင်း dropdown အတွက် State အသစ်
    const [monthlyIncomeData, setMonthlyIncomeData] = useState({}); // { driverName: { totalTripsIncome, totalMaintenanceCost, totalFuelCost, totalGeneralCost, netIncome, assignedCarNo, month } }

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 7 }, (_, i) => currentYear - 5 + i); // လက်ရှိနှစ်မှ ၅ နှစ်အောက်နှင့် ၁ နှစ်အထက်
    }, []);

    const months = useMemo(() => [
        { value: 'all', label: 'လ အားလုံး' }, // လအားလုံးအတွက် ရွေးချယ်စရာအသစ်
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

    // ကား တာဝန်ပေးအပ်မှု မှတ်တမ်းအတွက် State (အသစ်ပြောင်းလဲထားသည်)
    const [carAssignmentHistory, setCarAssignmentHistory] = useState([]);
    const [selectedCarForAssignmentHistory, setSelectedCarForAssignmentHistory] = useState(''); // ယာဉ်မောင်း ID အစား ကားနံပါတ်
    // const [showAssignmentHistory, setShowAssignmentHistory] = useState(false); // မလိုအပ်တော့ပါ

    // ယာဉ်မောင်းလစာအပြောင်းအလဲ မှတ်တမ်းအတွက် State
    const [driverSalaryHistory, setDriverSalaryHistory] = useState([]);
    const [selectedDriverForSalaryHistory, setSelectedDriverForSalaryHistory] = useState('');
    // const [showSalaryHistory, setShowSalaryHistory] = useState(false); // မလိုအပ်တော့ပါ

    // လစာမှတ်တမ်းအသစ်ထည့်ရန် Dialog အတွက် State
    const [newSalaryAmount, setNewSalaryAmount] = useState('');
    const [newSalaryEffectiveDate, setNewSalaryEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [openNewSalaryDialog, setOpenNewSalaryDialog] = useState(false);
    const [selectedDriverForNewSalary, setSelectedDriverForNewSalary] = useState(null);


    // ယာဉ်မောင်းစာရင်းများကို Backend မှ ရယူခြင်း
    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/drivers`);
            setDrivers(response.data.data);
            // ဝင်ငွေတွက်ချက်မှုအတွက် ယာဉ်မောင်းအားလုံးကို default ရွေးချယ်ထားခြင်း
            if (response.data.data.length > 0 && !selectedDriverForIncome) {
                setSelectedDriverForIncome(''); // Default to 'All Drivers'
            }
            // မှတ်တမ်းများအတွက် ပထမဆုံး ယာဉ်မောင်းကို default ရွေးချယ်ထားခြင်း
            // ကားချိတ်ဆက်မှု မှတ်တမ်းအတွက် ကားနံပါတ်ကို fetchCarNumbers ပြီးမှ သတ်မှတ်ပါမည်။
            if (response.data.data.length > 0 && !selectedDriverForSalaryHistory) {
                setSelectedDriverForSalaryHistory(response.data.data[0]?.id || ''); // Optional chaining ဖြင့် safe ဖြစ်စေရန်
            }
        } catch (err) {
            setError('ယာဉ်မောင်းစာရင်းများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('ယာဉ်မောင်းများရယူရာတွင် အမှား:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedDriverForIncome, selectedDriverForSalaryHistory]);

    // ထူးခြားသည့် ကားနံပါတ်များအားလုံးကို Backend မှ ရယူခြင်း
    const fetchCarNumbers = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/unique-car-numbers`);
            const backendCarNumbers = response.data.data;

            // Static JSON မှ ကားနံပါတ်များနှင့် Backend မှ ရရှိသော ကားနံပါတ်များကို ပေါင်းစပ်ခြင်း
            const allCarNumbersSet = new Set();
            carNumbersData.forEach(car => allCarNumbersSet.add(car.number)); // Static JSON မှ ထည့်သွင်း
            backendCarNumbers.forEach(car => allCarNumbersSet.add(car)); // Backend (DB) မှ ထည့်သွင်း

            const sortedCarNumbers = Array.from(allCarNumbersSet).sort();
            setCarNumbers(sortedCarNumbers);
            
            // ကားချိတ်ဆက်မှု မှတ်တမ်းအတွက် ပထမဆုံး ကားနံပါတ်ကို default ရွေးချယ်ထားခြင်း
            if (sortedCarNumbers.length > 0 && !selectedCarForAssignmentHistory) {
                setSelectedCarForAssignmentHistory(sortedCarNumbers[0]);
            }

        } catch (err) {
            setError('ကားနံပါတ်များကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('ထူးခြားသည့် ကားနံပါတ်များရယူရာတွင် အမှား:', err);
            // Backend မှ ရယူခြင်း မအောင်မြင်ပါက static ကားနံပါတ်များကိုသာ အသုံးပြု
            const allCarNumbersSet = new Set();
            carNumbersData.forEach(car => allCarNumbersSet.add(car.number));
            setCarNumbers(Array.from(allCarNumbersSet).sort());
        }
    }, [selectedCarForAssignmentHistory]);

    // ကားချိတ်ဆက်မှုများကို Backend မှ ရယူခြင်း
    const fetchCarAssignments = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/car-driver-assignments`);
            setCarAssignments(response.data.data);
        } catch (err) {
            setError('ကားချိတ်ဆက်မှုများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('ကားချိတ်ဆက်မှုများရယူရာတွင် အမှား:', err);
        }
    }, []);

    // လစဉ်ဝင်ငွေများကို တွက်ချက်ရန် Backend မှ Data ရယူခြင်း
    const fetchMonthlyIncome = useCallback(async () => {
        const newMonthlyIncomeData = {};
        const driversToFetch = selectedDriverForIncome ? drivers.filter(d => d.name === selectedDriverForIncome) : drivers;

        for (const driver of driversToFetch) {
            let totalTripsIncome = 0;
            let totalMaintenanceCost = 0;
            let totalFuelCost = 0;
            let totalGeneralCost = 0; // အထွေထွေအသုံးစာရိတ်
            let assignedCarForPeriod = null;

            // ယာဉ်မောင်းအတွက် လက်ရှိ ချိတ်ဆက်ထားသော ကားကို ရှာဖွေခြင်း (ယာဉ်မောင်းတစ်ဦးလျှင် ကားတစ်စီးသာ ချိတ်ဆက်ထားသည်ဟု ယူဆ)
            const currentAssignment = carAssignments.find(assign => assign.driver_name === driver.name);

            if (currentAssignment) {
                assignedCarForPeriod = currentAssignment.car_no;

                // ခရီးစဉ်ဝင်ငွေ ရယူခြင်း (ချိတ်ဆက်ထားသော ကားပေါ်မူတည်၍ query လုပ်သော API ကို အသုံးပြု)
                try {
                    const tripResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/driver-trips-yearly/${driver.name}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/driver-trips/${driver.name}/${selectedYear}/${selectedMonth}`);
                    totalTripsIncome = tripResponse.data.total_charge || 0;
                } catch (err) {
                    console.error(`${driver.name} အတွက် ခရီးစဉ်ဝင်ငွေ ရယူရာတွင် အမှား (${selectedYear}-${selectedMonth}):`, err);
                    totalTripsIncome = 0;
                }

                // ကားထိန်းသိမ်းစရိတ် ရယူခြင်း (ချိတ်ဆက်ထားသော ကားအတွက်)
                try {
                    const maintenanceResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/car-maintenance-yearly/${assignedCarForPeriod}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/car-maintenance-monthly/${assignedCarForPeriod}/${selectedYear}/${selectedMonth}`);
                    totalMaintenanceCost = maintenanceResponse.data.total_cost || 0;
                } catch (err) {
                    console.error(`${assignedCarForPeriod} အတွက် ထိန်းသိမ်းစရိတ် ရယူရာတွင် အမှား (${selectedYear}-${selectedMonth}):`, err);
                    totalMaintenanceCost = 0;
                }

                // ဆီဖိုး ရယူခြင်း (ချိတ်ဆက်ထားသော ကားအတွက်)
                try {
                    const fuelResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/fuel-logs-yearly/${assignedCarForPeriod}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/fuel-logs-monthly/${assignedCarForPeriod}/${selectedYear}/${selectedMonth}`);
                    totalFuelCost = fuelResponse.data.total_fuel_cost || 0;
                } catch (err) {
                    console.error(`${assignedCarForPeriod} အတွက် ဆီဖိုး ရယူရာတွင် အမှား (${selectedYear}-${selectedMonth}):`, err);
                    totalFuelCost = 0;
                }

                // အထွေထွေအသုံးစာရိတ် ရယူခြင်း (ချိတ်ဆက်ထားသော ကားအတွက်)
                try {
                    const generalExpenseResponse = selectedMonth === 'all'
                        ? await axios.get(`${API_BASE_URL}/general-expenses-yearly/${assignedCarForPeriod}/${selectedYear}`)
                        : await axios.get(`${API_BASE_URL}/general-expenses-monthly/${assignedCarForPeriod}/${selectedYear}/${selectedMonth}`);
                    totalGeneralCost = generalExpenseResponse.data.total_general_cost || 0;
                } catch (err) {
                    console.error(`${assignedCarForPeriod} အတွက် အထွေထွေအသုံးစာရိတ် ရယူရာတွင် အမှား (${selectedYear}-${selectedMonth}):`, err);
                    totalGeneralCost = 0;
                }
            }

            const monthlySalary = driver.monthly_salary || 0;
            // အသားတင်ဝင်ငွေ တွက်ချက်ခြင်း: စုစုပေါင်း ခရီးစဉ်ဝင်ငွေ - စုစုပေါင်း ထိန်းသိမ်းစရိတ် - စုစုပေါင်း ဆီဖိုး - စုစုပေါင်း အထွေထွေအသုံးစာရိတ် - လစဉ်လစာ
            const netIncome = totalTripsIncome - totalMaintenanceCost - totalFuelCost - totalGeneralCost - monthlySalary;

            newMonthlyIncomeData[driver.name] = {
                totalTripsIncome,
                totalMaintenanceCost,
                totalFuelCost,
                totalGeneralCost,
                monthlySalary,
                netIncome,
                assignedCarNo: assignedCarForPeriod || 'N/A',
                month: selectedMonth === 'all' ? 'လ အားလုံး' : months.find(m => m.value === selectedMonth)?.label,
            };
        }
        setMonthlyIncomeData(newMonthlyIncomeData);
    }, [drivers, carAssignments, selectedYear, selectedMonth, selectedDriverForIncome, months]);

    // သတ်မှတ်ထားသော ကားအတွက် တာဝန်ပေးအပ်မှု မှတ်တမ်းကို ရယူခြင်း (အသစ်ပြောင်းလဲထားသည်)
    const fetchCarAssignmentHistory = useCallback(async (carNo) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/car-driver-assignments/history/${carNo}`);
            setCarAssignmentHistory(response.data.data);
        } catch (err) {
            setError('ကားတာဝန်ပေးအပ်မှု မှတ်တမ်းကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('ကားတာဝန်ပေးအပ်မှု မှတ်တမ်းရယူရာတွင် အမှား:', err);
            setCarAssignmentHistory([]); // အမှားဖြစ်ပါက ယခင် data များကို ရှင်းလင်း
        }
    }, []);

    // သတ်မှတ်ထားသော ယာဉ်မောင်းအတွက် လစာမှတ်တမ်းကို ရယူခြင်း
    const fetchDriverSalaryHistory = useCallback(async (driverId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/driver-salary-history/${driverId}`);
            setDriverSalaryHistory(response.data.data);
        } catch (err) {
            setError('လစာအပြောင်းအလဲ မှတ်တမ်းကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('ယာဉ်မောင်းလစာမှတ်တမ်းရယူရာတွင် အမှား:', err);
            setDriverSalaryHistory([]); // အမှားဖြစ်ပါက ယခင် data များကို ရှင်းလင်း
        }
    }, []);

    // Initial Data Fetching (Component Mount လုပ်သောအခါ)
    useEffect(() => {
        fetchDrivers();
        fetchCarNumbers(); // fetchCarNumbers ကို အရင်ခေါ်ပါ
        fetchCarAssignments();
    }, [fetchDrivers, fetchCarNumbers, fetchCarAssignments]);

    // Monthly Income ကို drivers, carAssignments, selectedYear, selectedMonth, selectedDriverForIncome ပြောင်းလဲသောအခါတိုင်း ပြန်လည်တွက်ချက်ခြင်း
    useEffect(() => {
        if (drivers.length > 0 && carAssignments.length > 0) {
            fetchMonthlyIncome();
        }
    }, [drivers, carAssignments, selectedYear, selectedMonth, selectedDriverForIncome, fetchMonthlyIncome]);

    // ကား တာဝန်ပေးအပ်မှု မှတ်တမ်းကို ရွေးချယ်ထားသော ကားနံပါတ်ပြောင်းလဲခြင်း သို့မဟုတ် Tab ပြောင်းလဲသောအခါ ရယူခြင်း (အသစ်ပြောင်းလဲထားသည်)
    useEffect(() => {
        if (activeTab === 'assignmentHistory' && selectedCarForAssignmentHistory) {
            fetchCarAssignmentHistory(selectedCarForAssignmentHistory);
        }
    }, [activeTab, selectedCarForAssignmentHistory, fetchCarAssignmentHistory]);

    // လစာမှတ်တမ်းကို ရွေးချယ်ထားသော ယာဉ်မောင်းပြောင်းလဲခြင်း သို့မဟုတ် Tab ပြောင်းလဲသောအခါ ရယူခြင်း
    useEffect(() => {
        if (activeTab === 'salaryHistory' && selectedDriverForSalaryHistory) {
            fetchDriverSalaryHistory(selectedDriverForSalaryHistory);
        }
    }, [activeTab, selectedDriverForSalaryHistory, fetchDriverSalaryHistory]);

    // ယာဉ်မောင်းအသစ်ထည့်သွင်းရန် Form Submit လုပ်ခြင်း
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);
        
        // Frontend validation
        if (!driverName.trim()) {
            setError('ယာဉ်မောင်းအမည် ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
            return;
        }
        const parsedMonthlySalary = parseFloat(monthlySalary);
        if (isNaN(parsedMonthlySalary) || parsedMonthlySalary < 0) {
            setError('လစာပမာဏကို မှန်ကန်သော ဂဏန်းဖြင့် ဖြည့်သွင်းပါ။ (အနုတ်ဂဏန်း မဖြစ်ရပါ)');
            return;
        }
        if (newDriverAssignedCarNo && !newDriverAssignedDate) {
             setError('ကားချိတ်ဆက်ရန် ကားနံပါတ်ရွေးချယ်ပါက ချိတ်ဆက်သည့်ရက်စွဲကိုလည်း ဖြည့်သွင်းပါ။');
             return;
        }

        try {
            // 1. ယာဉ်မောင်းအသစ်ထည့်သွင်းခြင်း (backend က ကနဦးလစာမှတ်တမ်းကိုပါ ဖန်တီးပေးသည်)
            // const driverResponse = await axios.post(`${API_BASE_URL}/drivers`, { 
            //     name: driverName, 
            //     monthly_salary: parsedMonthlySalary,
            //     salaryEffectiveDate: newDriverAssignedDate
            // });
            
            // Backend က 'id' ကို ပြန်ပေးသည်။
            const newDriverName = driverName; // ချိတ်ဆက်မှုအတွက် ယာဉ်မောင်းအမည်ကို အသုံးပြု

            // 2. ကားချိတ်ဆက်မှု အချက်အလက်များပါရှိပါက ချိတ်ဆက်ခြင်း
            if (newDriverAssignedCarNo && newDriverAssignedDate) {
                await axios.post(`${API_BASE_URL}/car-driver-assignments`, {
                    carNo: newDriverAssignedCarNo,
                    driverName: newDriverName, // အသစ်ထည့်သွင်းထားသော ယာဉ်မောင်းအမည်ကို အသုံးပြု
                    assignedDate: newDriverAssignedDate
                });
            }

            setSuccessMessage('ယာဉ်မောင်းအသစ် ထည့်သွင်းပြီးပါပြီ။');
            // Form fields များကို ရှင်းလင်းခြင်း
            setDriverName('');
            setMonthlySalary('');
            setNewDriverAssignedCarNo(''); 
            setNewDriverAssignedDate(new Date().toISOString().split('T')[0]); 

            fetchDrivers(); // ယာဉ်မောင်းစာရင်းကို ပြန်လည်ရယူခြင်း
            fetchCarAssignments(); // ကားချိတ်ဆက်မှုများကို ပြန်လည်ရယူခြင်း
            fetchCarNumbers(); // ကားနံပါတ်စာရင်းကို ပြန်လည်ရယူခြင်း (အသစ်ထည့်သွင်းထားသည်)
        } catch (err) {
            if (err.response) {
                if (err.response.status === 409) {
                    setError(`ဤယာဉ်မောင်းအမည် ရှိပြီးသားဖြစ်သည်။ အခြားအမည်တစ်ခု ထည့်ပါ။`);
                } else if (err.response.status === 400) {
                    setError(`ဒေတာထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response.data.error || 'အချက်အလက်မပြည့်စုံပါ သို့မဟုတ် မမှန်ကန်ပါ။'}`);
                } else {
                    setError(`ယာဉ်မောင်းအသစ် ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response.data.error || err.message}`);
                }
            } else {
                setError('ကွန်ရက်ချိတ်ဆက်မှု ပြဿနာ သို့မဟုတ် Server အမှားဖြစ်ပွားခဲ့ပါသည်။');
            }
            console.error('ယာဉ်မောင်းထည့်သွင်းရာတွင် အမှား:', err);
        }
    };

    // ယာဉ်မောင်းကို ပြင်ဆင်ရန် (Edit Mode သို့ ဝင်ရောက်ခြင်း)
    const handleEdit = (driver) => {
        setEditingDriverId(driver.id);
        setEditDriverName(driver.name);
        // လစာကို inline edit မလုပ်တော့သောကြောင့် setEditMonthlySalary ကို ဖယ်ရှားလိုက်ပြီ။

        // ဤယာဉ်မောင်းအတွက် လက်ရှိချိတ်ဆက်ထားသော ကားကို ရှာဖွေခြင်း
        const currentAssignment = carAssignments.find(assignment => assignment.driver_name === driver.name);
        if (currentAssignment) {
            setAssignedCarNo(currentAssignment.car_no);
            // setAssignedDriverName(currentAssignment.driver_name); 
            setAssignedDate(currentAssignment.assigned_date);
        } else {
            setAssignedCarNo('');
            // setAssignedDriverName(driver.name); 
            setAssignedDate(new Date().toISOString().split('T')[0]); // ချိတ်ဆက်မှုမရှိသေးပါက ယနေ့ရက်စွဲကို Default ထား
        }
    };

    // ပြင်ဆင်ထားသော ယာဉ်မောင်းအချက်အလက်များကို သိမ်းဆည်းခြင်း
    const handleSaveEdit = async (id) => {
        setError(null);
        setSuccessMessage(null);
        
        // Frontend validation
        if (!editDriverName.trim()) {
            setError('ယာဉ်မောင်းအမည် ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
            return;
        }
        // လစာ validation ကို သီးခြား Dialog က ကိုင်တွယ်သောကြောင့် ဖယ်ရှားလိုက်ပြီ။
        if (assignedCarNo && !assignedDate) {
             setError('ကားချိတ်ဆက်ရန် ကားနံပါတ်ရွေးချယ်ပါက ချိတ်ဆက်သည့်ရက်စွဲကိုလည်း ဖြည့်သွင်းပါ။');
             return;
        }

        try {
            // မပြင်ဆင်မီ မူရင်းယာဉ်မောင်း data ကို ရှာဖွေခြင်း
            const originalDriver = drivers.find(d => d.id === id);
            const originalAssignedCar = carAssignments.find(assign => assign.driver_name === originalDriver.name);
            const originalCarNo = originalAssignedCar ? originalAssignedCar.car_no : null;

            // 1. ယာဉ်မောင်းအမည်ကို ပြင်ဆင်ခြင်း
            await axios.put(`${API_BASE_URL}/drivers/${id}`, {
                name: editDriverName,
            });

            // 2. ကားချိတ်ဆက်မှု အပြောင်းအလဲများကို ကိုင်တွယ်ခြင်း
            if (assignedCarNo) { // ကားချိတ်ဆက်ရန် ရွေးချယ်ထားပါက (အသစ် သို့မဟုတ် ရှိပြီးသား)
                if (originalCarNo && originalCarNo !== assignedCarNo) {
                    // Case 1: ကားကို ပြောင်းလဲခြင်း (ဥပမာ: 2K-7937 မှ 6G-8202 သို့)
                    // ပထမဆုံး၊ ကားအဟောင်းအတွက် ယခင်ချိတ်ဆက်မှု၏ end_date ကို update လုပ်ခြင်း
                    try {
                        await axios.put(`${API_BASE_URL}/car-driver-assignments/end-date/${originalCarNo}`, {
                            endDate: new Date().toISOString().split('T')[0] // ယနေ့ရက်စွဲဖြင့် ပိတ်
                        });
                        console.log(`ကားအဟောင်း ${originalCarNo} အတွက် ယခင်ချိတ်ဆက်မှုကို အောင်မြင်စွာ ပိတ်လိုက်ပါပြီ။`);
                    } catch (updateErr) {
                        console.warn(`ကားအဟောင်း ${originalCarNo} အတွက် end_date update လုပ်ရာတွင် အမှား:`, updateErr);
                    }
                }
                // ထို့နောက်၊ ရွေးချယ်ထားသော ကားအတွက် ချိတ်ဆက်မှုအသစ်ကို ဖန်တီး/update လုပ်ခြင်း
                // Backend ၏ POST endpoint သည် carNo ပေါ်မူတည်၍ insert နှင့် update နှစ်ခုလုံးကို ကိုင်တွယ်သည်။
                await axios.post(`${API_BASE_URL}/car-driver-assignments`, {
                    carNo: assignedCarNo,
                    driverName: editDriverName, // ပြောင်းလဲနိုင်သည့် ယာဉ်မောင်းအမည်ကို အသုံးပြု
                    assignedDate: assignedDate
                });
            } else if (originalCarNo) {
                // Case 2: ကားချိတ်ဆက်မှု ဖြုတ်ခြင်း (assignedCarNo ကို ရှင်းလင်းလိုက်သော်လည်း မူရင်းချိတ်ဆက်မှု ရှိနေသေးသည်)
                try {
                    // လက်ရှိချိတ်ဆက်မှု၏ end_date ကို ယနေ့ရက်စွဲဖြင့် update လုပ်ခြင်း
                    await axios.put(`${API_BASE_URL}/car-driver-assignments/end-date/${originalCarNo}`, {
                        endDate: new Date().toISOString().split('T')[0] // ယနေ့ရက်စွဲဖြင့် ပိတ်
                    });
                    console.log(`ကား ${originalCarNo} ကို အောင်မြင်စွာ ချိတ်ဆက်မှု ဖြုတ်လိုက်ပါပြီ။`);
                } catch (updateErr) {
                    console.warn(`ကား ${originalCarNo} ချိတ်ဆက်မှု ဖြုတ်ရာတွင် အမှား:`, updateErr);
                }
            }
            // Case 3: မူရင်းက ကားချိတ်ဆက်မှုမရှိဘဲ အခုလည်း ကားမရွေးချယ်ပါက (ဘာမှလုပ်စရာမလို)

            setSuccessMessage('ယာဉ်မောင်း အချက်အလက်နှင့် ကားချိတ်ဆက်မှုများ ပြင်ဆင်ပြီးပါပြီ။');
            // Edit mode မှ ထွက်ခြင်းနှင့် Form fields များကို ရှင်းလင်းခြင်း
            setEditingDriverId(null);
            setEditDriverName('');
            setAssignedCarNo('');
            // setAssignedDriverName('');
            setAssignedDate(new Date().toISOString().split('T')[0]); 
            fetchDrivers(); // ယာဉ်မောင်းစာရင်းကို ပြန်လည်ရယူခြင်း
            fetchCarAssignments(); // ကားချိတ်ဆက်မှုများကို ပြန်လည်ရယူခြင်း
            fetchCarNumbers(); // ကားနံပါတ်စာရင်းကို ပြန်လည်ရယူခြင်း (အသစ်ထည့်သွင်းထားသည်)
        } catch (err) {
            if (err.response) {
                if (err.response.status === 409) {
                    setError(`ဤယာဉ်မောင်းအမည် ရှိပြီးသားဖြစ်သည်။ အခြားအမည်တစ်ခု ထည့်ပါ။`);
                } else if (err.response.status === 400) {
                    setError(`ဒေတာပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response.data.error || 'အချက်အလက်မပြည့်စုံပါ သို့မဟုတ် မမှန်ကန်ပါ။'}`);
                } else {
                    setError(`ယာဉ်မောင်း အချက်အလက်များ ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response.data.error || err.message}`);
                }
            } else {
                setError('ကွန်ရက်ချိတ်ဆက်မှု ပြဿနာ သို့မဟုတ် Server အမှားဖြစ်ပွားခဲ့ပါသည်။');
            }
            console.error('ယာဉ်မောင်းပြင်ဆင်မှု သိမ်းဆည်းရာတွင် အမှား:', err);
        }
    };

    // Edit Mode မှ ထွက်ခြင်း
    const handleCancelEdit = () => {
        setEditingDriverId(null);
        setEditDriverName('');
        setAssignedCarNo('');
        // setAssignedDriverName('');
        setAssignedDate(new Date().toISOString().split('T')[0]); 
    };

    // ယာဉ်မောင်းကို ဖျက်ရန် အတည်ပြု Dialog ဖွင့်ခြင်း
    const handleDelete = (driver) => {
        setDriverToDelete(driver);
        setDeleteConfirmOpen(true);
    };

    // ယာဉ်မောင်းကို ဖျက်ရန် အတည်ပြုခြင်း
    const handleConfirmDelete = async () => {
        setError(null);
        setSuccessMessage(null);
        try {
            await axios.delete(`${API_BASE_URL}/drivers/${driverToDelete.id}`);
            setSuccessMessage('ယာဉ်မောင်းကို ဖျက်ပစ်ပြီးပါပြီ။');
            fetchDrivers(); // ယာဉ်မောင်းစာရင်းကို ပြန်လည်ရယူခြင်း
            fetchCarAssignments(); // ကားချိတ်ဆက်မှုများကို ပြန်လည်ရယူခြင်း (backend logic အရ ချိတ်ဆက်မှုများပါ ဖျက်ပေးမည်)
            fetchCarNumbers(); // ကားနံပါတ်စာရင်းကို ပြန်လည်ရယူခြင်း (အသစ်ထည့်သွင်းထားသည်)
        } catch (err) {
            setError('ယာဉ်မောင်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။');
            console.error('ယာဉ်မောင်းဖျက်ရာတွင် အမှား:', err);
        } finally {
            setDeleteConfirmOpen(false);
            setDriverToDelete(null);
        }
    };

    // ယာဉ်မောင်းဖျက်ရန် အတည်ပြု Dialog ပိတ်ခြင်း
    const handleCloseDeleteConfirm = () => {
        setDeleteConfirmOpen(false);
        setDriverToDelete(null);
    };

    // ကားချိတ်ဆက်ရန် dropdown မှ ကားနံပါတ်ရွေးချယ်ခြင်း
    const handleAssignedCarChange = (event) => {
        setAssignedCarNo(event.target.value);
    };

    // ကားချိတ်ဆက်မှု dropdown အတွက် ရရှိနိုင်သော ကားနံပါတ်များကို စစ်ထုတ်ခြင်း
    // ယခုအခါ ကားများအားလုံးကို ပြသမည်ဖြစ်ပြီး ပြန်လည်တာဝန်ပေးအပ်ခြင်း logic ကို backend က ကိုင်တွယ်မည်။
    const availableCarNumbers = useMemo(() => {
        const combinedCarNumbers = new Set([...carNumbersData.map(car => car.number), ...carNumbers]);
        return Array.from(combinedCarNumbers).sort();
    }, [carNumbers]);


    // လစာမှတ်တမ်း Dialog Function များ
    // လစာအသစ်ထည့်ရန် Dialog ဖွင့်ခြင်း
    const handleOpenNewSalaryDialog = (driver) => {
        setSelectedDriverForNewSalary(driver);
        // လက်ရှိလစာဖြင့် pre-fill လုပ်ခြင်း၊ null/undefined ကို ကိုင်တွယ်ခြင်း
        setNewSalaryAmount(driver.monthly_salary !== null && driver.monthly_salary !== undefined 
            ? driver.monthly_salary.toString() 
            : '');
        setNewSalaryEffectiveDate(new Date().toISOString().split('T')[0]); // Default အနေဖြင့် ယနေ့ရက်စွဲ
        setOpenNewSalaryDialog(true);
    };

    // လစာအသစ်ထည့်ရန် Dialog ပိတ်ခြင်း
    const handleCloseNewSalaryDialog = () => {
        setOpenNewSalaryDialog(false);
        setSelectedDriverForNewSalary(null);
        setNewSalaryAmount('');
        setNewSalaryEffectiveDate(new Date().toISOString().split('T')[0]);
    };

    // လစာမှတ်တမ်းအသစ်ကို ထည့်သွင်းခြင်း
    const handleAddNewSalary = async () => {
        setError(null); 
        setSuccessMessage(null); 

        if (!selectedDriverForNewSalary || newSalaryAmount === '' || !newSalaryEffectiveDate) {
            setError('လစာအသစ်ထည့်သွင်းရန် အချက်အလက်များ ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
            return;
        }
        
        const parsedNewSalaryAmount = parseFloat(newSalaryAmount);
        if (isNaN(parsedNewSalaryAmount) || parsedNewSalaryAmount < 0) {
            setError('လစာပမာဏကို မှန်ကန်သော ဂဏန်းဖြင့် ဖြည့်သွင်းပါ။ (အနုတ်ဂဏန်း မဖြစ်ရပါ)');
            return;
        }

        try {
            console.log(`New Salary Effective Date: ${newSalaryEffectiveDate}`);
            console.log(` Type of New Salary Effective Date: ${typeof newSalaryEffectiveDate}`);

            await axios.post(`${API_BASE_URL}/driver-salary-history`, {
                driverId: selectedDriverForNewSalary.id,
                salaryAmount: parsedNewSalaryAmount, // parsed value ကို အသုံးပြု
                effectiveStartDate: newSalaryEffectiveDate
            });
            setSuccessMessage('လစာအသစ် မှတ်တမ်းတင်ခြင်း အောင်မြင်ပါသည်။');
            handleCloseNewSalaryDialog();
            fetchDrivers(); // လက်ရှိလစာ update ဖြစ်စေရန် ယာဉ်မောင်းများကို ပြန်လည်ရယူခြင်း
            fetchDriverSalaryHistory(selectedDriverForNewSalary.id); // လစာမှတ်တမ်းကို ပြန်လည်ရယူခြင်း
        } catch (err) {
            if (err.response) {
                if (err.response.status === 409) {
                    setError(`လစာမှတ်တမ်း ရှိပြီးသားဖြစ်သည်။: ${err.response.data.error || 'ဤရက်စွဲတွင် လစာမှတ်တမ်း ရှိပြီးသားဖြစ်ပါသည်။'}`);
                } else if (err.response.status === 400) {
                    setError(`လစာအသစ် မှတ်တမ်းတင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response.data.error || 'အချက်အလက်မပြည့်စုံပါ သို့မဟုတ် မမှန်ကန်ပါ။'}`);
                } else {
                    setError(`လစာအသစ် မှတ်တမ်းတင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response.data.error || err.message}`);
                }
            } else {
                setError('ကွန်ရက်ချိတ်ဆက်မှု ပြဿနာ သို့မဟုတ် Server အမှားဖြစ်ပွားခဲ့ပါသည်။');
            }
            console.error('လစာမှတ်တမ်းအသစ်ထည့်ရာတွင် အမှား:', err);
        }
    };


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
                    sx={{ mr: 1, textTransform: 'none' }}
                >
                    ယာဉ်မောင်းအသစ်ထည့်ရန်
                </Button>
                <Button
                    variant={activeTab === 'assignmentHistory' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('assignmentHistory')}
                    sx={{ mr: 1, textTransform: 'none' }}
                >
                    ကား တာဝန်ပေးအပ်မှု မှတ်တမ်း
                </Button>
                <Button
                    variant={activeTab === 'salaryHistory' ? 'contained' : 'text'}
                    onClick={() => setActiveTab('salaryHistory')}
                    sx={{ mr: 1, textTransform: 'none' }}
                >
                    လစာအပြောင်းအလဲ မှတ်တမ်း
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
                                <TableRow sx={{ backgroundColor: '#8c55ff' }}>
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
                                        <TableCell sx={{ fontWeight: 'bold' }}>ကားနံပါတ်</TableCell> 
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
                                                    {/* လက်ရှိလစာကို ပြသခြင်း */}
                                                    {(driver.monthly_salary || 0).toLocaleString()} MMK
                                                    {/* လစာပြောင်းလဲရန် သီးခြား Dialog ကို ဖွင့်ပေးမည့် Button */}
                                                    <Button
                                                        onClick={() => handleOpenNewSalaryDialog(driver)}
                                                        size="small"
                                                        sx={{ ml: 1, textTransform: 'none' }}
                                                        startIcon={<HistoryIcon />}
                                                    >
                                                        လစာပြောင်း
                                                    </Button>
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

            {/* Tab Content - ယာဉ်မောင်းအသစ်ထည့်ရန် */}
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
                            type="text" // ငွေကြေးပုံစံအတွက် text အဖြစ်ပြောင်းလဲ
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

            {/* Tab Content - ကား တာဝန်ပေးအပ်မှု မှတ်တမ်း (အသစ်ပြောင်းလဲထားသည်) */}
            {activeTab === 'assignmentHistory' && (
                <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
                    <Typography variant="h5" gutterBottom>
                        ကား တာဝန်ပေးအပ်မှု မှတ်တမ်း
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <FormControl fullWidth>
                            <InputLabel>ကားနံပါတ် ရွေးချယ်ပါ</InputLabel>
                            <Select
                                value={selectedCarForAssignmentHistory}
                                label="ကားနံပါတ် ရွေးချယ်ပါ"
                                onChange={(e) => setSelectedCarForAssignmentHistory(e.target.value)}
                            >
                                {availableCarNumbers.map((carNo) => (
                                    <MenuItem key={carNo} value={carNo}>{carNo}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {selectedCarForAssignmentHistory && (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#8c55ff' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>ယာဉ်မောင်းအမည်</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>တာဝန်စတင်ရက်</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>တာဝန်ပြီးဆုံးရက်</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>အခြေအနေ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {carAssignmentHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                ဤကားအတွက် တာဝန်ပေးအပ်မှု မှတ်တမ်းများ မရှိသေးပါ။
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        carAssignmentHistory.map((assignment) => (
                                            <TableRow key={assignment.id}>
                                                <TableCell>{assignment.driver_name}</TableCell>
                                                <TableCell>{assignment.assigned_date}</TableCell>
                                                <TableCell>{assignment.end_date || 'လက်ရှိ'}</TableCell>
                                                <TableCell>{assignment.end_date ? 'ပြီးဆုံး' : 'လက်ရှိ တာဝန်ယူဆဲ'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Tab Content - လစာအပြောင်းအလဲ မှတ်တမ်း */}
            {activeTab === 'salaryHistory' && (
                <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
                    <Typography variant="h5" gutterBottom>
                        လစာအပြောင်းအလဲ မှတ်တမ်း
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <FormControl fullWidth>
                            <InputLabel>ယာဉ်မောင်း ရွေးချယ်ပါ</InputLabel>
                            <Select
                                value={selectedDriverForSalaryHistory}
                                label="ယာဉ်မောင်း ရွေးချယ်ပါ"
                                onChange={(e) => setSelectedDriverForSalaryHistory(e.target.value)}
                            >
                                {drivers.map((driver) => (
                                    <MenuItem key={driver.id} value={driver.id}>{driver.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {selectedDriverForSalaryHistory && (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#8c55ff' }}>
                                        <TableCell sx={{ fontWeight: 'bold' }}>လစာပမာဏ</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>စတင်သက်ရောက်သည့်ရက်</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>သက်တမ်းကုန်ဆုံးသည့်ရက်</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>အခြေအနေ</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {driverSalaryHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center">
                                                ဤယာဉ်မောင်းအတွက် လစာမှတ်တမ်းများ မရှိသေးပါ။
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        driverSalaryHistory.map((salaryRecord) => (
                                            <TableRow key={salaryRecord.id}>
                                                <TableCell>{salaryRecord.salary_amount.toLocaleString()} MMK</TableCell>
                                                <TableCell>{salaryRecord.effective_start_date}</TableCell>
                                                <TableCell>{salaryRecord.effective_end_date || 'လက်ရှိ'}</TableCell>
                                                <TableCell>{salaryRecord.effective_end_date ? 'ပြီးဆုံး' : 'လက်ရှိ သက်ရောက်ဆဲ'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}


            {/* ယာဉ်မောင်း ဖျက်သိမ်းရန် အတည်ပြု Dialog */}
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

            {/* လစာအသစ်ထည့်ရန် Dialog */}
            <Dialog open={openNewSalaryDialog} onClose={handleCloseNewSalaryDialog}>
                <DialogTitle>လစာအသစ် ထည့်သွင်းရန်</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        ယာဉ်မောင်း **{selectedDriverForNewSalary?.name}** အတွက် လစာအပြောင်းအလဲ မှတ်တမ်းတင်မည်။
                    </DialogContentText>
                    <TextField
                        margin="dense"
                        label="လစာပမာဏ"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newSalaryAmount}
                        onChange={(e) => {
                            const rawValue = e.target.value.replace(/,/g, '');
                            if (!isNaN(rawValue) || rawValue === '') {
                                setNewSalaryAmount(rawValue);
                            }
                        }}
                        InputProps={{
                            endAdornment: (
                                <Typography variant="body2" color="textSecondary">
                                    {newSalaryAmount && !isNaN(parseFloat(newSalaryAmount)) ? formatMMK(parseFloat(newSalaryAmount)) : ''}
                                </Typography>
                            ),
                        }}
                    />
                    <TextField
                        margin="dense"
                        label="စတင်သက်ရောက်သည့်ရက်"
                        type="date"
                        fullWidth
                        variant="outlined"
                        value={newSalaryEffectiveDate}
                        onChange={(e) => setNewSalaryEffectiveDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNewSalaryDialog} color="secondary">
                        မလုပ်တော့ပါ
                    </Button>
                    <Button onClick={handleAddNewSalary} color="primary" variant="contained">
                        သိမ်းဆည်းမည်
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default DriverManagementPage;
