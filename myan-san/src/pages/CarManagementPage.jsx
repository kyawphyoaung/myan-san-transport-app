// myan-san/src/pages/CarManagementPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { formatMMK } from '../utils/currencyFormatter';
import carNumbersData from '../data/carNumbers.json'; // carNumbers.json ကို import လုပ်ပါ။
import {
  IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  TextField, Select, MenuItem, FormControl, InputLabel, Collapse, Button, Box
} from '@mui/material';
import {
  Edit as EditIcon, Delete as DeleteIcon,
  FilterList as FilterListIcon, Sort as SortIcon,
  ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon,
  ArrowUpward as ArrowUpwardIcon, ArrowDownward as ArrowDownwardIcon,
  Search as SearchIcon, // Import SearchIcon (will be replaced by ResetIcon conceptually)
  Refresh as RefreshIcon // Import RefreshIcon for Reset button
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useApp } from '../components/AppProvider';
import { useTheme } from '@emotion/react';

function CarManagementPage() {
  const { mode } = useApp();
  const API_BASE_URL = 'http://localhost:5001';

  const [uniqueCarNumbers, setUniqueCarNumbers] = useState([]);
  const [selectedCarNo, setSelectedCarNo] = useState('');
  const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance', 'fuel', 'general'

  // Filter and Sort states
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [filterMonth, setFilterMonth] = useState(''); // Default to empty string for "All Months"
  const [filterYear, setFilterYear] = useState(new Date().getFullYear()); // Current year
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [filterTrigger, setFilterTrigger] = useState(0); // State to manually trigger fetches

  // Maintenance Specific Filter States
  const [maintenanceFilterDescription, setMaintenanceFilterDescription] = useState('');
  const [maintenanceFilterOtherDescription, setMaintenanceFilterOtherDescription] = useState('');

  // General Expense Specific Filter States
  const [generalExpenseFilterDescription, setGeneralExpenseFilterDescription] = useState('');
  const [generalExpenseFilterOtherDescription, setGeneralExpenseFilterOtherDescription] = useState('');


  // Car Maintenance Log အတွက် state များ
  const [maintenanceData, setMaintenanceData] = useState({
    carNo: '',
    maintenanceDate: '',
    description: '',
    otherDescription: '',
    cost: '',
  });

  const [carMaintenanceRecords, setCarMaintenanceRecords] = useState([]);
  const [openMaintenanceEditDialog, setOpenMaintenanceEditDialog] = useState(false);
  const [editMaintenanceFormData, setEditMaintenanceFormData] = useState(null);
  const [openMaintenanceDeleteConfirm, setOpenMaintenanceDeleteConfirm] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState(null);

  // Fuel Log အတွက် state များ
  const [fuelLogData, setFuelLogData] = useState({
    carNo: '',
    logDate: '', // Keep logDate for date input
    logTime: new Date().toTimeString().split(' ')[0].substring(0, 5), // Add logTime for time input
    fuelAmount: '',
    fuelCost: '',
    remarks: '',
  });
  const [fuelLogs, setFuelLogs] = useState([]);
  const [openFuelLogEditDialog, setOpenFuelLogEditDialog] = useState(false);
  const [editFuelLogFormData, setEditFuelLogFormData] = useState(null);
  const [openFuelLogDeleteConfirm, setOpenFuelLogDeleteConfirm] = useState(false);
  const [fuelLogToDelete, setFuelLogToDelete] = useState(null);


  // General Expense Log အတွက် state များ
  const [generalExpenseData, setGeneralExpenseData] = useState({
    carNo: '',
    expenseDate: '',
    description: '',
    otherDescription: '', // For "Other" option in description
    cost: '',
    remarks: '',
  });
  const [generalExpenses, setGeneralExpenses] = useState([]);
  const [openGeneralExpenseEditDialog, setOpenGeneralExpenseEditDialog] = useState(false);
  const [editGeneralExpenseFormData, setEditGeneralExpenseFormData] = useState(null);
  const [openGeneralExpenseDeleteConfirm, setOpenGeneralExpenseDeleteConfirm] = useState(false);
  const [generalExpenseToDelete, setGeneralExpenseToDelete] = useState(null);


  // General Expense Description Options
  const generalExpenseDescriptions = [
    'ယဥ်ရပ်နားခ',
    'ကျွတ်ဖာ',
    'ယဥ်မောင်းထမင်းဖိုး',
    'အိမ်စာရိတ်ဖိုး',
    'လိုင်စင်',
    'အခြား (Other)'
  ];

  const [maintenanceDescriptions, setMaintenanceDescriptions] = useState([]); // ကနဦးမှာ အလွတ်ထား

  useEffect(() => {
    // ဒီနေရာမှာ API ကနေ data တွေ fetch လုပ်မယ့် code ရေးပါ
    // ဥပမာ:
    const fetchedDescriptions = [
      'တာယာလဲလှယ်ခြင်း',
      'ဘက်ထရီအိုးလဲလှယ်ခြင်း',
      'အင်ဂျင်ဝိုင်လဲလှယ်ခြင်း',
      'ဂီယာဘောက်စ် ပြုပြင်ခြင်း',
      'ဘရိတ်စနစ် ပြုပြင်ခြင်း',
      'ဘရိတ်ဆီဖြည့်ခြင်း',
      'ဘရိတ်ဆီလဲလှယ်ခြင်း',
      'လေအိတ်လဲလှယ်ခြင်း',
      'ဝါယာရိန်းနှင့် အာရုံခံကိရိယာများ ပြုပြင်ခြင်း',
      'ကိုယ်ထည် ပြုပြင်ခြင်း/ဆေးမှုတ်ခြင်း',
      'အခြား (Other)'
    ];
    setMaintenanceDescriptions(fetchedDescriptions);
  }, []);

  // Months array for filter dropdown
  const months = [
    { value: '', label: 'လ အားလုံး' }, // Added "All Months" option
    { value: 1, label: 'ဇန်နဝါရီ' }, { value: 2, label: 'ဖေဖော်ဝါရီ' },
    { value: 3, label: 'မတ်' }, { value: 4, label: 'ဧပြီ' },
    { value: 5, label: 'မေ' }, { value: 6, label: 'ဇွန်' },
    { value: 7, label: 'ဇူလိုင်' }, { value: 8, label: 'ဩဂုတ်' },
    { value: 9, label: 'စက်တင်ဘာ' }, { value: 10, label: 'အောက်တိုဘာ' },
    { value: 11, label: 'နိုဝင်ဘာ' }, { value: 12, label: 'ဒီဇင်ဘာ' },
  ];

  // Years for filter dropdown (e.g., current year - 5 to current year + 1)
  const currentYear = new Date().getFullYear();
  const years = [''].concat(Array.from({ length: 7 }, (_, i) => currentYear - 5 + i)); // Added "All Years" option


  // Unique Car Numbers များကို Backend မှ fetch လုပ်ခြင်းနှင့် carNumbersData ဖြင့် ပေါင်းစပ်ခြင်း
  useEffect(() => {
    const fetchAndCombineCarNumbers = async () => {
      const allCarNumbersSet = new Set();

      // Step 1: Add car numbers from static carNumbersData.json
      carNumbersData.forEach(car => allCarNumbersSet.add(car.number));

      // Step 2: Fetch unique car numbers from backend (from trips, maintenance, fuel_logs, assignments, general_expenses)
      try {
        const response = await fetch(`${API_BASE_URL}/api/unique-car-numbers`);
        const data = await response.json();
        if (data.message === "success") {
          data.data.forEach(car => allCarNumbersSet.add(car));
        } else {
          console.error("Failed to fetch unique car numbers from backend:", data.error);
        }
      } catch (error) {
        console.error("Error fetching unique car numbers from backend:", error);
      }

      const sortedCarNumbers = Array.from(allCarNumbersSet).sort();
      setUniqueCarNumbers(sortedCarNumbers);

      // Set default selected car number if not already set
      if (sortedCarNumbers.length > 0 && !selectedCarNo) {
        setSelectedCarNo(sortedCarNumbers[0]);
        setMaintenanceData(prev => ({ ...prev, carNo: sortedCarNumbers[0] }));
        setFuelLogData(prev => ({ ...prev, carNo: sortedCarNumbers[0] }));
        setGeneralExpenseData(prev => ({ ...prev, carNo: sortedCarNumbers[0] }));
      }

      // Set default date for new entries
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
      setMaintenanceData(prev => ({ ...prev, maintenanceDate: today }));
      setFuelLogData(prev => ({ ...prev, logDate: today, logTime: currentTime })); // Set current time for fuel log
      setGeneralExpenseData(prev => ({ ...prev, expenseDate: today }));
    };

    fetchAndCombineCarNumbers();
  }, []); // Run once on component mount

  // Selected Car No, Filter, and Sort options ပြောင်းလဲသောအခါ သက်ဆိုင်ရာ records များကို fetch လုပ်ခြင်း
  // This useEffect will now be triggered by filterTrigger or selectedCarNo/activeTab changes
  useEffect(() => {
    if (selectedCarNo) {
      // Determine filter description based on active tab
      let currentFilterDescription = '';
      let currentFilterOtherDescription = '';

      if (activeTab === 'maintenance') {
        currentFilterDescription = maintenanceFilterDescription;
        currentFilterOtherDescription = maintenanceFilterOtherDescription;
      } else if (activeTab === 'general') {
        currentFilterDescription = generalExpenseFilterDescription;
        currentFilterOtherDescription = generalExpenseFilterOtherDescription;
      }

      fetchCarMaintenanceRecords(selectedCarNo, filterYear, filterMonth, sortColumn, sortDirection, currentFilterDescription, currentFilterOtherDescription);
      fetchFuelLogs(selectedCarNo, filterYear, filterMonth, sortColumn, sortDirection); // Fuel logs don't have description filter
      fetchGeneralExpenses(selectedCarNo, filterYear, filterMonth, sortColumn, sortDirection, currentFilterDescription, currentFilterOtherDescription);
    }
  }, [selectedCarNo, activeTab, filterTrigger, filterYear, filterMonth, sortColumn, sortDirection, maintenanceFilterDescription, maintenanceFilterOtherDescription, generalExpenseFilterDescription, generalExpenseFilterOtherDescription]); // Added filter and sort dependencies and filterTrigger

  // Car Maintenance Records များကို fetch လုပ်ခြင်း
  const fetchCarMaintenanceRecords = async (carNo, year, month, sortCol, sortDir, descriptionFilter, otherDescriptionFilter) => {
    try {
      let queryParams = new URLSearchParams();
      if (year) queryParams.append('year', year);
      if (month) queryParams.append('month', month); // Only append if a specific month is selected
      if (descriptionFilter) {
        queryParams.append('description', descriptionFilter);
      }
      if (otherDescriptionFilter) {
        queryParams.append('otherDescription', otherDescriptionFilter);
      }

      const response = await fetch(`${API_BASE_URL}/api/car-maintenance/${carNo}?${queryParams.toString()}`);
      const data = await response.json();
      if (data.message === "success") {
        let sortedData = [...data.data];
        if (sortCol) {
          sortedData.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];

            // Handle numeric sorting for cost
            if (sortCol === 'cost') {
              valA = parseFloat(valA);
              valB = parseFloat(valB);
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
        }
        setCarMaintenanceRecords(sortedData);
        console.log(`Fetched Maintenance Records for ${carNo}:`, sortedData);
      } else {
        console.error(`Failed to fetch maintenance records for ${carNo}:`, data.error);
      }
    } catch (error) {
      console.error(`Error fetching maintenance records for ${carNo}:`, error);
    }
  };

  // Fuel Logs များကို fetch လုပ်ခြင်း
  const fetchFuelLogs = async (carNo, year, month, sortCol, sortDir) => {
    try {
      let queryParams = new URLSearchParams();
      if (year) queryParams.append('year', year);
      if (month) queryParams.append('month', month); // Only append if a specific month is selected
      // No description filter for fuel logs
      const response = await fetch(`${API_BASE_URL}/api/fuel-logs/${carNo}?${queryParams.toString()}`);
      const data = await response.json();
      if (data.message === "success") {
        let sortedData = [...data.data];
        if (sortCol) {
          sortedData.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];

            // Handle numeric sorting for fuel_amount and fuel_cost
            if (sortCol === 'fuel_amount' || sortCol === 'fuel_cost') {
              valA = parseFloat(valA);
              valB = parseFloat(valB);
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
        }
        setFuelLogs(sortedData);
        console.log(`Fetched Fuel Logs for ${carNo}:`, sortedData);
      } else {
        console.error(`Failed to fetch fuel logs for ${carNo}:`, data.error);
      }
    } catch (error) {
      console.error(`Error fetching fuel logs for ${carNo}:`, error);
    }
  };

  // General Expenses များကို fetch လုပ်ခြင်း
  const fetchGeneralExpenses = async (carNo, year, month, sortCol, sortDir, descriptionFilter, otherDescriptionFilter) => {
    try {
      let queryParams = new URLSearchParams();
      if (year) queryParams.append('year', year);
      if (month) queryParams.append('month', month); // Only append if a specific month is selected
      if (descriptionFilter) {
        queryParams.append('description', descriptionFilter);
      }
      if (otherDescriptionFilter) {
        queryParams.append('otherDescription', otherDescriptionFilter);
      }
      const response = await fetch(`${API_BASE_URL}/api/general-expenses/${carNo}?${queryParams.toString()}`);
      const data = await response.json();
      if (data.message === "success") {
        let sortedData = [...data.data];
        if (sortCol) {
          sortedData.sort((a, b) => {
            let valA = a[sortCol];
            let valB = b[sortCol];

            // Handle numeric sorting for cost
            if (sortCol === 'cost') {
              valA = parseFloat(valA);
              valB = parseFloat(valB);
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
          });
        }
        setGeneralExpenses(sortedData);
        console.log(`Fetched General Expenses for ${carNo}:`, sortedData);
      } else {
        console.error(`Failed to fetch general expenses for ${carNo}:`, data.error);
      }
    } catch (error) {
      console.error(`Error fetching general expenses for ${carNo}:`, error);
    }
  };

  // Car No Dropdown အတွက် Handle Change
  const handleCarNoChange = (e) => {
    const car = e.target.value;
    setSelectedCarNo(car);
    setMaintenanceData(prev => ({ ...prev, carNo: car }));
    setFuelLogData(prev => ({ ...prev, carNo: car }));
    setGeneralExpenseData(prev => ({ ...prev, carNo: car }));
    setFilterTrigger(prev => prev + 1); // Trigger re-fetch
  };

  // Maintenance Form Input Change
  const handleMaintenanceChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue = (name === 'cost') ? value.replace(/,/g, '') : value;

    if (name === "description" && cleanedValue === "အခြား (Other)") {
      setMaintenanceData(prev => ({ ...prev, description: cleanedValue, otherDescription: '' }));
    } else if (name === "otherDescription") {
      setMaintenanceData(prev => ({ ...prev, otherDescription: cleanedValue }));
    } else {
      setMaintenanceData(prev => ({ ...prev, [name]: cleanedValue }));
    }
  };

  // Fuel Log Form Input Change - Now handles both logDate and logTime
  const handleFuelLogChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue = (name === 'fuelAmount' || name === 'fuelCost') ? value.replace(/,/g, '') : value;
    setFuelLogData(prev => ({ ...prev, [name]: cleanedValue }));
  };

  // General Expense Form Input Change
  const handleGeneralExpenseChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue = (name === 'cost') ? value.replace(/,/g, '') : value;

    if (name === "description" && value === "အခြား (Other)") {
      setGeneralExpenseData(prev => ({ ...prev, description: value, otherDescription: '' }));
    } else if (name === "otherDescription") {
      setGeneralExpenseData(prev => ({ ...prev, otherDescription: cleanedValue }));
    } else {
      setGeneralExpenseData(prev => ({ ...prev, [name]: cleanedValue }));
    }
  };

  // Filter description change handlers
  const handleMaintenanceFilterDescriptionChange = (e) => {
    setMaintenanceFilterDescription(e.target.value);
    if (e.target.value !== "အခြား (Other)") {
      setMaintenanceFilterOtherDescription('');
    }
  };

  const handleGeneralExpenseFilterDescriptionChange = (e) => {
    setGeneralExpenseFilterDescription(e.target.value);
    if (e.target.value !== "အခြား (Other)") {
      setGeneralExpenseFilterOtherDescription('');
    }
  };

  // Handle Reset Filter button click
  const handleResetFilter = () => {
    setFilterMonth(''); // Reset to "All Months"
    setFilterYear(new Date().getFullYear()); // Reset to current year
    setMaintenanceFilterDescription(''); // Reset to "All"
    setMaintenanceFilterOtherDescription(''); // Clear other description
    setGeneralExpenseFilterDescription(''); // Reset to "All"
    setGeneralExpenseFilterOtherDescription(''); // Clear other description
    setFilterTrigger(prev => prev + 1); // Trigger re-fetch
  };

  // Add Maintenance Record
  const handleAddMaintenance = async () => {
    let finalDescription = maintenanceData.description;
    if (maintenanceData.description === "အခြား (Other)") {
      finalDescription = maintenanceData.otherDescription;
    }

    if (!maintenanceData.carNo || !maintenanceData.maintenanceDate || !finalDescription || !maintenanceData.cost) {
      alert('ကျေးဇူးပြု၍ ထိန်းသိမ်းစောင့်ရှောက်မှု အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/car-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: maintenanceData.carNo,
          maintenanceDate: maintenanceData.maintenanceDate,
          description: finalDescription,
          cost: parseFloat(maintenanceData.cost), // Ensure cost is a number
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
        handleResetFilter(); // Refresh records with default filters after adding
        setMaintenanceData({ // Clear form
          carNo: selectedCarNo, // Keep selected car
          maintenanceDate: new Date().toISOString().split('T')[0], // Reset to today's date
          description: '',
          otherDescription: '',
          cost: '',
        });
      } else {
        alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ထည့်သွင်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  // Add Fuel Log - Now sends logDate and logTime separately
  const handleAddFuelLog = async () => {
    if (!fuelLogData.carNo || !fuelLogData.logDate || !fuelLogData.logTime || !fuelLogData.fuelAmount || !fuelLogData.fuelCost) {
      alert('ကျေးဇူးပြု၍ ဆီသုံးစွဲမှု အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/fuel-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: fuelLogData.carNo,
          logDate: fuelLogData.logDate, // Send logDate
          logTime: fuelLogData.logTime, // Send logTime
          fuelAmount: parseFloat(fuelLogData.fuelAmount), // Ensure fuelAmount is a number
          fuelCost: parseFloat(fuelLogData.fuelCost), // Ensure fuelCost is a number
          remarks: fuelLogData.remarks,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('ဆီသုံးစွဲမှု မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
        handleResetFilter(); // Refresh logs with default filters after adding
        setFuelLogData({ // Clear form
          carNo: selectedCarNo, // Keep selected car
          logDate: new Date().toISOString().split('T')[0], // Reset to today's date
          logTime: new Date().toTimeString().split(' ')[0].substring(0, 5), // Reset to current time
          fuelAmount: '',
          fuelCost: '',
          remarks: '',
        });
      } else {
        alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding fuel log:", error);
      alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ထည့်သွင်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  // Add General Expense
  const handleAddGeneralExpense = async () => {
    let finalDescription = generalExpenseData.description;
    if (generalExpenseData.description === "အခြား (Other)") {
      finalDescription = generalExpenseData.otherDescription;
    }

    if (!generalExpenseData.carNo || !generalExpenseData.expenseDate || !finalDescription || !generalExpenseData.cost) {
      alert('ကျေးဇူးပြု၍ အထွေထွေအသုံးစာရိတ် အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/general-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: generalExpenseData.carNo,
          expenseDate: generalExpenseData.expenseDate,
          description: finalDescription,
          cost: parseFloat(generalExpenseData.cost), // Ensure cost is a number
          remarks: generalExpenseData.remarks,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('အထွေထွေအသုံးစာရိတ် မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
        handleResetFilter(); // Refresh logs with default filters after adding
        setGeneralExpenseData({ // Clear form
          carNo: selectedCarNo, // Keep selected car
          expenseDate: new Date().toISOString().split('T')[0], // Reset to today's date
          description: '',
          otherDescription: '',
          cost: '',
          remarks: '',
        });
      } else {
        alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding general expense:", error);
      alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ထည့်သွင်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };


  // --- Edit/Delete Functions for Maintenance Records ---

  const handleEditMaintenanceClick = (record) => {
    setEditMaintenanceFormData({ ...record });
    setOpenMaintenanceEditDialog(true);
  };

  const handleSaveMaintenanceEdit = async () => {
    let finalDescription = editMaintenanceFormData.description;
    if (editMaintenanceFormData.description === "အခြား (Other)") {
      finalDescription = editMaintenanceFormData.other_description; // Use other_description for saving
    }

    if (!editMaintenanceFormData.car_no || !editMaintenanceFormData.maintenance_date || !finalDescription || !editMaintenanceFormData.cost) {
      alert('ကျေးဇူးပြု၍ ထိန်းသိမ်းစောင့်ရှောက်မှု အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/car-maintenance/${editMaintenanceFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: editMaintenanceFormData.car_no,
          maintenanceDate: editMaintenanceFormData.maintenance_date,
          description: finalDescription, // Send final description
          cost: parseFloat(editMaintenanceFormData.cost),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။');
        setOpenMaintenanceEditDialog(false);
        handleResetFilter(); // Refresh records with default filters after editing
      } else {
        alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating maintenance record:", error);
      alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ပြင်ဆင်ရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  const handleCancelMaintenanceEdit = () => {
    setOpenMaintenanceEditDialog(false);
    setEditMaintenanceFormData(null);
  };

  const handleDeleteMaintenanceClick = (record) => {
    setMaintenanceToDelete(record);
    setOpenMaintenanceDeleteConfirm(true);
  };

  const handleConfirmMaintenanceDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/car-maintenance/${maintenanceToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        alert('ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း အောင်မြင်စွာ ဖျက်သိမ်းပြီးပါပြီ။');
        setOpenMaintenanceDeleteConfirm(false);
        setMaintenanceToDelete(null);
        handleResetFilter(); // Refresh records with default filters after deleting
      } else {
        alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ဖျက်သိမ်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting maintenance record:", error);
      alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ဖျက်သိမ်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  const handleCloseMaintenanceDeleteConfirm = () => {
    setOpenMaintenanceDeleteConfirm(false);
    setMaintenanceToDelete(null);
  };

  // --- Edit/Delete Functions for Fuel Logs ---

  const handleEditFuelLogClick = (log) => {
    // Split log_datetime into date and time for the edit form
    const [logDate, logTime] = log.log_datetime.split(' ');
    setEditFuelLogFormData({ ...log, logDate, logTime: logTime.substring(0, 5) }); // HH:MM
    setOpenFuelLogEditDialog(true);
  };

  const handleSaveFuelLogEdit = async () => {
    if (!editFuelLogFormData.car_no || !editFuelLogFormData.logDate || !editFuelLogFormData.logTime || !editFuelLogFormData.fuel_amount || !editFuelLogFormData.fuel_cost) {
      alert('ကျေးဇူးပြု၍ ဆီသုံးစွဲမှု အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/fuel-logs/${editFuelLogFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: editFuelLogFormData.car_no,
          logDate: editFuelLogFormData.logDate,
          logTime: editFuelLogFormData.logTime,
          fuelAmount: parseFloat(editFuelLogFormData.fuel_amount),
          fuelCost: parseFloat(editFuelLogFormData.fuel_cost),
          remarks: editFuelLogFormData.remarks,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('ဆီသုံးစွဲမှု မှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။');
        setOpenFuelLogEditDialog(false);
        handleResetFilter(); // Refresh logs with default filters after editing
      } else {
        alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating fuel log:", error);
      alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ပြင်ဆင်ရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  const handleCancelFuelLogEdit = () => {
    setOpenFuelLogEditDialog(false);
    setEditFuelLogFormData(null);
  };

  const handleDeleteFuelLogClick = (log) => {
    setFuelLogToDelete(log);
    setOpenFuelLogDeleteConfirm(true);
  };

  const handleConfirmFuelLogDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fuel-logs/${fuelLogToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        alert('ဆီသုံးစွဲမှု မှတ်တမ်း အောင်မြင်စွာ ဖျက်သိမ်းပြီးပါပြီ။');
        setOpenFuelLogDeleteConfirm(false);
        setFuelLogToDelete(null);
        handleResetFilter(); // Refresh logs with default filters after deleting
      } else {
        alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ဖျက်သိမ်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting fuel log:", error);
      alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ဖျက်သိမ်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  const handleCloseFuelLogDeleteConfirm = () => {
    setOpenFuelLogDeleteConfirm(false);
    setFuelLogToDelete(null);
  };

  // --- Edit/Delete Functions for General Expenses ---

  const handleEditGeneralExpenseClick = (expense) => {
    setEditGeneralExpenseFormData({ ...expense });
    setOpenGeneralExpenseEditDialog(true);
  };

  const handleSaveGeneralExpenseEdit = async () => {
    let finalDescription = editGeneralExpenseFormData.description;
    if (editGeneralExpenseFormData.description === "အခြား (Other)") {
      finalDescription = editGeneralExpenseFormData.other_description; // Use other_description for saving
    }

    if (!editGeneralExpenseFormData.car_no || !editGeneralExpenseFormData.expense_date || !finalDescription || !editGeneralExpenseFormData.cost) {
      alert('ကျေးဇူးပြု၍ အထွေထွေအသုံးစာရိတ် အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/general-expenses/${editGeneralExpenseFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: editGeneralExpenseFormData.car_no,
          expenseDate: editGeneralExpenseFormData.expense_date,
          description: finalDescription, // Send final description
          cost: parseFloat(editGeneralExpenseFormData.cost),
          remarks: editGeneralExpenseFormData.remarks,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('အထွေထွေအသုံးစာရိတ် မှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။');
        setOpenGeneralExpenseEditDialog(false);
        handleResetFilter(); // Refresh logs with default filters after editing
      } else {
        alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating general expense:", error);
      alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ပြင်ဆင်ရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  const handleCancelGeneralExpenseEdit = () => {
    setOpenGeneralExpenseEditDialog(false);
    setEditGeneralExpenseFormData(null);
  };

  const handleDeleteGeneralExpenseClick = (expense) => {
    setGeneralExpenseToDelete(expense);
    setOpenGeneralExpenseDeleteConfirm(true);
  };

  const handleConfirmGeneralExpenseDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/general-expenses/${generalExpenseToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        alert('အထွေထွေအသုံးစာရိတ် မှတ်တမ်း အောင်မြင်စွာ ဖျက်သိမ်းပြီးပါပြီ။');
        setOpenGeneralExpenseDeleteConfirm(false);
        setGeneralExpenseToDelete(null);
        handleResetFilter(); // Refresh logs with default filters after deleting
      } else {
        alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ဖျက်သိမ်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting general expense:", error);
      alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ဖျက်သိမ်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  const handleCloseGeneralExpenseDeleteConfirm = () => {
    setOpenGeneralExpenseDeleteConfirm(false);
    setGeneralExpenseToDelete(null);
  };


  // Calculate Grand Total for Maintenance Costs
  const maintenanceGrandTotal = carMaintenanceRecords.reduce((sum, record) => sum + record.cost, 0);

  // Calculate Grand Total for Fuel Costs
  const fuelGrandTotal = fuelLogs.reduce((sum, log) => sum + log.fuel_cost, 0);

  // Calculate Grand Total for General Expenses
  const generalExpenseGrandTotal = generalExpenses.reduce((sum, expense) => sum + expense.cost, 0);

  // Handle sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <>
      <Box
        sx={{
          bgcolor: 'background.paper',  // bg-white ကိုအစားထိုးပါ
          boxShadow: 3,                 // shadow-md ကိုအစားထိုးပါ
          borderRadius: 2,              // rounded-lg ကိုအစားထိုးပါ (MUI spacing scale)
          p: 3,                         // p-6 ကိုအစားထိုးပါ (MUI spacing scale)
        }}
      >
        <h1 className="text-3xl font-bold text-center text-[#a514eb] mb-6">
          ကားစီမံခန့်ခွဲမှု (Car Management)
        </h1>

        {/* Car Selection - Made more prominent */}
        <div className="mb-8 flex justify-center">
          <div className="w-full md:w-2/3 lg:w-1/2">
            <label htmlFor="selectCarNo" className="block text-xl font-bold mb-3 text-center">
              ကားနံပါတ် ရွေးချယ်ပါ
            </label>
            <select
              id="selectCarNo"
              name="selectCarNo"
              value={selectedCarNo}
              onChange={handleCarNoChange}
              className={`mt-1 block w-full rounded-lg border-2 border-blue-400 shadow-lg focus:border-blue-600 focus:ring-blue-600 text-lg p-3 text-center ${mode === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                }`}
            >
              <option value="">ကားနံပါတ် ရွေးပါ</option>
              {uniqueCarNumbers.map((car, index) => (
                <option key={index} value={car}>
                  {car}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCarNo && (
          <>
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 text-lg font-medium ${activeTab === 'maintenance' ? 'border-b-2 border-my-purple-500 text-my-purple-500' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('maintenance')}
              >
                ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း
              </button>
              <button
                className={`py-2 px-4 text-lg font-medium ${activeTab === 'fuel' ? 'border-b-2 border-my-purple-500 text-my-purple-500' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('fuel')}
              >
                ဆီသုံးစွဲမှု မှတ်တမ်း
              </button>
              <button
                className={`py-2 px-4 text-lg font-medium ${activeTab === 'general' ? 'border-b-2 border-my-purple-500 text-my-purple-500' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('general')}
              >
                အထွေထွေအသုံးစာရိတ်
              </button>
            </div>

            {/* Filter and Sort Buttons - Moved to the left, between form and table */}
            <div className="flex justify-start space-x-4 mb-4"> {/* Changed justify-end to justify-start */}
              <Button
                variant="outlined"
                startIcon={showFilterOptions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowFilterOptions(!showFilterOptions)}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <FilterListIcon sx={{ mr: 1 }} /> စစ်ထုတ်ရန်
              </Button>
              <Button
                variant="outlined"
                startIcon={showSortOptions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setShowSortOptions(!showSortOptions)}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <SortIcon sx={{ mr: 1 }} /> စီရန်
              </Button>
            </div>

            {/* Filter Options Collapse */}
            <Collapse in={showFilterOptions}>
              <Box className="p-4 mb-4 bg-my-purple-800 rounded-lg shadow-inner flex flex-wrap gap-4 items-center">
                <FormControl variant="outlined" size="small" className="w-[150px]">
                  <InputLabel sx={{ color: 'white' }}>လ ရွေးပါ</InputLabel>
                  <Select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    label="လ ရွေးပါ"
                    sx={{ color: 'white' }}
                  >
                    {months.map((month) => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl variant="outlined" size="small" className="min-w-[120px]">
                  <InputLabel sx={{ color: 'white' }}>နှစ် ရွေးပါ</InputLabel>
                  <Select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    label="နှစ် ရွေးပါ"
                    sx={{ color: 'white' }}
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year === '' ? 'နှစ် အားလုံး' : year} {/* Display "All Years" for empty value */}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Maintenance Description Filter */}
                {activeTab === 'maintenance' && (
                  <>
                    <FormControl variant="outlined" size="small" className="w-[350px]">
                      <InputLabel sx={{ color: 'white' }}>ဖော်ပြချက် (ထိန်းသိမ်း)</InputLabel>
                      <Select
                        value={maintenanceFilterDescription}
                        onChange={handleMaintenanceFilterDescriptionChange}
                        label="ဖော်ပြချက် (ထိန်းသိမ်း)"
                        sx={{ color: 'white' }}
                      >
                        <MenuItem value="">အားလုံး</MenuItem>
                        {maintenanceDescriptions.map((desc, index) => (
                          <MenuItem key={index} value={desc}>
                            {desc}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {maintenanceFilterDescription === "အခြား (Other)" && (
                      <TextField
                        variant="outlined"
                        size="small"
                        label="အခြား ဖော်ပြချက် (ထိန်းသိမ်း)"
                        value={maintenanceFilterOtherDescription}
                        onChange={(e) => setMaintenanceFilterOtherDescription(e.target.value)}
                        className="min-w-[180px]"
                        sx={{
                          // Label ရဲ့ အရောင်ကို အဖြူရောင်ပြောင်းပါ
                          '& .MuiInputLabel-root': {
                            color: 'white',
                          },
                          // Input ထဲက စာသားရဲ့ အရောင်ကို အဖြူရောင်ပြောင်းပါ
                          '& .MuiInputBase-input': {
                            color: 'white',
                          },
                          // Outline border ရဲ့ အရောင်ကို အဖြူရောင်ပြောင်းပါ
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: 'white',
                            },
                            // focused ဖြစ်နေတဲ့အချိန်မှာ border အရောင်ပြောင်းပါ
                            '&.Mui-focused fieldset': {
                              borderColor: 'white',
                            },
                            // hover လုပ်တဲ့အခါ border အရောင်ပြောင်းပါ
                            '&:hover fieldset': {
                              borderColor: 'white',
                            },
                          },
                        }}
                      />
                    )}
                  </>
                )}

                {/* General Expense Description Filter */}
                {activeTab === 'general' && (
                  <>
                    <FormControl variant="outlined" size="small" className="w-[350px]">
                      <InputLabel sx={{ color: 'white' }}>ဖော်ပြချက် (အထွေထွေ)</InputLabel>
                      <Select
                        value={generalExpenseFilterDescription}
                        onChange={handleGeneralExpenseFilterDescriptionChange}
                        label="ဖော်ပြချက် (အထွေထွေ)"
                      >
                        <MenuItem value="">အားလုံး</MenuItem>
                        {generalExpenseDescriptions.map((desc, index) => (
                          <MenuItem key={index} value={desc}>
                            {desc}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {generalExpenseFilterDescription === "အခြား (Other)" && (
                      <TextField
                        variant="outlined"
                        size="small"
                        label="အခြား ဖော်ပြချက် (အထွေထွေ)"
                        value={generalExpenseFilterOtherDescription}
                        onChange={(e) => setGeneralExpenseFilterOtherDescription(e.target.value)}
                        className="min-w-[180px]"
                      />
                    )}
                  </>
                )}

                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />} // Changed icon to Refresh
                  onClick={handleResetFilter} // Changed function to handleResetFilter
                  className="bg-red-600 hover:bg-red-700 text-white" // Changed color to red
                >
                  ပြန်လည်သတ်မှတ်ရန်
                </Button>
              </Box>
            </Collapse>

            {/* Sort Options Collapse */}
            <Collapse in={showSortOptions}>
              <Box className="p-4 mb-4 bg-my-purple-800 rounded-lg shadow-inner flex flex-wrap gap-4 items-center">
                {activeTab === 'maintenance' && (
                  <>
                    <h1 className="text-white">Sorting စီရန် :</h1>
                    <Button onClick={() => handleSort('maintenance_date')} endIcon={sortColumn === 'maintenance_date' && (sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />)}
                    sx={{ color: 'white' }} >
                      ရက်စွဲ 
                    </Button>
                    <Button onClick={() => handleSort('cost')} endIcon={sortColumn === 'cost' && (sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />)}
                    sx={{ color: 'white' }} >
                      ကုန်ကျစရိတ်
                    </Button>
                  </>
                )}
                {activeTab === 'fuel' && (
                  <>
                    <Button onClick={() => handleSort('log_datetime')} endIcon={sortColumn === 'log_datetime' && (sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />)}>
                      ရက်စွဲ/အချိန်
                    </Button>
                    <Button onClick={() => handleSort('fuel_amount')} endIcon={sortColumn === 'fuel_amount' && (sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />)}>
                      ဆီပမာဏ
                    </Button>
                    <Button onClick={() => handleSort('fuel_cost')} endIcon={sortColumn === 'fuel_cost' && (sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />)}>
                      ဆီကုန်ကျငွေ
                    </Button>
                  </>
                )}
                {activeTab === 'general' && (
                  <>
                    <Button onClick={() => handleSort('expense_date')} endIcon={sortColumn === 'expense_date' && (sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />)}>
                      ရက်စွဲ
                    </Button>
                    <Button onClick={() => handleSort('cost')} endIcon={sortColumn === 'cost' && (sortDirection === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />)}>
                      ကုန်ကျစရိတ်
                    </Button>
                  </>
                )}
              </Box>
            </Collapse>


            {/* Tab Content - Maintenance */}
            {activeTab === 'maintenance' && (
              <>
                <h2 className="text-2xl font-semibold mb-4 mt-8">
                  {selectedCarNo} အတွက် ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-my-purple-500 rounded-lg items-end">
                  <div>
                    <label htmlFor="maintenanceDate" className="block text-sm font-medium mb-4">
                      ရက်စွဲ (Date)
                    </label>
                    <input
                      type="date"
                      id="maintenanceDate"
                      name="maintenanceDate"
                      value={maintenanceData.maintenanceDate}
                      onChange={handleMaintenanceChange}
                      className="mt-1 text-gray-900 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium mb-4">
                      ဖော်ပြချက် (Description)
                    </label>
                    {/* Added w-full to make the select box take full width */}
                    <select
                      id="description"
                      name="description"
                      value={maintenanceData.description}
                      onChange={handleMaintenanceChange}
                      className="mt-1 text-gray-900 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    >
                      <option value="">ဖော်ပြချက် ရွေးပါ</option>
                      {maintenanceDescriptions.map((desc, index) => (
                        <option key={index} value={desc}>
                          {desc}
                        </option>
                      ))}
                    </select>
                    {maintenanceData.description === "အခြား (Other)" && (
                      <input
                        type="text"
                        id="otherDescription"
                        name="otherDescription"
                        value={maintenanceData.otherDescription}
                        onChange={handleMaintenanceChange}
                        className="mt-2 text-gray-900 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        placeholder="အခြား ဖော်ပြချက် ထည့်ပါ..."
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="cost" className="block text-sm font-medium mb-4">
                      ကုန်ကျစရိတ် (Cost)
                    </label>
                    <div className="flex items-center">
                    <input
                      type="text"
                      id="cost"
                      name="cost"
                      value={maintenanceData.cost.toLocaleString('en-US')}
                      onChange={handleMaintenanceChange}
                      className="mt-1 text-gray-900 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 50,000"
                    />
                    {maintenanceData.cost && !isNaN(parseFloat(maintenanceData.cost.replace(/,/g, ''))) && (
                      <p className="text-xs text-gray-900 ml-4 mr-4 whitespace-nowrap">
                        {formatMMK(parseFloat(maintenanceData.cost.replace(/,/g, '')))}
                      </p>
                    )}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={handleAddMaintenance}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 ease-in-out w-full"
                    >
                      ထိန်းသိမ်းစောင့်ရှောက်မှု ထည့်ရန်
                    </button>
                  </div>
                </div>

                {/* Car Maintenance Records Table */}
                <Box
                  sx={{
                    overflowX: 'auto', // overflow-x-auto ကိုအစားထိုးပါ
                    mb: 4,             // mb-8 ကိုအစားထိုးပါ (MUI spacing scale 4 က 32px ဖြစ်ပါတယ်)
                  }}
                  >
                  <table className="min-w-full border rounded-lg shadow-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">No.</th>
                        <th className="px-4 py-2 text-left text-xs font-semibol uppercase tracking-wider">ရက်စွဲ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">ဖော်ပြချက်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">ကုန်ကျစရိတ်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibol uppercase tracking-wider">လုပ်ဆောင်ချက်</th> {/* Action column */}
                      </tr>
                    </thead>
                    <tbody>
                      {carMaintenanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                            ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်းများ မရှိသေးပါ။
                          </td>
                        </tr>
                      ) : (
                        carMaintenanceRecords.map((record, index) => (
                          <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-800">{index + 1}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{record.maintenance_date}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{record.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{record.cost.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">
                              <IconButton aria-label="edit" size="small" onClick={() => handleEditMaintenanceClick(record)}>
                                <EditIcon fontSize="small" color="primary" />
                              </IconButton>
                              <IconButton aria-label="delete" size="small" onClick={() => handleDeleteMaintenanceClick(record)}>
                                <DeleteIcon fontSize="small" color="error" />
                              </IconButton>
                            </td>
                          </tr>
                        ))
                      )}
                      {/* Grand Total Row for Maintenance */}
                      <tr className="font-bold border-t-2 border-gray-300">
                        <td colSpan="3" className="px-4 py-2 text-right text-sm text-gray-200">
                          စုစုပေါင်း ကုန်ကျစရိတ် (Grand Total):
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-200">
                          {maintenanceGrandTotal.toLocaleString()} ({formatMMK(maintenanceGrandTotal)})
                        </td>
                        <td></td> {/* Empty cell for action column */}
                      </tr>
                    </tbody>
                  </table>
                </Box>
              </>
            )}

            {/* Tab Content - Fuel */}
            {activeTab === 'fuel' && (
              <>
                <h2 className="text-2xl font-semibold mb-4 mt-8">
                  {selectedCarNo} အတွက် ဆီသုံးစွဲမှု မှတ်တမ်း
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-yellow-50 rounded-lg items-end">
                  <div>
                    <label htmlFor="fuelLogDate" className="block text-sm font-medium text-gray-700 mb-1">
                      ရက်စွဲ (Date)
                    </label>
                    <input
                      type="date"
                      id="fuelLogDate"
                      name="logDate"
                      value={fuelLogData.logDate}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full text-gray-800 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuelLogTime" className="block text-sm font-medium text-gray-700 mb-1">
                      အချိန် (Time)
                    </label>
                    <input
                      type="time"
                      id="fuelLogTime"
                      name="logTime"
                      value={fuelLogData.logTime}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuelAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      ဆီပမာဏ (ဂါလံ/လီတာ)
                    </label>
                    <input
                      type="number"
                      id="fuelAmount"
                      name="fuelAmount"
                      value={fuelLogData.fuelAmount.toLocaleString('en-US')}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 10"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuelCost" className="block text-sm font-medium text-gray-700 mb-1">
                      ဆီကုန်ကျငွေ
                    </label>
                    <div className="flex items-center">
                    <input
                      type="text"
                      id="fuelCost"
                      name="fuelCost"
                      value={fuelLogData.fuelCost.toLocaleString('en-US')}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 50,000"
                    />
                    {fuelLogData.fuelCost && !isNaN(parseFloat(fuelLogData.fuelCost.replace(/,/g, ''))) && (
                      <p className="text-xs text-gray-500 ml-5 mr-5 whitespace-nowrap">
                        {formatMMK(parseFloat(fuelLogData.fuelCost.replace(/,/g, '')))}
                      </p>
                    )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="fuelRemarks" className="block text-sm font-medium text-gray-700 mb-1">
                      မှတ်ချက်
                    </label>
                    <input
                      type="text"
                      id="fuelRemarks"
                      name="remarks"
                      value={fuelLogData.remarks}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="မှတ်ချက်..."
                    />
                  </div>
                  <div className="lg:col-span-1"> {/* Adjusted column span for button alignment */}
                    <button
                      onClick={handleAddFuelLog}
                      className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition duration-300 ease-in-out w-full"
                    >
                      ဆီဖြည့် မှတ်တမ်း ထည့်ရန်
                    </button>
                  </div>
                </div>

                {/* Fuel Logs Table */}
                <Box
                  sx={{
                    overflowX: 'auto', // overflow-x-auto ကိုအစားထိုးပါ
                  }}
                  >
                  <table className="min-w-full  border border-gray-200 rounded-lg shadow-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode === 'dark' ? 'text-gray-300' : 'text-gray-300'}  uppercase tracking-wider">No.</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode === 'dark' ? 'text-gray-300' : 'text-gray-300'} uppercase tracking-wider">ရက်စွဲ/အချိန်</th> {/* Changed header */}
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode === 'dark' ? 'text-gray-300' : 'text-gray-300'} uppercase tracking-wider">ဆီပမာဏ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode === 'dark' ? 'text-gray-300' : 'text-gray-300'} uppercase tracking-wider">ဆီကုန်ကျငွေ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode === 'dark' ? 'text-gray-300' : 'text-gray-300'} uppercase tracking-wider">မှတ်ချက်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode === 'dark' ? 'text-gray-300' : 'text-gray-300'} uppercase tracking-wider">လုပ်ဆောင်ချက်</th> {/* Action column */}
                      </tr>
                    </thead>
                    <tbody>
                      {fuelLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                            ဆီသုံးစွဲမှု မှတ်တမ်းများ မရှိသေးပါ။
                          </td>
                        </tr>
                      ) : (
                        fuelLogs.map((log, index) => (
                          <tr key={log.id} className="border-b border-gray-200 hover:bg-my-purple-800">
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100'}">{index + 1}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100'}">{log.log_datetime}</td> {/* Changed to log_datetime */}
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100'}">{log.fuel_amount.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100'}">{log.fuel_cost.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100'}">{log.remarks}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100'}">
                              <IconButton aria-label="edit" size="small" onClick={() => handleEditFuelLogClick(log)}>
                                <EditIcon fontSize="small" color="primary" />
                              </IconButton>
                              <IconButton aria-label="delete" size="small" onClick={() => handleDeleteFuelLogClick(log)}>
                                <DeleteIcon fontSize="small" color="error" />
                              </IconButton>
                            </td>
                          </tr>
                        ))
                      )}
                      {/* Grand Total Row for Fuel Logs */}
                      <tr className="font-bold border-t-2 border-gray-300">
                        <td colSpan="3" className="px-4 py-2 text-right text-sm ${mode==='dark' ? 'text-gray-400' : 'text-gray-900}">
                          စုစုပေါင်း ဆီကုန်ကျငွေ (Grand Total):
                        </td>
                        <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-400' : 'text-gray-900}">
                          {fuelGrandTotal.toLocaleString()} ({formatMMK(fuelGrandTotal)})
                        </td>
                        <td></td> {/* Empty cell for remarks column */}
                      </tr>
                    </tbody>
                  </table>
                </Box>
              </>
            )}

            {/* Tab Content - General Expenses */}
            {activeTab === 'general' && (
              <>
                <h2 className="text-2xl font-semibold mb-4 mt-8">
                  {selectedCarNo} အတွက် အထွေထွေအသုံးစာရိတ်
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-purple-50 rounded-lg items-end">
                  <div>
                    <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 mb-1">
                      ရက်စွဲ (Date)
                    </label>
                    <input
                      type="date"
                      id="expenseDate"
                      name="expenseDate"
                      value={generalExpenseData.expenseDate}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="generalDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      ဖော်ပြချက် (Description)
                    </label>
                    {/* Added w-full to make the select box take full width */}
                    <select
                      id="generalDescription"
                      name="description"
                      value={generalExpenseData.description}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    >
                      <option value="">ဖော်ပြချက် ရွေးပါ</option>
                      {generalExpenseDescriptions.map((desc, index) => (
                        <option key={index} value={desc}>
                          {desc}
                        </option>
                      ))}
                    </select>
                    {generalExpenseData.description === "အခြား (Other)" && (
                      <input
                        type="text"
                        id="generalOtherDescription"
                        name="otherDescription"
                        value={generalExpenseData.otherDescription}
                        onChange={handleGeneralExpenseChange}
                        className="mt-2 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        placeholder="အခြား ဖော်ပြချက် ထည့်ပါ..."
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="generalCost" className="block text-sm font-medium text-gray-700 mb-1">
                      ကုန်ကျစရိတ် (Cost)
                    </label>
                    <div className="flex items-center">
                    <input
                      type="text"
                      id="generalCost"
                      name="cost"
                      value={generalExpenseData.cost.toLocaleString('en-US')}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 15,000"
                    />
                    {generalExpenseData.cost && !isNaN(parseFloat(generalExpenseData.cost.replace(/,/g, ''))) && (
                      <p className="text-xs text-gray-500 ml-4 mr-4 whitespace-nowrap">
                        {formatMMK(parseFloat(generalExpenseData.cost.replace(/,/g, '')))}
                      </p>
                    )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="generalRemarks" className="block text-sm font-medium text-gray-700 mb-1">
                      မှတ်ချက်
                    </label>
                    <input
                      type="text"
                      id="generalRemarks"
                      name="remarks"
                      value={generalExpenseData.remarks}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md text-gray-800 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="မှတ်ချက်..."
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleAddGeneralExpense}
                      className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-300 ease-in-out w-full"
                    >
                      အသုံးစာရိတ် ထည့်ရန်
                    </button>
                  </div>
                </div>

                {/* General Expenses Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 rounded-lg shadow-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'} uppercase tracking-wider">No.</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'} uppercase tracking-wider">ရက်စွဲ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'} uppercase tracking-wider">ဖော်ပြချက်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'} uppercase tracking-wider">ကုန်ကျစရိတ်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'} uppercase tracking-wider">မှတ်ချက်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'} uppercase tracking-wider">လုပ်ဆောင်ချက်</th> {/* Action column */}
                      </tr>
                    </thead>
                    <tbody>
                      {generalExpenses.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
                            အထွေထွေအသုံးစာရိတ် မှတ်တမ်းများ မရှိသေးပါ။
                          </td>
                        </tr>
                      ) : (
                        generalExpenses.map((expense, index) => (
                          <tr key={expense.id} className="border-b border-gray-200 hover:bg-my-purple-800">
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">{index + 1}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">{expense.expense_date}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">{expense.description}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">{expense.cost.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">{expense.remarks}</td>
                            <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">
                              <IconButton aria-label="edit" size="small" onClick={() => handleEditGeneralExpenseClick(expense)}>
                                <EditIcon fontSize="small" color="primary" />
                              </IconButton>
                              <IconButton aria-label="delete" size="small" onClick={() => handleDeleteGeneralExpenseClick(expense)}>
                                <DeleteIcon fontSize="small" color="error" />
                              </IconButton>
                            </td>
                          </tr>
                        ))
                      )}
                      {/* Grand Total Row for General Expenses */}
                      <tr className="font-bold border-t-2 border-gray-300">
                        <td colSpan="4" className="px-4 py-2 text-right text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">
                          စုစုပေါင်း အထွေထွေအသုံးစာရိတ် (Grand Total):
                        </td>
                        <td className="px-4 py-2 text-sm ${mode==='dark' ? 'text-gray-100 : 'text-gray-600'}">
                          {generalExpenseGrandTotal.toLocaleString()} ({formatMMK(generalExpenseGrandTotal)})
                        </td>
                        <td></td> {/* Empty cell for remarks column */}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* Maintenance Edit Dialog */}
        {editMaintenanceFormData && (
          <Dialog open={openMaintenanceEditDialog} onClose={handleCancelMaintenanceEdit}>
            <DialogTitle>ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ပြင်ဆင်ရန်</DialogTitle>
            <DialogContent>
              <Box component="form" noValidate sx={{ mt: 1 }}>
                <TextField
                  margin="dense"
                  name="maintenance_date"
                  label="ရက်စွဲ"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={editMaintenanceFormData.maintenance_date}
                  onChange={(e) => setEditMaintenanceFormData({ ...editMaintenanceFormData, maintenance_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                {/* Added fullWidth to FormControl for Maintenance Edit Dialog */}
                <FormControl fullWidth margin="dense" variant="outlined">
                  <InputLabel>ဖော်ပြချက်</InputLabel>
                  <Select
                    name="description"
                    value={editMaintenanceFormData.description}
                    label="ဖော်ပြချက်"
                    onChange={(e) => setEditMaintenanceFormData({ ...editMaintenanceFormData, description: e.target.value, other_description: e.target.value === 'အခြား (Other)' ? '' : editMaintenanceFormData.other_description })}
                  >
                    {maintenanceDescriptions.map((desc, index) => (
                      <MenuItem key={index} value={desc}>
                        {desc}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {editMaintenanceFormData.description === "အခြား (Other)" && (
                  <TextField
                    margin="dense"
                    name="other_description"
                    label="အခြား ဖော်ပြချက်"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={editMaintenanceFormData.other_description || ''}
                    onChange={(e) => setEditMaintenanceFormData({ ...editMaintenanceFormData, other_description: e.target.value })}
                  />
                )}
                <TextField
                  margin="dense"
                  name="cost"
                  label="ကုန်ကျစရိတ်"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={editMaintenanceFormData.cost.toLocaleString('en-US')}
                  onChange={(e) => setEditMaintenanceFormData({ ...editMaintenanceFormData, cost: e.target.value.replace(/,/g, '') })}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelMaintenanceEdit} color="secondary">
                မလုပ်တော့ပါ
              </Button>
              <Button onClick={handleSaveMaintenanceEdit} color="primary" variant="contained">
                သိမ်းဆည်းမည်
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Maintenance Delete Confirmation Dialog */}
        {maintenanceToDelete && (
          <Dialog open={openMaintenanceDeleteConfirm} onClose={handleCloseMaintenanceDeleteConfirm}>
            <DialogTitle>ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ဖျက်သိမ်းခြင်း</DialogTitle>
            <DialogContent>
              <DialogContentText>
                ရက်စွဲ {maintenanceToDelete.maintenance_date}၊ ဖော်ပြချက် {maintenanceToDelete.description} ၏ မှတ်တမ်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseMaintenanceDeleteConfirm} color="primary">
                မလုပ်တော့ပါ
              </Button>
              <Button onClick={handleConfirmMaintenanceDelete} color="error" autoFocus>
                ဖျက်သိမ်းမည်
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Fuel Log Edit Dialog */}
        {editFuelLogFormData && (
          <Dialog open={openFuelLogEditDialog} onClose={handleCancelFuelLogEdit}>
            <DialogTitle>ဆီသုံးစွဲမှု မှတ်တမ်း ပြင်ဆင်ရန်</DialogTitle>
            <DialogContent>
              <Box component="form" noValidate sx={{ mt: 1 }}>
                <TextField
                  margin="dense"
                  name="logDate"
                  label="ရက်စွဲ"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={editFuelLogFormData.logDate}
                  onChange={(e) => setEditFuelLogFormData({ ...editFuelLogFormData, logDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  margin="dense"
                  name="logTime"
                  label="အချိန်"
                  type="time"
                  fullWidth
                  variant="outlined"
                  value={editFuelLogFormData.logTime}
                  onChange={(e) => setEditFuelLogFormData({ ...editFuelLogFormData, logTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  margin="dense"
                  name="fuel_amount"
                  label="ဆီပမာဏ (ဂါလံ/လီတာ)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={editFuelLogFormData.fuel_amount}
                  onChange={(e) => setEditFuelLogFormData({ ...editFuelLogFormData, fuel_amount: e.target.value.replace(/,/g, '') })}
                />
                <TextField
                  margin="dense"
                  name="fuel_cost"
                  label="ဆီကုန်ကျငွေ"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={editFuelLogFormData.fuel_cost.toLocaleString('en-US')}
                  onChange={(e) => setEditFuelLogFormData({ ...editFuelLogFormData, fuel_cost: e.target.value.replace(/,/g, '') })}
                />
                <TextField
                  margin="dense"
                  name="remarks"
                  label="မှတ်ချက်"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={editFuelLogFormData.remarks || ''}
                  onChange={(e) => setEditFuelLogFormData({ ...editFuelLogFormData, remarks: e.target.value })}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelFuelLogEdit} color="secondary">
                မလုပ်တော့ပါ
              </Button>
              <Button onClick={handleSaveFuelLogEdit} color="primary" variant="contained">
                သိမ်းဆည်းမည်
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* Fuel Log Delete Confirmation Dialog */}
        {fuelLogToDelete && (
          <Dialog open={openFuelLogDeleteConfirm} onClose={handleCloseFuelLogDeleteConfirm}>
            <DialogTitle>ဆီသုံးစွဲမှု မှတ်တမ်း ဖျက်သိမ်းခြင်း</DialogTitle>
            <DialogContent>
              <DialogContentText>
                ရက်စွဲ {fuelLogToDelete.log_datetime}၊ ဆီပမာဏ {fuelLogToDelete.fuel_amount} ၏ မှတ်တမ်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseFuelLogDeleteConfirm} color="primary">
                မလုပ်တော့ပါ
              </Button>
              <Button onClick={handleConfirmFuelLogDelete} color="error" autoFocus>
                ဖျက်သိမ်းမည်
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* General Expense Edit Dialog */}
        {editGeneralExpenseFormData && (
          <Dialog open={openGeneralExpenseEditDialog} onClose={handleCancelGeneralExpenseEdit}>
            <DialogTitle>အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ပြင်ဆင်ရန်</DialogTitle>
            <DialogContent>
              <Box component="form" noValidate sx={{ mt: 1 }}>
                <TextField
                  margin="dense"
                  name="expense_date"
                  label="ရက်စွဲ"
                  type="date"
                  fullWidth
                  variant="outlined"
                  value={editGeneralExpenseFormData.expense_date}
                  onChange={(e) => setEditGeneralExpenseFormData({ ...editGeneralExpenseFormData, expense_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                {/* Added fullWidth to FormControl for General Expense Edit Dialog */}
                <FormControl fullWidth margin="dense" variant="outlined">
                  <InputLabel>ဖော်ပြချက်</InputLabel>
                  <Select
                    name="description"
                    value={editGeneralExpenseFormData.description}
                    label="ဖော်ပြချက်"
                    onChange={(e) => setEditGeneralExpenseFormData({ ...editGeneralExpenseFormData, description: e.target.value, other_description: e.target.value === 'အခြား (Other)' ? '' : editGeneralExpenseFormData.other_description })}
                  >
                    {generalExpenseDescriptions.map((desc, index) => (
                      <MenuItem key={index} value={desc}>
                        {desc}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {editGeneralExpenseFormData.description === "အခြား (Other)" && (
                  <TextField
                    margin="dense"
                    name="other_description"
                    label="အခြား ဖော်ပြချက်"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={editGeneralExpenseFormData.other_description || ''}
                    onChange={(e) => setEditGeneralExpenseFormData({ ...editGeneralExpenseFormData, other_description: e.target.value })}
                  />
                )}
                <TextField
                  margin="dense"
                  name="cost"
                  label="ကုန်ကျစရိတ်"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={editGeneralExpenseFormData.cost.toLocaleString('en-US')}
                  onChange={(e) => setEditGeneralExpenseFormData({ ...editGeneralExpenseFormData, cost: e.target.value.replace(/,/g, '') })}
                />
                <TextField
                  margin="dense"
                  name="remarks"
                  label="မှတ်ချက်"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={editGeneralExpenseFormData.remarks || ''}
                  onChange={(e) => setEditGeneralExpenseFormData({ ...editGeneralExpenseFormData, remarks: e.target.value })}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCancelGeneralExpenseEdit} color="secondary">
                မလုပ်တော့ပါ
              </Button>
              <Button onClick={handleSaveGeneralExpenseEdit} color="primary" variant="contained">
                သိမ်းဆည်းမည်
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {/* General Expense Delete Confirmation Dialog */}
        {generalExpenseToDelete && (
          <Dialog open={openGeneralExpenseDeleteConfirm} onClose={handleCloseGeneralExpenseDeleteConfirm}>
            <DialogTitle>အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ဖျက်သိမ်းခြင်း</DialogTitle>
            <DialogContent>
              <DialogContentText>
                ရက်စွဲ {generalExpenseToDelete.expense_date}၊ ဖော်ပြချက် {generalExpenseToDelete.description} ၏ မှတ်တမ်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseGeneralExpenseDeleteConfirm} color="primary">
                မလုပ်တော့ပါ
              </Button>
              <Button onClick={handleConfirmGeneralExpenseDelete} color="error" autoFocus>
                ဖျက်သိမ်းမည်
              </Button>
            </DialogActions>
          </Dialog>
        )}

      </Box>
    </>
  );
}

export default CarManagementPage;
