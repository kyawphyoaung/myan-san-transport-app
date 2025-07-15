// myan-san/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios'; // axios ကို import လုပ်ပေးခြင်း
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, TextField, Select, MenuItem, FormControl, InputLabel,
  Checkbox, Button, Box, Typography, Alert, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

// Static data များကို import လုပ်ခြင်း
import carNumbersData from '../data/carNumbers.json';
// emptyContainerLocationsData ကို ဖယ်ရှားပါပြီ။ Backend မှ empty_charges_versions ကို သုံးပါမည်။
import kmData from '../data/kmData.json';
import { formatMMK } from '../utils/currencyFormatter'; // Currency formatter ကို import လုပ်ပါ။

function HomePage() {
  // Form input များကို သိမ်းဆည်းရန် state များ
  const [formData, setFormData] = useState({
    date: '',
    carNo: '',
    from: '',
    to: '',
    emptyHandlingLocation: '', // NEW: Empty Container Pickup/Drop-off location name
    overnightStay: false,
    dayOverDelayed: false,
    remarks: '',
    driverName: '',
    routeCharge: 0, // Auto-calculated
    emptyCharge: 0, // NEW: Combined empty pickup/dropoff charge (auto-calculated)
    totalCharge: 0, // Auto-calculated initially, can be manual
    kmTravelled: 0, // Auto-calculated
    isManualEdited: false, // Flag to check if totalCharge was manually edited
  });

  // Editing အတွက် state များ
  const [editingTripId, setEditingTripId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    carNo: '',
    from: '',
    to: '',
    emptyHandlingLocation: '', // NEW: Empty Container Pickup/Drop-off location name
    overnightStay: false,
    dayOverDelayed: false,
    remarks: '',
    driverName: '',
    routeCharge: 0,
    emptyCharge: 0, // NEW: Combined empty pickup/dropoff charge
    totalCharge: 0,
    kmTravelled: 0,
    isManualEdited: false,
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

  // NEW: States for Empty Charges Data from Backend
  const [emptyChargeData, setEmptyChargeData] = useState(null); // Stores empty_locations_charges, same_direction_overrides, port_locations
  const [emptyLocationsOptions, setEmptyLocationsOptions] = useState([]); // For the empty handling location dropdown
  const [portLocations, setPortLocations] = useState(new Set()); // For quick lookup of port locations

  // HomePage Table Filter states (CarNo, Month, Year only)
  const [filterCarNo, setFilterCarNo] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Available options for filters
  const [uniqueCarNumbersForFilter, setUniqueCarNumbersForFilter] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);

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

        let initialFilterYear = years.includes(currentYear) ? currentYear : (years.length > 0 ? years[0] : '');
        setFilterYear(initialFilterYear);

        const monthsForInitialYear = [...new Set(data.data
          .filter(trip => new Date(trip.date).getFullYear() === initialFilterYear)
          .map(trip => new Date(trip.date).getMonth() + 1)
        )].sort((a, b) => a - b);
        setAvailableMonths(monthsForInitialYear);

        let initialFilterMonth = monthsForInitialYear.includes(currentMonth) ? currentMonth : (monthsForInitialYear.length > 0 ? monthsForInitialYear[0] : '');
        setFilterMonth(initialFilterMonth);

        let initialFilterCarNo = '';
        if (data.data.length > 0) {
          const sortedTrips = [...data.data].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateA.getTime() !== dateB.getTime()) {
              return dateB.getTime() - dateA.getTime();
            }
            return b.id - a.id;
          });
          initialFilterCarNo = sortedTrips[0].car_no;
        }
        setFilterCarNo(initialFilterCarNo);

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
  }, []);

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

  // NEW: Fetch active empty charges data
  const fetchEmptyChargeData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/empty-charges/active`);
      const data = res.data.data.emptyCharges;
      setEmptyChargeData(data);
      setEmptyLocationsOptions(data.empty_locations_charges.map(loc => loc.location));
      setPortLocations(new Set(data.port_locations));
    } catch (err) {
      console.error("Error fetching active empty charges data:", err);
      setError("အခွံချ/အခွံတင် စျေးနှုန်းများ ရယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
      setEmptyChargeData(null);
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
      fetchEmptyChargeData(); // Fetch empty charge data
    };

    fetchInitialData();
  }, [fetchTrips, fetchDriverNames, fetchCarDriverAssignments, fetchEmptyChargeData]);

  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (New Trip Form)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
      isManualEdited: name === 'totalCharge' ? true : prevData.isManualEdited // Set manual edit flag if totalCharge is changed
    }));
  };

  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (Edit Trip Form)
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
      isManualEdited: name === 'totalCharge' ? true : prevData.isManualEdited // Set manual edit flag if totalCharge is changed
    }));
  };

  // ကားနံပါတ် ပြောင်းလဲသောအခါ ယာဉ်မောင်းအမည်ကို အလိုအလျောက် ဖြည့်ရန် (New Trip Form)
  const handleCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(assignment => assignment.car_no === carNo && assignment.end_date === null); // Find active assignment
    setFormData(prevData => ({
      ...prevData,
      carNo: carNo,
      driverName: assignedDriver ? assignedDriver.driver_name : '',
    }));
  };

  // ကားနံပါတ် ပြောင်းလဲသောအခါ ယာဉ်မောင်းအမည်ကို အလိုအလျောက် ဖြည့်ရန် (Edit Trip Form)
  const handleEditCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(assignment => assignment.car_no === carNo && assignment.end_date === null); // Find active assignment
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
      const matchesCarNo = carNo === '' ? true : trip.car_no === carNo;
      const matchesYear = year === '' ? true : tripDate.getFullYear() === year;
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
      setFilteredTrips([]);
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
      if (!monthsForSelectedYear.includes(filterMonth) && monthsForSelectedYear.length > 0) {
        setFilterMonth(monthsForSelectedYear[0]);
      } else if (monthsForSelectedYear.length === 0) {
        setFilterMonth('');
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
      if (from === 'သီလဝါ' && to === 'MIP') {
        const sezThilawarRoute = currentRouteCharges.find(r => r.route === 'SEZ/Thilawar Zone');
        return sezThilawarRoute ? sezThilawarRoute.MIP_AWPT_40 : 0;
      }
    }
    return 0;
  }, [currentRouteCharges]);

  // NEW: Frontend logic to calculate empty charges based on selected locations and active data
  // Returns { charge: number, type: 'pickup' | 'dropoff' | 'none' }
  const calculateEmptyChargeFrontend = useCallback((from, to, emptyLoc, tripDate) => {
    if (!emptyChargeData || !emptyLoc) {
      return { charge: 0, type: 'none' };
    }

    const { empty_locations_charges, same_direction_overrides, port_locations } = emptyChargeData;
    const portLocationsSet = new Set(port_locations);

    let baseCharge = 0;
    const locationChargeEntry = empty_locations_charges.find(item => item.location === emptyLoc);
    if (locationChargeEntry) {
      baseCharge = locationChargeEntry.charge_40_ft || 0;
    } else {
      console.warn(`Empty handling location '${emptyLoc}' not found in empty_locations_charges. Base charge will be 0.`);
      return { charge: 0, type: 'none' };
    }

    let chargeType = 'none';
    if (portLocationsSet.has(from)) {
      chargeType = 'dropoff'; // Container came with cargo, dropped empty after cargo delivery
    } else if (portLocationsSet.has(to)) {
      chargeType = 'pickup'; // Container picked up empty, then loaded for delivery to Point B
    } else {
      // console.log(`Neither trip origin (${from}) nor destination (${to}) is a recognized port. No empty charge calculated.`);
      return { charge: 0, type: 'none' };
    }

    // Check for "Same Direction" override
    const isSameDirection = same_direction_overrides.some(rule =>
      rule.main_trip_origin === from &&
      rule.main_trip_destination === to &&
      rule.empty_location === emptyLoc
    );

    if (isSameDirection) {
      // console.log(`Combination (${from} -> ${to} with Empty ${emptyLoc}) is 'Same Direction'. Charge is 0.`);
      return { charge: 0, type: chargeType }; // Same direction, no extra charge
    } else {
      // console.log(`Combination (${from} -> ${to} with Empty ${emptyLoc}) is 'Opposite Direction'. Charge is ${baseCharge}.`);
      return { charge: baseCharge, type: chargeType }; // Opposite direction, apply base charge
    }
  }, [emptyChargeData]);


  // Main calculation function for Total Charge (reusable for new and edit forms)
  const calculateTotalCharge = useCallback((
    currentRouteCharge,
    currentEmptyCharge, // This is the combined empty charge
    overnightStatusBoolean,
    dayOverStatusBoolean,
    currentCarNo
  ) => {
    let total = parseFloat(currentRouteCharge || 0);
    total += parseFloat(currentEmptyCharge || 0);

    const overnightDayoverCombinedCharge = parseFloat(settings.overnight_dayover_combined_charge || 0);
    const gepOvernightCharge = parseFloat(settings.gep_overnight_charge || 0);
    const nineKOvernightCharge = parseFloat(settings['9k_overnight_charge'] || 0);

    // Convert boolean status to string for calculation logic (matches DB values)
    const overnightStatus = overnightStatusBoolean ? 'yes' : 'no'; // Changed to 'yes'/'no' for consistency with backend
    const dayOverStatus = dayOverStatusBoolean ? 'yes' : 'no'; // Changed to 'yes'/'no' for consistency with backend

    if (overnightStatus === 'yes' && dayOverStatus === 'yes') {
      total += overnightDayoverCombinedCharge;
    } else if (overnightStatus === 'yes') { // Only overnight, no dayover
      if (currentCarNo.startsWith('GEP')) {
        total += gepOvernightCharge;
      } else if (currentCarNo.startsWith('9K')) {
        total += nineKOvernightCharge;
      }
    }
    // If only dayOverStatus is 'yes' and overnightStatus is 'no', no extra charge based on current logic.
    return total;
  }, [settings]);


  // Effect to update new trip form's auto-calculated fields
  useEffect(() => {
    if (formData.isManualEdited) return; // Do not auto-calculate if manually edited

    const newRouteCharge = getRouteCharge(formData.from, formData.to);
    const newKmTravelled = kmData.find(k => k.start_point === formData.from && k.destination_point === formData.to)?.km_value || 0;

    // Calculate empty charge
    const emptyChargeResult = calculateEmptyChargeFrontend(formData.from, formData.to, formData.emptyHandlingLocation, formData.date);
    const newEmptyCharge = emptyChargeResult.charge;

    const newTotalCharge = calculateTotalCharge(
      newRouteCharge,
      newEmptyCharge,
      formData.overnightStay,
      formData.dayOverDelayed,
      formData.carNo
    );

    setFormData(prevData => ({
      ...prevData,
      routeCharge: newRouteCharge,
      emptyCharge: newEmptyCharge,
      kmTravelled: newKmTravelled,
      totalCharge: newTotalCharge,
    }));
  }, [formData.from, formData.to, formData.emptyHandlingLocation, formData.overnightStay, formData.dayOverDelayed, formData.carNo, formData.date, formData.isManualEdited, getRouteCharge, calculateEmptyChargeFrontend, calculateTotalCharge]);


  // Effect to update edit trip form's auto-calculated fields
  useEffect(() => {
    if (editFormData.isManualEdited) return; // Do not auto-calculate if manually edited

    const newRouteCharge = getRouteCharge(editFormData.from, editFormData.to);
    const newKmTravelled = kmData.find(k => k.start_point === editFormData.from && k.destination_point === editFormData.to)?.km_value || 0;

    // Calculate empty charge for edit form
    const emptyChargeResult = calculateEmptyChargeFrontend(editFormData.from, editFormData.to, editFormData.emptyHandlingLocation, editFormData.date);
    const newEmptyCharge = emptyChargeResult.charge;

    const newTotalCharge = calculateTotalCharge(
      newRouteCharge,
      newEmptyCharge,
      editFormData.overnightStay,
      editFormData.dayOverDelayed,
      editFormData.carNo
    );

    setEditFormData(prevData => ({
      ...prevData,
      routeCharge: newRouteCharge,
      emptyCharge: newEmptyCharge,
      kmTravelled: newKmTravelled,
      totalCharge: newTotalCharge,
    }));
  }, [editFormData.from, editFormData.to, editFormData.emptyHandlingLocation, editFormData.overnightStay, editFormData.dayOverDelayed, editFormData.carNo, editFormData.date, editFormData.isManualEdited, getRouteCharge, calculateEmptyChargeFrontend, calculateTotalCharge]);


  // တွက်ချက်ရန် ခလုတ် နှိပ်သောအခါ လုပ်ဆောင်မည့် function (New Trip)
  const handleCalculateAndSave = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!formData.date || !formData.carNo || !formData.from || !formData.to || !formData.driverName) {
      setError('ကျေးဇူးပြု၍ ရက်စွဲ၊ ကားနံပါတ်၊ မှ၊ သို့ နှင့် ယာဉ်မောင်းအမည် နေရာများကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }

    // Determine empty_pickup_charge and empty_dropoff_charge for backend based on emptyCharge and emptyHandlingLocation
    let empty_pickup_charge_for_backend = 0;
    let empty_dropoff_charge_for_backend = 0;
    let remarks_for_backend = formData.remarks;

    if (formData.emptyHandlingLocation) {
      const emptyChargeResult = calculateEmptyChargeFrontend(formData.from, formData.to, formData.emptyHandlingLocation, formData.date);
      if (emptyChargeResult.type === 'pickup') {
        empty_pickup_charge_for_backend = emptyChargeResult.charge;
      } else if (emptyChargeResult.type === 'dropoff') {
        empty_dropoff_charge_for_backend = emptyChargeResult.charge;
      }
      if (emptyChargeResult.charge === 0 && (emptyChargeResult.type === 'pickup' || emptyChargeResult.type === 'dropoff')) {
        remarks_for_backend += (remarks_for_backend ? "; " : "") + "အခွံတင်/ချ - လားရာတူသောကြောင့် ဝန်ဆောင်ခ မရရှိပါ။";
      }
    }

    const tripDataToSave = {
      date: formData.date,
      carNo: formData.carNo,
      from_location: formData.from,
      to_location: formData.to,
      routeCharge: formData.routeCharge, // Use the auto-calculated routeCharge from state
      empty_pickup_charge: empty_pickup_charge_for_backend, // Send to backend
      empty_dropoff_charge: empty_dropoff_charge_for_backend, // Send to backend
      empty_handling_location: formData.emptyHandlingLocation || null, // Send selected empty handling location
      overnight_status: formData.overnightStay ? 'yes' : 'no', // Send 'yes'/'no'
      day_over_status: formData.dayOverDelayed ? 'yes' : 'no', // Send 'yes'/'no'
      remarks: remarks_for_backend,
      total_charge: formData.totalCharge, // Use the auto-calculated or manually edited totalCharge from state
      km_travelled: formData.kmTravelled, // Use the auto-calculated kmTravelled from state
      fuel_amount: 0,
      fuel_cost: 0,
      driverName: formData.driverName,
      is_manual_edited: formData.isManualEdited ? 1 : 0, // Send 1 if manually edited, 0 otherwise
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/trips`, tripDataToSave);

      if (response.status === 201) {
        setSuccessMessage("ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
        // Clear form fields, resetting isManualEdited to false
        setFormData({
          date: new Date().toISOString().split('T')[0],
          carNo: '',
          from: '',
          to: '',
          emptyHandlingLocation: '',
          overnightStay: false,
          dayOverDelayed: false,
          remarks: '',
          driverName: '',
          routeCharge: 0,
          emptyCharge: 0,
          totalCharge: 0,
          kmTravelled: 0,
          isManualEdited: false,
        });
        fetchTrips(); // Refresh data and update filters
      } else {
        setError(`ခရီးစဉ်မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`ခရီးစဉ်မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response?.data?.error || err.message}`);
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
      emptyHandlingLocation: trip.empty_handling_location || '', // Set empty handling location
      overnightStay: trip.overnight_status === 'yes', // Convert 'yes'/'no' to boolean
      dayOverDelayed: trip.day_over_status === 'yes', // Convert 'yes'/'no' to boolean
      remarks: trip.remarks || '',
      driverName: trip.driver_name || '',
      routeCharge: trip.route_charge,
      emptyCharge: (trip.empty_pickup_charge || 0) + (trip.empty_dropoff_charge || 0), // Combine for display
      totalCharge: trip.total_charge,
      kmTravelled: trip.km_travelled,
      isManualEdited: trip.is_manual_edited === 1, // Convert 0/1 to boolean
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

    // Determine empty_pickup_charge and empty_dropoff_charge for backend based on emptyCharge and emptyHandlingLocation
    let empty_pickup_charge_for_backend = 0;
    let empty_dropoff_charge_for_backend = 0;
    let remarks_for_backend = editFormData.remarks;

    if (!editFormData.isManualEdited && editFormData.emptyHandlingLocation) {
        // Recalculate empty charges if not manually edited
        const emptyChargeResult = calculateEmptyChargeFrontend(editFormData.from, editFormData.to, editFormData.emptyHandlingLocation, editFormData.date);
        if (emptyChargeResult.type === 'pickup') {
            empty_pickup_charge_for_backend = emptyChargeResult.charge;
        } else if (emptyChargeResult.type === 'dropoff') {
            empty_dropoff_charge_for_backend = emptyChargeResult.charge;
        }
        if (emptyChargeResult.charge === 0 && (emptyChargeResult.type === 'pickup' || emptyChargeResult.type === 'dropoff')) {
            remarks_for_backend += (remarks_for_backend ? "; " : "") + "အခွံတင်/ချ - လားရာတူသောကြောင့် ဝန်ဆောင်ခ မရရှိပါ။";
        }
    } else {
        // If manually edited, use the combined emptyCharge from editFormData for both pickup/dropoff
        // This is a simplification; ideally, you'd store/edit pickup and dropoff separately if manual.
        // For now, we'll put the combined value into empty_pickup_charge and set dropoff to 0 if manually edited.
        // Or, if the backend handles it as a single 'emptyCharge' field, that's easier.
        // Given the backend expects empty_pickup_charge and empty_dropoff_charge,
        // if isManualEdited, we should assume the user manually set the *total* empty charge,
        // and for simplicity, assign it to pickup and set dropoff to 0.
        // A better UI would let them manually set pickup and dropoff separately.
        empty_pickup_charge_for_backend = parseFloat(editFormData.emptyCharge) || 0;
        empty_dropoff_charge_for_backend = 0; // Assuming combined goes to pickup for simplicity
    }


    const tripDataToUpdate = {
      date: editFormData.date,
      carNo: editFormData.carNo,
      from_location: editFormData.from,
      to_location: editFormData.to,
      routeCharge: editFormData.routeCharge, // Use the auto-calculated routeCharge from state
      empty_pickup_charge: empty_pickup_charge_for_backend, // Send to backend
      empty_dropoff_charge: empty_dropoff_charge_for_backend, // Send to backend
      empty_handling_location: editFormData.emptyHandlingLocation || null, // Send selected empty handling location
      overnight_status: editFormData.overnightStay ? 'yes' : 'no',
      day_over_status: editFormData.dayOverDelayed ? 'yes' : 'no',
      remarks: remarks_for_backend,
      total_charge: editFormData.totalCharge, // Use the auto-calculated or manually edited totalCharge from state
      km_travelled: editFormData.kmTravelled, // Use the auto-calculated kmTravelled from state
      fuel_amount: 0,
      fuel_cost: 0,
      driverName: editFormData.driverName,
      is_manual_edited: editFormData.isManualEdited ? 1 : 0,
    };

    try {
      const response = await axios.put(`${API_BASE_URL}/api/trips/${editingTripId}`, tripDataToUpdate);

      if (response.status === 200) {
        setSuccessMessage('ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။');
        setEditingTripId(null);
        setEditDialogOpen(false);
        fetchTrips();
      } else {
        setError(`ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response?.data?.error || err.message}`);
      console.error('Error saving trip edit:', err);
    }
  };

  // Handle Cancel Edit button click (from Dialog)
  const handleCancelEdit = () => {
    setEditingTripId(null);
    setEditDialogOpen(false);
    // Reset edit form states, resetting isManualEdited to false
    setEditFormData({
      date: '', carNo: '', from: '', to: '', emptyHandlingLocation: '',
      overnightStay: false, dayOverDelayed: false, remarks: '', driverName: '',
      routeCharge: 0, emptyCharge: 0, totalCharge: 0, kmTravelled: 0,
      isManualEdited: false,
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
      const response = await axios.delete(`${API_BASE_URL}/api/trips/${tripToDelete.id}`);
      if (response.status === 200) {
        setSuccessMessage('ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ပြီးပါပြီ။');
        fetchTrips();
      } else {
        setError(`ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.response?.data?.error || err.message}`);
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
      "ယာဉ်မောင်း": trip.driver_name,
      "မှ (From)": trip.from_location,
      "သို့ (To)": trip.to_location,
      "လမ်းကြောင်းခ (Route Charge)": trip.route_charge,
      "အခွံတင်/ချ နေရာ": trip.empty_handling_location || '', // NEW: Export empty handling location
      "အခွံတင်ခ (Empty Pickup Charge)": trip.empty_pickup_charge, // Keep for export detail
      "အခွံချခ (Empty Drop-off Charge)": trip.empty_dropoff_charge, // Keep for export detail
      "အသား/အခွံ အိပ်": trip.overnight_status,
      "နေ့ကျော်/ပြီး": trip.day_over_status,
      "မှတ်ချက်": trip.remarks,
      "စုစုပေါင်း": trip.total_charge,
      "KM သွားခဲ့မှု": trip.km_travelled,
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
              readOnly: true,
              endAdornment: (
                <Typography variant="body2" color="textSecondary">
                  {formData.routeCharge ? formatMMK(formData.routeCharge) : ''}
                </Typography>
              ),
            }}
            className="bg-gray-100 rounded-md"
          />
        </div>

        {/* NEW: အခွံတင်/ချ နေရာ (Empty Handling Location) */}
        {/* Only show if "from" or "to" is a port */}
        {(portLocations.has(formData.from) || portLocations.has(formData.to)) && (
          <div>
            <label htmlFor="emptyHandlingLocation" className="block text-sm font-medium text-gray-700 mb-1">
              အခွံတင်/ချ နေရာ
            </label>
            <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
              <Select
                id="emptyHandlingLocation"
                name="emptyHandlingLocation"
                value={formData.emptyHandlingLocation}
                onChange={handleChange}
              >
                <MenuItem value=""><em>ရွေးချယ်ပါ (မရှိလျှင် မရွေးပါ)</em></MenuItem>
                {emptyLocationsOptions.map((loc, index) => (
                  <MenuItem key={index} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}

        {/* NEW: အခွံတင်/ချ (Empty Charge) - Combined display, auto-calculated */}
        {/* Only show if "from" or "to" is a port */}
        {(portLocations.has(formData.from) || portLocations.has(formData.to)) && (
          <div>
            <label htmlFor="emptyCharge" className="block text-sm font-medium text-gray-700 mb-1">
              အခွံတင်/ချ <span className="text-xs text-gray-500">(Auto)</span>
            </label>
            <TextField
              type="text"
              id="emptyCharge"
              name="emptyCharge"
              value={formData.emptyCharge || ''}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <Typography variant="body2" color="textSecondary">
                    {formData.emptyCharge ? formatMMK(formData.emptyCharge) : ''}
                  </Typography>
                ),
              }}
              className="bg-gray-100 rounded-md"
            />
          </div>
        )}


        {/* KM (ခရီးအကွာအဝေး) - Display only */}
        <div>
          <label htmlFor="kmTravelled" className="block text-sm font-medium text-gray-700 mb-1">
            KM (ခရီးအကွာအဝေး) <span className="text-xs text-gray-500">(Auto)</span>
          </label>
          <TextField
            type="number"
            id="kmTravelled"
            name="kmTravelled"
            value={formData.kmTravelled || ''}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{ readOnly: true }}
            className="bg-gray-100 rounded-md"
          />
        </div>

        {/* အသားအိပ် (Overnight Stay with Cargo) */}
        <div className="flex items-center">
          <FormControlLabel
            control={
              <Checkbox
                id="overnightStay"
                name="overnightStay"
                checked={formData.overnightStay}
                onChange={handleChange}
                sx={{ p: 0, mr: 1 }}
              />
            }
            label="အသားအိပ် (Overnight Stay with Cargo)"
            className="text-sm font-medium text-gray-700"
          />
        </div>

        {/* နေ့ကျော်/ပြီး (Day Over/Delayed) */}
        <div className="flex items-center">
          <FormControlLabel
            control={
              <Checkbox
                id="dayOverDelayed"
                name="dayOverDelayed"
                checked={formData.dayOverDelayed}
                onChange={handleChange}
                sx={{ p: 0, mr: 1 }}
              />
            }
            label="နေ့ကျော်/ပြီး (Day Over/Delayed)"
            className="text-sm font-medium text-gray-700"
          />
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
          စုစုပေါင်း: {formatMMK(formData.totalCharge)}
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isManualEdited}
              onChange={(e) => setFormData(prev => ({ ...prev, isManualEdited: e.target.checked }))}
              name="isManualEdited"
              color="primary"
            />
          }
          label="စုစုပေါင်းကျသင့်ငွေကို ကိုယ်တိုင်ပြင်မည်"
          sx={{ mr: 2 }}
        />
        <Button
          onClick={handleCalculateAndSave}
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
              <MenuItem value="">အားလုံး</MenuItem>
              {availableYears.filter(year => year !== null && year !== undefined).map((year, index) => (
                <MenuItem key={index} value={year}>
                  {year}
                </MenuItem>
              ))}
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
              <MenuItem value="">အားလုံး</MenuItem>
              {monthNames.filter(month => month !== null && month !== undefined).map((month) => (
                <MenuItem key={month.value} value={month.value}>
                  {month.label}
                </MenuItem>
              ))}
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
              <MenuItem value="">အားလုံး</MenuItem>
              {uniqueCarNumbersForFilter.filter(carNo => carNo !== null && carNo !== undefined).map((carNo, index) => (
                <MenuItem key={index} value={carNo}>
                  {carNo}
                </MenuItem>
              ))}
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
                <TableCell sx={{ fontWeight: 'bold' }}>အခွံတင်/ချ</TableCell> {/* Combined column */}
                <TableCell sx={{ fontWeight: 'bold' }}>ညအိပ်ခ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ရက်ကျော်/ပြီး</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>မှတ်ချက်</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>စုစုပေါင်း</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>KM သွားခဲ့မှု</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>လုပ်ဆောင်ချက်များ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    တွက်ချက်ထားသော ရလဒ်များ မရှိသေးပါ သို့မဟုတ် Filter နှင့် ကိုက်ညီသော Data မရှိပါ။
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => {
                  const isSelected = selectedRows.has(trip.id);
                  const combinedEmptyCharge = (trip.empty_pickup_charge || 0) + (trip.empty_dropoff_charge || 0);
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
                      <TableCell>{formatMMK(combinedEmptyCharge)}</TableCell> {/* Display combined empty charge */}
                      <TableCell>{trip.overnight_status === 'yes' ? 'ရှိသည်' : 'မရှိပါ'}</TableCell>
                      <TableCell>{trip.day_over_status === 'yes' ? 'ရှိသည်' : 'မရှိပါ'}</TableCell>
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
                  <TableCell colSpan={12} align="right" sx={{ fontWeight: 'bold' }}>
                    စုစုပေါင်း (Grand Total):
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {formatMMK(grandTotalCharge)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
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
            {/* NEW: အခွံတင်/ချ နေရာ (Empty Handling Location) for Edit Dialog */}
            {(portLocations.has(editFormData.from) || portLocations.has(editFormData.to)) && (
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>အခွံတင်/ချ နေရာ</InputLabel>
                <Select
                  name="emptyHandlingLocation"
                  value={editFormData.emptyHandlingLocation}
                  onChange={handleEditChange}
                  label="အခွံတင်/ချ နေရာ"
                >
                  <MenuItem value=""><em>ရွေးချယ်ပါ (မရှိလျှင် မရွေးပါ)</em></MenuItem>
                  {emptyLocationsOptions.map((loc, index) => (
                    <MenuItem key={index} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* NEW: အခွံတင်/ချ (Empty Charge) for Edit Dialog */}
            {(portLocations.has(editFormData.from) || portLocations.has(editFormData.to)) && (
              <div>
                <label htmlFor="editEmptyCharge" className="block text-sm font-medium text-gray-700 mb-1">
                  အခွံတင်/ချ
                </label>
                <TextField
                  type="text"
                  id="editEmptyCharge"
                  name="emptyCharge"
                  value={editFormData.emptyCharge || ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '');
                    if (!isNaN(rawValue) || rawValue === '') {
                      setEditFormData(prev => ({ ...prev, emptyCharge: rawValue, isManualEdited: true }));
                    }
                  }}
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    readOnly: !editFormData.isManualEdited, // Read-only if not manually edited
                    endAdornment: (
                      <Typography variant="body2" color="textSecondary">
                        {editFormData.emptyCharge && !isNaN(parseFloat(editFormData.emptyCharge)) ? formatMMK(parseFloat(editFormData.emptyCharge)) : ''}
                      </Typography>
                    ),
                  }}
                  className={!editFormData.isManualEdited ? "bg-gray-100 rounded-md" : "rounded-md"}
                />
              </div>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="overnightStay"
                    checked={editFormData.overnightStay}
                    onChange={handleEditChange}
                    sx={{ p: 0, mr: 1 }}
                  />
                }
                label="အသားအိပ် (Overnight Stay)"
                className="text-sm font-medium text-gray-700"
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="dayOverDelayed"
                    checked={editFormData.dayOverDelayed}
                    onChange={handleEditChange}
                    sx={{ p: 0, mr: 1 }}
                  />
                }
                label="နေ့ကျော်/ပြီး (Day Over)"
                className="text-sm font-medium text-gray-700"
              />
            </Box>
            <TextField
              label="KM (ခရီးအကွာအဝေး)"
              type="number"
              name="kmTravelled"
              value={editFormData.kmTravelled || ''}
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
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3 }}>
            <Typography variant="h6" sx={{ mr: 2, color: 'text.primary' }}>
              စုစုပေါင်း: {formatMMK(editFormData.totalCharge)}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={editFormData.isManualEdited}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, isManualEdited: e.target.checked }))}
                  name="isManualEdited"
                  color="primary"
                />
              }
              label="စုစုပေါင်းကျသင့်ငွေကို ကိုယ်တိုင်ပြင်မည်"
              sx={{ mr: 2 }}
            />
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
