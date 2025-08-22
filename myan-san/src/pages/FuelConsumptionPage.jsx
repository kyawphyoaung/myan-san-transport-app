// myan-san/src/pages/FuelConsumptionPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { format } from "date-fns";

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Pagination,
  Collapse, // Import Collapse for smooth toggle animation
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon, // Added for toggle icons
} from "@mui/icons-material";
import carNumbersData from "../data/carNumbers.json";

const API_BASE_URL = "http://localhost:5001/api";
const ITEMS_PER_PAGE = 50;

function FuelConsumptionPage() {
  const [fuelReadings, setFuelReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form data for new entry
  const [formData, setFormData] = useState({
    carNo: "",
    tripId: "",
    readingDate: new Date().toISOString().split("T")[0],
    readingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
    fuelGaugeReading: "",
    previousFuelGaugeReading: "", // This will be auto-filled or manually set
    remarks: "",
  });

  const [availableTrips, setAvailableTrips] = useState([]);
  const [selectedCarNoForTrips, setSelectedCarNoForTrips] = useState("");

  // For Edit Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    carNo: "",
    tripId: "",
    readingDate: "",
    readingTime: "",
    fuelGaugeReading: "",
    previousFuelGaugeReading: "", // This will be auto-filled or manually set
    remarks: "",
    trip_date: "",
    from_location: "",
    to_location: "",
    km_travelled: "",
  });
  const [editAvailableTrips, setEditAvailableTrips] = useState([]);

  // For Delete Confirmation Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReadings, setTotalReadings] = useState(0);

  // Filter states
  const [filterCarNo, setFilterCarNo] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString()
  );
  const [filterTripId, setFilterTripId] = useState("");
  const [availableFilterTrips, setAvailableFilterTrips] = useState([]);

  // Sorting states
  const [sortBy, setSortBy] = useState("reading_date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Visibility states for filter and sort sections
  const [showFilterSection, setShowFilterSection] = useState(false);
  const [showSortSection, setShowSortSection] = useState(false);

  // NEW: State to track if previousFuelGaugeReading was manually set by user
  const [
    isNewEntryPreviousReadingManuallySet,
    setIsNewEntryPreviousReadingManuallySet,
  ] = useState(false);
  const [
    isEditPreviousReadingManuallySet,
    setIsEditPreviousReadingManuallySet,
  ] = useState(false);

  const uniqueCarNumbers = useMemo(
    () => carNumbersData.map((car) => car.number).sort(),
    []
  );

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = String(i + 1).padStart(2, "0");
      const monthName = format(new Date(2000, i, 1), "MMMM");
      return { value: monthNum, label: monthName };
    });
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push(i.toString());
    }
    return years.sort((a, b) => b - a);
  }, []);

  const fetchFuelReadings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        carNo: filterCarNo,
        month: filterMonth,
        year: filterYear,
        tripId: filterTripId,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };
      const filteredParams = Object.fromEntries(
        Object.entries(params).filter(
          ([, value]) => value !== "" && value !== null
        )
      );

      const response = await axios.get(`${API_BASE_URL}/fuel-readings`, {
        params: filteredParams,
      });
      setFuelReadings(response.data.data);
      setTotalReadings(response.data.totalCount || 0);
    } catch (err) {
      console.error("Error fetching fuel readings:", err);
      setError("ဆီစားနှုန်းမှတ်တမ်းများ ခေါ်ယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    filterCarNo,
    filterMonth,
    filterYear,
    filterTripId,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchFuelReadings();
  }, [fetchFuelReadings]);

  useEffect(() => {
    const fetchAvailableTripsForNewEntry = async () => {
      if (selectedCarNoForTrips) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/trips-without-fuel-reading/${selectedCarNoForTrips}`
          );
          setAvailableTrips(response.data.data);
        } catch (err) {
          console.error("Error fetching available trips for new entry:", err);
          setError("ခရီးစဉ်မှတ်တမ်းများ ခေါ်ယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        }
      } else {
        setAvailableTrips([]);
      }
    };
    fetchAvailableTripsForNewEntry();
  }, [selectedCarNoForTrips]);

  useEffect(() => {
    const fetchAvailableFilterTrips = async () => {
      if (filterCarNo && filterMonth && filterYear) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/trips-by-car-month/${filterCarNo}/${filterYear}/${filterMonth}`
          );
          setAvailableFilterTrips(response.data.data);
        } catch (err) {
          console.error("Error fetching trips for filter dropdown:", err);
          setError("ခရီးစဉ်များ ခေါ်ယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        }
      } else {
        setAvailableFilterTrips([]);
        setFilterTripId("");
      }
    };
    fetchAvailableFilterTrips();
  }, [filterCarNo, filterMonth, filterYear]);

  // Handle change for new entry form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "carNo") {
      setSelectedCarNoForTrips(value);
      // Reset tripId and previous reading when carNo changes, and allow auto-fill
      setFormData((prev) => ({
        ...prev,
        tripId: "",
        previousFuelGaugeReading: "",
      }));
      setIsNewEntryPreviousReadingManuallySet(false); // Allow auto-fill for new car selection
    } else if (name === "previousFuelGaugeReading") {
      setIsNewEntryPreviousReadingManuallySet(true); // User is manually setting this
    } else if (name === "readingDate" || name === "readingTime") {
      // If date/time changes, reset manual flag to allow re-calculation of prev reading
      setIsNewEntryPreviousReadingManuallySet(false);
    }
  };

  // Function to fetch previous reading for auto-fill in new entry form
  const fetchPreviousReadingForNewEntry = useCallback(
    async (carNo, readingDate, readingTime) => {
      // Only auto-fill if user hasn't manually set it
      if (
        carNo &&
        readingDate &&
        readingTime &&
        !isNewEntryPreviousReadingManuallySet
      ) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/fuel-readings-previous/${carNo}`,
            {
              params: { readingDate, readingTime },
            }
          );
          if (
            response.data.data &&
            response.data.data.fuel_gauge_reading !== null
          ) {
            setFormData((prev) => ({
              ...prev,
              previousFuelGaugeReading:
                response.data.data.fuel_gauge_reading.toFixed(2),
            }));
          } else {
            setFormData((prev) => ({ ...prev, previousFuelGaugeReading: "" })); // No previous reading found or calculated
          }
        } catch (err) {
          console.error(
            "Error fetching previous fuel reading for new entry:",
            err
          );
          // Do not set error message on UI for this, it's an auto-fill feature
        }
      }
    },
    [isNewEntryPreviousReadingManuallySet]
  );

  useEffect(() => {
    // Auto-fill previousFuelGaugeReading if not manually entered
    if (
      formData.carNo &&
      formData.readingDate &&
      formData.readingTime &&
      !isNewEntryPreviousReadingManuallySet
    ) {
      fetchPreviousReadingForNewEntry(
        formData.carNo,
        formData.readingDate,
        formData.readingTime
      );
    }
  }, [
    formData.carNo,
    formData.readingDate,
    formData.readingTime,
    isNewEntryPreviousReadingManuallySet,
    fetchPreviousReadingForNewEntry,
  ]);

  // Handle form submission for new entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Client-side validation
    const currentReading = parseFloat(formData.fuelGaugeReading);
    const previousReading =
      formData.previousFuelGaugeReading !== ""
        ? parseFloat(formData.previousFuelGaugeReading)
        : null;

    if (isNaN(currentReading)) {
      setError("ယခုဆီတိုင်းအမှတ် (ဂါလံ) ကို မှန်ကန်စွာ ဖြည့်ပါ။");
      setLoading(false);
      return;
    }

    if (currentReading > 20) {
      setError("ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ၂၀ ဂါလံထက် မများရပါ။");
      setLoading(false);
      return;
    }
    if (previousReading !== null && currentReading > previousReading) {
      setError(
        "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ယခင်ဆီတိုင်းအမှတ် (ဂါလံ) ထက် မများရပါ။"
      );
      setLoading(false);
      return;
    }

    try {
      // Send previousFuelGaugeReading only if manually set, otherwise let backend calculate
      const dataToSend = { ...formData };
      if (!isNewEntryPreviousReadingManuallySet) {
        delete dataToSend.previousFuelGaugeReading; // Let backend calculate
      }

      await axios.post(`${API_BASE_URL}/fuel-readings`, dataToSend);
      setSuccessMessage(
        "ဆီစားနှုန်းမှတ်တမ်း အသစ်ထည့်သွင်းခြင်း အောင်မြင်ပါသည်။"
      );
      setFormData({
        carNo: "",
        tripId: "",
        readingDate: new Date().toISOString().split("T")[0],
        readingTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
        fuelGaugeReading: "",
        previousFuelGaugeReading: "", // Reset this as well
        remarks: "",
      });
      setSelectedCarNoForTrips(""); // Reset selected car for trips dropdown
      setIsNewEntryPreviousReadingManuallySet(false); // Reset manual flag for next entry
      setCurrentPage(1); // Go back to first page after adding
      fetchFuelReadings(); // Refresh the list
    } catch (err) {
      console.error("Error adding fuel reading:", err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("ဆီစားနှုန်းမှတ်တမ်း ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
      }
    } finally {
      setLoading(false);
    }
  };

  // Edit Handlers
  const handleEditClick = async (reading) => {
    // When opening edit dialog, populate form data and set manual flag based on existing data
    setEditFormData({
      id: reading.id,
      carNo: reading.car_no,
      tripId: reading.trip_id,
      readingDate: reading.reading_date,
      readingTime: reading.reading_time,
      fuelGaugeReading: reading.fuel_gauge_reading,
      previousFuelGaugeReading:
        reading.previous_fuel_gauge_reading !== null
          ? reading.previous_fuel_gauge_reading.toFixed(2)
          : "",
      remarks: reading.remarks,
      trip_date: reading.trip_date,
      from_location: reading.from_location,
      to_location: reading.to_location,
      km_travelled: reading.km_travelled,
    });

    // Set manual flag based on whether previous_fuel_gauge_reading exists in the fetched data
    // If it's null, it means it was auto-calculated or not set, so allow auto-fill.
    // If it has a value, assume it was either manually set or correctly calculated and should be editable.
    setIsEditPreviousReadingManuallySet(
      reading.previous_fuel_gauge_reading !== null
    );

    // Fetch trips for the selected car, including the currently assigned trip if it exists
    try {
      const response = await axios.get(
        `${API_BASE_URL}/trips-without-fuel-reading/${reading.car_no}`
      );
      // Add the current trip to the list if it's not already there (it won't be if it has a reading)
      let tripsForEdit = response.data.data;
      if (reading.trip_id) {
        const currentTripResponse = await axios.get(
          `${API_BASE_URL}/trips/${reading.trip_id}`
        );
        if (currentTripResponse.data.data) {
          // Check if the current trip is already in the list to avoid duplicates
          if (
            !tripsForEdit.some(
              (trip) => trip.id === currentTripResponse.data.data.id
            )
          ) {
            tripsForEdit = [...tripsForEdit, currentTripResponse.data.data];
          }
        }
      }
      // Sort trips by date descending
      tripsForEdit.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEditAvailableTrips(tripsForEdit);
    } catch (err) {
      console.error("Error fetching trips for edit:", err);
      setError("ခရီးစဉ်မှတ်တမ်းများ ခေါ်ယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
    }

    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "carNo") {
      // When carNo changes in edit dialog, re-fetch available trips for that car
      const fetchTripsForEditCar = async (newCarNo) => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/trips-without-fuel-reading/${newCarNo}`
          );
          setEditAvailableTrips(response.data.data);
          setEditFormData((prev) => ({
            ...prev,
            tripId: "",
            previousFuelGaugeReading: "",
          })); // Clear tripId and previous reading if car changes
          setIsEditPreviousReadingManuallySet(false); // Allow auto-fill for new car selection in edit
        } catch (err) {
          console.error("Error fetching trips for new car in edit:", err);
          setError("ခရီးစဉ်မှတ်တမ်းများ ခေါ်ယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
        }
      };
      fetchTripsForEditCar(value);
    } else if (name === "previousFuelGaugeReading") {
      setIsEditPreviousReadingManuallySet(true); // User is manually setting this in edit
    } else if (name === "readingDate" || name === "readingTime") {
      setIsEditPreviousReadingManuallySet(false); // Allow re-calculation if date/time changes in edit
    }
  };

  // Function to fetch previous reading for auto-fill in edit form
  const fetchPreviousReadingForEditEntry = useCallback(
    async (carNo, readingDate, readingTime, readingId) => {
      // Only auto-fill if user hasn't manually set it
      if (
        carNo &&
        readingDate &&
        readingTime &&
        readingId &&
        !isEditPreviousReadingManuallySet
      ) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/fuel-readings-previous/${carNo}`,
            {
              params: { readingDate, readingTime, currentReadingId: readingId }, // Pass current reading ID
            }
          );
          if (
            response.data.data &&
            response.data.data.fuel_gauge_reading !== null
          ) {
            setEditFormData((prev) => ({
              ...prev,
              previousFuelGaugeReading:
                response.data.data.fuel_gauge_reading.toFixed(2),
            }));
          } else {
            setEditFormData((prev) => ({
              ...prev,
              previousFuelGaugeReading: "",
            })); // No previous reading found or calculated
          }
        } catch (err) {
          console.error(
            "Error fetching previous fuel reading for edit entry:",
            err
          );
        }
      }
    },
    [isEditPreviousReadingManuallySet]
  );

  useEffect(() => {
    // Auto-fill previousFuelGaugeReading in edit dialog if not manually entered
    if (
      editDialogOpen &&
      editFormData.carNo &&
      editFormData.readingDate &&
      editFormData.readingTime &&
      editFormData.id &&
      !isEditPreviousReadingManuallySet
    ) {
      fetchPreviousReadingForEditEntry(
        editFormData.carNo,
        editFormData.readingDate,
        editFormData.readingTime,
        editFormData.id
      );
    }
  }, [
    editDialogOpen,
    editFormData.carNo,
    editFormData.readingDate,
    editFormData.readingTime,
    editFormData.id,
    isEditPreviousReadingManuallySet,
    fetchPreviousReadingForEditEntry,
  ]);

  const handleSaveEdit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Client-side validation for edit form
    const currentReading = parseFloat(editFormData.fuelGaugeReading);
    const previousReading =
      editFormData.previousFuelGaugeReading !== ""
        ? parseFloat(editFormData.previousFuelGaugeReading)
        : null;

    if (isNaN(currentReading)) {
      setError("ယခုဆီတိုင်းအမှတ် (ဂါလံ) ကို မှန်ကန်စွာ ဖြည့်ပါ။");
      setLoading(false);
      return;
    }

    if (currentReading > 20) {
      setError("ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ၂၀ ဂါလံထက် မများရပါ။");
      setLoading(false);
      return;
    }
    if (previousReading !== null && currentReading > previousReading) {
      setError(
        "ယခုဆီတိုင်းအမှတ် (ဂါလံ) သည် ယခင်ဆီတိုင်းအမှတ် (ဂါလံ) ထက် မများရပါ။"
      );
      setLoading(false);
      return;
    }

    try {
      // Send previousFuelGaugeReading only if manually set, otherwise let backend calculate
      const dataToSend = { ...editFormData };
      if (!isEditPreviousReadingManuallySet) {
        delete dataToSend.previousFuelGaugeReading; // Let backend calculate
      }

      await axios.put(
        `${API_BASE_URL}/fuel-readings/${editFormData.id}`,
        dataToSend
      );
      setSuccessMessage("ဆီစားနှုန်းမှတ်တမ်း ပြင်ဆင်ခြင်း အောင်မြင်ပါသည်။");
      setEditDialogOpen(false);
      setIsEditPreviousReadingManuallySet(false); // Reset manual flag after save
      fetchFuelReadings(); // Refresh the list
    } catch (err) {
      console.error("Error updating fuel reading:", err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("ဆီစားနှုန်းမှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setIsEditPreviousReadingManuallySet(false); // Reset manual flag on cancel
  };

  // Delete Handlers
  const handleDeleteClick = (reading) => {
    setReadingToDelete(reading);
    setDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setReadingToDelete(null);
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await axios.delete(`${API_BASE_URL}/fuel-readings/${readingToDelete.id}`);
      setSuccessMessage("ဆီစားနှုန်းမှတ်တမ်း ဖျက်သိမ်းခြင်း အောင်မြင်ပါသည်။");
      handleCloseDeleteConfirm();
      fetchFuelReadings(); // Refresh the list
    } catch (err) {
      console.error("Error deleting fuel reading:", err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("ဆီစားနှုန်းမှတ်တမ်း ဖျက်သိမ်းရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။");
      }
    } finally {
      setLoading(false);
    }
  };

  // Pagination Handlers
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const totalPages = Math.ceil(totalReadings / ITEMS_PER_PAGE);

  // Filter Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === "filterCarNo") {
      setFilterCarNo(value);
      setFilterTripId(""); // Reset trip filter when carNo changes
      setAvailableFilterTrips([]); // Clear trips for filter dropdown
    } else if (name === "filterMonth") {
      setFilterMonth(value);
      setFilterTripId(""); // Reset trip filter when month changes
    } else if (name === "filterYear") {
      setFilterYear(value);
      setFilterTripId(""); // Reset trip filter when year changes
    } else if (name === "filterTripId") {
      setFilterTripId(value);
    }
  };

  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    fetchFuelReadings(); // Re-fetch data with new filters
  };

  const clearFilters = () => {
    setFilterCarNo("");
    setFilterMonth("");
    setFilterYear(new Date().getFullYear().toString());
    setFilterTripId("");
    setAvailableFilterTrips([]); // Clear trips for filter dropdown
    setCurrentPage(1); // Reset to first page
    // fetchFuelReadings will be called due to dependency array of useEffect
  };

  // Sorting Handlers
  const handleSortByChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1); // Reset page on sort change
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(1); // Reset page on sort change
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        align="center"
        sx={{ mb: 4, fontWeight: "bold", color: "#1976d2" }}
      >
        ဆီစားနှုန်း မှတ်တမ်း
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Add New Fuel Reading Form */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: "12px" }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, color: "#3f51b5" }}>
          ဆီစားနှုန်းမှတ်တမ်း အသစ်ထည့်သွင်းရန်
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <FormControl fullWidth size="small" required>
            <InputLabel id="car-no-label">ကားနံပါတ်</InputLabel>
            <Select
              labelId="car-no-label"
              id="carNo"
              name="carNo"
              value={formData.carNo}
              label="ကားနံပါတ်"
              onChange={handleChange}
            >
              <MenuItem value="">
                <em>ရွေးပါ</em>
              </MenuItem>
              {uniqueCarNumbers.map((carNo) => (
                <MenuItem key={carNo} value={carNo}>
                  {carNo}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="trip-id-label">ခရီးစဉ် (KM)</InputLabel>
            <Select
              labelId="trip-id-label"
              id="tripId"
              name="tripId"
              value={formData.tripId}
              label="ခရီးစဉ် (KM)"
              onChange={handleChange}
              disabled={!formData.carNo || availableTrips.length === 0}
              required
            >
              <MenuItem value="">
                <em>
                  {formData.carNo
                    ? availableTrips.length > 0
                      ? "ခရီးစဉ်ရွေးပါ"
                      : "ဤကားအတွက် ဆီစားနှုန်းမမှတ်ရသေးသော ခရီးစဉ်မရှိပါ"
                    : "ကားနံပါတ်အရင်ရွေးပါ"}
                </em>
              </MenuItem>
              {availableTrips.map((trip) => (
                <MenuItem key={trip.id} value={trip.id}>
                  {(() => {
                    const [year, month, day] = trip.start_date.split("-");
                    return `${day}-${month}-${year} - ${
                      trip.from_location
                    } မှ ${trip.to_location} (${trip.km_travelled || 0} KM)`;
                  })()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="မှတ်တမ်းတင်သည့်ရက်စွဲ"
            type="date"
            name="readingDate"
            value={formData.readingDate}
            onChange={handleChange}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="မှတ်တမ်းတင်သည့်အချိန်"
            type="time"
            name="readingTime"
            value={formData.readingTime}
            onChange={handleChange}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="ယခင်ဆီတိုင်းအမှတ် (ဂါလံ)"
            type="number"
            name="previousFuelGaugeReading"
            value={formData.previousFuelGaugeReading}
            onChange={handleChange}
            fullWidth
            size="small"
            inputProps={{ step: "0.01" }}
            helperText={isNewEntryPreviousReadingManuallySet ? "Manual" : ""}
          />
          <TextField
            label="ယခုဆီတိုင်းအမှတ် (ဂါလံ)"
            type="number"
            name="fuelGaugeReading"
            value={formData.fuelGaugeReading}
            onChange={handleChange}
            fullWidth
            size="small"
            required
            inputProps={{ step: "0.01", max: 20 }}
            helperText=""
          />
          <TextField
            label="မှတ်ချက်"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            fullWidth
            size="small"
            multiline
            rows={1}
            sx={{ gridColumn: "span 2" }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ gridColumn: "span 2" }}
            disabled={loading}
          >
            မှတ်တမ်းတင်မည်
          </Button>
        </Box>
      </Paper>

      {/* Filter and Sort Section Toggle Buttons */}
      <Box sx={{ mb: 2, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button
          variant="contained"
          color="primary" // Different color for filter
          startIcon={<FilterListIcon />}
          endIcon={showFilterSection ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowFilterSection((prev) => !prev)}
          sx={{
            minWidth: "200px", // Ensure buttons have a minimum width
            py: 1.5, // Vertical padding
            borderRadius: "8px", // Rounded corners
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)", // Subtle shadow
            "&:hover": {
              boxShadow: "0 6px 12px rgba(0, 0, 0, 0.3)", // Larger shadow on hover
            },
          }}
        >
          မှတ်တမ်းများ ရှာဖွေရန်
        </Button>
        <Button
          variant="contained"
          color="secondary" // Different color for sort
          startIcon={<SortIcon />}
          endIcon={showSortSection ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setShowSortSection((prev) => !prev)}
          sx={{
            minWidth: "200px",
            py: 1.5,
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            "&:hover": {
              boxShadow: "0 6px 12px rgba(0, 0, 0, 0.3)",
            },
          }}
        >
          မှတ်တမ်းများ စီစဥ်ရန်
        </Button>
      </Box>

      {/* Filter Section (Collapsible) */}
      <Collapse in={showFilterSection}>
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: "12px" }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ mb: 3, color: "#3f51b5" }}
          >
            မှတ်တမ်းများ ရှာဖွေရန်
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              alignItems: "flex-end",
            }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id="filter-car-no-label">ကားနံပါတ်</InputLabel>
              <Select
                labelId="filter-car-no-label"
                id="filterCarNo"
                name="filterCarNo"
                value={filterCarNo}
                label="ကားနံပါတ်"
                onChange={handleFilterChange}
              >
                <MenuItem value="">
                  <em>အားလုံး</em>
                </MenuItem>
                {uniqueCarNumbers.map((carNo) => (
                  <MenuItem key={carNo} value={carNo}>
                    {carNo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="filter-year-label">နှစ်</InputLabel>
              <Select
                labelId="filter-year-label"
                id="filterYear"
                name="filterYear"
                value={filterYear}
                label="နှစ်"
                onChange={handleFilterChange}
              >
                <MenuItem value="">
                  <em>အားလုံး</em>
                </MenuItem>
                {yearOptions.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="filter-month-label">လ</InputLabel>
              <Select
                labelId="filter-month-label"
                id="filterMonth"
                name="filterMonth"
                value={filterMonth}
                label="လ"
                onChange={handleFilterChange}
                disabled={!filterYear}
              >
                <MenuItem value="">
                  <em>အားလုံး</em>
                </MenuItem>
                {monthOptions.map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="filter-trip-id-label">ခရီးစဉ်</InputLabel>
              <Select
                labelId="filter-trip-id-label"
                id="filterTripId"
                name="filterTripId"
                value={filterTripId}
                label="ခရီးစဉ်"
                onChange={handleFilterChange}
                disabled={
                  !filterCarNo ||
                  !filterMonth ||
                  !filterYear ||
                  availableFilterTrips.length === 0
                }
              >
                <MenuItem value="">
                  <em>
                    {filterCarNo && filterMonth && filterYear
                      ? availableFilterTrips.length > 0
                        ? "ခရီးစဉ်ရွေးပါ"
                        : "ဤကား/လ/နှစ်အတွက် ခရီးစဉ်မရှိပါ"
                      : "ကားနံပါတ်၊ နှစ်၊ လ အရင်ရွေးပါ"}
                  </em>
                </MenuItem>
                {availableFilterTrips.map((trip) => (
                  <MenuItem key={trip.id} value={trip.id}>
                    {`${trip.start_date} - ${trip.from_location} မှ ${
                      trip.to_location
                    } (${trip.km_travelled || 0} KM)`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="secondary"
              onClick={applyFilters}
              startIcon={<SearchIcon />}
              sx={{ height: "40px" }}
            >
              ရှာဖွေမည်
            </Button>
            <Button
              variant="outlined"
              color="info"
              onClick={clearFilters}
              startIcon={<ClearIcon />}
              sx={{ height: "40px" }}
            >
              ရှင်းလင်းမည်
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {/* Sorting Section (Collapsible) */}
      <Collapse in={showSortSection}>
        <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: "12px" }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ mb: 3, color: "#3f51b5" }}
          >
            မှတ်တမ်းများ စီစဥ်ရန်
          </Typography>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel id="sort-by-label">စီစဥ်မည်</InputLabel>
              <Select
                labelId="sort-by-label"
                id="sortBy"
                name="sortBy"
                value={sortBy}
                label="စီစဥ်မည်"
                onChange={handleSortByChange}
              >
                <MenuItem value="reading_date">ရက်စွဲ</MenuItem>
                <MenuItem value="car_no">ကားနံပါတ်</MenuItem>
                <MenuItem value="km_travelled">KM</MenuItem>
                <MenuItem value="fuel_consumed_gallons">
                  သုံးစွဲဆီ (ဂါလံ)
                </MenuItem>
                <MenuItem value="km_per_gallon">KM/ဂါလံ</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="primary"
              onClick={toggleSortOrder}
              startIcon={
                sortOrder === "asc" ? (
                  <ArrowUpwardIcon />
                ) : (
                  <ArrowDownwardIcon />
                )
              }
              sx={{ height: "40px" }}
            >
              {sortOrder === "asc"
                ? "အနိမ့်ဆုံးမှ အမြင့်ဆုံး"
                : "အမြင့်ဆုံးမှ အနိမ့်ဆုံး"}
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {/* Fuel Readings List */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: "12px" }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, color: "#3f51b5" }}>
          ဆီစားနှုန်း မှတ်တမ်းများ
        </Typography>
        <TableContainer>
          <Table stickyHeader aria-label="fuel readings table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>စဉ်</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>ကားနံပါတ်</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>ခရီးစဉ်ရက်စွဲ</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>ခရီးစဉ်</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>KM</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  မှတ်တမ်းတင်သည့်ရက်စွဲ/အချိန်
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>ဆီဂိတ် (အစ)</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  ဆီဂိတ် (အဆုံး)
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  သုံးစွဲဆီ (ဂါလံ)
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>KM/ဂါလံ</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>မှတ်ချက်</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fuelReadings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    ဆီစားနှုန်းမှတ်တမ်းများ မရှိသေးပါ။
                  </TableCell>
                </TableRow>
              ) : (
                fuelReadings.map((reading, index) => (
                  <TableRow key={reading.id} hover>
                    <TableCell>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell>{reading.car_no}</TableCell>
                    <TableCell>{reading.trip_date}</TableCell>
                    <TableCell>
                      {reading.from_location} မှ {reading.to_location}
                    </TableCell>
                    <TableCell>{reading.km_travelled || "N/A"}</TableCell>
                    <TableCell>
                      {reading.reading_date} {reading.reading_time}
                    </TableCell>
                    <TableCell>
                      {reading.previous_fuel_gauge_reading !== null
                        ? reading.previous_fuel_gauge_reading.toFixed(2)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {reading.fuel_gauge_reading.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {reading.fuel_consumed_gallons !== null
                        ? reading.fuel_consumed_gallons.toFixed(2)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {reading.km_per_gallon !== null
                        ? reading.km_per_gallon.toFixed(2)
                        : "N/A"}
                    </TableCell>
                    <TableCell>{reading.remarks}</TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleEditClick(reading)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(reading)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Paper>

      {/* Edit Fuel Reading Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCancelEdit}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ဆီစားနှုန်းမှတ်တမ်း ပြင်ဆင်ရန်</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="edit-car-no-label">ကားနံပါတ်</InputLabel>
              <Select
                labelId="edit-car-no-label"
                id="editCarNo"
                name="carNo"
                value={editFormData.carNo}
                label="ကားနံပါတ်"
                onChange={handleEditChange}
                required
              >
                {uniqueCarNumbers.map((carNo) => (
                  <MenuItem key={carNo} value={carNo}>
                    {carNo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="edit-trip-id-label">ခရီးစဉ် (KM)</InputLabel>
              <Select
                labelId="edit-trip-id-label"
                id="editTripId"
                name="tripId"
                value={editFormData.tripId || ""}
                label="ခရီးစဉ် (KM)"
                onChange={handleEditChange}
                required
              >
                <MenuItem value="">
                  <em>ခရီးစဉ်ရွေးပါ</em>
                </MenuItem>
                {editAvailableTrips.map((trip) => (
                  <MenuItem key={trip.id} value={trip.id}>
                    {`${trip.start_date} - ${trip.from_location} မှ ${
                      trip.to_location
                    } (${trip.km_travelled || 0} KM)`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="မှတ်တမ်းတင်သည့်ရက်စွဲ"
              type="date"
              name="readingDate"
              value={editFormData.readingDate}
              onChange={handleEditChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="မှတ်တမ်းတင်သည့်အချိန်"
              type="time"
              name="readingTime"
              value={editFormData.readingTime}
              onChange={handleEditChange}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="ယခင်ဆီတိုင်းအမှတ် (ဂါလံ)"
              type="number"
              name="previousFuelGaugeReading"
              value={editFormData.previousFuelGaugeReading}
              onChange={handleEditChange}
              fullWidth
              size="small"
              inputProps={{ step: "0.01" }}
              helperText={
                isEditPreviousReadingManuallySet
                  ? "လက်ဖြင့် ဖြည့်သွင်းထားသည်"
                  : "အလိုအလျောက် တွက်ချက်ပေးပါမည်။"
              }
            />
            <TextField
              label="ယခုဆီတိုင်းအမှတ် (ဂါလံ)"
              type="number"
              name="fuelGaugeReading"
              value={editFormData.fuelGaugeReading}
              onChange={handleEditChange}
              fullWidth
              size="small"
              required
              inputProps={{ step: "0.01", max: 20 }}
              helperText="၂၀ ဂါလံထက် မများရပါ။ ယခင်ဆီတိုင်းအမှတ်ထက် နည်းရပါမည်။"
            />
            <TextField
              label="မှတ်ချက်"
              name="remarks"
              value={editFormData.remarks}
              onChange={handleEditChange}
              fullWidth
              size="small"
              multiline
              rows={2}
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
        <DialogTitle id="alert-dialog-title">
          {"ဆီစားနှုန်းမှတ်တမ်း ဖျက်သိမ်းခြင်း"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ရက်စွဲ {readingToDelete?.reading_date}၊ ကားနံပါတ်{" "}
            {readingToDelete?.car_no} ၏ ဆီစားနှုန်းမှတ်တမ်းကို ဖျက်သိမ်းမှာ
            သေချာပါသလား။
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
}

export default FuelConsumptionPage;
