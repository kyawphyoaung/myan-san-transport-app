// myan-san/src/pages/AllTripsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from 'axios';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, TextField, Select, MenuItem, FormControl, InputLabel,
  Checkbox, Button, Box, Typography, Alert, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, TableSortLabel,ListSubheader
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

// Static data များကို import လုပ်ခြင်း
import carNumbersData from '../data/carNumbers.json';
import emptyContainerLocationsData from '../data/emptyContainerLocations.json';
import kmData from '../data/kmData.json';
import { formatMMK } from '../utils/currencyFormatter';
import groupedRoutes from '../data/groupedRoutes.json';

// Table Header Cells
const headCells = [
  { id: 'id', numeric: true, disablePadding: true, label: 'No.' },
  { id: 'date', numeric: false, disablePadding: false, label: 'Date' },
  { id: 'car_no', numeric: false, disablePadding: false, label: 'Car No' },
  // { id: 'driver_name', numeric: false, disablePadding: false, label: 'ယာဉ်မောင်း' },
  { id: 'from_location', numeric: false, disablePadding: false, label: 'မှ (From)' },
  { id: 'to_location', numeric: false, disablePadding: false, label: 'သို့ (To)' },
  { id: 'route_charge', numeric: true, disablePadding: false, label: 'လမ်းကြောင်းခ' },
  { id: 'empty_pickup_charge', numeric: true, disablePadding: false, label: 'အခွံတင်/ချ' },
  { id: 'empty_dropoff_charge', numeric: true, disablePadding: false, label: 'အခွံချခ' },
  { id: 'overnight_status', numeric: false, disablePadding: false, label: 'အသား/အခွံ အိပ်' },
  { id: 'day_over_status', numeric: false, disablePadding: false, label: 'နေ့ကျော်/ပြီး' },
  { id: 'remarks', numeric: false, disablePadding: false, label: 'မှတ်ချက်' },
  { id: 'total_charge', numeric: true, disablePadding: false, label: 'စုစုပေါင်း' },
  { id: 'km_travelled', numeric: true, disablePadding: false, label: 'KM သွားခဲ့မှု' },
  { id: 'actions', numeric: false, disablePadding: false, label: 'လုပ်ဆောင်ချက်များ' },
];

function AllTripsPage() {
  const [allTrips, setAllTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [settings, setSettings] = useState({});
  const [currentRouteCharges, setCurrentRouteCharges] = useState([]);
  const [driverNames, setDriverNames] = useState([]);
  const [carDriverAssignments, setCarDriverAssignments] = useState([]);

  const [filter, setFilter] = useState({
    searchCarNo: '',
    searchFrom: '',
    searchTo: '',
    searchRemarks: '',
    startDate: '',
    endDate: '',
  });

  const [selectedRows, setSelectedRows] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    carNo: '',
    from: '',
    to: '',
    emptyContainer: '',
    emptyDropoffCharge: 0,
    overnightStay: false,
    dayOverDelayed: false,
    remarks: '',
    driverName: '',
    routeCharge: 0,
    kmTravelled: 0,
  });

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false); // State for filter section visibility

  const API_BASE_URL = 'http://localhost:5001';

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips`);
      const data = await response.json();
      if (data.message === "success") {
        setAllTrips(data.data);
        applyFilters(data.data, filter, orderBy, order);
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
  }, [filter, orderBy, order]);

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

  useEffect(() => {
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
  }, [fetchTrips, fetchDriverNames, fetchCarDriverAssignments]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prevFilter => {
      const newFilter = { ...prevFilter, [name]: value };
      applyFilters(allTrips, newFilter, orderBy, order);
      return newFilter;
    });
  };

  const applyFilters = useCallback((trips, currentFilter, currentOrderBy, currentOrder) => {
    let tempFilteredTrips = trips.filter(trip => {
      const matchesCarNo = currentFilter.searchCarNo ? trip.car_no === currentFilter.searchCarNo : true;
      const matchesFrom = currentFilter.searchFrom ? trip.from_location === currentFilter.searchFrom : true;
      const matchesTo = currentFilter.searchTo ? trip.to_location === currentFilter.searchTo : true;
      const matchesRemarks = currentFilter.searchRemarks ? trip.remarks.toLowerCase().includes(currentFilter.searchRemarks.toLowerCase()) : true;

      const tripDate = new Date(trip.date);
      const startDate = currentFilter.startDate ? new Date(currentFilter.startDate) : null;
      const endDate = currentFilter.endDate ? new Date(currentFilter.endDate) : null;

      const matchesDateRange = (!startDate || tripDate >= startDate) && (!endDate || tripDate <= endDate);

      return matchesCarNo && matchesFrom && matchesTo && matchesRemarks && matchesDateRange;
    });

    // Apply sorting
    const sortedTrips = tempFilteredTrips.sort((a, b) => {
      const aValue = a[currentOrderBy];
      const bValue = b[currentOrderBy];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return currentOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        return currentOrder === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
      }
    });

    setFilteredTrips(sortedTrips);
  }, []);

  // Handle Sort Change from dropdowns
  const handleSortChange = (event) => {
    const { name, value } = event.target;
    if (name === 'orderBy') {
      setOrderBy(value);
      applyFilters(allTrips, filter, value, order);
    } else if (name === 'order') {
      setOrder(value);
      applyFilters(allTrips, filter, orderBy, value);
    }
  };

  const handleResetFilters = () => {
    const initialFilterState = {
      searchCarNo: '',
      searchFrom: '',
      searchTo: '',
      searchRemarks: '',
      startDate: '',
      endDate: '',
    };
    setFilter(initialFilterState);
    setOrder('asc');
    setOrderBy('date');
    applyFilters(allTrips, initialFilterState, 'date', 'asc');
    setSelectedRows(new Set());
  };

  const handleSelectAllRows = (e) => {
    const { checked } = e.target;
    if (checked) {
      const newSelectedRows = new Set(filteredTrips.map(trip => trip.id));
      setSelectedRows(newSelectedRows);
    } else {
      setSelectedRows(new Set());
    }
  };

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

  const calculateTotalCharge = useCallback((
    routeCharge,
    emptyDropoffCharge,
    overnightStatusBoolean,
    dayOverStatusBoolean,
    currentCarNo,
    emptyContainerId // Pass emptyContainerId for same direction logic
  ) => {
    let total = parseFloat(routeCharge || 0);
    total += parseFloat(emptyDropoffCharge || 0);

    let calculatedEmptyPickupCharge = emptyContainerLocationsData.find(loc => loc.id === emptyContainerId)?.charge || 0;
    const isSameDirection = (from, to, emptyLocId) => {
      const emptyLocName = emptyContainerLocationsData.find(loc => loc.id === emptyLocId)?.name;
      if (from === 'MIP' && to === 'တောင်ဒဂုံ(ဇုံ ၁/၂/၃)' && emptyLocName === 'DIL/ICH') return true;
      if (from === 'DIL/ICH' && to === 'သီလဝါ' && emptyLocName === 'MIP') return true;
      return false;
    };

    // Use editFormData.from and editFormData.to for calculation if editing, otherwise use default
    const currentFrom = editingTripId ? editFormData.from : ''; // Placeholder, actual value comes from form
    const currentTo = editingTripId ? editFormData.to : '';     // Placeholder, actual value comes from form

    if (emptyContainerId && isSameDirection(currentFrom, currentTo, emptyContainerId)) {
      calculatedEmptyPickupCharge = 0;
    }
    total += calculatedEmptyPickupCharge;

    const overnightDayoverCombinedCharge = parseFloat(settings.overnight_dayover_combined_charge || 0);
    const gepOvernightCharge = parseFloat(settings.gep_overnight_charge || 0);
    const nineKOvernightCharge = parseFloat(settings['9k_overnight_charge'] || 0);

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
  }, [settings, emptyContainerLocationsData, editingTripId, editFormData.from, editFormData.to]);


  const handleEdit = (trip) => {
    setEditingTripId(trip.id);
    setEditFormData({
      date: trip.date,
      carNo: trip.car_no,
      from: trip.from_location,
      to: trip.to_location,
      emptyContainer: emptyContainerLocationsData.find(loc => loc.charge === trip.empty_pickup_charge)?.id || '',
      overnightStay: trip.overnight_status === 'အသားအိပ်',
      dayOverDelayed: trip.day_over_status === 'နေ့ကျော်',
      remarks: trip.remarks || '',
      driverName: trip.driver_name || '',
      routeCharge: trip.route_charge,
      emptyPickupCharge: trip.empty_pickup_charge,
      emptyDropoffCharge: trip.empty_dropoff_charge,
      kmTravelled: trip.km_travelled,
    });
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(assignment => assignment.car_no === carNo);
    setEditFormData(prevData => ({
      ...prevData,
      carNo: carNo,
      driverName: assignedDriver ? assignedDriver.driver_name : '',
    }));
  };

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


  const handleSaveEdit = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!editFormData.date || !editFormData.carNo || !editFormData.from || !editFormData.to || !editFormData.driverName) {
      setError('လိုအပ်သော အချက်အလက်များကို ပြည့်စုံစွာ ဖြည့်သွင်းပါ။');
      return;
    }

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
      editFormData.emptyContainer
    );

    const tripDataToUpdate = {
      date: editFormData.date,
      carNo: editFormData.carNo,
      from_location: editFormData.from,
      to_location: editFormData.to,
      routeCharge: calculatedRouteCharge,
      empty_pickup_charge: emptyPickupChargeVal,
      empty_dropoff_charge: emptyDropoffCharge,
      overnight_status: editFormData.overnightStay ? 'အသားအိပ်' : 'No',
      day_over_status: editFormData.dayOverDelayed ? 'နေ့ကျော်' : 'No',
      remarks: remarks,
      total_charge: totalCharge,
      km_travelled: calculatedKmTravelled,
      fuel_amount: 0,
      fuel_cost: 0,
      driverName: editFormData.driverName,
      is_manual_edited: 1,
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
      setError(`ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.message}. Backend API (PUT /api/trips/:id) မရှိခြင်းကြောင့် ဖြစ်နိုင်ပါသည်။`);
      console.error('Error saving trip edit:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingTripId(null);
    setEditDialogOpen(false);
    setEditFormData({
      date: '', carNo: '', from: '', to: '', emptyContainer: '',
      overnightStay: false, dayOverDelayed: false, remarks: '', driverName: '',
      routeCharge: 0, emptyPickupCharge: 0, emptyDropoffCharge: 0, kmTravelled: 0,
    });
  };

  const handleDelete = (trip) => {
    setTripToDelete(trip);
    setDeleteConfirmOpen(true);
  };

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
      setError(`ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.message}. Backend API (DELETE /api/trips/:id) မရှိခြင်းကြောင့် ဖြစ်နိုင်ပါသည်။`);
      console.error('Error deleting trip:', err);
    } finally {
      setDeleteConfirmOpen(false);
      setTripToDelete(null);
    }
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setTripToDelete(null);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredTrips.map(trip => ({
      "No.": trip.id,
      "Date": trip.date,
      "Car No": trip.car_no,
      "မှ (From)": trip.from_location,
      "သို့ (To)": trip.to_location,
      "ကားခ (Route Charge)": trip.route_charge,
      "အခွံတင်/ချ (Empty Charge)": trip.empty_pickup_charge,
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

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',  // bg-white ကိုအစားထိုး
        boxShadow: 3,                 // shadow-md ကိုအစားထိုး
        borderRadius: 2,              // rounded-lg ကိုအစားထိုး
        p: 3,                         // p-6 ကိုအစားထိုး (MUI spacing scale အရ 1 => 8px, 3 => 24px ဖြစ်ပါတယ်)
        width: '100%',                // w-full ကိုအစားထိုး
        overflowX: 'auto',            // overflow-x-auto ကိုအစားထိုး
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <h2 className="text-2xl font-semibold">
          ခရီးစဉ်မှတ်တမ်းများ (အားလုံး)
        </h2>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      {/* Sorting and Export Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Sort by:</Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Field</InputLabel>
          <Select
            name="orderBy"
            value={orderBy}
            onChange={handleSortChange}
            label="Field"
          >
            {headCells.filter(cell => cell.id !== 'actions' && cell.id !== 'id').map((cell) => (
              <MenuItem key={cell.id} value={cell.id}>{cell.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Order</InputLabel>
          <Select
            name="order"
            value={order}
            onChange={handleSortChange}
            label="Order"
          >
            <MenuItem value="asc">Ascending</MenuItem>
            <MenuItem value="desc">Descending</MenuItem>
          </Select>
        </FormControl>
        <Button
          onClick={exportToExcel}
          variant="contained"
          color="secondary"
          sx={{ py: 1, px: 2, fontSize: '0.875rem' }}
        >
          Excel Export
        </Button>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="contained"
          color="primary"
          sx={{ py: 1, px: 2, fontSize: '0.875rem' }}
        >
          {showFilters ? 'Filter များ ဖျောက်ရန်' : 'Filter များ ပြသရန်'}
        </Button>
      </Box>

      {/* Data Filtering Inputs (Conditional rendering) */}
      {showFilters && (
        <Paper elevation={1} sx={{ p: 3, mb: 4}}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 2 }}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>ကားနံပါတ် ရှာဖွေရန်</InputLabel>
              <Select
                name="searchCarNo"
                value={filter.searchCarNo}
                onChange={handleFilterChange}
                label="ကားနံပါတ် ရှာဖွေရန်"
              >
                <MenuItem value="">အားလုံး</MenuItem>
                {carNumbersData.map((car, index) => (
                  <MenuItem key={index} value={car.number}>
                    {car.number} ({car.gate})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>မှ (From) ရှာဖွေရန်</InputLabel>
              <Select
                name="searchFrom"
                value={filter.searchFrom}
                onChange={handleFilterChange}
                label="မှ (From) ရှာဖွေရန်"
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
              <InputLabel>သို့ (To) ရှာဖွေရန်</InputLabel>
              <Select
                name="searchTo"
                value={filter.searchTo}
                onChange={handleFilterChange}
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
              label="မှတ်ချက် ရှာဖွေရန်"
              name="searchRemarks"
              value={filter.searchRemarks}
              onChange={handleFilterChange}
              fullWidth
              variant="outlined"
              size="small"
              placeholder="မှတ်ချက်..."
            />

            <Button
              onClick={handleResetFilters}
              variant="contained"
              color="error"
              sx={{ py: 1.5 }}
            >
              Filter များ ပြန်လည်သတ်မှတ်ရန်
            </Button>

            <TextField
              label="ရက်စွဲ (စတင်)"
              type="date"
              name="startDate"
              value={filter.startDate}
              onChange={handleFilterChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />

            <TextField
              label="ရက်စွဲ (အဆုံး)"
              type="date"
              name="endDate"
              value={filter.endDate}
              onChange={handleFilterChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              variant="outlined"
              size="small"
            />
          </Box>
        </Paper>
      )}

      {/* Results Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 4, overflowX: 'auto' }}>
          <Table stickyHeader aria-label="trip records table" sx={{ width: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                {/* <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRows.size === filteredTrips.length && filteredTrips.length > 0}
                    onChange={handleSelectAllRows}
                  />
                </TableCell> */}
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    // align={headCell.numeric ? 'right' : 'left'}
                    // padding={headCell.disablePadding ? 'none' : 'normal'}
                    sx={{ fontWeight: 'bold' }} // Removed sortDirection and onClick
                  >
                    {/* Removed TableSortLabel */}
                    {headCell.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrips.map((trip) => {
                const displayRemarks = `${trip.end_date || ''} ${trip.end_time || ''} ${trip.agent_name || ''} ${trip.remarks || ''}`.trim();
                const isSelected = selectedRows.has(trip.id);
                return (
                  <TableRow
                    key={trip.id}
                    selected={isSelected}
                    sx={{ '&:hover': { bgcolor: '#17ACE8' } }}
                  >
                    {/* <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleRowSelect(trip.id)}
                      />
                    </TableCell> */}
                    <TableCell>{trip.id}</TableCell>
                    <TableCell>{trip.date}</TableCell>
                    <TableCell>{trip.car_no}</TableCell>
                    {/* <TableCell>{trip.driver_name}</TableCell> */}
                    <TableCell>{trip.from_location}</TableCell>
                    <TableCell>{trip.to_location}</TableCell>
                    <TableCell>{formatMMK(trip.route_charge)}</TableCell>
                    <TableCell>{trip.empty_handling_location}</TableCell>
                    <TableCell>{trip.empty_pickup_dropoff_charge}</TableCell>
                    <TableCell>{trip.overnight_status==='yes' ? 'အသားအိပ်' : ''}</TableCell>
                    <TableCell>{trip.day_over_status==='yes' ? 'နေ့ကျော်' : ''}</TableCell>
                    <TableCell>{displayRemarks}</TableCell>
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
              })}
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
              sx={{ gridColumn: '1 / -1' }}
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
                editFormData.emptyContainer
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
    </Box>
  );
}

export default AllTripsPage;
