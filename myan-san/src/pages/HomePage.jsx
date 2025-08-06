// myan-san/src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios'; // axios ကို import လုပ်ပေးခြင်း
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, TextField, Select, MenuItem, FormControl, InputLabel,
  Checkbox, Button, Box, Typography, Alert, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, ListSubheader
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { parseISO, addDays, setHours, setMinutes, isAfter, format } from 'date-fns'; // date-fns functions
// import html2pdf from 'html2pdf.js'; // html2pdf library ကို ဖယ်ရှားလိုက်ပါပြီ။
import '../index.css'; // Global CSS (print styles for index.css)
// Static data များကို import လုပ်ခြင်း
import carNumbersData from '../data/carNumbers.json';
import kmData from '../data/kmData.json';
import { formatMMK } from '../utils/currencyFormatter'; // Currency formatter ကို import လုပ်ပါ။
import groupedRoutes from '../data/groupedRoutes.json';

// မှ သို့ လမ်းကြောင်းခ နဲ့ပက်သက်ရင် const getRouteCharge ကို စစ်

function HomePage() {
  // Form input များကို သိမ်းဆည်းရန် state များ
  const [formData, setFormData] = useState({
    date: '', // Start Date (YYYY-MM-DD)
    startTime: '00:00', // NEW: Start Time (HH:MM) - Default to 00:00
    endDate: '', // NEW: Trip End Date (YYYY-MM-DD)
    endTime: '00:00', // NEW: Trip End Time (HH:MM) - Default to 00:00
    carNo: '',
    from: '',
    to: '',
    emptyHandlingLocation: '',
    overnightStay: false,
    dayOverDelayed: false,
    remarks: '',
    agentName: '', // NEW: Agent Name
    driverName: '',
    routeCharge: 0,
    emptyCharge: 0,
    totalCharge: 0,
    isManualEdited: false,
    overnightCharges: 0,
    dayOverCharges: 0,
  });

  // Editing အတွက် state များ
  const [editingTripId, setEditingTripId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    startTime: '',
    endDate: '',
    endTime: '',
    carNo: '',
    from: '',
    to: '',
    emptyHandlingLocation: '',
    overnightStay: false,
    dayOverDelayed: false,
    remarks: '',
    agentName: '',
    driverName: '',
    routeCharge: 0,
    emptyCharge: 0,
    totalCharge: 0,
    isManualEdited: false,
  });

  // Manual override flags for overnight/dayover (new trip form)
  const [isOvernightStayManual, setIsOvernightStayManual] = useState(false);
  const [isDayOverDelayedManual, setIsDayOverDelayedManual] = useState(false);

  // Manual override flags for overnight/dayover (edit trip form)
  const [isEditOvernightStayManual, setIsEditOvernightStayManual] = useState(false);
  const [isEditDayOverDelayedManual, setIsEditDayOverDelayedManual] = useState(false);


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
  // Empty Charges Data from Backend
  const [emptyChargeData, setEmptyChargeData] = useState(null);
  const [emptyLocationsOptions, setEmptyLocationsOptions] = useState([]);
  const [portLocations, setPortLocations] = useState(new Set());
  // Agent Names for dropdown
  const [agentNames, setAgentNames] = useState([]);

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

  // NEW: State to control whether to show print-specific content
  const [showPrintView, setShowPrintView] = useState(false);

  //For LarYar Button
  const [buttonState, setButtonState] = useState(null);

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

        // Extract unique years and car numbers from fetched data for filters
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

  // Agent အမည်များကို Backend မှ fetch လုပ်ရန် function (NEW)
  const fetchAgentNames = useCallback(async () => {
    try {
      // For now, using a hardcoded list for agents. Replace with API call if needed.
      // Make sure the server.js has this API if you uncomment
      // const response = await fetch(`${API_BASE_URL}/api/agent-names`);
      // const data = await response.json();
      // if (data.message === "success") {
      //   setAgentNames(data.data);
      // } else {
      //   console.error("Failed to fetch agent names:", data.error);
      // }
      const agents = ['ဖိုးချမ်း', 'ကိုစိုင်း', 'ကျော်သူနိုင်', 'ကိုစိုင်း']; // Placeholder list
      setAgentNames(agents);
    } catch (error) {
      console.error("Error fetching agent names:", error);
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

  // Fetch active empty charges data
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
    const currentTime = format(new Date(), 'HH:mm'); // Current time in HH:MM format

    // Set default start/end date/time for new trip
    setFormData(prevData => ({ ...prevData, date: today, startTime: currentTime, endDate: today, endTime: currentTime }));

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
      fetchAgentNames(); // Fetch agent names
      fetchCarDriverAssignments();
      fetchEmptyChargeData(); // Fetch empty charge data
    };

    fetchInitialData();
  }, [fetchTrips, fetchDriverNames, fetchAgentNames, fetchCarDriverAssignments, fetchEmptyChargeData]);


  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (New Trip Form)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Handle manual override for overnightStay and dayOverDelayed
    if (name === 'overnightStay') {
      setIsOvernightStayManual(true);
    } else if (name === 'dayOverDelayed') {
      setIsDayOverDelayedManual(true);
      if (checked) {
        // overnightStay ကိုပါ true အဖြစ် auto-checked လုပ်ပါ
        setFormData(prevData => ({
          ...prevData,
          dayOverDelayed: true,
          overnightStay: true // <-- overnightStay ကို true လုပ်လိုက်ပါ
        }));
        // manual flag ကိုလည်း မှတ်ပါ
        setIsDayOverDelayedManual(true);
        setIsOvernightStayManual(true);
      } else {
        // dayOverDelayed ကို uncheck လုပ်ရင် (false ဖြစ်ရင်)
        setFormData(prevData => ({
          ...prevData,
          dayOverDelayed: false,
        }));
        setIsDayOverDelayedManual(true);
      }
    } else if (name === 'date' || name === 'startTime' || name === 'endDate' || name === 'endTime' || name === 'from') { // Reset manual flags when key auto-calculation fields change
      setIsOvernightStayManual(false);
      setIsDayOverDelayedManual(false);
    }

    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
      isManualEdited: name === 'totalCharge' ? true : prevData.isManualEdited
    }));
  };

  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (Edit Trip Form)
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'overnightStay') {
      setIsOvernightStayManual(true);
    } else if (name === 'dayOverDelayed') {
      setIsDayOverDelayedManual(true);
      if (checked) {
        // overnightStay ကိုပါ true အဖြစ် auto-checked လုပ်ပါ
        setEditFormData(prevData => ({
          ...prevData,
          dayOverDelayed: true,
          overnightStay: true // <-- overnightStay ကို true လုပ်လိုက်ပါ
        }));
        // manual flag ကိုလည်း မှတ်ပါ
        setIsDayOverDelayedManual(true);
        setIsOvernightStayManual(true);
      } else {
        // dayOverDelayed ကို uncheck လုပ်ရင် (false ဖြစ်ရင်)
        setFormData(prevData => ({
          ...prevData,
          dayOverDelayed: false,
        }));
        setIsDayOverDelayedManual(true);
      }
    } else if (name === 'date' || name === 'startTime' || name === 'endDate' || name === 'endTime' || name === 'from') { // Reset manual flags when key auto-calculation fields change
      setIsOvernightStayManual(false);
      setIsDayOverDelayedManual(false);
    }

    setEditFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
      isManualEdited: name === 'totalCharge' ? true : prevData.isManualEdited
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
      const tripStartDate = parseISO(trip.date); // Use parseISO for robustness
      const matchesCarNo = carNo === '' ? true : trip.car_no === carNo;
      const matchesYear = year === '' ? true : tripStartDate.getFullYear() === year;
      const matchesMonth = month === '' ? true : (tripStartDate.getMonth() + 1) === month;
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
        .filter(trip => parseISO(trip.date).getFullYear() === filterYear)
        .map(trip => parseISO(trip.date).getMonth() + 1)
      )].sort((a, b) => a - b);
      setAvailableMonths(monthsForSelectedYear);
      if (!monthsForSelectedYear.includes(filterMonth) && monthsForSelectedYear.length > 0) {
        setFilterMonth(''); // Default to 'All' if current month is not available for new year
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
    // Special case ကို အရင်ဆုံး စစ်ဆေးပါ။
    if (from === 'သီလဝါ' && to === 'MIP') {
      const sezThilawarRoute = currentRouteCharges.find(r => r.route === 'SEZ/Thilawar Zone');
      return sezThilawarRoute ? sezThilawarRoute.MIP_AWPT_40 : 0;
    }

    // from နဲ့ to ထဲက ဘယ်ဟာက ဆိပ်ကမ်းနာမည်လဲဆိုတာကို ရှာဖွေပါ။
    const ports = ['အေးရှားဝေါ', 'MIP', 'သီလဝါ'];
    const tripRoute = ports.includes(from) ? to : from;

    // အခုမှ tripRoute ကို အသုံးပြုပြီး မှန်ကန်တဲ့ route ကို ရှာဖွေပါ။
    const route = currentRouteCharges.find(r => {
      const isExactMatch = r.route === tripRoute;
      const isPartialMatch = r.route.split(/[\/+]/).includes(tripRoute);
      return isExactMatch || isPartialMatch;
    });
    // console.log("ရှာဖွေရရှိသော route သည်",route)
    if (route) {
      // from သို့မဟုတ် to က အေးရှားဝေါ/MIP ဖြစ်ရင် MIP_AWPT_40 ကို ရွေးပါ။
      if (from === 'အေးရှားဝေါ' || from === 'MIP' || to === 'အေးရှားဝေါ' || to === 'MIP') {
        return route.MIP_AWPT_40;
      }
      // from သို့မဟုတ် to က သီလဝါ ဖြစ်ရင် MIIT_40 ကို ရွေးပါ။
      else if (from === 'သီလဝါ' || to === 'သီလဝါ') {
        return route.MIIT_40;
      }
    }

    return 0;
  }, [currentRouteCharges]);

  // Frontend logic to calculate empty charges based on selected locations and active data
  const calculateEmptyChargeFrontend = useCallback((from, to, emptyLoc, tripDate, buttonState) => {
    // 1. Initial Checks and Setup
    if (!emptyChargeData || !emptyLoc) {
      return { charge: 0, type: 'none' };
    }

    const { empty_locations_charges, same_direction_charges, no_charge_routes, port_locations } = emptyChargeData;
    const portLocationsSet = new Set(port_locations);
    let routeType = 'none';

    if (portLocationsSet.has(from)) {
      routeType = 'import'; // dropoff
    } else if (portLocationsSet.has(to)) {
      routeType = 'export'; // pickup
    }

    // 2. Button State Logic (Highest Priority)
    // User က manual override လုပ်ထားတာဖြစ်လို့ အရင်ဆုံးစစ်ရပါမယ်။
    if (buttonState === 'same') {
      return { charge: 0, type: 'same' };
    } else if (buttonState === 'opposite') {
      const oppositeDirectionCharge = empty_locations_charges.find(item => item.location === emptyLoc);
      // Button က 'opposite' ဖြစ်နေရင်တော့ opposite charge ကိုပဲ အတင်းတွက်ပါ။
      return { charge: oppositeDirectionCharge ? oppositeDirectionCharge.charge_40_ft : 0, type: 'opposite' };
    }

    // 3. No Charge Logic (Auto-calculation Priority 1)
    // Check for export ports with no empty charge
    if (routeType === "export" && (emptyLoc === "MIP" || emptyLoc === "MEC" || emptyLoc === "အေးရှားဝေါ" || emptyLoc === "အလုံ")) {
      return { charge: 0, type: routeType };
    }

    // Check for specific no-charge routes
    const noChargeRouteFound = no_charge_routes.some(rule =>
      rule.main_trip_origin === from &&
      rule.main_trip_destination === to &&
      rule.empty_location === emptyLoc
    );
    if (noChargeRouteFound) {
      return { charge: 0, type: routeType };
    }

    // 4. Same Direction Extra Charge Logic (Auto-calculation Priority 2)
    const sameExtraDirectionCharge = same_direction_charges.find(item =>
      item.empty_location.includes(emptyLoc) && (item.location_one === from || item.location_one === to)
    );
    if (sameExtraDirectionCharge) {
      return { charge: sameExtraDirectionCharge.charge_40_ft, type: routeType };
    }

    // 5. Default Case: Opposite Direction Charge (Auto-calculation Final Priority)
    const oppositeDirectionCharge = empty_locations_charges.find(item => item.location === emptyLoc);
    if (oppositeDirectionCharge) {
      return { charge: oppositeDirectionCharge.charge_40_ft, type: routeType };
    }

    // Fallback if emptyLoc is not found in any list
    console.warn(`Empty handling location '${emptyLoc}' not found in any charge list. Defaulting to 0.`);
    return { charge: 0, type: routeType };

  }, [emptyChargeData, buttonState]);


  // Logic to auto-calculate overnightStay and dayOverDelayed based on dates and times
  const autoCalculateOvernightAndDayOver = useCallback((startDateStr, startTimeStr, endDateStr, endTimeStr, fromLocation) => {
    let suggestedOvernightStay = false;
    let suggestedDayOverDelayed = false;

    // Ensure all necessary date/time strings are present
    if (!startDateStr || !startTimeStr || !endDateStr || !endTimeStr) {
      return { overnightStay: false, dayOverDelayed: false };
    }

    try {
      const startDateTime = parseISO(`${startDateStr}T${startTimeStr}`);
      const endDateTime = parseISO(`${endDateStr}T${endTimeStr}`);

      // Auto-calculate overnightStay
      // Trip ends after 6:30 AM on the next day from start date
      const nextDay630AM = setMinutes(setHours(addDays(startDateTime, 1), 6), 30);
      if (isAfter(endDateTime, nextDay630AM)) {
        suggestedOvernightStay = true;
      }

      // Auto-calculate dayOverDelayed
      const nextDay1AM = setMinutes(setHours(addDays(startDateTime, 1), 1), 0);
      const nextDay230AM = setMinutes(setHours(addDays(startDateTime, 1), 2), 30);

      if (fromLocation === 'အေးရှားဝေါ') {
        if (isAfter(endDateTime, nextDay1AM)) {
          suggestedDayOverDelayed = true;
        }
      } else { // Not 'အေးရှားဝေါ'
        if (isAfter(endDateTime, nextDay230AM)) {
          suggestedDayOverDelayed = true;
        }
      }

      return {
        overnightStay: suggestedOvernightStay,
        dayOverDelayed: suggestedDayOverDelayed
      };
    } catch (e) {
      console.error("Error in autoCalculateOvernightAndDayOver:", e);
      return { overnightStay: false, dayOverDelayed: false }; // Default to false on error
    }
  }, []);

  // Main calculation function for Total Charge (reusable for new and edit forms)
  const calculateTotalCharge = useCallback((
    currentRouteCharge,
    currentEmptyCharge, // This is the combined empty charge
    overnightStatusBoolean, // true/false
    dayOverStatusBoolean, // true/false
    currentCarNo
  ) => {
    let total = parseFloat(currentRouteCharge || 0);
    total += parseFloat(currentEmptyCharge || 0);

    const overnightDayoverCombinedCharge = parseFloat(settings.overnight_dayover_combined_charge || 0);
    const gepOvernightCharge = parseFloat(settings.gep_overnight_charge || 0);
    const nineKOvernightCharge = parseFloat(settings['9k_overnight_charge'] || 0);
    let overNightCharges = 0.0;
    let DayOverCharges = 0.0;


    const selectedCar = carNumbersData.find(car => car.number === currentCarNo);
    // ရှာတွေ့ရင် gate တန်ဖိုးကို ယူပါ၊ မတွေ့ရင်တော့ null သို့မဟုတ် '' ထားပါ
    const car_gate = selectedCar ? selectedCar.gate : '';


    if (overnightStatusBoolean && dayOverStatusBoolean) {
      overNightCharges = 80000;
      DayOverCharges = 120000;
      total += overnightDayoverCombinedCharge;

    } else if (overnightStatusBoolean) { // Only overnight, no dayover
      if (car_gate.includes('GEP')) {
        overNightCharges += gepOvernightCharge;
        DayOverCharges = overnightDayoverCombinedCharge - overNightCharges;
        total += gepOvernightCharge;
      } else if (car_gate.includes('9K')) {

        overNightCharges += nineKOvernightCharge;
        DayOverCharges = overnightDayoverCombinedCharge - overNightCharges;
        total += nineKOvernightCharge;
      }
    }
    return {
      newTotalCharge: total,
      overNightCharges: overNightCharges,
      DayOverCharges: DayOverCharges
    }
  }, [settings, formData.overnightStay, formData.dayOverDelayed]);

  // Effect to update new trip form's auto-calculated fields (route, km, emptyCharge, totalCharge, overnight, dayover)
  useEffect(() => {
    // Only auto-calculate if totalCharge is NOT manually edited
    // AND if any key calculation fields are present
    if (formData.isManualEdited) return;

    const hasKeyFields = formData.date && formData.startTime && formData.endDate && formData.endTime && formData.from && formData.to && formData.carNo;
    if (!hasKeyFields) {
      // If key fields are missing, reset auto-calculated values to 0/false
      setFormData(prevData => ({
        ...prevData,
        routeCharge: 0,
        emptyCharge: 0,
        kmTravelled: 0,
        totalCharge: 0,
        overnightStay: false,
        dayOverDelayed: false,
      }));
      return;
    }


    const newRouteCharge = getRouteCharge(formData.from, formData.to);
    const newKmTravelled = kmData.find(k => k.start_point === formData.from && k.destination_point === formData.to)?.km_value || 0;

    const emptyChargeResult = calculateEmptyChargeFrontend(formData.from, formData.to, formData.emptyHandlingLocation, formData.date, buttonState);
    const newEmptyCharge = emptyChargeResult.charge;

    const { overnightStay: autoOvernight, dayOverDelayed: autoDayOver } =
      autoCalculateOvernightAndDayOver(formData.date, formData.startTime, formData.endDate, formData.endTime, formData.from);

    // Apply auto-calculated values only if manual flags are false
    const finalOvernightStay = isOvernightStayManual ? formData.overnightStay : autoOvernight;
    const finalDayOverDelayed = isDayOverDelayedManual ? formData.dayOverDelayed : autoDayOver;

    const { newTotalCharge, overNightCharges, DayOverCharges } = calculateTotalCharge(
      newRouteCharge,
      newEmptyCharge,
      finalOvernightStay, // Use final state for calculation
      finalDayOverDelayed, // Use final state for calculation
      formData.carNo
    );



    setFormData(prevData => ({
      ...prevData,
      routeCharge: newRouteCharge,
      emptyCharge: newEmptyCharge,
      kmTravelled: newKmTravelled,
      totalCharge: newTotalCharge,
      // Update checkboxes only if not manually overridden
      overnightStay: finalOvernightStay,
      dayOverDelayed: finalDayOverDelayed,
      overnightCharges: overNightCharges,
      dayOverCharges: DayOverCharges,
    }));
  }, [
    formData.date, formData.startTime, formData.endDate, formData.endTime, // NEW Date/Time dependencies
    formData.from, formData.to, formData.emptyHandlingLocation, formData.carNo,
    formData.isManualEdited, isOvernightStayManual, isDayOverDelayedManual, // Manual flags
    getRouteCharge, calculateEmptyChargeFrontend, autoCalculateOvernightAndDayOver, calculateTotalCharge,
    buttonState,
  ]);


  // Effect to update edit trip form's auto-calculated fields
  useEffect(() => {
    const hasKeyFields = editFormData.date && editFormData.startTime && editFormData.endDate && editFormData.endTime && editFormData.from && editFormData.to && editFormData.carNo;
    if (!hasKeyFields) {
      // If key fields are missing, reset auto-calculated values to 0/false
      setEditFormData(prevData => ({
        ...prevData,
        routeCharge: 0,
        emptyCharge: 0,
        kmTravelled: 0,
        totalCharge: 0,
        overnightStay: false,
        dayOverDelayed: false,
      }));
      return;
    }

    const newRouteCharge = getRouteCharge(editFormData.from, editFormData.to);
    const newKmTravelled = kmData.find(k => k.start_point === editFormData.from && k.destination_point === editFormData.to)?.km_value || 0;

    const emptyChargeResult = calculateEmptyChargeFrontend(editFormData.from, editFormData.to, editFormData.emptyHandlingLocation, editFormData.date);
    const newEmptyCharge = emptyChargeResult.charge;

    // Remove auto calculation logic and use the existing state
    // const { overnightStay: autoOvernight, dayOverDelayed: autoDayOver } =
    //   autoCalculateOvernightAndDayOver(editFormData.date, editFormData.startTime, editFormData.endDate, editFormData.endTime, editFormData.from);

    // Use the values from editFormData directly for calculation
    const newTotalCharge = calculateTotalCharge(
      newRouteCharge,
      newEmptyCharge,
      editFormData.overnightStay,
      editFormData.dayOverDelayed,
      editFormData.carNo
    );

    console.log("newTotalCharge", newTotalCharge);

    setEditFormData(prevData => ({
      ...prevData,
      routeCharge: newRouteCharge,
      emptyCharge: newEmptyCharge,
      kmTravelled: newKmTravelled,
      totalCharge: newTotalCharge.newTotalCharge,
      // Do not update overnightStay and dayOverDelayed here to avoid infinite loops
    }));
  }, [
    // All dependencies that can change and should trigger a re-calculation
    editFormData.date,
    editFormData.startTime,
    editFormData.endDate,
    editFormData.endTime,
    editFormData.from,
    editFormData.to,
    editFormData.emptyHandlingLocation,
    editFormData.carNo,
    editFormData.overnightStay, // Add this dependency
    editFormData.dayOverDelayed, // Add this dependency
    getRouteCharge,
    calculateEmptyChargeFrontend,
    calculateTotalCharge,
  ]);


  // တွက်ချက်ရန် ခလုတ် နှိပ်သောအခါ လုပ်ဆောင်မည့် function (New Trip)
  const handleCalculateAndSave = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validation (Updated with new fields)
    if (!formData.date || !formData.startTime || !formData.endDate || !formData.endTime ||
      !formData.carNo || !formData.from || !formData.to || !formData.driverName) {
      setError('ကျေးဇူးပြု၍ ရက်စွဲ၊ စတင်ချိန်၊ ပြီးဆုံးရက်၊ ပြီးဆုံးချိန်၊ ကားနံပါတ်၊ မှ၊ သို့ နှင့် ယာဉ်မောင်းအမည် နေရာများကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }

    let empty_pickup_charge_for_backend = 0;
    let empty_dropoff_charge_for_backend = 0;
    let remarks_for_backend = formData.remarks;

    if (formData.emptyHandlingLocation) {
      const emptyChargeResult = calculateEmptyChargeFrontend(formData.from, formData.to, formData.emptyHandlingLocation, formData.date);
      // Determine if it's pickup or dropoff for backend storage
      if (emptyChargeResult.type === 'export') {
        empty_pickup_charge_for_backend = emptyChargeResult.charge;
        empty_dropoff_charge_for_backend = 0; // Ensure only one is set
      } else if (emptyChargeResult.type === 'import') {
        empty_dropoff_charge_for_backend = emptyChargeResult.charge;
        empty_pickup_charge_for_backend = 0; // Ensure only one is set
      }

      if (emptyChargeResult.charge === 0 && (emptyChargeResult.type === 'export' || emptyChargeResult.type === 'import')) {
        remarks_for_backend += (remarks_for_backend ? "; " : "");
      }
    }

    const tripDataToSave = {
      date: formData.date, //1
      startTime: formData.startTime, //2
      endDate: formData.endDate, //3
      endTime: formData.endTime, //4
      carNo: formData.carNo, //5
      from_location: formData.from, //6
      to_location: formData.to, //7
      routeCharge: formData.routeCharge, //8
      // empty_pickup_charge: empty_pickup_charge_for_backend, 
      empty_pickup_dropoff_charge: formData.emptyCharge, //9
      empty_handling_location: formData.emptyHandlingLocation || null,  //10
      overnight_status: formData.overnightStay ? 'yes' : 'no', //11
      overnight_charges: formData.overnightCharges, //12
      day_over_status: formData.dayOverDelayed ? 'yes' : 'no', //13
      day_over_charges: formData.dayOverCharges, //14
      remarks: remarks_for_backend, //15
      agent_name: formData.agentName || null, //16
      total_charge: formData.totalCharge, //17
      km_travelled: formData.kmTravelled, //18
      fuel_amount: 0, //19
      fuel_cost: 0, //20
      is_manual_edited: formData.isManualEdited ? 1 : 0, //21
      driverName: formData.driverName, //22
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/api/trips`, tripDataToSave);

      if (response.status === 201) {
        setSuccessMessage("ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
        // Clear form fields, resetting manual flags
        const today = new Date().toISOString().split('T')[0];
        const currentTime = format(new Date(), 'HH:mm');
        setFormData({
          date: today, startTime: currentTime, endDate: today, endTime: currentTime,
          carNo: '', from: '', to: '', emptyHandlingLocation: '',
          overnightStay: false, dayOverDelayed: false, remarks: '', agentName: '', driverName: '',
          routeCharge: 0, emptyCharge: 0, totalCharge: 0, kmTravelled: 0, isManualEdited: false,
        });
        setIsOvernightStayManual(false);
        setIsDayOverDelayedManual(false);
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
      startTime: trip.start_time || '00:00', // Set start time, default if null
      endDate: trip.end_date || trip.date, // Set end date, default to start date if null
      endTime: trip.end_time || '00:00', // Set end time, default if null
      carNo: trip.car_no,
      from: trip.from_location,
      to: trip.to_location,
      emptyHandlingLocation: trip.empty_handling_location || '',
      overnightStay: trip.overnight_status === 'yes',
      dayOverDelayed: trip.day_over_status === 'yes',
      remarks: trip.remarks || '',
      agentName: trip.agent_name || '',
      driverName: trip.driver_name || '',
      routeCharge: trip.route_charge,
      emptyCharge: (trip.empty_pickup_charge || 0) + (trip.empty_dropoff_charge || 0),
      totalCharge: trip.total_charge,
      kmTravelled: trip.km_travelled,
      isManualEdited: trip.is_manual_edited === 1,
    });
    // Reset manual flags for edit form when dialog opens
    setIsEditOvernightStayManual(false);
    setIsEditDayOverDelayedManual(false);
    setEditDialogOpen(true);

    console.log("trip.id", trip.id);
    console.log("trip.carNO", trip.car_no);
    console.log("trip.remarks", trip.remarks);
    console.log("trip.total_charge", trip.total_charge);
    console.log("EditFormData:", editFormData);
    console.log("edit form data. carNo:", editFormData.carNo);
  };

  // Handle Save Edit button click (from Dialog)
  const handleSaveEdit = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validation (Updated with new fields)
    if (!editFormData.date || !editFormData.startTime || !editFormData.endDate || !editFormData.endTime ||
      !editFormData.carNo || !editFormData.from || !editFormData.to || !editFormData.driverName) {
      setError('လိုအပ်သော အချက်အလက်များကို ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
      return;
    }

    let empty_pickup_charge_for_backend = 0;
    let empty_dropoff_charge_for_backend = 0;
    let remarks_for_backend = editFormData.remarks;

    if (!editFormData.isManualEdited) { // Recalculate empty charges if not manually edited
      if (editFormData.emptyHandlingLocation) {
        const emptyChargeResult = calculateEmptyChargeFrontend(editFormData.from, editFormData.to, editFormData.emptyHandlingLocation, editFormData.date);
        empty_pickup_charge_for_backend = 0;
        empty_dropoff_charge_for_backend = 0;
        if (emptyChargeResult.type === 'export') {
          empty_pickup_charge_for_backend = emptyChargeResult.charge;
        } else if (emptyChargeResult.type === 'import') {
          empty_dropoff_charge_for_backend = emptyChargeResult.charge;
        }
        if (emptyChargeResult.charge === 0 && (emptyChargeResult.type === 'export' || emptyChargeResult.type === 'import')) {
          remarks_for_backend += (remarks_for_backend ? "; " : "") + "အခွံတင်/ချ - လားရာတူသောကြောင့် ဝန်ဆောင်ခ မရရှိပါ။";
        }
      } else {
        empty_pickup_charge_for_backend = 0;
        empty_dropoff_charge_for_backend = 0;
      }
    } else {
      // If manually edited, use the combined emptyCharge from editFormData
      empty_pickup_charge_for_backend = parseFloat(editFormData.emptyCharge) || 0;
      empty_dropoff_charge_for_backend = 0; // Assuming combined goes to pickup for simplicity
    }

    const tripDataToUpdate = {
      date: editFormData.date,
      startTime: editFormData.startTime,
      endDate: editFormData.endDate,
      endTime: editFormData.endTime,
      carNo: editFormData.carNo,
      from_location: editFormData.from,
      to_location: editFormData.to,
      routeCharge: editFormData.routeCharge,
      empty_pickup_charge: empty_pickup_charge_for_backend,
      empty_dropoff_charge: empty_dropoff_charge_for_backend,
      empty_handling_location: editFormData.emptyHandlingLocation || null,
      overnight_status: editFormData.overnightStay ? 'yes' : 'no',
      day_over_status: editFormData.dayOverDelayed ? 'yes' : 'no',
      remarks: remarks_for_backend,
      agent_name: editFormData.agentName || null, // Changed to agent_name
      total_charge: editFormData.totalCharge,
      km_travelled: editFormData.kmTravelled,
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
    // Reset edit form states and manual flags
    const today = new Date().toISOString().split('T')[0];
    const currentTime = format(new Date(), 'HH:mm');
    setEditFormData({
      date: today, startTime: currentTime, endDate: today, endTime: currentTime,
      carNo: '', from: '', to: '', emptyHandlingLocation: '',
      overnightStay: false, dayOverDelayed: false, remarks: '', agentName: '', driverName: '',
      routeCharge: 0, emptyCharge: 0, totalCharge: 0, kmTravelled: 0, isManualEdited: false,
    });
    setIsEditOvernightStayManual(false);
    setIsEditDayOverDelayedManual(false);
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
      "Start Time": trip.start_time || '', // Export Start Time
      "End Date": trip.end_date || '',   // Export End Date
      "End Time": trip.end_time || '',   // Export End Time
      "Car No": trip.car_no,
      "ယာဉ်မောင်း": trip.driver_name || '',
      "မှ (From)": trip.from_location,
      "သို့ (To)": trip.to_location,
      "လမ်းကြောင်းခ (Route Charge)": trip.route_charge,
      "အခွံတင်/ချ နေရာ": trip.empty_handling_location || '',
      "အခွံတင်/ချ ခ (Empty Pickup Charge)": trip.empty_pickup_dropoff_charge,// Keep for export detail
      "အသား/အခွံ အိပ်": trip.overnight_status === 'yes' ? 'အသားအိပ်' : '',
      "နေ့ကျော်/ပြီး": trip.day_over_status === 'yes' ? 'နေ့ကျော်' : '',
      "မှတ်ချက်": `${trip.end_date || ''} ${trip.end_time || ''} ${trip.agent_name || ''} ${trip.remarks || ''}`.trim(), // Combined remarks
      "အေးဂျင့် အမည်": trip.agent_name || '', // Export agent name separately for clarity in Excel
      "စုစုပေါင်း": trip.total_charge,
      "KM သွားခဲ့မှု": trip.km_travelled,
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trip Records");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, 'trip_records.xlsx');
  };
  // Promise တစ်ခုကို ပြန်ပေးတဲ့ delay function ကို အရင်ဆုံးရေးပါ
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handlePrintReport = async () => {
    // ပထမဆုံး၊ print view ကို ပြပါ
    setShowPrintView(true);

    // ပြီးရင် UI update ဖြစ်ဖို့အတွက် ခဏစောင့်ပါ
    await delay(50); // 50ms လောက်စောင့်ပါ

    // ပြီးမှ print dialog ကို ခေါ်ပါ
    window.print();

    // (optional) Print ထုတ်ပြီးရင် မူရင်း view ကို ပြန်ပြောင်းပါ
    // setShowPrintView(false);
  };


  // Calculate Grand Total for "စုစုပေါင်း" column
  const grandTotalCharge = filteredTrips.reduce((sum, trip) => sum + (trip.total_charge || 0), 0);

  // Month names for dropdown
  const monthNames = useMemo(() => [
    { value: '', label: 'အားလုံး' }, // "အားလုံး" for month filter
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

  const yearsForFilter = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsArray = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
    return [{ value: '', label: 'အားလုံး' }, ...yearsArray];
  }, []);

  
  //for LarYar Button
  const handleButtonClick = () => {
    if (buttonState === null) {
      setButtonState('opposite');
    } else if (buttonState === 'opposite') {
      setButtonState('same');
    } else if (buttonState === 'same') {
      setButtonState(null);
    }
  };

  // Determine button properties based on the state
  const buttonProps = {
    text: 'လားရာ',
    color: 'inherit', // Default color for gray
    variant: 'outlined',
  };

  if (buttonState === 'opposite') {
    buttonProps.text = 'လားရာဆန့်ကျင်';
    buttonProps.color = 'error';
    buttonProps.variant = 'contained';
  } else if (buttonState === 'same') {
    buttonProps.text = 'လားရာတူ';
    buttonProps.color = 'success';
    buttonProps.variant = 'contained';
  }

  return (
    <>
      {/* Main HomePage Content - conditionally rendered */}
      {!showPrintView && (
        <Box
          sx={{
            p: 6, // Padding
            minHeight: '100%',
            bgcolor: 'background.default', // ဒါက dark mode မှာ အနက်ရောင်ပြောင်းသွားပါလိမ့်မယ်
            color: 'text.primary',
          }}
        >
          <h2 className="text-2xl font-semibold mb-4">
            အချက်အလက် ထည့်သွင်းခြင်း
          </h2>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

          {/* New Form Layout - Single Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* ရက်စွဲ (Date) */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1">
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

            {/* NEW: ခရီးစဉ် စတင်ချိန် (Start Time) */}
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium mb-1">
                ခရီးစဉ် စတင်ချိန်
              </label>
              <TextField
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                size="small"
                className="rounded-md"
              />
            </div>

            {/* NEW: ခရီးစဉ် ပြီးဆုံးရက် (End Date) */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium  mb-1">
                ခရီးစဉ် ပြီးဆုံးရက်
              </label>
              <TextField
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                size="small"
                className="rounded-md"
              />
            </div>

            {/* NEW: ခရီးစဉ် ပြီးဆုံးချိန် (End Time) */}
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium  mb-1">
                ခရီးစဉ် ပြီးဆုံးချိန်
              </label>
              <TextField
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
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
              <label htmlFor="carNo" className="block text-sm font-medium  mb-1">
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
              <label htmlFor="driverName" className="block text-sm font-medium  mb-1">
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
              <label htmlFor="from" className="block text-sm font-medium  mb-1">
                မှ (From)
              </label>
              <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
                {/* <InputLabel id="from-label">ခရီးစဉ် ရွေးပါ</InputLabel> */}
                <Select
                  labelId="from-label"
                  id="from"
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                >
                  {Object.keys(groupedRoutes).flatMap(groupName => [
                    <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                    ...groupedRoutes[groupName].map((route) => (
                      <MenuItem key={route.id} value={route.route}>
                        {route.route}
                      </MenuItem>
                    ))
                  ])}
                </Select>
              </FormControl>
            </div>

            {/* သို့ (To) */}
            <div>
              <label htmlFor="to" className="block text-sm font-medium  mb-1">
                သို့ (To)
              </label>
              <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
                {/* <InputLabel id="to-label">ခရီးစဉ် ရွေးပါ</InputLabel> */}
                <Select
                  labelId="to-label"
                  id="to"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                >
                  {Object.keys(groupedRoutes).flatMap(groupName => [
                    <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                    ...groupedRoutes[groupName].map((route) => (
                      <MenuItem key={route.id} value={route.route}>
                        {route.route}
                      </MenuItem>
                    ))
                  ])}
                </Select>
              </FormControl>
            </div>

            {/* လမ်းကြောင်းခ (Route Charge) - Display only */}
            <div>
              <label htmlFor="routeCharge" className="block text-sm font-medium   mb-1">
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
                className="rounded-md"
              />
            </div>

            {/* အခွံတင်/ချ နေရာ (Empty Handling Location) */}

            <div className="flex items-end">
              <div className="flex flex-col flex-grow">
                <label htmlFor="emptyHandlingLocation" className="block text-sm font-medium   mb-1">
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
              <Button
                onClick={handleButtonClick}
                variant={buttonProps.variant}
                color={buttonProps.color}
                size="small"
                sx={{
                  ml: 2,
                  height:'40px',
                  width:'120px',
                }}
              >
                {buttonProps.text}
              </Button>
            </div>
            <div>
              <label htmlFor="emptyCharge" className="block text-sm font-medium mb-1">
                အခွံတင်/ချ <span className="text-xs text-gray-500">(Auto)</span>
              </label>
              <TextField
                type="text"
                id="emptyCharge"
                name="emptyCharge"
                value={formData.emptyCharge || ''} // value ကို empty string အဖြစ် ပြင်လိုက်ပါ
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
                className="rounded-md"
              />
            </div>



            {/* Remarks (spanning all columns, adjusted to only 1 column below other elements) */}
            {/* NEW: Agent Name Field */}
            <div>
              <label htmlFor="agentName" className="block text-sm font-medium   mb-1">
                အေးဂျင့် အမည်
              </label>
              <FormControl fullWidth variant="outlined" size="small" className="rounded-md">
                <Select
                  id="agentName"
                  name="agentName"
                  value={formData.agentName}
                  onChange={handleChange}
                >
                  <MenuItem value=""><em>ရွေးချယ်ပါ</em></MenuItem>
                  {agentNames.map((name, index) => (
                    <MenuItem key={index} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                className="text-sm font-medium  "
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
                className="text-sm font-medium  "
              />
            </div>

            {/* Remarks - Span remaining columns */}
            <div className="col-span-full"> {/* Changed to col-span-full to ensure it always spans */}
              <label htmlFor="remarks" className="block text-sm font-medium   mb-1">
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
            {/* <FormControlLabel
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
            /> */}

          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
            <Button
              onClick={handleCalculateAndSave}
              variant="contained"
              color="primary"
              sx={{ py: 1.5, px: 4 }}
            >
              စာရင်းထည့်သွင်းရန်
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
              {/* Print Report Button - now uses browser's native print */}
              <Button
                onClick={handlePrintReport}
                variant="contained"
                color="primary"
                sx={{ py: 1, px: 2, fontSize: '0.875rem' }}
              >
                Print Report
              </Button>
            </Box>
          </Box>

          {/* Year, Month, and Car No Filters for HomePage Table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg shadow-inner">
            {/* နှစ် (Year) Filter */}
            <div>
              <label htmlFor="filterYear" className="block text-sm font-medium   mb-1">
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
              <label htmlFor="filterMonth" className="block text-sm font-medium   mb-1">
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
              <label htmlFor="filterCarNo" className="block text-sm font-medium   mb-1">
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
                    <TableCell sx={{ fontWeight: 'bold' }}>နေ့စွဲ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ကားနံပါတ်</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>မှ (From)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>သို့ (To)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>လမ်းကြောင်းခ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>အခွံတင်/ချ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>အသား/အခွံအိပ်</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>နေ့ကျော်/ပြီး</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>မှတ်ချက်</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>စုစုပေါင်း</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTrips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        တွက်ချက်ထားသော ရလဒ်များ မရှိသေးပါ သို့မဟုတ် Filter နှင့် ကိုက်ညီသော Data မရှိပါ။
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrips.map((trip, index) => {
                      const isSelected = selectedRows.has(trip.id);
                      const combinedEmptyCharge = (trip.empty_pickup_charge || 0) + (trip.empty_dropoff_charge || 0);
                      const displayRemarks = `${trip.end_date || ''} ${trip.end_time || ''} ${trip.agent_name || ''} ${trip.remarks || ''}`.trim();

                      return (
                        <TableRow
                          key={trip.id}
                          selected={isSelected}
                          sx={{ '&:hover': '' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleRowSelect(trip.id)}
                            />
                          </TableCell>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{trip.date}</TableCell>
                          <TableCell>{trip.car_no}</TableCell>
                          <TableCell>{trip.from_location}</TableCell>
                          <TableCell>{trip.to_location}</TableCell>
                          <TableCell>{formatMMK(trip.route_charge)}</TableCell>
                          <TableCell>{formatMMK(trip.empty_pickup_dropoff_charge)}</TableCell>
                          <TableCell>{trip.overnight_status === 'yes' ? 'အသားအိပ်' : ''}</TableCell>
                          <TableCell>{trip.day_over_status === 'yes' ? 'နေ့ကျော်' : ''}</TableCell>
                          <TableCell>{displayRemarks}</TableCell>
                          <TableCell>{formatMMK(trip.total_charge)}</TableCell>
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
                    <TableRow sx={{ fontWeight: 'bold', borderTop: '2px solid #ccc' }}>
                      <TableCell colSpan={11} align="right" sx={{ fontWeight: 'bold' }}> {/* Adjusted colSpan */}
                        စုစုပေါင်း (Grand Total):
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {formatMMK(grandTotalCharge)}
                      </TableCell>
                      <TableCell colSpan={1}></TableCell> {/* Empty cell for Action column */}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      {showPrintView && (
        // Printable Report Content - conditionally rendered
        <Box id="printable-report-content"
          sx={{
            '@media print': {
              // ပင်မ content ရဲ့ အရောင်ကို အမည်းရောင်ထားပါ
              color: 'black',
              backgroundColor: 'white',

              // Table Container ကိုပါ ဘောင်အမည်းရောင်ဖြစ်အောင် သတ်မှတ်ခြင်း
              '& .MuiTableContainer-root': {
                border: '1px solid black !important',
              },

              // Table ထဲက ခေါင်းစဉ်ရော၊ data ရော အရောင်မည်းအောင် သတ်မှတ်ခြင်း
              '& .MuiTableCell-root': {
                color: 'black !important',
                borderColor: 'black !important',
              },

              // Table Head ကို background အဖြူရောင်ထားခြင်း
              '& .MuiTableHead-root .MuiTableRow-root': {
                backgroundColor: '#f0f0f0 !important',
              },
            },
          }}
        >
          {/* Report Header Section */}
          <h1 style={{ textAlign: 'center', fontSize: '50px', marginBottom: '10px', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>
            {filterCarNo || 'အားလုံး'}
          </h1>
          <p style={{ textAlign: 'center', marginBottom: '30px', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>
            {monthNames.find(m => m.value === filterMonth)?.label || 'အားလုံး'} လပိုင်း {filterYear || 'အားလုံး'}ခုနှစ်
          </p>

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table aria-label="printable trip records table" size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 'bold',
                      width: '2.28%',
                      fontFamily: 'Noto Sans Myanmar, sans-serif',
                      // Print ထုတ်တဲ့အခါမှသာ သီးသန့်သက်ရောက်မည့် style
                      '@media print': { // padding အားလုံးကို အတင်းအကျဖယ်ရှားပါ
                        textAlign: 'left !important', // စာသားကို ဘယ်ဘက်အစွန်းမှာ ကပ်ပါ
                        paddingLeft: '0.2rem !important', // ဘယ်ဘက် padding ကိုလည်း အသေအချာဖယ်ပါ
                      },
                    }}
                  // ဒီမှာ align prop ကိုထပ်ထည့်စရာမလိုတော့ပါဘူး
                  >စဥ်</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10.54%', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>နေ့စွဲ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '14.40%', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>မှ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '14.40%', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>သို့</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10.45%', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>အခွံတင်/ချ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '11.85%', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>အသား/အခွံအိပ်</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10.09%', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>နေ့ကျော်/ပြီး</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '25.99%', wordBreak: 'break-word', whiteSpace: 'normal', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>မှတ်ချက်</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 2, fontFamily: 'Noto Sans Myanmar, sans-serif' }}>
                      No data available for report.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrips.map((trip, index) => {
                    // const combinedEmptyCharge = (trip.empty_pickup_charge || 0) + (trip.empty_dropoff_charge || 0); // Not displayed in this simplified print table
                    const displayRemarks = `${trip.end_date || ''} ${trip.end_time || ''} ${trip.agent_name || ''} ${trip.remarks || ''}`.trim();

                    return (
                      <TableRow key={trip.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{trip.date}</TableCell>
                        <TableCell>{trip.from_location}</TableCell>
                        <TableCell>{trip.to_location}</TableCell>
                        <TableCell>{trip.empty_handling_location}</TableCell>
                        <TableCell>{trip.overnight_status === 'yes' ? 'အသားအိပ်' : ''}</TableCell>
                        <TableCell>{trip.day_over_status === 'yes' ? 'နေ့ကျော်' : ''}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-word', whiteSpace: 'normal', fontFamily: 'Noto Sans Myanmar, sans-serif' }}>{displayRemarks}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Back button for print view only */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, '@media print': { display: 'none' } }}>
            <Button onClick={() => setShowPrintView(false)} variant="contained" color="secondary">
              ပြန်ထွက်မည်
            </Button>
          </Box>
        </Box>
      )} {/* End of conditional rendering for print view */}

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
            {/* NEW: Edit Dialog - Start Time */}
            <TextField
              label="ခရီးစဉ် စတင်ချိန်"
              type="time"
              name="startTime"
              value={editFormData.startTime}
              onChange={handleEditChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
            {/* NEW: Edit Dialog - End Date */}
            <TextField
              label="ခရီးစဉ် ပြီးဆုံးရက်"
              type="date"
              name="endDate"
              value={editFormData.endDate}
              onChange={handleEditChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
            {/* NEW: Edit Dialog - End Time */}
            <TextField
              label="ခရီးစဉ် ပြီးဆုံးချိန်"
              type="time"
              name="endTime"
              value={editFormData.endTime}
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
                {Object.keys(groupedRoutes).flatMap(groupName => [
                  <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                  ...groupedRoutes[groupName].map((route) => (
                    <MenuItem key={route.id} value={route.route}>
                      {route.route}
                    </MenuItem>
                  ))
                ])}
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
                {Object.keys(groupedRoutes).flatMap(groupName => [
                  <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                  ...groupedRoutes[groupName].map((route) => (
                    <MenuItem key={route.id} value={route.route}>
                      {route.route}
                    </MenuItem>
                  ))
                ])}
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
              <InputLabel>အခွံတင်/ချ နေရာ</InputLabel>
              <Select
                name="emptyHandlingLocation"
                value={editFormData.emptyHandlingLocation}
                onChange={handleEditChange}
                label="အခွံတင်/ချ နေရာ"
              >
                <MenuItem value=""><em>ရွေးချယ်ပါ</em></MenuItem>
                {emptyLocationsOptions.map((loc, index) => (
                  <MenuItem key={index} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <div>
              {/* <label htmlFor="editEmptyCharge" className="block text-sm font-medium mb-1">
                အခွံတင်/ချ
              </label> */}
              {/* <InputLabel>အခွံတင်/ချ ခ</InputLabel> */}
              <TextField
                label="အခွံတင်/ချ ခ"
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
                  readOnly: !editFormData.isManualEdited,
                  endAdornment: (
                    <Typography variant="body2" color="textPrimary">
                      {editFormData.emptyCharge && !isNaN(parseFloat(editFormData.emptyCharge)) ? formatMMK(parseFloat(editFormData.emptyCharge)) : ''}
                    </Typography>
                  ),
                }}
                className={!editFormData.isManualEdited ? "rounded-md" : "rounded-md"}
              />
            </div>

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
                className="text-sm font-medium  "
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
                className="text-sm font-medium  "
              />
            </Box>
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
            {/* NEW: Edit Dialog - Agent Name */}
            <div>
              <label htmlFor="editAgentName" className="block text-sm font-medium   mb-1">
                အေးဂျင့် အမည်
              </label>
              <FormControl fullWidth variant="outlined" size="small">
                <Select
                  id="editAgentName"
                  name="agentName"
                  value={editFormData.agentName}
                  onChange={handleEditChange}
                >
                  <MenuItem value=""><em>ရွေးချယ်ပါ</em></MenuItem>
                  {agentNames.map((name, index) => (
                    <MenuItem key={index} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3 }}>
            <Typography variant="h6" sx={{ mr: 2, color: 'text.primary' }}>
              စုစုပေါင်း: {formatMMK(editFormData.totalCharge)}
            </Typography>
            {/* <FormControlLabel
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
            /> */}
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
    </>
  );
}

export default HomePage;
