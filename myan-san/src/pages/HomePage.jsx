// myan-san/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios'; // axios ကို import လုပ်ပေးခြင်း
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, TextField, Select, MenuItem, FormControl, InputLabel,
  Checkbox, Button, Box, Typography, Alert, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

// Static data များကို import လုပ်ခြင်း
import carNumbersData from '../data/carNumbers.json';
import emptyContainerLocationsData from '../data/emptyContainerLocations.json';
import kmData from '../data/kmData.json';
import { formatMMK } from '../utils/currencyFormatter'; // Currency formatter ကို import လုပ်ပါ။

function HomePage() {
  // Form input များကို သိမ်းဆည်းရန် state များ (အသစ်ထည့်သွင်းရန်)
  const [formData, setFormData] = useState({
    date: '',
    carNo: '',
    from: '',
    to: '',
    emptyContainer: '', // Empty Container Pickup/Drop-off location ID
    emptyDropoffCharge: 0, // Renamed to "အခွံချခ"
    overnightStay: false, // အသားအိပ်
    dayOverDelayed: false, // နေ့ကျော်/ပြီး
    remarks: '', // မှတ်ချက်
    driverName: '', // ယာဉ်မောင်းအမည်
  });

  // Editing အတွက် state များ
  const [editingTripId, setEditingTripId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    carNo: '',
    from: '',
    to: '',
    emptyContainer: '', // Empty Container Pickup/Drop-off location ID
    emptyDropoffCharge: 0, // Renamed to "အခွံချခ"
    overnightStay: false,
    dayOverDelayed: false,
    remarks: '',
    driverName: '',
    // These will store the numerical values directly for editing
    routeCharge: 0, // This will be calculated and displayed
    kmTravelled: 0, // This will be calculated and displayed
  });

  // တွက်ချက်ထားသော ရလဒ်များကို သိမ်းဆည်းရန် state (Database မှ ရယူမည်)
  const [allTrips, setAllTrips] = useState([]);
  // Filter လုပ်ပြီး ရလဒ်များကို ပြသရန် state
  const [filteredTrips, setFilteredTrips] = useState([]);
  // Backend မှ ရယူမည့် settings များကို သိမ်းဆည်းရန် state
  const [settings, setSettings] = useState({});
  // Backend မှ ရယူမည့် Route Charges များကို သိမ်းဆည်းရန် state
  const [currentRouteCharges, setCurrentRouteCharges] = useState([]);
  // Backend မှ ရယူမည့် ယာဉ်မောင်းအမည်များ
  const [driverNames, setDriverNames] = useState([]);
  // Backend မှ ရယူမည့် ကား-ယာဉ်မောင်း ချိတ်ဆက်မှုများ
  const [carDriverAssignments, setCarDriverAssignments] = useState([]);

  // HomePage Table Filter states (CarNo, Month, Year only)
  const [filterCarNo, setFilterCarNo] = useState('');
  const [filterYear, setFilterYear] = useState(''); // Default to empty string for "အားလုံး"
  const [filterMonth, setFilterMonth] = useState(''); // Default to empty string for "အားလုံး"

  // Available options for filters
  const [uniqueCarNumbersForFilter, setUniqueCarNumbersForFilter] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]); // Months available for the selected year

  // ရွေးချယ်ထားသော row များကို သိမ်းဆည်းရန် state
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Loading and Error/Success messages
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Delete confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const API_BASE_URL = 'http://localhost:5001'; // Backend API base URL ကို သတ်မှတ်ပါ။

  // Trips များကို Backend မှ fetch လုပ်ရန် function
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips`);
      const data = await response.json();
      if (data.message === "success") {
        setAllTrips(data.data);

        // Extract unique years and car numbers from fetched data
        const years = [...new Set(data.data.map(trip => new Date(trip.date).getFullYear()))].sort((a, b) => b - a);
        setAvailableYears(years);

        const carNos = [...new Set(data.data.map(trip => trip.car_no))].sort();
        setUniqueCarNumbersForFilter(carNos);

        // Set initial selected year, month, and carNo for filters
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // Default year: current year, or first available year if current year not in data, else empty string
        let initialFilterYear = years.includes(currentYear) ? currentYear : (years.length > 0 ? years[0] : '');
        setFilterYear(initialFilterYear);

        // Determine initial month based on the initial year
        const monthsForInitialYear = [...new Set(data.data
          .filter(trip => new Date(trip.date).getFullYear() === initialFilterYear)
          .map(trip => new Date(trip.date).getMonth() + 1)
        )].sort((a, b) => a - b);
        setAvailableMonths(monthsForInitialYear);

        // Default month: current month, or first available month if current month not in data for selected year, else empty string
        let initialFilterMonth = monthsForInitialYear.includes(currentMonth) ? currentMonth : (monthsForInitialYear.length > 0 ? monthsForInitialYear[0] : '');
        setFilterMonth(initialFilterMonth);

        // Determine initial car number from the last added trip
        let initialFilterCarNo = '';
        if (data.data.length > 0) {
          const sortedTrips = [...data.data].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() !== dateB.getTime()) {
              return dateB.getTime() - dateA.getTime();
            }
            return b.id - a.id; // Fallback to ID for consistent last entry
          });
          initialFilterCarNo = sortedTrips[0].car_no;
        }
        setFilterCarNo(initialFilterCarNo);

        // Apply initial filters
        applyHomePageFilters(data.data, initialFilterCarNo, initialFilterYear, initialFilterMonth);

      } else {
        setError("ခရီးစဉ်မှတ်တမ်းများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။");
        console.error("Failed to fetch trips:", data.error);
      }
    } catch (error) {
      setError("ခရီးစဉ်မှတ်တမ်းများကို ရယူရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။");
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies that change over time, so useCallback is fine.

  // ယာဉ်မောင်းအမည်များကို Backend မှ fetch လုပ်ရန် function
  const fetchDriverNames = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/driver-names`);
      const data = await response.json();
      if (data.message === "success") {
        setDriverNames(data.data);
      } else {
        console.error("Failed to fetch driver names:", data.error);
      }
    } catch (error) {
      console.error("Error fetching driver names:", error);
    }
  }, []);

  // ကား-ယာဉ်မောင်း ချိတ်ဆက်မှုများကို Backend မှ fetch လုပ်ရန် function
  const fetchCarDriverAssignments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/car-driver-assignments`);
      const data = await response.json();
      if (data.message === "success") {
        setCarDriverAssignments(data.data);
      } else {
        console.error("Failed to fetch car-driver assignments:", data.error);
      }
    } catch (error) {
      console.error("Error fetching car-driver assignments:", error);
    }
  }, []);

  // Component စတင်သောအခါ Backend မှ settings, route charges, trips နှင့် driver names များကို ရယူခြင်း
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prevData => ({ ...prevData, date: today }));

    const fetchInitialData = async () => {
      try {
        const [settingsResponse, routeChargesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/settings`),
          fetch(`${API_BASE_URL}/api/route-charges`)
        ]);

        const settingsData = await settingsResponse.json();
        if (settingsData.message === "success") {
          setSettings(settingsData.data);
        } else {
          console.error("Failed to fetch settings:", settingsData.error);
        }

        const routeChargesData = await routeChargesResponse.json();
        if (routeChargesData.message === "success") {
          setCurrentRouteCharges(routeChargesData.data);
        } else {
          console.error("Failed to fetch route charges:", routeChargesData.error);
        }

      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
      fetchTrips();
      fetchDriverNames();
      fetchCarDriverAssignments();
    };

    fetchInitialData();
  }, [fetchTrips, fetchDriverNames, fetchCarDriverAssignments]); // Dependencies added

  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (New Trip Form)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (Edit Trip Form)
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ကားနံပါတ် ပြောင်းလဲသောအခါ ယာဉ်မောင်းအမည်ကို အလိုအလျောက် ဖြည့်ရန် (New Trip Form)
  const handleCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(assignment => assignment.car_no === carNo);
    setFormData(prevData => ({
      ...prevData,
      carNo: carNo,
      driverName: assignedDriver ? assignedDriver.driver_name : '',
    }));
  };

  // ကားနံပါတ် ပြောင်းလဲသောအခါ ယာဉ်မောင်းအမည်ကို အလိုအလျောက် ဖြည့်ရန် (Edit Trip Form)
  const handleEditCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(assignment => assignment.car_no === carNo);
    setEditFormData(prevData => ({
      ...prevData,
      carNo: carNo,
      driverName: assignedDriver ? assignedDriver.driver_name : '',
    }));
  };

  // Filter logic for HomePage (Car No, Year, and Month only)
  const applyHomePageFilters = useCallback((trips, carNo, year, month) => {
    let tempFilteredTrips = trips.filter(trip => {
      const tripDate = new Date(trip.date);
      // If carNo is an empty string, it means "အားလုံး" (All), so don't filter by carNo
      const matchesCarNo = carNo === '' ? true : trip.car_no === carNo;
      // If year is an empty string, it means "အားလုံး" (All), so don't filter by year
      const matchesYear = year === '' ? true : tripDate.getFullYear() === year;
      // If month is an empty string, it means "အားလုံး" (All), so don't filter by month
      const matchesMonth = month === '' ? true : (tripDate.getMonth() + 1) === month;
      return matchesCarNo && matchesYear && matchesMonth;
    });
    setFilteredTrips(tempFilteredTrips);
  }, []);

  // Update filtered trips when filter states or allTrips change
  useEffect(() => {
    if (allTrips.length > 0) {
      applyHomePageFilters(allTrips, filterCarNo, filterYear, filterMonth);
    } else {
      setFilteredTrips([]); // If no trips, clear filtered trips
    }
  }, [filterCarNo, filterYear, filterMonth, allTrips, applyHomePageFilters]);

  // Update available months when filterYear changes
  useEffect(() => {
    if (filterYear && allTrips.length > 0) {
      const monthsForSelectedYear = [...new Set(allTrips
        .filter(trip => new Date(trip.date).getFullYear() === filterYear)
        .map(trip => new Date(trip.date).getMonth() + 1)
      )].sort((a, b) => a - b);
      setAvailableMonths(monthsForSelectedYear);
      // If the current selected month is not available for the new year, reset it
      if (!monthsForSelectedYear.includes(filterMonth) && monthsForSelectedYear.length > 0) {
        setFilterMonth(monthsForSelectedYear[0]);
      } else if (monthsForSelectedYear.length === 0) {
        setFilterMonth(''); // No months available for this year
      }
    } else {
      setAvailableMonths([]);
      setFilterMonth('');
    }
  }, [filterYear, allTrips, filterMonth]);


  // Select/Deselect all rows
  const handleSelectAllRows = (e) => {
    const { checked } = e.target;
    if (checked) {
      const newSelectedRows = new Set(filteredTrips.map(trip => trip.id));
      setSelectedRows(newSelectedRows);
    } else {
      setSelectedRows(new Set());
    }
  };

  // Select/Deselect individual row
  const handleRowSelect = (id) => {
    setSelectedRows(prevSelectedRows => {
      const newSelectedRows = new Set(prevSelectedRows);
      if (newSelectedRows.has(id)) {
        newSelectedRows.delete(id);
      } else {
        newSelectedRows.add(id);
      }
      return newSelectedRows;
    });
  };

  // Helper to get route charge from routeCharges data
  const getRouteCharge = useCallback((from, to) => {
    const route = currentRouteCharges.find(r => r.route === to);
    if (route) {
      if (from === 'အေးရှားဝေါ' || from === 'MIP') {
        return route.MIP_AWPT_40;
      } else if (from === 'သီလဝါ') {
        return route.MIIT_40;
      }
      // Special case: From Thilawa to MIP
      if (from === 'သီလဝါ' && to === 'MIP') {
        const sezThilawarRoute = currentRouteCharges.find(r => r.route === 'SEZ/Thilawar Zone');
        return sezThilawarRoute ? sezThilawarRoute.MIP_AWPT_40 : 0;
      }
    }
    return 0;
  }, [currentRouteCharges]);

  // Calculate total charge function (reusable for new and edit forms)
  const calculateTotalCharge = useCallback((
    routeCharge,
    emptyDropoffCharge,
    overnightStatusBoolean, // true/false
    dayOverStatusBoolean,   // true/false
    currentCarNo, // Pass carNo for calculation
    emptyContainerId // Pass emptyContainerId to check for same direction
  ) => {
    let total = parseFloat(routeCharge || 0);
    total += parseFloat(emptyDropoffCharge || 0);

    // Calculate empty pickup charge based on emptyContainerId and same direction logic
    let calculatedEmptyPickupCharge = emptyContainerLocationsData.find(loc => loc.id === emptyContainerId)?.charge || 0;
    const isSameDirection = (from, to, emptyLocId) => {
      const emptyLocName = emptyContainerLocationsData.find(loc => loc.id === emptyLocId)?.name;
      if (from === 'MIP' && to === 'တောင်ဒဂုံ(ဇုံ ၁/၂/၃)' && emptyLocName === 'DIL/ICH') return true;
      if (from === 'DIL/ICH' && to === 'သီလဝါ' && emptyLocName === 'MIP') return true;
      return false;
    };

    // Use the appropriate 'from' and 'to' based on whether it's the new form or edit form
    const currentFrom = editingTripId ? editFormData.from : formData.from;
    const currentTo = editingTripId ? editFormData.to : formData.to;

    if (emptyContainerId && isSameDirection(currentFrom, currentTo, emptyContainerId)) {
        calculatedEmptyPickupCharge = 0; // Set to 0 if same direction
    }
    total += calculatedEmptyPickupCharge; // Add the calculated empty pickup charge


    const overnightDayoverCombinedCharge = parseFloat(settings.overnight_dayover_combined_charge || 0);
    const gepOvernightCharge = parseFloat(settings.gep_overnight_charge || 0);
    const nineKOvernightCharge = parseFloat(settings['9k_overnight_charge'] || 0);

    // Convert boolean status to string for calculation logic (matches DB values)
    const overnightStatus = overnightStatusBoolean ? 'အသားအိပ်' : 'No';
    const dayOverStatus = dayOverStatusBoolean ? 'နေ့ကျော်' : 'No';

    if (overnightStatus === 'အသားအိပ်' && dayOverStatus === 'နေ့ကျော်') {
      total += overnightDayoverCombinedCharge;
    } else if (overnightStatus === 'အသားအိပ်') {
      if (currentCarNo.startsWith('GEP')) {
        total += gepOvernightCharge;
      } else if (currentCarNo.startsWith('9K')) {
        total += nineKOvernightCharge;
      }
    }
    return total;
  }, [settings, formData.from, formData.to, editFormData.from, editFormData.to, editingTripId]); // Added dependencies


  // Update new trip form's route charge and kmTravelled when 'from' or 'to' changes
  useEffect(() => {
    if (formData.from && formData.to) {
      const newRouteCharge = getRouteCharge(formData.from, formData.to);
      const newKmTravelled = kmData.find(k => k.start_point === formData.from && k.destination_point === formData.to)?.km_value || 0;
      setFormData(prevData => ({
        ...prevData,
        routeCharge: newRouteCharge,
        kmTravelled: newKmTravelled
      }));
    } else {
      setFormData(prevData => ({ ...prevData, routeCharge: 0, kmTravelled: 0 }));
    }
  }, [formData.from, formData.to, getRouteCharge]);

  // Update edit trip form's route charge and kmTravelled when 'from' or 'to' changes
  useEffect(() => {
    if (editFormData.from && editFormData.to) {
      const newRouteCharge = getRouteCharge(editFormData.from, editFormData.to);
      const newKmTravelled = kmData.find(k => k.start_point === editFormData.from && k.destination_point === editFormData.to)?.km_value || 0;
      setEditFormData(prevData => ({
        ...prevData,
        routeCharge: newRouteCharge,
        kmTravelled: newKmTravelled
      }));
    } else {
      setEditFormData(prevData => ({ ...prevData, routeCharge: 0, kmTravelled: 0 }));
    }
  }, [editFormData.from, editFormData.to, getRouteCharge]);


  // တွက်ချက်ရန် ခလုတ် နှိပ်သောအခါ လုပ်ဆောင်မည့် function (New Trip)
  const handleCalculate = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!formData.date || !formData.carNo || !formData.from || !formData.to || !formData.driverName) {
      setError('ကျေးဇူးပြု၍ ရက်စွဲ၊ ကားနံပါတ်၊ မှ၊ သို့ နှင့် ယာဉ်မောင်းအမည် နေရာများကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }

    const routeCharge = getRouteCharge(formData.from, formData.to);
    const emptyPickupChargeVal = emptyContainerLocationsData.find(loc => loc.id === formData.emptyContainer)?.charge || 0; // Actual charge from location
    const emptyDropoffCharge = parseFloat(formData.emptyDropoffCharge || 0);

    let kmTravelled = kmData.find(k => k.start_point === formData.from && k.destination_point === formData.to)?.km_value || 0;

    let remarks = formData.remarks;
    const isSameDirection = (from, to, emptyLocId) => {
      const emptyLocName = emptyContainerLocationsData.find(loc => loc.id === emptyLocId)?.name;
      if (from === 'MIP' && to === 'တောင်ဒဂုံ(ဇုံ ၁/၂/၃)' && emptyLocName === 'DIL/ICH') return true;
      if (from === 'DIL/ICH' && to === 'သီလဝါ' && emptyLocName === 'MIP') return true;
      return false;
    };

    let finalEmptyPickupChargeForCalculation = emptyPickupChargeVal;
    if (formData.emptyContainer && isSameDirection(formData.from, formData.to, formData.emptyContainer)) {
        finalEmptyPickupChargeForCalculation = 0; // Set to 0 if same direction for calculation
        remarks += (remarks ? "; " : "") + "အခွံတင်/ချ - လားရာတူသောကြောင့် ဝန်ဆောင်ခ မရရှိပါ။";
    }

    const totalCharge = calculateTotalCharge(
      routeCharge,
      emptyDropoffCharge,
      formData.overnightStay,
      formData.dayOverDelayed,
      formData.carNo,
      formData.emptyContainer // Pass emptyContainerId for same direction logic inside calculateTotalCharge
    );

    const tripDataToSave = {
      date: formData.date,
      carNo: formData.carNo,
      from_location: formData.from,
      to_location: formData.to,
      routeCharge: routeCharge,
      empty_pickup_charge: emptyPickupChargeVal, // Store the actual charge from dropdown (even if not used in total for same direction)
      empty_dropoff_charge: emptyDropoffCharge,
      overnight_status: formData.overnightStay ? 'အသားအိပ်' : 'No',
      day_over_status: formData.dayOverDelayed ? 'နေ့ကျော်' : 'No',
      remarks: remarks,
      total_charge: totalCharge,
      km_travelled: kmTravelled,
      fuel_amount: 0,
      fuel_cost: 0,
      driverName: formData.driverName,
      is_manual_edited: 0,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/trips`, tripDataToSave);

      if (response.status === 201) {
        setSuccessMessage("ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
        // Clear form fields
        setFormData({
          date: new Date().toISOString().split('T')[0],
          carNo: '',
          from: '',
          to: '',
          emptyContainer: '',
          emptyDropoffCharge: 0,
          overnightStay: false,
          dayOverDelayed: false,
          remarks: '',
          driverName: '',
        });
        fetchTrips(); // Refresh data and update filters
      } else {
        setError(`ခရီးစဉ်မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`ခရီးစဉ်မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.message}`);
      console.error("Error saving trip:", err);
    }
  };

  // Handle Edit button click (Opens Dialog)
  const handleEdit = (trip) => {
    setEditingTripId(trip.id);
    setEditFormData({
      date: trip.date,
      carNo: trip.car_no,
      from: trip.from_location,
      to: trip.to_location,
      // Map empty_pickup_charge back to emptyContainer ID for dropdown
      emptyContainer: emptyContainerLocationsData.find(loc => loc.charge === trip.empty_pickup_charge)?.id || '',
      overnightStay: trip.overnight_status === 'အသားအိပ်',
      dayOverDelayed: trip.day_over_status === 'နေ့ကျော်',
      remarks: trip.remarks || '',
      driverName: trip.driver_name || '',
      routeCharge: trip.route_charge, // Display current value, will be recalculated on save
      emptyPickupCharge: trip.empty_pickup_charge, // Display current value, will be recalculated on save
      emptyDropoffCharge: trip.empty_dropoff_charge,
      kmTravelled: trip.km_travelled, // Display current value, will be recalculated on save
    });
    setEditDialogOpen(true); // Open the edit dialog
  };

  // Handle Save Edit button click (from Dialog)
  const handleSaveEdit = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!editFormData.date || !editFormData.carNo || !editFormData.from || !editFormData.to || !editFormData.driverName) {
      setError('လိုအပ်သော အချက်အလက်များကို ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
      return;
    }

    // Recalculate values based on current editFormData
    const calculatedRouteCharge = getRouteCharge(editFormData.from, editFormData.to);
    const emptyPickupChargeVal = emptyContainerLocationsData.find(loc => loc.id === editFormData.emptyContainer)?.charge || 0;
    const calculatedKmTravelled = kmData.find(k => k.start_point === editFormData.from && k.destination_point === editFormData.to)?.km_value || 0;
    const emptyDropoffCharge = parseFloat(editFormData.emptyDropoffCharge || 0);

    let remarks = editFormData.remarks;
    const isSameDirection = (from, to, emptyLocId) => {
      const emptyLocName = emptyContainerLocationsData.find(loc => loc.id === emptyLocId)?.name;
      if (from === 'MIP' && to === 'တောင်ဒဂုံ(ဇုံ ၁/၂/၃)' && emptyLocName === 'DIL/ICH') return true;
      if (from === 'DIL/ICH' && to === 'သီလဝါ' && emptyLocName === 'MIP') return true;
      return false;
    };

    // This variable is used for internal calculation, not for storage
    let finalEmptyPickupChargeForCalculation = emptyPickupChargeVal;
    if (editFormData.emptyContainer && isSameDirection(editFormData.from, editFormData.to, editFormData.emptyContainer)) {
        finalEmptyPickupChargeForCalculation = 0;
        remarks += (remarks ? "; " : "") + "အခွံတင်/ချ - လားရာတူသောကြောင့် ဝန်ဆောင်ခ မရရှိပါ။";
    }

    const totalCharge = calculateTotalCharge(
      calculatedRouteCharge,
      emptyDropoffCharge,
      editFormData.overnightStay,
      editFormData.dayOverDelayed,
      editFormData.carNo,
      editFormData.emptyContainer // Pass emptyContainerId for same direction logic inside calculateTotalCharge
    );

    const tripDataToUpdate = {
      date: editFormData.date,
      carNo: editFormData.carNo,
      from_location: editFormData.from,
      to_location: editFormData.to,
      routeCharge: calculatedRouteCharge,
      empty_pickup_charge: emptyPickupChargeVal, // Store the actual charge from dropdown
      empty_dropoff_charge: emptyDropoffCharge,
      overnight_status: editFormData.overnightStay ? 'အသားအိပ်' : 'No',
      day_over_status: editFormData.dayOverDelayed ? 'နေ့ကျော်' : 'No',
      remarks: remarks,
      total_charge: totalCharge,
      km_travelled: calculatedKmTravelled,
      fuel_amount: 0, // Not editable in this form
      fuel_cost: 0,   // Not editable in this form
      driverName: editFormData.driverName,
      is_manual_edited: 1, // Mark as manually edited
    };

    try {
      // NOTE: This PUT API endpoint must exist in your backend/server.js for this to work.
      // Based on your previous instruction, this API was removed.
      // If you want this functionality, you need to re-add the PUT API in server.js.
      const response = await axios.put(`${API_BASE_URL}/api/trips/${editingTripId}`, tripDataToUpdate);

      if (response.status === 200) {
        setSuccessMessage('ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။');
        setEditingTripId(null);
        setEditDialogOpen(false); // Close the edit dialog
        fetchTrips(); // Refresh data and update filters
      } else {
        setError(`ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.message}. Backend API (PUT /api/trips/:id) မရှိခြင်းကြောင့် ဖြစ်နိုင်ပါသည်။`);
      console.error('Error saving trip edit:', err);
    }
  };

  // Handle Cancel Edit button click (from Dialog)
  const handleCancelEdit = () => {
    setEditingTripId(null);
    setEditDialogOpen(false); // Close the edit dialog
    setEditFormData({ // Reset edit form states
      date: '', carNo: '', from: '', to: '', emptyContainer: '',
      overnightStay: false, dayOverDelayed: false, remarks: '', driverName: '',
      routeCharge: 0, emptyPickupCharge: 0, emptyDropoffCharge: 0, kmTravelled: 0,
    });
  };

  // Handle Delete button click
  const handleDelete = (trip) => {
    setTripToDelete(trip);
    setDeleteConfirmOpen(true);
  };

  // Handle Confirm Delete button click
  const handleConfirmDelete = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      // NOTE: This DELETE API endpoint must exist in your backend/server.js for this to work.
      // Based on your previous instruction, this API was removed.
      // If you want this functionality, you need to re-add the DELETE API in server.js.
      const response = await axios.delete(`${API_BASE_URL}/api/trips/${tripToDelete.id}`);
      if (response.status === 200) {
        setSuccessMessage('ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ပြီးပါပြီ။');
        fetchTrips(); // Refresh data and update filters
      } else {
        setError(`ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.message}. Backend API (DELETE /api/trips/:id) မရှိခြင်းကြောင့် ဖြစ်နိုင်ပါသည်။`);
      console.error('Error deleting trip:', err);
    } finally {
      setDeleteConfirmOpen(false);
      setTripToDelete(null);
    }
  };

  // Handle Close Delete Confirm dialog
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setTripToDelete(null);
  };

  // Export to Excel function
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredTrips.map(trip => ({
      "No.": trip.id,
      "Date": trip.date,
      "Car No": trip.car_no,
      "မှ (From)": trip.from_location,
      "သို့ (To)": trip.to_location,
      "ကားခ (Route Charge)": trip.route_charge,
      "အခွံတင်/ချ (Empty Charge)": trip.empty_pickup_charge, // Still exporting this, though its calculation might be 0
      "အခွံချခ (Empty Drop-off Charge)": trip.empty_dropoff_charge,
      "အသား/အခွံ အိပ်": trip.overnight_status,
      "နေ့ကျော်/ပြီး": trip.day_over_status,
      "မှတ်ချက်": trip.remarks,
      "စုစုပေါင်း": trip.total_charge,
      "KM သွားခဲ့မှု": trip.km_travelled,
      "ယာဉ်မောင်း": trip.driver_name,
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trip Records");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'trip_records.xlsx');
  };

  // Calculate Grand Total for "စုစုပေါင်း" column
  const grandTotalCharge = filteredTrips.reduce((sum, trip) => sum + (trip.total_charge || 0), 0);

  // Month names for dropdown
  const monthNames = useMemo(() => [
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


  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        အချက်အလက် ထည့်သွင်းခြင်း
      </h2>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      {/* New Form Layout - Single Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* ရက်စွဲ (Date) */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            ရက်စွဲ (Date)
          </label>
          <TextField
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
            className="rounded-md"
          />
        </div>

        {/* ကားနံပါတ် (Car No) */}
        <div>
             <label htmlFor="carNo" className="block text-sm font-medium text-gray-700 mb-1">
            ကားနံပါတ် (Car No)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="carNo"
              name="carNo"
              value={formData.carNo}
              onChange={handleCarNoChange}
            >
              <MenuItem value="">ကားနံပါတ် ရွေးပါ</MenuItem>
              {carNumbersData.map((car, index) => (
                <MenuItem key={index} value={car.number}>
                  {car.number} ({car.gate})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* ယာဉ်မောင်းအမည် (Driver Name) */}
        <div>
             <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-1">
            ယာဉ်မောင်းအမည် (Driver Name)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="driverName"
              name="driverName"
              value={formData.driverName}
              onChange={handleChange}
            >
              <MenuItem value="">ယာဉ်မောင်း ရွေးပါ</MenuItem>
              {driverNames.map((name, index) => (
                <MenuItem key={index} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* မှ (From) */}
        <div>
             <label htmlFor="from" className="block text-sm font-medium text-gray-700 mb-1">
            မှ (From)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="from"
              name="from"
              value={formData.from}
              onChange={handleChange}
            >
              <MenuItem value="">နေရာ ရွေးပါ</MenuItem>
              {['အေးရှားဝေါ', 'MIP', 'သီလဝါ'].map((location, index) => (
                <MenuItem key={index} value={location}>
                  {location}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* သို့ (To) */}
        <div>
             <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
            သို့ (To)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="to"
              name="to"
              value={formData.to}
              onChange={handleChange}
            >
              <MenuItem value="">ခရီးစဉ် ရွေးပါ</MenuItem>
              {currentRouteCharges.map((route, index) => (
                <MenuItem key={index} value={route.route}>
                  {route.route}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* လမ်းကြောင်းခ (Route Charge) - Display only */}
        <div>
          <label htmlFor="routeCharge" className="block text-sm font-medium text-gray-700 mb-1">
            လမ်းကြောင်းခ <span className="text-xs text-gray-500">(Auto)</span>
          </label>
          <TextField
            type="text"
            id="routeCharge"
            name="routeCharge"
            value={formData.routeCharge || ''}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{
              readOnly: true, // Make it read-only
              endAdornment: (
                <Typography variant="body2" color="textSecondary">
                  {formData.routeCharge ? formatMMK(formData.routeCharge) : ''}
                </Typography>
              ),
            }}
            className="bg-gray-100 rounded-md" // Tailwind class for light grey background
          />
        </div>

        {/* အခွံတင်/ချ (Empty Container Pickup/Drop-off) */}
        <div>
          <label htmlFor="emptyContainer" className="block text-sm font-medium text-gray-700 mb-1">
            အခွံတင်/ချ (Empty Container)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="emptyContainer"
              name="emptyContainer"
              value={formData.emptyContainer}
              onChange={handleChange}
            >
              <MenuItem value="">နေရာ ရွေးပါ (မရှိလျှင် မရွေးပါ)</MenuItem>
              {emptyContainerLocationsData.map((location, index) => (
                <MenuItem key={index} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* အခွံချခ (Empty Drop-off Charge) - Manual input */}
        <div>
          <label htmlFor="emptyDropoffCharge" className="block text-sm font-medium text-gray-700 mb-1">
            အခွံချခ
          </label>
          <TextField
            type="text"
            id="emptyDropoffCharge"
            name="emptyDropoffCharge"
            value={formData.emptyDropoffCharge}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/,/g, '');
              if (!isNaN(rawValue) || rawValue === '') {
                setFormData(prev => ({ ...prev, emptyDropoffCharge: rawValue }));
              }
            }}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{
              endAdornment: (
                <Typography variant="body2" color="textSecondary">
                  {formData.emptyDropoffCharge && !isNaN(parseFloat(formData.emptyDropoffCharge)) ? formatMMK(parseFloat(formData.emptyDropoffCharge)) : ''}
                </Typography>
              ),
            }}
            className="rounded-md"
          />
        </div>

        {/* KM (ခရီးအကွာအဝေး) - Display only */}
        <div>
          <label htmlFor="kmTravelled" className="block text-sm font-medium text-gray-700 mb-1">
            KM (ခရီးအကွာအဝေး) <span className="text-xs text-gray-500">(Auto)</span>
          </label>
          <TextField
            type="number"
            id="kmTravelled"
            name="kmTravelled"
            value={kmData.find(k => k.start_point === formData.from && k.destination_point === formData.to)?.km_value || ''}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{ readOnly: true }}
            className="bg-gray-100 rounded-md" // Tailwind class for light grey background
          />
        </div>

        {/* အသားအိပ် (Overnight Stay with Cargo) */}
        <div className="flex items-center">
          <Checkbox
            id="overnightStay"
            name="overnightStay"
            checked={formData.overnightStay}
            onChange={handleChange}
            sx={{ p: 0, mr: 1 }}
          />
          <label htmlFor="overnightStay" className="text-sm font-medium text-gray-700">
            အသားအိပ် (Overnight Stay with Cargo)
          </label>
        </div>

        {/* နေ့ကျော်/ပြီး (Day Over/Delayed) */}
        <div className="flex items-center">
          <Checkbox
            id="dayOverDelayed"
            name="dayOverDelayed"
            checked={formData.dayOverDelayed}
            onChange={handleChange}
            sx={{ p: 0, mr: 1 }}
          />
          <label htmlFor="dayOverDelayed" className="text-sm font-medium text-gray-700">
            နေ့ကျော်/ပြီး (Day Over/Delayed)
          </label>
        </div>

        {/* Remarks (spanning all columns) */}
        <div className="col-span-full">
          <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
            မှတ်ချက် (Remarks)
          </label>
          <TextField
            id="remarks"
            name="remarks"
            multiline
            rows={3}
            value={formData.remarks}
            onChange={handleChange}
            fullWidth
            variant="outlined"
            size="small"
            placeholder="လိုအပ်သည့် မှတ်ချက်များ ထည့်သွင်းပါ..."
            className="rounded-md"
          />
        </div>
      </div>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
        <Typography variant="h6" sx={{ mr: 2, color: 'text.primary' }}>
          စုစုပေါင်း: {formatMMK(calculateTotalCharge(
            formData.routeCharge,
            formData.emptyDropoffCharge,
            formData.overnightStay,
            formData.dayOverDelayed,
            formData.carNo,
            formData.emptyContainer // Pass emptyContainerId for same direction logic
          ))}
        </Typography>
        <Button
          onClick={handleCalculate}
          variant="contained"
          color="primary"
          sx={{ py: 1.5, px: 4 }}
        >
          တွက်ချက်ရန် (Calculate)
        </Button>
      </Box>

      <hr className="my-8 border-gray-300" />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          ရလဒ်များ ပြသမှု
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={exportToExcel}
            variant="contained"
            color="secondary"
            sx={{ py: 1, px: 2, fontSize: '0.875rem' }}
          >
            Excel Export
          </Button>
        </Box>
      </Box>

      {/* Year, Month, and Car No Filters for HomePage Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">
        {/* နှစ် (Year) Filter */}
        <div>
          <label htmlFor="filterYear" className="block text-sm font-medium text-gray-700 mb-1">
            နှစ် (Year)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="filterYear"
              name="filterYear"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
            >
              {/* Filter out null/undefined values before mapping */}
              {availableYears.filter(year => year !== null && year !== undefined).map((year, index) => (
                <MenuItem key={index} value={year}>
                  {year}
                </MenuItem>
              ))}
              <MenuItem value="">အားလုံး</MenuItem> {/* "Choose all" option */}
            </Select>
          </FormControl>
        </div>

        {/* လ (Month) Filter */}
        <div>
          <label htmlFor="filterMonth" className="block text-sm font-medium text-gray-700 mb-1">
            လ (Month)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="filterMonth"
              name="filterMonth"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
            >
              {/* Filter out null/undefined values before mapping */}
              {monthNames.filter(month => month !== null && month !== undefined).map((month) => (
                <MenuItem key={month.value} value={month.value}>
                  {month.label}
                </MenuItem>
              ))}
              <MenuItem value="">အားလုံး</MenuItem> {/* "Choose all" option */}
            </Select>
          </FormControl>
        </div>

        {/* ကားနံပါတ် (Car No) Filter */}
        <div>
          <label htmlFor="filterCarNo" className="block text-sm font-medium text-gray-700 mb-1">
            ကားနံပါတ် (Car No)
          </label>
          <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
            <Select
              id="filterCarNo"
              name="filterCarNo"
              value={filterCarNo}
              onChange={(e) => setFilterCarNo(e.target.value)}
            >
              {/* Filter out null/undefined values before mapping */}
              {uniqueCarNumbersForFilter.filter(carNo => carNo !== null && carNo !== undefined).map((carNo, index) => (
                <MenuItem key={index} value={carNo}>
                  {carNo}
                </MenuItem>
              ))}
              <MenuItem value="">အားလုံး</MenuItem> {/* "Choose all" option */}
            </Select>
          </FormControl>
        </div>
      </div>


      {/* Results Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 4 }}>
          <Table stickyHeader aria-label="trip records table">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRows.size === filteredTrips.length && filteredTrips.length > 0}
                    onChange={handleSelectAllRows}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>No.</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Car No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ယာဉ်မောင်း</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>မှ (From)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>သို့ (To)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>လမ်းကြောင်းခ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>အခွံတင်/ချ</TableCell> {/* Renamed */}
                <TableCell sx={{ fontWeight: 'bold' }}>အခွံချခ</TableCell> {/* Renamed */}
                <TableCell sx={{ fontWeight: 'bold' }}>အသား/အခွံ အိပ်</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>နေ့ကျော်/ပြီး</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>မှတ်ချက်</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>စုစုပေါင်း</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>KM သွားခဲ့မှု</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>လုပ်ဆောင်ချက်များ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    တွက်ချက်ထားသော ရလဒ်များ မရှိသေးပါ သို့မဟုတ် Filter နှင့် ကိုက်ညီသော Data မရှိပါ။
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => {
                  const isSelected = selectedRows.has(trip.id);
                  return (
                    <TableRow
                      key={trip.id}
                      selected={isSelected}
                      sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleRowSelect(trip.id)}
                        />
                      </TableCell>
                      <TableCell>{trip.id}</TableCell>
                      <TableCell>{trip.date}</TableCell>
                      <TableCell>{trip.car_no}</TableCell>
                      <TableCell>{trip.driver_name}</TableCell>
                      <TableCell>{trip.from_location}</TableCell>
                      <TableCell>{trip.to_location}</TableCell>
                      <TableCell>{formatMMK(trip.route_charge)}</TableCell>
                      <TableCell>{formatMMK(trip.empty_pickup_charge)}</TableCell> {/* Display empty_pickup_charge */}
                      <TableCell>{formatMMK(trip.empty_dropoff_charge)}</TableCell>
                      <TableCell>{trip.overnight_status}</TableCell>
                      <TableCell>{trip.day_over_status}</TableCell>
                      <TableCell>{trip.remarks}</TableCell>
                      <TableCell>{formatMMK(trip.total_charge)}</TableCell>
                      <TableCell>{trip.km_travelled}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton color="info" size="small" onClick={() => handleEdit(trip)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton color="error" size="small" onClick={() => handleDelete(trip)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {/* Grand Total Row */}
              {filteredTrips.length > 0 && (
                <TableRow sx={{ backgroundColor: '#e0e0e0', fontWeight: 'bold', borderTop: '2px solid #ccc' }}>
                  <TableCell colSpan={13} align="right" sx={{ fontWeight: 'bold' }}>
                    စုစုပေါင်း (Grand Total):
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {grandTotalCharge.toLocaleString()} ({formatMMK(grandTotalCharge)})
                  </TableCell>
                  <TableCell colSpan={2}></TableCell> {/* Empty cells for remaining columns */}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Trip Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCancelEdit}
        aria-labelledby="edit-trip-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="edit-trip-dialog-title">ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ခြင်း</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            <TextField
              label="ရက်စွဲ (Date)"
              type="date"
              name="date"
              value={editFormData.date}
              onChange={handleEditChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>ကားနံပါတ် (Car No)</InputLabel>
              <Select
                name="carNo"
                value={editFormData.carNo}
                onChange={handleEditCarNoChange}
                label="ကားနံပါတ် (Car No)"
              >
                <MenuItem value="">ကားနံပါတ် ရွေးပါ</MenuItem>
                {carNumbersData.map((car, index) => (
                  <MenuItem key={index} value={car.number}>{car.number} ({car.gate})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>ယာဉ်မောင်းအမည်</InputLabel>
              <Select
                name="driverName"
                value={editFormData.driverName}
                onChange={handleEditChange}
                label="ယာဉ်မောင်းအမည်"
              >
                <MenuItem value="">ယာဉ်မောင်း ရွေးပါ</MenuItem>
                {driverNames.map((name, index) => (
                  <MenuItem key={index} value={name}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>မှ (From)</InputLabel>
              <Select
                name="from"
                value={editFormData.from}
                onChange={handleEditChange}
                label="မှ (From)"
              >
                <MenuItem value="">နေရာ ရွေးပါ</MenuItem>
                {['အေးရှားဝေါ', 'MIP', 'သီလဝါ'].map((location, index) => (
                  <MenuItem key={index} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>သို့ (To)</InputLabel>
              <Select
                name="to"
                value={editFormData.to}
                onChange={handleEditChange}
                label="သို့ (To)"
              >
                <MenuItem value="">ခရီးစဉ် ရွေးပါ</MenuItem>
                {currentRouteCharges.map((route, index) => (
                  <MenuItem key={index} value={route.route}>
                    {route.route}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="လမ်းကြောင်းခ"
              type="text"
              name="routeCharge"
              value={editFormData.routeCharge || ''}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Typography variant="body2" color="textSecondary">
                    {editFormData.routeCharge ? formatMMK(editFormData.routeCharge) : ''}
                  </Typography>
                ),
              }}
            />
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>အခွံတင်/ချ (Empty Container)</InputLabel>
              <Select
                name="emptyContainer"
                value={editFormData.emptyContainer}
                onChange={handleEditChange}
                label="အခွံတင်/ချ (Empty Container)"
              >
                <MenuItem value="">နေရာ ရွေးပါ (မရှိလျှင် မရွေးပါ)</MenuItem>
                {emptyContainerLocationsData.map((location, index) => (
                  <MenuItem key={index} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="အခွံချခ"
              type="text"
              name="emptyDropoffCharge"
              value={editFormData.emptyDropoffCharge}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/,/g, '');
                if (!isNaN(rawValue) || rawValue === '') {
                  setEditFormData(prev => ({ ...prev, emptyDropoffCharge: rawValue }));
                }
              }}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <Typography variant="body2" color="textSecondary">
                    {editFormData.emptyDropoffCharge && !isNaN(parseFloat(editFormData.emptyDropoffCharge)) ? formatMMK(parseFloat(editFormData.emptyDropoffCharge)) : ''}
                  </Typography>
                ),
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                name="overnightStay"
                checked={editFormData.overnightStay}
                onChange={handleEditChange}
                sx={{ p: 0, mr: 1 }}
              />
              <label htmlFor="overnightStay" className="text-sm font-medium text-gray-700">
                အသားအိပ် (Overnight Stay)
              </label>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                name="dayOverDelayed"
                checked={editFormData.dayOverDelayed}
                onChange={handleEditChange}
                sx={{ p: 0, mr: 1 }}
              />
              <label htmlFor="dayOverDelayed" className="text-sm font-medium text-gray-700">
                နေ့ကျော်/ပြီး (Day Over)
              </label>
            </Box>
            <TextField
              label="KM (ခရီးအကွာအဝေး)"
              type="number"
              name="kmTravelled"
              value={editFormData.kmTravelled}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="မှတ်ချက် (Remarks)"
              name="remarks"
              multiline
              rows={3}
              value={editFormData.remarks}
              onChange={handleEditChange}
              fullWidth
              variant="outlined"
              size="small"
              sx={{ gridColumn: '1 / -1' }} // Span all columns
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3 }}>
            <Typography variant="h6" sx={{ mr: 2, color: 'text.primary' }}>
              စုစုပေါင်း: {formatMMK(calculateTotalCharge(
                editFormData.routeCharge,
                editFormData.emptyDropoffCharge,
                editFormData.overnightStay,
                editFormData.dayOverDelayed,
                editFormData.carNo,
                editFormData.emptyContainer // Pass emptyContainerId for same direction logic
              ))}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} color="secondary">
            မလုပ်တော့ပါ
          </Button>
          <Button onClick={handleSaveEdit} color="primary" variant="contained">
            သိမ်းဆည်းမည်
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"ခရီးစဉ်မှတ်တမ်း ဖျက်သိမ်းခြင်း"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ရက်စွဲ {tripToDelete?.date}၊ ကားနံပါတ် {tripToDelete?.car_no} ခရီးစဉ်မှတ်တမ်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။
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
    </div>
  );
}

export default HomePage;
