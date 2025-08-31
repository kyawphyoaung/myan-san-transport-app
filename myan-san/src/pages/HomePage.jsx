// myan-san/src/pages/HomePage.jsx
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material"; // Add AddIcon
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios"; // axios ကို import လုပ်ပေးခြင်း
import { addDays, format, parseISO } from "date-fns"; // date-fns functions
import { saveAs } from "file-saver";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import "../index.css"; // Global CSS (print styles for index.css)
// Static data များကို import လုပ်ခြင်း
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import carNumbersData from "../data/carNumbers.json";
import groupedRoutes from "../data/groupedRoutes.json";
import kmData from "../data/kmData.json";
import { formatMMK } from "../utils/currencyFormatter"; // Currency formatter ကို import လုပ်ပါ။
import { formatDateForDisplay } from "../utils/formatDate";
import EditTripDialog from "./EditTripDialog";
import SuccessDialog from "../components/SuccessDialog";

import { autoCalculateOvernightAndDayOver as importedCalculate } from "../utils/calculations.js";

//import icons
//iic
import BusAlertIcon from "@mui/icons-material/BusAlert";
import CarRepairIcon from "@mui/icons-material/CarRepair";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AddLocationIcon from "@mui/icons-material/AddLocation";
import FlagIcon from "@mui/icons-material/Flag";
import ModeOfTravelIcon from "@mui/icons-material/ModeOfTravel";
import WrongLocationIcon from "@mui/icons-material/WrongLocation";
import WhereToVoteIcon from "@mui/icons-material/WhereToVote";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import RvHookupIcon from "@mui/icons-material/RvHookup";
import StartIcon from "@mui/icons-material/Start";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SaveIcon from "@mui/icons-material/Save";
import LocalPrintshopOutlinedIcon from "@mui/icons-material/LocalPrintshopOutlined";

function HomePage() {
  // Form input များကို သိမ်းဆည်းရန် state များ
  const [formData, setFormData] = useState({
    date: "", // ခရီးစဉ် စတင်သည့်ရက် (Start Date) (YYYY-MM-DD)
    startTime: "00:00", // ခရီးစဉ် စတင်ချိန် (Start Time) (HH:MM)
    endDate: "", // ခရီးစဉ် ပြီးဆုံးရက် (End Date) (YYYY-MM-DD)
    endTime: "00:00", // ခရီးစဉ် ပြီးဆုံးချိန် (End Time) (HH:MM)
    carNo: "",
    from: "",
    to: "",
    emptyHandlingLocation: "",
    cargoLoadType: "normal", // 'normal': ပုံမှန် (နောက်ရက်တင်), 'sameDay': ပတ်မောင်း (ဒီနေ့တင်), 'custom': စိတ်ကြိုက်ရွေး
    cargoLoadDate: "", // အသားတင်သည့်ရက် (Effective date for cargo loading)
    cargoLoadTime: "00:00", // အသားတင်သည့်အချိန်
    pointChangeLocations: [], // [{ id: uniqueId, location: '', charge: 0 }]
    tripType: "normal", // 'normal', 'tinSit', 'pointPyat'
    overnightStayCount: 0, // ညအိပ်အရေအတွက် (integer)
    dayOverDelayedCount: 0, // နေ့ကျော်အရေအတွက် (integer)
    remarks: "",
    agentName: "",
    driverName: "",
    routeCharge: 0,
    emptyCharge: 0,
    totalCharge: 0,
    isManualEdited: false, // For totalCharge manual edit
    overnightCharges: 0, // ညအိပ်ခ
    dayOverCharges: 0, // နေ့ကျော်ခ
    pointChangeTotalCharge: 0, // ပွိုင့်ချိန်း စုစုပေါင်းခ
  });

  // Editing အတွက် state များ (formData နှင့် တူညီစွာ ပြင်ဆင်ပါ)
  const [editingTripId, setEditingTripId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: "",
    startTime: "",
    endDate: "",
    endTime: "",
    carNo: "",
    from: "",
    to: "",
    emptyHandlingLocation: "",
    cargoLoadType: "normal",
    cargoLoadDate: "",
    cargoLoadTime: "",
    pointChangeLocations: [],
    tripType: "normal",
    overnightStayCount: 0,
    dayOverDelayedCount: 0,
    remarks: "",
    agentName: "",
    driverName: "",
    routeCharge: 0,
    emptyCharge: 0,
    totalCharge: 0,
    isManualEdited: false,
    overnightCharges: 0,
    dayOverCharges: 0,
    pointChangeTotalCharge: 0,
  });

  //States

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
  const [portLocationsSet, setPortLocationsSet] = useState(new Set()); // Renamed for clarity

  // Agent Names for dropdown
  const [agentNames, setAgentNames] = useState([]);
  const [showOtherAgentInput, setShowOtherAgentInput] = useState(false);
  const [newAgentNameInput, setNewAgentNameInput] = useState("");

  // HomePage Table Filter states (CarNo, Month, Year only)
  const [filterCarNo, setFilterCarNo] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Available options for filters
  const [uniqueCarNumbersForFilter, setUniqueCarNumbersForFilter] = useState(
    []
  );
  const [availableYears, setAvailableYears] = useState([]);

  // ရွေးချယ်ထားသော row များကို သိမ်းဆည်းရန် state
  // const [selectedRows, setSelectedRows] = useState(new Set());

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

  // For LarYar Button (Empty Charge Type Override)
  const [buttonState, setButtonState] = useState(null); // null: grey, 'opposite': red, 'same': green

  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const [originalKmTravelled, setOriginalKmTravelled] = useState(0);

  const [updatedTrip, setUpdatedTrip] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || ""; // Backend API base URL ကို သတ်မှတ်ပါ။

  // src/components/YourTableComponent.jsx (သို့) AllTripsPage.jsx

  // Export routes အတွက် from location ကို မြားနဲ့ဆက်ပြီး ပြပေးမယ့် function
  const getExportRouteFromDisplay = (trip) => {
    const { from_location, point_change_locations } = trip;
    let intermediateStops = [];
    try {
      intermediateStops = JSON.parse(point_change_locations);
    } catch (e) {
      intermediateStops = [];
    }
    const stops = Array.isArray(intermediateStops) ? intermediateStops : [];

    if (stops.length > 0) {
      // 'from' location မှစ၍ ကြားခံ location များအားလုံးကို မြှားဖြင့်ဆက်ပါ
      const route = [from_location, ...stops.map((point) => point.location)];
      return route.join(" → ");
    }

    // ကြားခံ stop မရှိပါက from location ကိုပဲ ပြပါ
    return from_location;
  };

  // Import routes အတွက် to location ကို မြားနဲ့ဆက်ပြီး ပြပေးမယ့် function
  const getImportRouteToDisplay = (trip) => {
    const { to_location, point_change_locations } = trip;
    let intermediateStops = [];
    try {
      intermediateStops = JSON.parse(point_change_locations);
    } catch (e) {
      intermediateStops = [];
    }
    const stops = Array.isArray(intermediateStops) ? intermediateStops : [];

    if (stops.length > 0) {
      // 'to' location မှစ၍ ကြားခံ location များအားလုံးကို မြှားဖြင့်ဆက်ပါ
      const route = [to_location, ...stops.map((point) => point.location)];
      return route.join(" → ");
    }

    // ကြားခံ stop မရှိပါက to location ကိုပဲ ပြပါ
    return to_location;
  };

  // Filter logic for HomePage (Car No, Year, and Month only)
  const applyHomePageFilters = useCallback((trips, carNo, year, month) => {
    let tempFilteredTrips = trips.filter((trip) => {
      const tripStartDate = parseISO(trip.start_date); // Use parseISO for robustness
      const matchesCarNo = carNo === "" ? true : trip.car_no === carNo;
      const matchesYear =
        year === "" ? true : tripStartDate.getFullYear() === year;
      const matchesMonth =
        month === "" ? true : tripStartDate.getMonth() + 1 === month;
      return matchesCarNo && matchesYear && matchesMonth;
    });
    setFilteredTrips(tempFilteredTrips);
  }, []);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trips`);
      const data = await response.json();
      if (data.message === "success") {
        setAllTrips(data.data);

        // Filter out trips where start_date is not a valid string (null/undefined/not string)
        // This is crucial to prevent '__' on undefined errors.
        const validTrips = data.data.filter(
          (trip) => trip.start_date && typeof trip.start_date === "string"
        );

        // Extract unique years from valid trips
        // Only process trips with valid start_date to avoid errors
        const years = [
          ...new Set(
            validTrips.map((trip) => new Date(trip.start_date).getFullYear())
          ),
        ].sort((a, b) => b - a);
        setAvailableYears(years);

        // car_no should typically be a string and not cause date-related __ errors
        const carNos = [
          ...new Set(data.data.map((trip) => trip.car_no)),
        ].sort();
        setUniqueCarNumbersForFilter(carNos);

        // Set initial selected year, month, and carNo for filters
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        let initialFilterYear = years.includes(currentYear)
          ? currentYear
          : years.length > 0
          ? years[0]
          : "";
        setFilterYear(initialFilterYear);

        const monthsForInitialYear = [
          ...new Set(
            validTrips // Use validTrips here to ensure valid dates
              .filter(
                (trip) =>
                  new Date(trip.start_date).getFullYear() === initialFilterYear
              )
              .map((trip) => new Date(trip.start_date).getMonth() + 1)
          ),
        ].sort((a, b) => a - b);
        // setAvailableMonths(monthsForInitialYear);

        let initialFilterMonth = monthsForInitialYear.includes(currentMonth)
          ? currentMonth
          : monthsForInitialYear.length > 0
          ? monthsForInitialYear[0]
          : "";
        setFilterMonth(initialFilterMonth);

        let initialFilterCarNo = "";
        if (data.data.length > 0) {
          const sortedTrips = [...data.data].sort((a, b) => {
            // Robust date parsing for sorting:
            // If start_date is invalid, use a fallback date (e.g., epoch 0 or a very old date)
            // to ensure Date object creation doesn't fail.
            const dateA =
              a.start_date && typeof a.start_date === "string"
                ? new Date(a.start_date)
                : new Date(0);
            const dateB =
              b.start_date && typeof b.start_date === "string"
                ? new Date(b.start_date)
                : new Date(0);

            if (dateA.getTime() !== dateB.getTime()) {
              return dateB.getTime() - dateA.getTime();
            }
            return b.id - a.id;
          });
          initialFilterCarNo = sortedTrips[0].car_no;
        }
        setFilterCarNo(initialFilterCarNo);

        // applyHomePageFilters should receive data that is already clean or handle invalid dates internally
        applyHomePageFilters(
          data.data,
          initialFilterCarNo,
          initialFilterYear,
          initialFilterMonth
        );
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
  }, [applyHomePageFilters, API_BASE_URL]);

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
  }, [API_BASE_URL]);

  const fetchAgentNames = useCallback(async () => {
    try {
      // API call to your Express backend to get agent names
      const response = await fetch(`${API_BASE_URL}/api/agent-names`);
      const data = await response.json();

      if (response.ok && data.message === "success") {
        let fetchedNames = data.data;
        // Sort alphabetically by Burmese locale
        fetchedNames.sort((a, b) => a.name.localeCompare(b.name, "my")); // Assuming data.data is [{ id: '...', name: '...' }]
        setAgentNames(fetchedNames.map((agent) => agent.name)); // Store just the names
      } else {
        console.error(
          "Failed to fetch agent names:",
          data.error || response.statusText
        );
        setAgentNames([]); // Set to empty array on error
      }
    } catch (error) {
      console.error("Error fetching agent names:", error);
      setAgentNames([]); // Set to empty array on network error
    }
  }, [API_BASE_URL]);

  // ကား-ယာဉ်မောင်း ချိတ်ဆက်မှုများကို Backend မှ fetch လုပ်ရန် function
  const fetchCarDriverAssignments = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/car-driver-assignments`
      );
      const data = await response.json();
      if (data.message === "success") {
        setCarDriverAssignments(data.data);
      } else {
        console.error("Failed to fetch car-driver assignments:", data.error);
      }
    } catch (error) {
      console.error("Error fetching car-driver assignments:", error);
    }
  }, [API_BASE_URL]);

  // Fetch active empty charges data
  const fetchEmptyChargeData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/empty-charges/active`);
      const data = res.data.data.emptyCharges;
      setEmptyChargeData(data);
      setEmptyLocationsOptions(
        data.empty_locations_charges.map((loc) => loc.location)
      );
      setPortLocationsSet(new Set(data.port_locations));
    } catch (err) {
      console.error("Error fetching active empty charges data:", err);
      setError(
        "အခွံချ/အခွံတင် စျေးနှုန်းများ ရယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။"
      );
      setEmptyChargeData(null);
    }
  }, [API_BASE_URL]);

  // Component စတင်သောအခါ Backend မှ settings, route charges, trips နှင့် driver names များကို ရယူခြင်း
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = format(new Date(), "HH:mm");

    // Set default start/end date/time for new trip, and initial cargo load date/time
    setFormData((prevData) => ({
      ...prevData,
      date: today,
      startTime: currentTime,
      endDate: today,
      endTime: currentTime,
      cargoLoadDate: today, // Default cargo load date to trip start date
      cargoLoadTime: currentTime, // Default cargo load time to trip start time
    }));

    const fetchInitialData = async () => {
      try {
        const [settingsResponse, routeChargesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/settings`),
          fetch(`${API_BASE_URL}/api/route-charges`),
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
          console.error(
            "Failed to fetch route charges:",
            routeChargesData.error
          );
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
      fetchTrips();
      fetchDriverNames();
      fetchAgentNames();
      fetchCarDriverAssignments();
      fetchEmptyChargeData();
    };

    fetchInitialData();
  }, [
    fetchTrips,
    fetchDriverNames,
    fetchAgentNames,
    fetchCarDriverAssignments,
    fetchEmptyChargeData,
    API_BASE_URL,
  ]);

  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (New Trip Form)
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prevData) => {
      let updatedData = {
        ...prevData,
        [name]: type === "checkbox" ? checked : value,
      };

      // Reset isManualEdited if key calculation fields change
      if (
        [
          "date",
          "startTime",
          "endDate",
          "endTime",
          "from",
          "to",
          "carNo",
          "emptyHandlingLocation",
          "cargoLoadType",
          "cargoLoadDate",
          "cargoLoadTime",
          "tripType",
        ].includes(name)
      ) {
        updatedData.isManualEdited = false;
      }

      // Special handling for cargoLoadType to update cargoLoadDate/Time
      if (name === "cargoLoadType") {
        const tripStartDateTime = parseISO(
          `${updatedData.date}T${updatedData.startTime}`
        );
        if (value === "normal") {
          const nextDay = addDays(tripStartDateTime, 1);
          updatedData.cargoLoadDate = format(nextDay, "yyyy-MM-dd");
          updatedData.cargoLoadTime = updatedData.startTime; // Keep same time as trip start
        } else if (value === "sameDay") {
          updatedData.cargoLoadDate = updatedData.date;
          updatedData.cargoLoadTime = updatedData.startTime;
        } else if (value === "custom" && !updatedData.cargoLoadDate) {
          // If custom is selected and no custom date is set yet, default to trip start date
          updatedData.cargoLoadDate = updatedData.date;
          updatedData.cargoLoadTime = updatedData.startTime;
        }
      }

      return updatedData;
    });
  };

  // Input field များ ပြောင်းလဲသောအခါ state ကို update လုပ်ရန် function (Edit Trip Form)
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;

    setEditFormData((prevData) => {
      let updatedData = {
        ...prevData,
        [name]: type === "checkbox" ? checked : value,
      };

      // Special handling for cargoLoadType to update cargoLoadDate/Time
      if (name === "cargoLoadType") {
        const tripStartDateTime = parseISO(
          `${updatedData.date}T${updatedData.startTime}`
        );
        if (value === "normal") {
          const nextDay = addDays(tripStartDateTime, 1);
          updatedData.cargoLoadDate = format(nextDay, "yyyy-MM-dd");
          updatedData.cargoLoadTime = updatedData.startTime;
        } else if (value === "sameDay") {
          updatedData.cargoLoadDate = updatedData.date;
          updatedData.cargoLoadTime = updatedData.startTime;
        } else if (value === "custom" && !updatedData.cargoLoadDate) {
          updatedData.cargoLoadDate = updatedData.date;
          updatedData.cargoLoadTime = updatedData.startTime;
        }
      }

      return updatedData;
    });
  };

  // Point Change Logic
  const handleAddPointChange = () => {
    setFormData((prevData) => ({
      ...prevData,
      pointChangeLocations: [
        ...prevData.pointChangeLocations,
        { id: Date.now(), location: "", charge: 0 }, // Unique ID for key prop
      ],
    }));
  };

  const handleRemovePointChange = (indexToRemove) => {
    setFormData((prevData) => ({
      ...prevData,
      pointChangeLocations: prevData.pointChangeLocations.filter(
        (_, index) => index !== indexToRemove
      ),
    }));
  };

  const handlePointChange = (index, field, value) => {
    setFormData((prevData) => {
      const newPointChangeLocations = [...prevData.pointChangeLocations];
      newPointChangeLocations[index] = {
        ...newPointChangeLocations[index],
        [field]: field === "charge" ? Number(value) : value,
      };
      return { ...prevData, pointChangeLocations: newPointChangeLocations };
    });
  };

  // Edit Dialog Point Change Logic
  const handleEditAddPointChange = () => {
    setEditFormData((prevData) => ({
      ...prevData,
      pointChangeLocations: [
        ...prevData.pointChangeLocations,
        { id: Date.now(), location: "", charge: 0 },
      ],
    }));
  };

  const handleEditRemovePointChange = (indexToRemove) => {
    setEditFormData((prevData) => ({
      ...prevData,
      pointChangeLocations: prevData.pointChangeLocations.filter(
        (_, index) => index !== indexToRemove
      ),
    }));
  };

  const handleEditPointChange = (index, field, value) => {
    setEditFormData((prevData) => {
      const newPointChangeLocations = [...prevData.pointChangeLocations];
      newPointChangeLocations[index] = {
        ...newPointChangeLocations[index],
        [field]: field === "charge" ? Number(value) : value,
      };
      return { ...prevData, pointChangeLocations: newPointChangeLocations };
    });
  };

  // ကားနံပါတ် ပြောင်းလဲသောအခါ ယာဉ်မောင်းအမည်ကို အလိုအလျောက် ဖြည့်ရန် (New Trip Form)
  const handleCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(
      (assignment) =>
        assignment.car_no === carNo && assignment.end_date === null
    ); // Find active assignment
    setFormData((prevData) => ({
      ...prevData,
      carNo: carNo,
      driverName: assignedDriver ? assignedDriver.driver_name : "",
    }));
  };

  // ကားနံပါတ် ပြောင်းလဲသောအခါ ယာဉ်မောင်းအမည်ကို အလိုအလျောက် ဖြည့်ရန် (Edit Trip Form)
  const handleEditCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(
      (assignment) =>
        assignment.car_no === carNo && assignment.end_date === null
    ); // Find active assignment
    setEditFormData((prevData) => ({
      ...prevData,
      carNo: carNo,
      driverName: assignedDriver ? assignedDriver.driver_name : "",
    }));
  };

  const handleAgentNameChange = async (event) => {
    const selectedValue = event.target.value;
    if (selectedValue === "other") {
      setShowOtherAgentInput(true);
      setFormData((prevData) => ({ ...prevData, agentName: "" })); // Clear agentName for new input
    } else {
      setShowOtherAgentInput(false);
      setNewAgentNameInput(""); // Clear new agent name input
      setFormData((prevData) => ({
        ...prevData,
        agentName: selectedValue,
      }));
    }
  };

  const handleAddAgentName = async () => {
    if (!newAgentNameInput.trim()) {
      alert("အေးဂျင့်အမည် အသစ်ထည့်ရန် လိုအပ်ပါသည်။"); // Use a custom dialog in real app
      return;
    }

    const newName = newAgentNameInput.trim();

    try {
      // API call to your Express backend to add a new agent name
      const response = await fetch(`${API_BASE_URL}/api/agent-names/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });
      const data = await response.json();

      if (response.ok && data.message === "success") {
        alert(`'${newName}' ကို အေးဂျင့်စာရင်းထဲ ထည့်သွင်းလိုက်ပါပြီ။`); // Use a custom dialog
        await fetchAgentNames(); // Re-fetch all agent names to update the list and sort
        setEditFormData((prevData) => ({ ...prevData, agentName: newName })); // Select the newly added agent
        setNewAgentNameInput("");
        setShowOtherAgentInput(false);
      } else {
        // This handles cases where backend might return a specific error message, e.g., duplicate
        alert(
          data.error || "အေးဂျင့်အမည် အသစ်ထည့်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။"
        ); // Use a custom dialog
        console.error(
          "Failed to add agent name:",
          data.error || response.statusText
        );
      }
    } catch (error) {
      console.error("Error adding new agent name:", error);
      alert("အေးဂျင့်အမည် အသစ်ထည့်ရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။"); // Use a custom dialog
    }
  };

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
      const monthsForSelectedYear = [
        ...new Set(
          allTrips
            .filter(
              (trip) => parseISO(trip.start_date).getFullYear() === filterYear
            )
            .map((trip) => parseISO(trip.start_date).getMonth() + 1)
        ),
      ].sort((a, b) => a - b);
      // setAvailableMonths(monthsForSelectedYear);
      if (
        !monthsForSelectedYear.includes(filterMonth) &&
        monthsForSelectedYear.length > 0
      ) {
        setFilterMonth(""); // Default to 'All' if current month is not available for new year
      } else if (monthsForSelectedYear.length === 0) {
        setFilterMonth("");
      }
    } else {
      // setAvailableMonths([]);
      setFilterMonth("");
    }
  }, [filterYear, allTrips, filterMonth]);

  // Select/Deselect all rows
  // const handleSelectAllRows = (e) => {
  //   const { checked } = e.target;
  //   if (checked) {
  //     const newSelectedRows = new Set(filteredTrips.map(trip => trip.id));
  //     setSelectedRows(newSelectedRows);
  //   } else {
  //     setSelectedRows(new Set());
  //   }
  // };

  // // Select/Deselect individual row
  // const handleRowSelect = (id) => {
  //   setSelectedRows(prevSelectedRows => {
  //     const newSelectedRows = new Set(prevSelectedRows);
  //     if (newSelectedRows.has(id)) {
  //       newSelectedRows.delete(id);
  //     } else {
  //       newSelectedRows.add(id);
  //     }
  //     return newSelectedRows;
  //   });
  // };

  // Helper to get route charge from routeCharges data
  const getRouteCharge = useCallback(
    (from, to) => {
      // Special case ကို အရင်ဆုံး စစ်ဆေးပါ။
      if (from === "သီလဝါ" && to === "MIP") {
        const sezThilawarRoute = currentRouteCharges.find(
          (r) => r.route === "SEZ/Thilawar Zone"
        );
        return sezThilawarRoute ? sezThilawarRoute.MIP_AWPT_40 : 0;
      }

      // from နဲ့ to ထဲက ဘယ်ဟာက ဆိပ်ကမ်းနာမည်လဲဆိုတာကို ရှာဖွေပါ။
      const ports = ["အေးရှားဝေါ", "MIP", "သီလဝါ"]; // This should ideally come from emptyChargeData.port_locations
      const tripRoute = ports.includes(from) ? to : from;

      // အခုမှ tripRoute ကို အသုံးပြုပြီး မှန်ကန်တဲ့ route ကို ရှာဖွေပါ။
      const route = currentRouteCharges.find((r) => {
        const isExactMatch = r.route === tripRoute;
        const isPartialMatch = r.route.split(/[/+]/).includes(tripRoute);
        return isExactMatch || isPartialMatch;
      });
      if (route) {
        // from သို့မဟုတ် to က အေးရှားဝေါ/MIP ဖြစ်ရင် MIP_AWPT_40 ကို ရွေးပါ။
        if (
          from === "အေးရှားဝေါ" ||
          from === "MIP" ||
          to === "အေးရှားဝေါ" ||
          to === "MIP"
        ) {
          return route.MIP_AWPT_40;
        }
        // from သို့မဟုတ် to က သီလဝါ ဖြစ်ရင် MIIT_40 ကို ရွေးပါ။
        else if (from === "သီလဝါ" || to === "သီလဝါ") {
          return route.MIIT_40;
        }
      }

      return 0;
    },
    [currentRouteCharges]
  );

  // Frontend logic to calculate empty charges based on selected locations and active data
  const calculateEmptyChargeFrontend = useCallback(
    (from, to, emptyLoc, tripDate, buttonState) => {
      // 1. Initial Checks and Setup
      if (!emptyChargeData || !emptyLoc) {
        return { charge: 0, direction: "none" };
      }

      const {
        empty_locations_charges,
        same_direction_overrides,
        no_charge_routes,
        port_locations,
      } = emptyChargeData;
      const portLocationsSet = new Set(port_locations); // Ensure this is correctly initialized
      let routeType = "none";

      if (portLocationsSet.has(from)) {
        routeType = "import"; // dropoff
      } else if (portLocationsSet.has(to)) {
        routeType = "export"; // pickup
      }

      // 2. Button State Logic (Highest Priority for empty charge override)
      // User က manual override လုပ်ထားတာဖြစ်လို့ အရင်ဆုံးစစ်ရပါမယ်။
      if (buttonState === "same") {
        return {
          charge: 0,
          direction: "လားရာတူ၍ မရရှိပါ",
          routeType: routeType,
        };
      } else if (buttonState === "opposite") {
        const oppositeDirectionCharge = empty_locations_charges.find(
          (item) => item.location === emptyLoc
        );
        // Button က 'opposite' ဖြစ်နေရင်တော့ opposite charge ကိုပဲ အတင်းတွက်ပါ။
        return {
          charge: oppositeDirectionCharge
            ? oppositeDirectionCharge.charge_40_ft
            : 0,
          direction: "လားရာဆန့်ကျင်",
          routeType: routeType,
        };
      }

      // 3. No Charge Logic (Auto-calculation Priority 1)
      // Check for export ports with no empty charge
      if (
        routeType === "export" &&
        (emptyLoc === "MIP" ||
          emptyLoc === "MEC" ||
          emptyLoc === "အေးရှားဝေါ" ||
          emptyLoc === "အလုံ")
      ) {
        return {
          charge: 0,
          direction: "တင်စစ်,ပွိုင့်ပျက်",
          routeType: routeType,
        };
      }

      // Check for specific no-charge routes
      const noChargeRouteFound = no_charge_routes.some(
        (rule) =>
          rule.main_trip_origin === from &&
          rule.main_trip_destination === to &&
          rule.empty_location === emptyLoc
      );
      if (noChargeRouteFound) {
        return {
          charge: 0,
          direction: "လားရာတူ၍မရရှိပါ",
          routeType: routeType,
        };
      }

      // 4. Same Direction Extra Charge Logic (Auto-calculation Priority 2)
      const sameExtraDirectionCharge = same_direction_overrides.find(
        (item) =>
          item.empty_location.includes(emptyLoc) &&
          (item.location_one === from || item.location_one === to)
      );
      if (sameExtraDirectionCharge) {
        return {
          charge: sameExtraDirectionCharge.charge_40_ft,
          direction: "လားရာတူထပ်ဆောင်းရရှိ",
          routeType: routeType,
        };
      }

      // 5. Default Case: Opposite Direction Charge (Auto-calculation Final Priority)
      const oppositeDirectionCharge = empty_locations_charges.find(
        (item) => item.location === emptyLoc
      );
      if (oppositeDirectionCharge) {
        return {
          charge: oppositeDirectionCharge.charge_40_ft,
          direction: "လားရာဆန့်ကျင်",
          routeType: routeType,
        };
      }

      // Fallback if emptyLoc is not found in any list
      console.warn(
        `Empty handling location '${emptyLoc}' not found in any charge list. Defaulting to 0.`
      );
      return { charge: 0, type: routeType };
    },
    [emptyChargeData]
  );

  // importedCalculate function ကို useCallback နဲ့ ထုတ်ပြီး မူရင်းနာမည်ကိုပဲ ပြန်ပေးလိုက်သည်။
  const autoCalculateOvernightAndDayOver = useCallback(
    (
      tripStartDate,
      tripStartTime,
      tripEndDate,
      tripEndTime,
      routeType,
      cargoLoadType,
      cargoLoadDate,
      cargoLoadTime
    ) => {
      return importedCalculate(
        tripStartDate,
        tripStartTime,
        tripEndDate,
        tripEndTime,
        routeType,
        cargoLoadType,
        cargoLoadDate,
        cargoLoadTime
      );
    },
    []
  );

  // Main calculation function for Total Charge (reusable for new and edit forms)
  const calculateTotalCharge = useCallback(
    (
      currentRouteCharge,
      currentEmptyCharge, // This is the combined empty charge
      overnightStayCount, // integer
      dayOverDelayedCount, // integer
      currentCarNo,
      pointChangeLocations, // array of {location, charge}
      currentTripType, // 'normal', 'tinSit', 'pointPyaat'
      fromLocation,
      toLocation
    ) => {
      let finalRouteCharge = parseFloat(currentRouteCharge || 0);
      let total = finalRouteCharge;
      total += parseFloat(currentEmptyCharge || 0);

      const overnightChargePerNight = parseFloat(
        settings.overnight_charge_per_night || 80000
      ); // Default if not set
      const dayOverChargePerDay = parseFloat(
        settings.dayover_charge_per_day || 120000
      ); // Default if not set

      let overNightCharges = overnightStayCount * overnightChargePerNight;
      let DayOverCharges = dayOverDelayedCount * dayOverChargePerDay;

      // Add overnight and dayover charges to total
      total += overNightCharges;
      total += DayOverCharges;

      // Calculate Point Change Total Charge
      const pointChangeTotalCharge = pointChangeLocations.reduce(
        (sum, pc) => sum + (parseFloat(pc.charge) || 0),
        0
      );
      total += pointChangeTotalCharge;

      // *** "တင်စစ်" / "ပွိုင့်ပျက်" Logic Override for Route Charge ***
      // "တင်စစ် ရော ပွိုင့်ပျက်တို့သည် တစ်နေရာထဲတွင် စတင်ပြီး တစ်နေရာထဲတွင်သာ ပြီးဆုံးပါသည်။​ တနည်းအားဖြင့် from location ရော to location ရော် တူညီနေပြီး များသောအားဖြင့် ဆိပ်ကမ်းများဖြစ်ပါသည်။ တင်စစ် ပွိုင့်ပျက်တို့အတွက် လမ်းကြောင်းခ သည် data ထဲက အတိုင်းပင် 100000 ရပါသည်။"
      if (
        (currentTripType === "tinSit" || currentTripType === "pointPyat") &&
        fromLocation === toLocation &&
        portLocationsSet.has(fromLocation)
      ) {
        // Ensure portLocationsSet is available here
        finalRouteCharge = 100000; // Override route charge for these specific cases
        // Re-calculate total based on overridden route charge
        total =
          finalRouteCharge +
          parseFloat(currentEmptyCharge || 0) +
          overNightCharges +
          DayOverCharges +
          pointChangeTotalCharge;
      }

      return {
        newTotalCharge: total,
        overNightCharges: overNightCharges,
        DayOverCharges: DayOverCharges,
        pointChangeTotalCharge: pointChangeTotalCharge,
        finalRouteCharge: finalRouteCharge, // Return final route charge if it was overridden
      };
    },
    [settings, portLocationsSet]
  ); // Add portLocationsSet to dependencies

  // Effect to update new trip form's auto-calculated fields (route, km, emptyCharge, totalCharge, overnight, dayover)
  useEffect(() => {
    const hasKeyFields =
      formData.date &&
      formData.startTime &&
      formData.endDate &&
      formData.endTime &&
      formData.from &&
      formData.to &&
      formData.carNo;
    if (!hasKeyFields) {
      // If key fields are missing, reset auto-calculated values to 0/false
      setFormData((prevData) => ({
        ...prevData,
        routeCharge: 0,
        emptyCharge: 0,
        kmTravelled: 0,
        totalCharge: 0,
        overnightStayCount: 0,
        dayOverDelayedCount: 0,
        overnightCharges: 0,
        dayOverCharges: 0,
        pointChangeTotalCharge: 0,
      }));
      return;
    }

    // Determine routeType for autoCalculateOvernightAndDayOver
    let currentRouteType = "none";
    if (portLocationsSet.has(formData.from)) {
      currentRouteType = "import";
    } else if (portLocationsSet.has(formData.to)) {
      currentRouteType = "export";
    }

    const newRouteCharge = getRouteCharge(formData.from, formData.to);

    const emptyChargeResult = calculateEmptyChargeFrontend(
      formData.from,
      formData.to,
      formData.emptyHandlingLocation,
      formData.date,
      buttonState
    );
    const newEmptyCharge = emptyChargeResult.charge;

    if (formData.to === formData.from) {
      setFormData((prevData) => ({
        ...prevData,
        tripType: "tinSit",
      }));
    }

    const {
      overnightStayCount: autoOvernightCount,
      dayOverDelayedCount: autoDayOverCount,
    } = autoCalculateOvernightAndDayOver(
      formData.date,
      formData.startTime,
      formData.endDate,
      formData.endTime,
      currentRouteType, // <-- ဒီအစီအစဉ်အတိုင်း ပြင်ပါ
      formData.cargoLoadType,
      formData.cargoLoadDate,
      formData.cargoLoadTime
    );
    console.log("formData.date", formData.date);
    console.log("formData.endDate", formData.endDate);
    console.log("formData.endTime", formData.endTime);
    console.log("autoOvernightCount", autoOvernightCount);
    console.log("autoDayOverCount", autoDayOverCount);
    const {
      newTotalCharge,
      overNightCharges,
      DayOverCharges,
      pointChangeTotalCharge,
      finalRouteCharge,
    } = calculateTotalCharge(
      newRouteCharge,
      newEmptyCharge,
      autoOvernightCount, // Use auto-calculated counts
      autoDayOverCount, // Use auto-calculated counts
      formData.carNo,
      formData.pointChangeLocations, // Pass point change locations
      formData.tripType, // Pass trip type
      formData.from,
      formData.to
    );

    const newKmTravelled =
      kmData.find((k) => {
        // This is a much cleaner way to write the same logic.
        // It directly returns the boolean result of the condition.
        return (
          k.start_point === formData.from && k.destination_point === formData.to
        );
      })?.km_value || 1;

    setFormData((prevData) => ({
      ...prevData,
      routeCharge: finalRouteCharge, // Use finalRouteCharge which might be overridden
      emptyCharge: newEmptyCharge,
      totalCharge: newTotalCharge,
      kmTravelled: newKmTravelled,
      overnightStayCount: autoOvernightCount,
      dayOverDelayedCount: autoDayOverCount,
      overnightCharges: overNightCharges,
      dayOverCharges: DayOverCharges,
      pointChangeTotalCharge: pointChangeTotalCharge,
      direction: emptyChargeResult.direction,
      routeType: currentRouteType,
    }));
  }, [
    formData.date,
    formData.startTime,
    formData.endDate,
    formData.endTime,
    formData.from,
    formData.to,
    formData.emptyHandlingLocation,
    formData.carNo,
    formData.cargoLoadType,
    formData.cargoLoadDate,
    formData.cargoLoadTime, // New dependencies
    formData.pointChangeLocations,
    formData.tripType, // New dependencies
    formData.isManualEdited,
    getRouteCharge,
    calculateEmptyChargeFrontend,
    autoCalculateOvernightAndDayOver,
    calculateTotalCharge,
    buttonState,
    portLocationsSet, // Add portLocationsSet to dependencies
  ]);

  // Effect to update edit trip form's auto-calculated fields
  useEffect(() => {
    // This useEffect for edit form needs similar updates as the new trip form's useEffect
    // For simplicity, I'm keeping it similar to previous version, but in a real app,
    // you'd want to apply the same new logic as above.
    // However, the request was to generate HomePage.jsx, so I'll update it here as well.

    const hasKeyFields =
      editFormData.date &&
      editFormData.startTime &&
      editFormData.endDate &&
      editFormData.endTime &&
      editFormData.from &&
      editFormData.to &&
      editFormData.carNo;
    if (!hasKeyFields) {
      setEditFormData((prevData) => ({
        ...prevData,
        routeCharge: 0,
        emptyCharge: 0,
        kmTravelled: 0,
        totalCharge: 0,
        overnightStayCount: 0,
        dayOverDelayedCount: 0,
        overnightCharges: 0,
        dayOverCharges: 0,
        pointChangeTotalCharge: 0,
      }));
      return;
    }

    let currentRouteType = "none";
    if (portLocationsSet.has(editFormData.from)) {
      currentRouteType = "import";
    } else if (portLocationsSet.has(editFormData.to)) {
      currentRouteType = "export";
    }

    const newRouteCharge = getRouteCharge(editFormData.from, editFormData.to);

    const emptyChargeResult = calculateEmptyChargeFrontend(
      editFormData.from,
      editFormData.to,
      editFormData.emptyHandlingLocation,
      editFormData.date,
      buttonState
    ); // Assuming buttonState affects edit form too
    const newEmptyCharge = emptyChargeResult.charge;

    const {
      overnightStayCount: autoOvernightCount,
      dayOverDelayedCount: autoDayOverCount,
    } = autoCalculateOvernightAndDayOver(
      editFormData.date,
      editFormData.startTime,
      editFormData.endDate,
      editFormData.endTime,
      currentRouteType, // <-- ဒီအစီအစဉ်အတိုင်း ပြင်ပါ
      editFormData.cargoLoadType,
      editFormData.cargoLoadDate,
      editFormData.cargoLoadTime
    );

    const {
      newTotalCharge,
      overNightCharges,
      DayOverCharges,
      pointChangeTotalCharge,
      finalRouteCharge,
    } = calculateTotalCharge(
      newRouteCharge,
      newEmptyCharge,
      autoOvernightCount,
      autoDayOverCount,
      editFormData.carNo,
      editFormData.pointChangeLocations,
      editFormData.tripType,
      editFormData.from,
      editFormData.to
    );

    setEditFormData((prevData) => ({
      ...prevData,
      routeCharge: finalRouteCharge,
      emptyCharge: newEmptyCharge,
      totalCharge: newTotalCharge,
      overnightStayCount: autoOvernightCount,
      dayOverDelayedCount: autoDayOverCount,
      overnightCharges: overNightCharges,
      dayOverCharges: DayOverCharges,
      pointChangeTotalCharge: pointChangeTotalCharge,
    }));
  }, [
    editFormData.date,
    editFormData.startTime,
    editFormData.endDate,
    editFormData.endTime,
    editFormData.from,
    editFormData.to,
    editFormData.emptyHandlingLocation,
    editFormData.carNo,
    editFormData.cargoLoadType,
    editFormData.cargoLoadDate,
    editFormData.cargoLoadTime,
    editFormData.pointChangeLocations,
    editFormData.tripType,
    editFormData.isManualEdited,
    getRouteCharge,
    calculateEmptyChargeFrontend,
    autoCalculateOvernightAndDayOver,
    calculateTotalCharge,
    buttonState,
    portLocationsSet,
  ]);

  // တွက်ချက်ရန် ခလုတ် နှိပ်သောအခါ လုပ်ဆောင်မည့် function (New Trip)
  const handleCalculateAndSave = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validation (Updated with new fields)
    if (
      !formData.date ||
      !formData.startTime ||
      !formData.endDate ||
      !formData.endTime ||
      !formData.carNo ||
      !formData.from ||
      !formData.to ||
      !formData.driverName ||
      (formData.cargoLoadType === "custom" &&
        (!formData.cargoLoadDate || !formData.cargoLoadTime))
    ) {
      setError(
        "ကျေးဇူးပြု၍ လိုအပ်သော အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။ (ရက်စွဲ၊ အချိန်များ၊ ကား၊ လမ်းကြောင်း၊ ယာဉ်မောင်း၊ အသားတင်သည့်ရက်စွဲ/အချိန်)"
      );
      return;
    }

    // // --- Remarks Logic ---
    // let routeType = "none";
    // if (portLocationsSet.has(formData.from)) {
    //   routeType = "import";
    // } else if (portLocationsSet.has(formData.to)) {
    //   routeType = "export";
    // }

    // let cargoLoadRemark = "";
    // if (routeType === "export") {
    //   if (formData.cargoLoadType === "normal") {
    //     const cargoLoadDateObj = parseISO(formData.cargoLoadDate);
    //     // cargoLoadRemark = `အသားတင် ${format(cargoLoadDateObj, "MM-dd")} `;
    //   } else if (formData.cargoLoadType === "sameDay") {
    //     // cargoLoadRemark = "ပတ်မောင်း ";
    //   } else if (formData.cargoLoadType === "custom") {
    //     const cargoLoadDateObj = parseISO(formData.cargoLoadDate);
    //     // cargoLoadRemark = `အသားတင် ${format(cargoLoadDateObj, "MM-dd")} `;
    //   }
    // }

    // let tripTypeRemark = "";
    // if (formData.tripType === "tinSit") {
    //   tripTypeRemark = "တင်စစ် ";
    // } else if (formData.tripType === "pointPyat") {
    //   tripTypeRemark = "ပွိုင့်ပျက် ";
    // }

    // let pointChangeRemark = "";
    // if (formData.pointChangeLocations.length > 0) {
    //   const locations = formData.pointChangeLocations
    //     .map((pc) => pc.location)
    //     .join(", ");
    //   const charges = formData.pointChangeLocations
    //     .map((pc) => formatMMK(pc.charge))
    //     .join(", ");
    //   pointChangeRemark = `ပွိုင့်ချိန်း: ${locations} (${charges}) `;
    // }

    // Corrected tripDataToSave object to match database columns
    const tripDataToSave = {
      start_date: formData.date,
      start_time: formData.startTime,
      end_date: formData.endDate,
      end_time: formData.endTime,
      car_no: formData.carNo,
      from_location: formData.from,
      to_location: formData.to,
      route_charge: formData.routeCharge,
      empty_handling_location: formData.emptyHandlingLocation || null,
      direction: formData.direction,
      empty_pickup_dropoff_charge: formData.emptyCharge || 0,
      overnight_status: formData.overnightStayCount,
      overnight_total_charges: formData.overnightCharges,
      day_over_status: formData.dayOverDelayedCount,
      day_over_total_charges: formData.dayOverCharges,
      remarks: formData.remarks,
      agent_name: formData.agentName || null,
      total_charge: formData.totalCharge,
      km_travelled: formData.kmTravelled,
      fuel_amount: formData.fuel_amount || 0, // Use formData.fuel_amount if available, else 0
      fuel_cost: formData.fuel_cost || 0, // Use formData.fuel_cost if available, else 0
      is_manual_edited: formData.isManualEdited ? 1 : 0,
      driver_name: formData.driverName,
      cargo_load_type: formData.cargoLoadType,
      cargo_load_date: formData.cargoLoadDate,
      cargo_load_time: formData.cargoLoadTime,
      // Ensure point_change_locations is stringified if it's an array/object
      point_change_locations: formData.pointChangeLocations,
      point_change_total_charges: formData.pointChangeTotalCharge || 0, // Corrected column name
      trip_type: formData.tripType,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/trips`,
        tripDataToSave
      );

      if (response.status === 201) {
        setSuccessMessage("ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။");
        // Clear form fields, resetting manual flags
        const today = new Date().toISOString().split("T")[0];
        const currentTime = format(new Date(), "HH:mm");
        setFormData({
          date: today,
          startTime: currentTime,
          endDate: today,
          endTime: currentTime,
          carNo: formData.carNo,
          driverName: formData.driverName,
          from: "",
          to: "",
          emptyHandlingLocation: "",
          cargoLoadType: "normal",
          cargoLoadDate: today,
          cargoLoadTime: currentTime,
          pointChangeLocations: [],
          tripType: "normal",
          overnightStayCount: 0,
          dayOverDelayedCount: 0,
          remarks: "",
          agentName: "",
          routeCharge: 0,
          emptyCharge: 0,
          totalCharge: 0,
          kmTravelled: 0,
          isManualEdited: false,
          overnightCharges: 0,
          dayOverCharges: 0,
          pointChangeTotalCharge: 0,
        });
        fetchTrips(); // Refresh data and update filters
      } else {
        setError(
          `ခရီးစဉ်မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${
            response.data.error || "Unknown error"
          }`
        );
      }
    } catch (err) {
      setError(
        `ခရီးစဉ်မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${
          err.response?.data?.error || err.message
        }`
      );
      console.error("Error saving trip:", err);
    }
  };

  // Handle Edit button click (Opens Dialog)
  const handleEdit = (trip) => {
    setEditingTripId(trip.id);

    // Parse point_change_locations from JSON string back to array
    let parsedPointChangeLocations = [];
    try {
      parsedPointChangeLocations = trip.point_change_locations
        ? JSON.parse(trip.point_change_locations)
        : [];
    } catch (e) {
      console.error("Error parsing point_change_locations:", e);
      parsedPointChangeLocations = [];
    }

    setEditFormData({
      date: trip.start_date,
      startTime: trip.start_time || "00:00",
      endDate: trip.end_date || trip.start_date,
      endTime: trip.end_time || "00:00",
      carNo: trip.car_no,
      from: trip.from_location,
      to: trip.to_location,
      trip_type: trip.trip_type,
      emptyHandlingLocation: trip.empty_handling_location || "",
      cargoLoadType: trip.cargo_load_type || "normal", // New field
      cargoLoadDate: trip.cargo_load_date || trip.start_date, // New field
      cargoLoadTime: trip.cargo_load_time || trip.startTime || "00:00", // New field
      pointChangeLocations: parsedPointChangeLocations, // New field
      tripType: trip.trip_type || "normal", // New field
      overnightStayCount: trip.overnight_stay_count || 0, // New field
      dayOverDelayedCount: trip.day_over_delayed_count || 0, // New field
      remarks: trip.remarks || "",
      agentName: trip.agent_name || "",
      driverName: trip.driver_name || "",
      routeCharge: trip.route_charge,
      emptyCharge: trip.empty_pickup_dropoff_charge, // Combined empty charge
      totalCharge: trip.total_charge,
      kmTravelled: trip.km_travelled,
      isManualEdited: trip.is_manual_edited === 1,
      overnightCharges: trip.overnight_charges || 0, // Ensure these are set
      dayOverCharges: trip.day_over_charges || 0, // Ensure these are set
      pointChangeTotalCharge: trip.point_change_charges || 0, // Ensure this is set
    });

    setOriginalKmTravelled(trip.km_travelled);
    setEditDialogOpen(true);
  };

  const handleCloseSuccessDialog = () => {
    setSuccessDialogOpen(false);
  };

  // Handle Save Edit button click (from Dialog)
  const handleSaveEdit = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validation (Updated with new fields)
    if (
      !editFormData.date ||
      !editFormData.startTime ||
      !editFormData.endDate ||
      !editFormData.endTime ||
      !editFormData.carNo ||
      !editFormData.from ||
      !editFormData.to ||
      !editFormData.driverName ||
      (editFormData.cargoLoadType === "custom" &&
        (!editFormData.cargoLoadDate || !editFormData.cargoLoadTime))
    ) {
      setError("လိုအပ်သော အချက်အလက်များကို ပြည့်စုံစွာ ဖြည့်သွင်းပါ။");
      return;
    }

    // --- Remarks Logic (similar to new trip form) ---
    // let routeType = 'none';
    // if (portLocationsSet.has(editFormData.from)) {
    //   routeType = 'import';
    // } else if (portLocationsSet.has(editFormData.to)) {
    //   routeType = 'export';
    // }

    // let cargoLoadRemark = '';
    // if (routeType === 'export') {
    //   if (editFormData.cargoLoadType === 'normal') {
    //     const cargoLoadDateObj = parseISO(editFormData.cargoLoadDate);
    //     cargoLoadRemark = `အသားတင် ${format(cargoLoadDateObj, 'MM-dd')} `;
    //   } else if (editFormData.cargoLoadType === 'sameDay') {
    //     cargoLoadRemark = 'ပတ်မောင်း ';
    //   } else if (editFormData.cargoLoadType === 'custom') {
    //     const cargoLoadDateObj = parseISO(editFormData.cargoLoadDate);
    //     cargoLoadRemark = `အသားတင် ${format(cargoLoadDateObj, 'MM-dd')} `;
    //   }
    // }

    const tripDataToUpdate = {
      // Required fields
      start_date: editFormData.date, // ပြင်ဆင်လိုက်ပြီ
      car_no: editFormData.carNo, // ပြင်ဆင်လိုက်ပြီ
      from_location: editFormData.from,
      to_location: editFormData.to,

      // Other fields (CamelCase ကို SnakeCase ပြောင်းပါ)
      start_time: editFormData.startTime, // ပြင်ဆင်လိုက်ပြီ
      end_date: editFormData.endDate, // ပြင်ဆင်လိုက်ပြီ
      end_time: editFormData.endTime, // ပြင်ဆင်လိုက်ပြီ
      route_charge: editFormData.routeCharge, // ပြင်ဆင်လိုက်ပြီ
      empty_pickup_dropoff_charge: editFormData.emptyCharge,
      empty_handling_location: editFormData.emptyHandlingLocation || null,
      overnight_status: editFormData.overnightStayCount,
      overnight_total_charges: editFormData.overnightCharges, // ပြင်ဆင်လိုက်ပြီ
      day_over_status: editFormData.dayOverDelayedCount,
      day_over_total_charges: editFormData.dayOverCharges, // ပြင်ဆင်လိုက်ပြီ
      remarks: editFormData.remarks,
      agent_name: editFormData.agentName || null,
      total_charge: editFormData.totalCharge,
      km_travelled: editFormData.kmTravelled,
      fuel_amount: 0,
      fuel_cost: 0,
      driver_name: editFormData.driverName, // ပြင်ဆင်လိုက်ပြီ
      is_manual_edited: editFormData.isManualEdited ? 1 : 0,
      cargo_load_type: editFormData.cargoLoadType,
      cargo_load_date: editFormData.cargoLoadDate,
      cargo_load_time: editFormData.cargoLoadTime,
      point_change_locations: editFormData.pointChangeLocations, // JSON.stringify ကိုဖယ်လိုက်ပြီ
      point_change_total_charges: editFormData.pointChangeTotalCharge, // ပြင်ဆင်လိုက်ပြီ
      trip_type: editFormData.tripType,
      // `overnight_stay_count` နဲ့ `day_over_delayed_count` ကို ဖယ်လိုက်နိုင်ပါတယ်
      // ဘာလို့လဲဆိုတော့ `overnight_status` နဲ့ `day_over_status` နဲ့ တူနေလို့ပါ။
      // overnight_status: editFormData.overnightStayCount,
      // day_over_status: editFormData.dayOverDelayedCount
    };

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/trips/${editingTripId}`,
        tripDataToUpdate
      );

      if (response.status === 200) {
        const updatedTripData = tripDataToUpdate;

        // `allTrips` ထဲက မူရင်း data ကို ပြန်ရှာပါ
        const originalTripData = allTrips.find((t) => t.id === editingTripId);

        const changes = {};
        for (const key in updatedTripData) {
          const originalValue = originalTripData?.[key];
          const updatedValue = updatedTripData[key];

          // နှိုင်းယှဉ်မယ့် value တွေကို string အဖြစ်ပြောင်းလိုက်ပါ
          const originalValueAsString = JSON.stringify(originalValue);
          const updatedValueAsString = JSON.stringify(updatedValue);

          // value က မတူညီဘူးဆိုရင် ဒါမှမဟုတ် original value က null ဖြစ်ပြီး updated value က string ဖြစ်နေရင်
          if (originalValueAsString !== updatedValueAsString) {
            // Case 1: original က null ဖြစ်ပြီး updated က empty string ဆိုရင် ပြောင်းလဲမှုမရှိဘူးလို့ ယူဆပါ
            if (originalValue === null && updatedValue === "") {
              continue;
            }

            // Case 2: original က '[]' string ဖြစ်ပြီး updated က [] array ဆိုရင် ပြောင်းလဲမှုမရှိဘူးလို့ ယူဆပါ
            if (
              originalValue === "[]" &&
              JSON.stringify(updatedValue) === "[]"
            ) {
              continue;
            }

            // Case 3: **အခုထပ်ထည့်မယ့် code**
            // original က null ဖြစ်ပြီး updated က 0 ဖြစ်နေရင် ပြောင်းလဲမှုမရှိဘူးလို့ ယူဆပါ
            if (originalValue === null && updatedValue === 0) {
              continue;
            }

            // တခြားပြောင်းလဲမှု ရှိရင် changes ထဲထည့်ပါ
            changes[key] = updatedValue;
          }
        }

        setUpdatedTrip(changes);
        setUpdatedTrip(changes);
        setSuccessMessage("ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။");
        setEditingTripId(null);
        setSuccessDialogOpen(true);
        setEditDialogOpen(false);
        fetchTrips();
      } else {
        setError(
          `ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${
            response.data.error || "Unknown error"
          }`
        );
      }
    } catch (err) {
      setError(
        `ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${
          err.response?.data?.error || err.message
        }`
      );
      console.error("Error saving trip edit:", err);
    }
  };

  // Handle Cancel Edit button click (from Dialog)
  const handleCancelEdit = () => {
    setEditingTripId(null);
    setEditDialogOpen(false);
    // Reset edit form states
    const today = new Date().toISOString().split("T")[0];
    const currentTime = format(new Date(), "HH:mm");
    setEditFormData({
      date: today,
      startTime: currentTime,
      endDate: today,
      endTime: currentTime,
      carNo: "",
      from: "",
      to: "",
      emptyHandlingLocation: "",
      cargoLoadType: "normal",
      cargoLoadDate: today,
      cargoLoadTime: currentTime,
      pointChangeLocations: [],
      tripType: "normal",
      overnightStayCount: 0,
      dayOverDelayedCount: 0,
      remarks: "",
      agentName: "",
      driverName: "",
      routeCharge: 0,
      emptyCharge: 0,
      totalCharge: 0,
      kmTravelled: 0,
      isManualEdited: false,
      overnightCharges: 0,
      dayOverCharges: 0,
      pointChangeTotalCharge: 0,
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
      const response = await axios.delete(
        `${API_BASE_URL}/api/trips/${tripToDelete.id}`
      );
      if (response.status === 200) {
        setSuccessMessage("ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ပြီးပါပြီ။");
        fetchTrips();
      } else {
        setError(
          `ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${
            response.data.error || "Unknown error"
          }`
        );
      }
    } catch (err) {
      setError(
        `ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${
          err.response?.data?.error || err.message
        }`
      );
      console.error("Error deleting trip:", err);
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
    const worksheet = XLSX.utils.json_to_sheet(
      filteredTrips.map((trip) => {
        // Re-calculate display remarks for export, similar to table display
        let displayRemarks = "";
        let cargoLoadRemark = "";
        let routeType = "none";
        if (portLocationsSet.has(trip.from_location)) {
          routeType = "import";
        } else if (portLocationsSet.has(trip.to_location)) {
          routeType = "export";
        }

        if (routeType === "export") {
          if (trip.cargo_load_type === "normal") {
            const cargoLoadDateObj = parseISO(trip.cargo_load_date);
            cargoLoadRemark = `အသားတင် ${format(cargoLoadDateObj, "MM-dd")} `;
          } else if (trip.cargo_load_type === "sameDay") {
            cargoLoadRemark = "ပတ်မောင်း ";
          } else if (trip.cargo_load_type === "custom") {
            const cargoLoadDateObj = parseISO(trip.cargo_load_date);
            cargoLoadRemark = `အသားတင် ${format(cargoLoadDateObj, "MM-dd")} `;
          }
        }

        let tripTypeRemark = "";
        if (trip.trip_type === "tinSit") {
          tripTypeRemark = "တင်စစ် ";
        } else if (trip.trip_type === "pointPyat") {
          tripTypeRemark = "ပွိုင့်ပျက် ";
        }

        //ဒါက excel print ထုတ်တဲ့အခါ pointChange
        let pointChangeRemark = "";
        let parsedPointChangeLocations = [];
        try {
          const raw = trip.point_change_locations;
          const parsed = raw ? JSON.parse(raw) : [];

          // ✅ သေချာစစ်တာ — array ဖြစ်မှသာ assign လုပ်မယ်
          if (Array.isArray(parsed)) {
            parsedPointChangeLocations = parsed;
          } else {
            console.warn("point_change_locations ဟာ array မဟုတ်ပါ:", parsed);
            parsedPointChangeLocations = [];
          }
        } catch (e) {
          console.error(
            "point_change_locations ကို JSON parse လုပ်တဲ့အချိန် error:",
            e
          );
          parsedPointChangeLocations = [];
        }

        if (parsedPointChangeLocations.length > 0) {
          const locations = parsedPointChangeLocations
            .map((pc) => pc.location)
            .join(", ");
          const charges = parsedPointChangeLocations
            .map((pc) => formatMMK(pc.charge))
            .join(", ");
          pointChangeRemark = `ပွိုင့်ချိန်း: ${locations} (${charges}) `;
        }

        displayRemarks =
          `${cargoLoadRemark}${tripTypeRemark}${pointChangeRemark}${
            trip.remarks || ""
          }`.trim();

        return {
          "No.": trip.id,
          Date: trip.start_date,
          "Start Time": trip.start_time || "",
          "End Date": trip.end_date || "",
          "End Time": trip.end_time || "",
          "Car No": trip.car_no,
          ယာဉ်မောင်း: trip.driver_name || "",
          "မှ (From)": trip.from_location,
          "သို့ (To)": trip.to_location,
          "လမ်းကြောင်းခ (Route Charge)": trip.route_charge,
          "အခွံတင်/ချ နေရာ": trip.empty_handling_location || "",
          "အခွံတင်/ချ ခ (Empty Charge)": trip.empty_pickup_dropoff_charge,
          အသားတင်သည့်အမျိုးအစား: trip.cargo_load_type,
          အသားတင်သည့်ရက်: trip.cargo_load_date || "",
          အသားတင်သည့်အချိန်: trip.cargo_load_time || "",
          ပွိုင့်ချိန်းနေရာများ:
            parsedPointChangeLocations.map((pc) => pc.location).join(", ") ||
            "",
          ပွိုင့်ချိန်းခ: trip.point_change_charges || 0,
          ခရီးစဥ်အမျိုးအစား: trip.trip_type,
          အသားအိပ်အရေအတွက်: trip.overnight_stay_count || 0,
          နေ့ကျော်အရေအတွက်: trip.day_over_delayed_count || 0,
          အသားအိပ်ခ: trip.overnight_charges || 0,
          နေ့ကျော်ခ: trip.day_over_charges || 0,
          မှတ်ချက်: displayRemarks, // Updated remarks
          "အေးဂျင့် အမည်": trip.agent_name || "",
          စုစုပေါင်း: trip.total_charge,
          "KM သွားခဲ့မှု": trip.km_travelled,
        };
      })
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trip Records");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "trip_records.xlsx");
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handlePrintReport = async () => {
    setShowPrintView(true);
    await delay(50);
    window.print();
    setShowPrintView(false);
  };

  // Calculate Grand Total for "စုစုပေါင်း" column
  const grandTotalCharge = filteredTrips.reduce(
    (sum, trip) => sum + (trip.total_charge || 0),
    0
  );

  // Month names for dropdown
  const monthNames = useMemo(
    () => [
      { value: "", label: "အားလုံး" },
      { value: 1, label: "ဇန်နဝါရီ" },
      { value: 2, label: "ဖေဖော်ဝါရီ" },
      { value: 3, label: "မတ်" },
      { value: 4, label: "ဧပြီ" },
      { value: 5, label: "မေ" },
      { value: 6, label: "ဇွန်" },
      { value: 7, label: "ဇူလိုင်" },
      { value: 8, label: "သြဂုတ်" },
      { value: 9, label: "စက်တင်ဘာ" },
      { value: 10, label: "အောက်တိုဘာ" },
      { value: 11, label: "နိုဝင်ဘာ" },
      { value: 12, label: "ဒီဇင်ဘာ" },
    ],
    []
  );

  // const yearsForFilter = useMemo(() => {
  //   const currentYear = new Date().getFullYear();
  //   const yearsArray = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  //   return [{ value: '', label: 'အားလုံး' }, ...yearsArray];
  // }, []);

  //for LarYar Button
  const handleButtonClick = () => {
    if (buttonState === null) {
      setButtonState("opposite");
    } else if (buttonState === "opposite") {
      setButtonState("same");
    } else if (buttonState === "same") {
      setButtonState(null);
    }
  };

  // Determine button properties based on the state
  const buttonProps = {
    text: "လားရာ",
    color: "inherit", // Default color for gray
    variant: "outlined",
  };

  if (buttonState === "opposite") {
    buttonProps.text = "လားရာဆန့်ကျင်";
    buttonProps.color = "error";
    buttonProps.variant = "contained";
  } else if (buttonState === "same") {
    buttonProps.text = "လားရာတူ";
    buttonProps.color = "success";
    buttonProps.variant = "contained";
  }

  // filteredTrips ကို စတင်ရက်စွဲအလိုက် အဟောင်းကနေ အသစ်ကို စီပေးပါ
  const sortedTrips = [...filteredTrips].sort((a, b) => {
    const dateA = new Date(a.start_date);
    const dateB = new Date(b.start_date);
    return dateA - dateB;
  });

  return (
    <>
      {/* Main HomePage Content - conditionally rendered */}
      {!showPrintView && (
        <Box
          sx={{
            p: 6, // Padding
            minHeight: "100%",
            bgcolor: "background.default", // ဒါက dark mode မှာ အနက်ရောင်ပြောင်းသွားပါလိမ့်မယ်
            color: "text.primary",
          }}
        >
          <h2 className="text-2xl font-semibold mb-5 text-center">
            အချက်အလက် ထည့်သွင်းခြင်း
          </h2>
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

          {/* New Form Layout - Single Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* ကားနံပါတ် (Car No) */}
            <div>
              <label
                htmlFor="carNo"
                className="block text-sm font-medium  mb-1"
              >
                ကားနံပါတ် (Car No)
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
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
              <label
                htmlFor="driverName"
                className="block text-sm font-medium  mb-1"
              >
                ယာဉ်မောင်းအမည် (Driver Name)
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
                <Select
                  id="driverName"
                  name="driverName"
                  value={formData.driverName}
                  onChange={handleChange}
                >
                  <MenuItem value="">ယာဉ်မောင်း ရွေးပါ</MenuItem>
                  {driverNames.map((name, index) => (
                    <MenuItem key={index} value={name}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <AccountCircleIcon fontSize="small" color="success" />
                        <span>{name}</span>
                      </div>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {/* ခရီးစဉ်အမျိုးအစား (Trip Type) */}
            <div>
              <label
                htmlFor="tripType"
                className="block text-sm font-medium mb-1"
              >
                ခရီးစဉ်အမျိုးအစား
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
                <Select
                  id="tripType"
                  name="tripType"
                  value={formData.tripType}
                  onChange={handleChange}
                >
                  <MenuItem value="normal">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <WhereToVoteIcon fontSize="small" color="success" />
                      <span>ပုံမှန်</span>
                    </div>
                  </MenuItem>
                  <MenuItem value="tinSit">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ModeOfTravelIcon fontSize="small" color="error" />
                      <span>တင်စစ်</span>
                    </div>
                  </MenuItem>
                  <MenuItem value="pointPyat">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <WrongLocationIcon fontSize="small" color="error" />
                      <span>ပွိုင့်ပျက်</span>
                    </div>
                  </MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* မှ (From) */}
            <div>
              <label htmlFor="from" className="block text-sm font-medium  mb-1">
                မှ (From)
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
                <Select
                  labelId="from-label"
                  id="from"
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                >
                  {Object.keys(groupedRoutes).flatMap((groupName) => [
                    <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                    ...groupedRoutes[groupName].map((route) => (
                      <MenuItem key={route.id} value={route.route}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <AddLocationIcon fontSize="small" color="success" />
                          <span>{route.route}</span>
                        </div>
                      </MenuItem>
                    )),
                  ])}
                </Select>
              </FormControl>
            </div>

            {/* သို့ (To) */}
            <div>
              <label htmlFor="to" className="block text-sm font-medium  mb-1">
                သို့ (To)
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
                <Select
                  labelId="to-label"
                  id="to"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                >
                  {Object.keys(groupedRoutes).flatMap((groupName) => [
                    <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                    ...groupedRoutes[groupName].map((route) => (
                      <MenuItem key={route.id} value={route.route}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FlagIcon fontSize="small" color="warning" />
                          <span>{route.route}</span>
                        </div>
                      </MenuItem>
                    )),
                  ])}
                </Select>
              </FormControl>
            </div>

            {/* လမ်းကြောင်းခ (Route Charge) - Display only */}
            <div>
              <label
                htmlFor="routeCharge"
                className="block text-sm font-medium   mb-1"
              >
                လမ်းကြောင်းခ{" "}
                <span className="text-xs text-gray-500">(Auto)</span>
              </label>
              <TextField
                type="text"
                id="routeCharge"
                name="routeCharge"
                value={formData.routeCharge || ""}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                  readOnly: true,
                  // value ရဲ့ရှေ့မှာ icon ထည့်ရန်
                  startAdornment: (
                    <MonetizationOnIcon sx={{ mr: 1, color: "green" }} />
                  ),
                  endAdornment: (
                    <Typography variant="body2" color="textSecondary">
                      {formData.routeCharge
                        ? formatMMK(formData.routeCharge)
                        : ""}
                    </Typography>
                  ),
                }}
                className="rounded-md"
              />
            </div>

            {/* ရက်စွဲ (Date) */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1">
                ခရီးစဥ်စတင်သည့်ရက် (Date)
              </label>
              <DatePicker
                value={formData.date ? dayjs(formData.date) : null}
                format="DD-MM-YYYY"
                onChange={(newValue) => {
                  const formattedDate = newValue
                    ? newValue.format("YYYY-MM-DD")
                    : "";
                  handleChange({
                    target: {
                      name: "date",
                      value: formattedDate,
                    },
                  });
                }}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    InputProps: {
                      startAdornment: (
                        <StartIcon sx={{ mr: 1, color: "green" }} />
                      ),
                    },
                  },
                }}
              />
            </div>

            {/* NEW: ခရီးစဉ် စတင်ချိန် (Start Time) */}
            <div>
              <label
                htmlFor="startTime"
                className="block text-sm font-medium mb-1"
              >
                ခရီးစဉ် စတင်ချိန်
              </label>
              <TextField
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                variant="outlined"
                size="small"
                className="rounded-md"
              />
            </div>

            <div>
              {/* အသားတင်သည့်ရက် အမျိုးအစား (Cargo Loading Type) */}
              <div>
                <label
                  htmlFor="cargoLoadType"
                  className="block text-sm font-medium mb-1"
                >
                  အသားတင်သည့်ပုံစံ ( for Export only)
                </label>
                <FormControl
                  fullWidth
                  variant="outlined"
                  size="small"
                  className="rounded-md"
                >
                  <RadioGroup
                    row
                    name="cargoLoadType"
                    value={formData.cargoLoadType}
                    onChange={handleChange}
                    disabled={formData.routeType !== "export"}
                  >
                    <FormControlLabel
                      value="normal"
                      control={<Radio size="small" />}
                      label={
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <LocalShippingIcon
                            fontSize="small"
                            color={
                              formData.routeType === "export"
                                ? "primary"
                                : "disabled"
                            }
                          />
                          <span>ပုံမှန်</span>
                        </div>
                      }
                      disabled={formData.routeType !== "export"}
                    />
                    <FormControlLabel
                      value="sameDay"
                      control={<Radio size="small" />}
                      label={
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CarRepairIcon
                            fontSize="small"
                            color={
                              formData.routeType === "export"
                                ? "success"
                                : "disabled"
                            }
                          />
                          <span>ပတ်မောင်း</span>
                        </div>
                      }
                      disabled={formData.routeType !== "export"}
                    />
                    <FormControlLabel
                      value="custom"
                      control={<Radio size="small" />}
                      label={
                        // Icon နဲ့ စာကို အတူတူထည့်ရန်
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <BusAlertIcon
                            fontSize="small"
                            color={
                              formData.routeType === "export"
                                ? "error"
                                : "disabled"
                            }
                          />
                          <span>ရက်ကြာ</span>
                        </div>
                      }
                      disabled={formData.routeType !== "export"}
                    />
                  </RadioGroup>
                </FormControl>
              </div>

              {/* အသားတင်သည့်ရက်စွဲ (Cargo Loading Date) - Conditionally rendered */}
              {formData.cargoLoadType === "custom" && (
                <div className="mt-3">
                  <label
                    htmlFor="cargoLoadDate"
                    className="block text-sm font-medium mb-1"
                  >
                    အသားတင်သည့်ရက်စွဲ
                  </label>
                  <DatePicker
                    value={
                      formData.cargoLoadDate
                        ? dayjs(formData.cargoLoadDate)
                        : null
                    }
                    format="DD-MM-YYYY"
                    onChange={(newValue) => {
                      const formattedDate = newValue
                        ? newValue.format("YYYY-MM-DD")
                        : "";

                      handleChange({
                        target: {
                          name: "cargoLoadDate",
                          value: formattedDate,
                        },
                      });
                    }}
                    slotProps={{
                      textField: {
                        variant: "outlined",
                        size: "small",
                        fullWidth: true,
                      },
                    }}
                  />
                </div>
              )}

              {/* အသားတင်သည့်အချိန် (Cargo Loading Time) - Conditionally rendered */}
              {formData.cargoLoadType === "custom" && (
                <div className="mt-3">
                  <label
                    htmlFor="cargoLoadTime"
                    className="block text-sm font-medium mb-1"
                  >
                    အသားတင်သည့်အချိန်
                  </label>
                  <TextField
                    type="time"
                    id="cargoLoadTime"
                    name="cargoLoadTime"
                    value={formData.cargoLoadTime}
                    onChange={handleChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    size="small"
                    className="rounded-md"
                  />
                </div>
              )}
            </div>

            {/* NEW: ခရီးစဉ် ပြီးဆုံးရက် (End Date) */}
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium  mb-1"
              >
                ခရီးစဉ် ပြီးဆုံးရက်
              </label>
              <DatePicker
                value={formData.endDate ? dayjs(formData.endDate) : null}
                format="DD-MM-YYYY"
                onChange={(newValue) => {
                  const formattedDate = newValue
                    ? newValue.format("YYYY-MM-DD")
                    : "";

                  handleChange({
                    target: {
                      name: "endDate",
                      value: formattedDate,
                    },
                  });
                }}
                slotProps={{
                  textField: {
                    variant: "outlined",
                    size: "small",
                    fullWidth: true,
                    InputProps: {
                      startAdornment: (
                        <AssignmentTurnedInIcon sx={{ mr: 1, color: "red" }} />
                      ),
                    },
                  },
                }}
              />
            </div>

            {/* NEW: ခရီးစဉ် ပြီးဆုံးချိန် (End Time) */}
            <div>
              <label
                htmlFor="endTime"
                className="block text-sm font-medium  mb-1"
              >
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

            {/* အခွံတင်/ချ နေရာ (Empty Handling Location) */}
            <div className="flex items-end">
              <div className="flex flex-col flex-grow">
                <label
                  htmlFor="emptyHandlingLocation"
                  className="block text-sm font-medium   mb-1"
                >
                  အခွံတင်/ချ နေရာ
                </label>
                <FormControl
                  fullWidth
                  variant="outlined"
                  size="small"
                  className="rounded-md"
                >
                  <Select
                    id="emptyHandlingLocation"
                    name="emptyHandlingLocation"
                    value={formData.emptyHandlingLocation}
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>ရွေးချယ်ပါ (မရှိလျှင် မရွေးပါ)</em>
                    </MenuItem>
                    {emptyLocationsOptions.map((loc, index) => (
                      <MenuItem key={index} value={loc}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <RvHookupIcon fontSize="small" color="primary" />
                          <span>{loc}</span>
                        </div>
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
                  height: "40px", // Match height of select field
                  width: "120px", // Fixed width for the button
                }}
              >
                {buttonProps.text}
              </Button>
            </div>

            {/* အခွံတင်/ချ (Empty Charge) - Auto Display */}
            <div>
              <label
                htmlFor="emptyCharge"
                className="block text-sm font-medium mb-1"
              >
                အခွံတင်/ချ <span className="text-xs text-gray-500">(Auto)</span>
              </label>
              <TextField
                type="text"
                id="emptyCharge"
                name="emptyCharge"
                value={formData.emptyCharge || ""}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Typography variant="body2" color="textSecondary">
                      {formData.emptyCharge
                        ? formatMMK(formData.emptyCharge)
                        : ""}
                    </Typography>
                  ),
                }}
                className="rounded-md"
              />
            </div>

            {/* အသားအိပ် (Overnight Stay) - Display only */}
            <div>
              <label className="block text-sm font-medium mb-1">
                အသားအိပ် (Overnight Stay)
              </label>
              <TextField
                type="text"
                value={
                  formData.overnightStayCount > 0
                    ? `${formData.overnightStayCount} ညအိပ်`
                    : "မရှိပါ"
                }
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{ readOnly: true }}
                className="rounded-md"
              />
            </div>

            {/* နေ့ကျော်/ပြီး (Day Over) - Display only */}
            <div>
              <label className="block text-sm font-medium mb-1">
                နေ့ကျော်/ပြီး (Day Over)
              </label>
              <TextField
                type="text"
                value={
                  formData.dayOverDelayedCount > 0
                    ? `${formData.dayOverDelayedCount} ရက်ကျော်`
                    : "မရှိပါ"
                }
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{ readOnly: true }}
                className="rounded-md"
              />
            </div>

            {/* KM (ခရီးအကွာအဝေး) */}
            <div>
              <label
                htmlFor="kmTravelled"
                className="block text-sm font-medium mb-1"
              >
                KM (ခရီးအကွာအဝေး){" "}
                <span className="text-xs text-gray-500">(Auto)</span>
              </label>
              <TextField
                type="text"
                id="kmTravelled"
                name="kmTravelled"
                value={formData.kmTravelled || ""}
                fullWidth
                variant="outlined"
                size="small"
                InputProps={{ readOnly: true }}
                className="rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="editAgentName"
                className="block text-sm font-medium   mb-1"
              >
                အေးဂျင့် အမည်
              </label>
              <FormControl fullWidth variant="outlined" size="small">
                <Select
                  id="editAgentName"
                  name="agentName"
                  value={formData.agentName || ""} // Ensure value is not null/undefined for Select
                  onChange={handleAgentNameChange} // Use the new handler
                >
                  <MenuItem value="">
                    <em>ရွေးချယ်ပါ</em>
                  </MenuItem>
                  {/* Map over the agentNames fetched from your backend */}
                  {agentNames.map((name, index) => (
                    <MenuItem key={name} value={name}>
                      {" "}
                      {/* Use name as key, it's unique */}
                      {name}
                    </MenuItem>
                  ))}
                  <MenuItem value="other">
                    <em>...အခြား (Add New)</em>
                  </MenuItem>
                </Select>
              </FormControl>
              {showOtherAgentInput && (
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <TextField
                    label="အေးဂျင့်အမည်အသစ် ထည့်ပါ"
                    value={newAgentNameInput}
                    onChange={(e) => setNewAgentNameInput(e.target.value)}
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddAgentName}
                    size="small"
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    ထည့်ရန်
                  </Button>
                </Box>
              )}
            </div>

            {/* ပွိုင့်ချိန်း (Point Change) Section */}
            <div>
              <label className="block text-sm font-medium mb-1">
                ပွိုင့်ချိန်း (Point Change)
              </label>
              {formData.pointChangeLocations.map((pc, index) => (
                <Box
                  key={pc.id}
                  sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}
                >
                  {/* FormControl ကို width 200px သတ်မှတ်ပြီး သေးလိုက်ပါပြီ။ */}
                  <FormControl
                    variant="outlined"
                    size="small"
                    sx={{ width: "300px" }}
                  >
                    <InputLabel>{`နေရာ ${index + 1}`}</InputLabel>
                    <Select
                      label={`နေရာ ${index + 1}`}
                      name="location"
                      value={pc.location}
                      onChange={(e) =>
                        handlePointChange(index, "location", e.target.value)
                      }
                    >
                      {Object.keys(groupedRoutes).flatMap((groupName) => [
                        <ListSubheader key={groupName}>
                          {groupName}
                        </ListSubheader>,
                        ...groupedRoutes[groupName].map((route) => (
                          <MenuItem key={route.id} value={route.route}>
                            {route.route}
                          </MenuItem>
                        )),
                      ])}
                    </Select>
                  </FormControl>

                  {/* ဝန်ဆောင်ခ TextField ကို width 150px သတ်မှတ်ပြီး နဲနဲကြီးအောင် လုပ်လိုက်ပါပြီ။ */}
                  <TextField
                    label={`ဝန်ဆောင်ခ ${index + 1}`}
                    type="number"
                    name="charge"
                    value={pc.charge || ""}
                    onChange={(e) =>
                      handlePointChange(index, "charge", e.target.value)
                    }
                    variant="outlined"
                    size="small"
                    sx={{ width: "150px" }}
                  />
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleRemovePointChange(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                onClick={handleAddPointChange}
                startIcon={<AddIcon />}
                sx={{ mt: 1 }}
              >
                ပွိုင့်ချိန်း ထပ်ထည့်မည်
              </Button>
            </div>
          </div>

          {/* Remarks - Span remaining columns */}
          <div className="col-span-full">
            <label
              htmlFor="remarks"
              className="block text-sm font-medium   mb-1"
            >
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

          {/* Total Charge Breakdown and Grand Total */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              mt: 2,
            }}
          >
            <Typography variant="body1" sx={{ mr: 2, color: "text.secondary" }}>
              လမ်းကြောင်းခ: {formatMMK(formData.routeCharge)}
            </Typography>
            <Typography variant="body1" sx={{ mr: 2, color: "text.secondary" }}>
              အခွံတင်/ချ: {formatMMK(formData.emptyCharge)}
            </Typography>
            {formData.overnightCharges > 0 && (
              <Typography
                variant="body1"
                sx={{ mr: 2, color: "text.secondary" }}
              >
                အသားအိပ်ခ: {formatMMK(formData.overnightCharges)}
              </Typography>
            )}
            {formData.dayOverCharges > 0 && (
              <Typography
                variant="body1"
                sx={{ mr: 2, color: "text.secondary" }}
              >
                နေ့ကျော်ခ: {formatMMK(formData.dayOverCharges)}
              </Typography>
            )}
            {formData.pointChangeTotalCharge > 0 && (
              <Typography
                variant="body1"
                sx={{ mr: 2, color: "text.secondary" }}
              >
                ပွိုင့်ချိန်းခ: {formatMMK(formData.pointChangeTotalCharge)}
              </Typography>
            )}
            <Typography
              variant="h6"
              sx={{ mr: 2, color: "text.primary", mt: 1 }}
            >
              စုစုပေါင်း: {formatMMK(formData.totalCharge)}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mt: 2,
            }}
          >
            <Button
              onClick={handleCalculateAndSave}
              variant="contained"
              color="success"
              sx={{ py: 1.5, px: 4 }}
            >
              <SaveIcon />
              စာရင်းထည့်သွင်းရန်
            </Button>
          </Box>

          <hr className="my-8 border-gray-300" />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Typography
              variant="h5"
              component="h2"
              sx={{ color: "#1976d2", fontWeight: "bold" }}
            >
              ရလဒ်များ ပြသမှု
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                onClick={exportToExcel}
                variant="contained"
                color="secondary"
                sx={{ py: 1, px: 2, fontSize: "0.875rem" }}
              >
                Excel Export
              </Button>
              {/* Print Report Button - now uses browser's native print */}
              <Button
                onClick={handlePrintReport}
                variant="contained"
                color="primary"
                sx={{ py: 1, px: 2, fontSize: "0.875rem" }}
              >
                <LocalPrintshopOutlinedIcon />
                Print Report
              </Button>
            </Box>
          </Box>

          {/* Year, Month, and Car No Filters for HomePage Table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg shadow-inner">
            {/* နှစ် (Year) Filter */}
            <div>
              <label
                htmlFor="filterYear"
                className="block text-sm font-medium   mb-1"
              >
                နှစ် (Year)
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
                <Select
                  id="filterYear"
                  name="filterYear"
                  value={filterYear}
                  onChange={(e) =>
                    setFilterYear(
                      e.target.value === "" ? "" : parseInt(e.target.value, 10)
                    )
                  }
                >
                  <MenuItem value="">အားလုံး</MenuItem>
                  {availableYears
                    .filter((year) => year !== null && year !== undefined)
                    .map((year, index) => (
                      <MenuItem key={index} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>

            {/* လ (Month) Filter */}
            <div>
              <label
                htmlFor="filterMonth"
                className="block text-sm font-medium   mb-1"
              >
                လ (Month)
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
                <Select
                  id="filterMonth"
                  name="filterMonth"
                  value={filterMonth}
                  onChange={(e) =>
                    setFilterMonth(
                      e.target.value === "" ? "" : parseInt(e.target.value, 10)
                    )
                  }
                >
                  <MenuItem value="">အားလုံး</MenuItem>
                  {monthNames
                    .filter((month) => month !== null && month !== undefined)
                    .map((month) => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </div>

            {/* ကားနံပါတ် (Car No) Filter */}
            <div>
              <label
                htmlFor="filterCarNo"
                className="block text-sm font-medium   mb-1"
              >
                ကားနံပါတ် (Car No)
              </label>
              <FormControl
                fullWidth
                variant="outlined"
                size="small"
                className="rounded-md"
              >
                <Select
                  id="filterCarNo"
                  name="filterCarNo"
                  value={filterCarNo}
                  onChange={(e) => setFilterCarNo(e.target.value)}
                >
                  <MenuItem value="">အားလုံး</MenuItem>
                  {uniqueCarNumbersForFilter
                    .filter((carNo) => carNo !== null && carNo !== undefined)
                    .map((carNo, index) => (
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
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              sx={{ mt: 4, display: "flex", flexDirection: "column" }}
            >
              <Table stickyHeader aria-label="trip records table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>No.</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>နေ့စွဲ</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>ကားနံပါတ်</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>မှ (From)</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>သို့ (To)</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      လမ်းကြောင်းခ
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      အခွံတင်/ချ
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      အသား/အခွံအိပ်
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      နေ့ကျော်/ပြီး
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>မှတ်ချက်</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      စုစုပေါင်း
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTrips.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        align="center"
                        sx={{ py: 4, color: "text.secondary" }}
                      >
                        တွက်ချက်ထားသော ရလဒ်များ မရှိသေးပါ သို့မဟုတ် Filter နှင့်
                        ကိုက်ညီသော Data မရှိပါ။
                      </TableCell>
                    </TableRow>
                  ) : (
                    // <-- ဒီနေရာမှာ React Fragment <>...</> ကို အသုံးပြုထားပါတယ်
                    <>
                      {sortedTrips.map((trip, index) => {
                        let routeType = "";
                        if (portLocationsSet.has(trip.from_location)) {
                          routeType = "export";
                        } else if (portLocationsSet.has(trip.to_location)) {
                          routeType = "import";
                        }

                        // const isSelected = selectedRows.has(trip.id);
                        // Display Remark ရဲ့ အဓိက အချက်အလက် စုစည်းမှု
                        const coreRemark = `
                          ${trip.remarks || ""}
                          ${trip.remarks && trip.agent_name ? " " : ""}
                          ${trip.agent_name ? trip.agent_name : ""}`.trim();

                        return (
                          <TableRow
                            key={trip.id}
                            sx={{ "&:hover": "" }}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{"T" + trip.id}</TableCell>
                            <TableCell>
                              {formatDateForDisplay(trip.start_date)}
                            </TableCell>
                            <TableCell>{trip.car_no}</TableCell>
                            <TableCell>
                              {routeType === "import"
                                ? getExportRouteFromDisplay(trip)
                                : trip.from_location}
                            </TableCell>
                            <TableCell>
                              {routeType === "export"
                                ? getImportRouteToDisplay(trip)
                                : trip.to_location}
                            </TableCell>
                            <TableCell>
                              {formatMMK(trip.route_charge)}
                            </TableCell>
                            <TableCell>
                              {formatMMK(trip.empty_pickup_dropoff_charge)}
                            </TableCell>
                            <TableCell>
                              {trip.overnight_status > 0
                                ? `${trip.overnight_status} ညအိပ်`
                                : ""}
                            </TableCell>
                            <TableCell>
                              {trip.day_over_status > 0
                                ? `${trip.day_over_status} ရက်ကျော်`
                                : ""}
                            </TableCell>
                            <TableCell>
                              {/* Display Remarks */}
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                {/* ပထမအကွက် (Cargo Type သို့မဟုတ် Trip Type) */}
                                <Box
                                  sx={{ minWidth: "70px", textAlign: "center" }}
                                >
                                  {trip.cargo_load_type === "sameDay" ? (
                                    <span>ပတ်မောင်း</span>
                                  ) : trip.cargo_load_type === "custom" ? (
                                    <span>
                                      {parseInt(
                                        trip.cargo_load_date.split("-")[2],
                                        10
                                      )}{" "}
                                      ရက်နေ့တင်
                                    </span>
                                  ) : trip.trip_type === "tinSit" ? (
                                    <span>တင်စစ်</span>
                                  ) : trip.trip_type === "pointPyat" ? (
                                    <span>ပွိုင့်ပျက်</span>
                                  ) : null}
                                </Box>

                                {/* ဒုတိယအကွက် (နေ့စွဲ၊ အချိန် သို့မဟုတ် နေရာလွတ်) */}
                                <Box
                                  sx={{
                                    minWidth: "140px",
                                    textAlign: "center",
                                  }}
                                >
                                  {trip.overnight_status > 0 && (
                                    <span>
                                      {trip.end_date.split("-")[2]} ရက်နေ့{" "}
                                      {trip.end_time} ပြီး
                                    </span>
                                  )}
                                </Box>

                                {/* တတိယအကွက် (Core Remarks) */}
                                <Box
                                  sx={{
                                    flexGrow: 1,
                                    textAlign: "left",
                                    minWidth: "70px",
                                  }}
                                >
                                  {coreRemark}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {formatMMK(trip.total_charge)}
                            </TableCell>
                            <TableCell>
                              <Box>
                                <IconButton
                                  color="info"
                                  size="small"
                                  onClick={() => handleEdit(trip)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleDelete(trip)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Grand Total Row */}
                      <TableRow
                        sx={{ fontWeight: "bold", borderTop: "2px solid #ccc" }}
                      >
                        <TableCell
                          colSpan={11}
                          align="right"
                          sx={{ fontWeight: "bold" }}
                        >
                          စုစုပေါင်း (Grand Total):
                        </TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>
                          {formatMMK(grandTotalCharge)}
                        </TableCell>
                        <TableCell colSpan={1}></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      {showPrintView && (
        // Printable Report Content - conditionally rendered
        <Box
          id="printable-report-content"
          sx={{
            "@media print": {
              // ပင်မ content ရဲ့ အရောင်ကို အမည်းရောင်ထားပါ
              color: "black",
              backgroundColor: "white",

              // Table Container ကိုပါ ဘောင်အမည်းရောင်ဖြစ်အောင် သတ်မှတ်ခြင်း
              "& .MuiTableContainer-root": {
                border: "1px solid black !important",
              },

              // Table ထဲက ခေါင်းစဉ်ရော၊ data ရော အရောင်မည်းအောင် သတ်မှတ်ခြင်း
              "& .MuiTableCell-root": {
                color: "black !important",
                borderColor: "black !important",
              },

              // Table Head ကို background အဖြူရောင်ထားခြင်း
              "& .MuiTableHead-root .MuiTableRow-root": {
                backgroundColor: "#f0f0f0 !important",
              },
            },
          }}
        >
          {/* Report Header Section */}
          <h1
            style={{
              textAlign: "center",
              fontSize: "50px",
              marginBottom: "10px",
              fontFamily: "Noto Sans Myanmar, sans-serif",
            }}
          >
            {filterCarNo || "အားလုံး"}
          </h1>
          <p
            style={{
              textAlign: "center",
              marginBottom: "30px",
              fontFamily: "Noto Sans Myanmar, sans-serif",
            }}
          >
            {monthNames.find((m) => m.value === filterMonth)?.label ||
              "အားလုံး"}{" "}
            လပိုင်း {filterYear || "အားလုံး"}ခုနှစ်
          </p>

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table
              aria-label="printable trip records table"
              size="small"
              sx={{ width: "100%", tableLayout: "fixed" }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "2.28%", // စဥ် (မပြောင်းလဲပါ)
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                      "@media print": {
                        textAlign: "left !important",
                        paddingLeft: "0.2rem !important",
                      },
                    }}
                  >
                    စဥ်
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "6%", // နေ့စွဲ (10.54% မှ 6% သို့ လျှော့ချ)
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                    }}
                  >
                    နေ့စွဲ
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "16.40%", // မှ (14.40% မှ 16.40% သို့ ချဲ့သည်)
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                    }}
                  >
                    မှ
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "16.40%", // သို့ (14.40% မှ 16.40% သို့ ချဲ့သည်)
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                    }}
                  >
                    သို့
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "10.45%", // အခွံတင်/ချ (မပြောင်းလဲပါ)
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                    }}
                  >
                    အခွံတင်/ချ
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "11.85%", // အသား/အခွံအိပ် (မပြောင်းလဲပါ)
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                    }}
                  >
                    အသား/အခွံအိပ်
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "10.09%", // နေ့ကျော်/ပြီး (မပြောင်းလဲပါ)
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                    }}
                  >
                    နေ့ကျော်/ပြီး
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      width: "25.99%", // မှတ်ချက် (မပြောင်းလဲပါ)
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      fontFamily: "Noto Sans Myanmar, sans-serif",
                    }}
                  >
                    မှတ်ချက်
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {sortedTrips.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{
                        py: 2,
                        fontFamily: "Noto Sans Myanmar, sans-serif",
                      }}
                    >
                      No data available for report.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTrips.map((trip, index) => {
                    // --- Updated Display Remarks Logic for Print Table ---
                    // let displayRemarks = "";

                    //Remarks တွေ တွက်ချက်ခြင်း
                    const cargoLoadDay = trip.cargo_load_date.split("-")[2];
                    const cargoLoadDayRemark = `${cargoLoadDay} ရက်နေ့တင် |`;

                    const endDate = trip.end_date.split("-")[2];
                    const tripEndDateTimeRemark = `${endDate} ရက်နေ့ ${trip.end_time} ပြီး |`;

                    // Remarks အစိတ်အပိုင်းတွေကို သိမ်းဖို့ array တစ်ခုကို စနစ်တကျ တည်ဆောက်ပါမယ်။
                    const remarksParts = [];

                    // --- Remarks အစိတ်အပိုင်းတွေကို condition အလိုက် စုစည်းခြင်း (Order အတိုင်း) ---

                    // ၁။ အဓိက remarks စာသား (remarks and agent_name) ကို အမြဲတမ်း ပထမဆုံး ထည့်ပါ
                    const coreRemark = `
                        ${trip.remarks || ""}
                        ${trip.remarks && trip.agent_name ? " " : ""}
                        ${trip.agent_name ? `${trip.agent_name}` : ""}`.trim();

                    // ၅။ cargo_load_type "ရက်ကြာ" ရှိရင် ထည့်ပါ။
                    if (trip.cargo_load_type === "custom") {
                      remarksParts.push(cargoLoadDayRemark);
                    }

                    // ၄။ cargo_load_type "ပတ်မောင်း" ရှိရင် ထည့်ပါ။
                    if (trip.cargo_load_type === "sameDay") {
                      remarksParts.push("ပတ်မောင်း |");
                    }

                    // ၃။ trip_type "ပုံမှန်" မဟုတ်ရင် ထည့်ပါ။ (ဥပမာ - တင်စစ်, ပွိုင့်ပျက်)
                    if (trip.trip_type && trip.trip_type !== "normal") {
                      remarksParts.push(trip.trip_type);
                    }

                    // ၂။ overnight_status > 0 ရှိရင် end date/time remark ကို ထည့်ပါ။
                    if (trip.overnight_status > 0) {
                      remarksParts.push(tripEndDateTimeRemark);
                    }

                    if (coreRemark) {
                      remarksParts.push(coreRemark);
                    }

                    // displayRemarks = remarksParts.join(" ");

                    let routeType = "";
                    if (portLocationsSet.has(trip.from_location)) {
                      routeType = "export";
                    } else if (portLocationsSet.has(trip.to_location)) {
                      routeType = "import";
                    }

                    return (
                      <TableRow key={trip.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {formatDateForDisplay(trip.start_date)}
                        </TableCell>
                        <TableCell>
                          {routeType === "import"
                            ? getExportRouteFromDisplay(trip)
                            : trip.from_location}
                        </TableCell>
                        <TableCell>
                          {routeType === "export"
                            ? getImportRouteToDisplay(trip)
                            : trip.to_location}
                        </TableCell>
                        <TableCell>{trip.empty_handling_location}</TableCell>
                        <TableCell>
                          {trip.overnight_status > 0
                            ? `${trip.overnight_status} ညအိပ်`
                            : ""}
                        </TableCell>
                        <TableCell>
                          {trip.day_over_status > 0
                            ? `${trip.day_over_status} ရက်ကျော်`
                            : ""}
                        </TableCell>
                        <TableCell>
                          {/* ဒီနေရာကို အောက်က code နဲ့ အစားထိုးလိုက်ပါ */}
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            {/* ပထမအကွက် (Cargo Type သို့မဟုတ် Trip Type) */}
                            <Box sx={{ minWidth: "70px", textAlign: "center" }}>
                              {trip.cargo_load_type === "sameDay" ? (
                                <span>ပတ်မောင်း</span>
                              ) : trip.cargo_load_type === "custom" ? (
                                <span>
                                  {parseInt(
                                    trip.cargo_load_date.split("-")[2],
                                    10
                                  )}{" "}
                                  ရက်နေ့တင်
                                </span>
                              ) : trip.trip_type === "tinSit" ? (
                                <span>တင်စစ်</span>
                              ) : trip.trip_type === "pointPyat" ? (
                                <span>ပွိုင့်ပျက်</span>
                              ) : null}
                            </Box>

                            {/* ဒုတိယအကွက် (နေ့စွဲ၊ အချိန် သို့မဟုတ် နေရာလွတ်) */}
                            <Box
                              sx={{ minWidth: "120px", textAlign: "center" }}
                            >
                              {trip.overnight_status > 0 && (
                                <span>
                                  {trip.end_date.split("-")[2]} ရက်နေ့{" "}
                                  {trip.end_time} ပြီး
                                </span>
                              )}
                            </Box>

                            {/* တတိယအကွက် (Core Remarks) */}
                            <Box
                              sx={{
                                flexGrow: 1,
                                textAlign: "left",
                                minWidth: "80px",
                              }}
                            >
                              {coreRemark}
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Back button for print view only */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 3,
              "@media print": { display: "none" },
            }}
          >
            <Button
              onClick={() => setShowPrintView(false)}
              variant="contained"
              color="secondary"
            >
              ပြန်ထွက်မည်
            </Button>
          </Box>
        </Box>
      )}{" "}
      {/* End of conditional rendering for print view */}
      <EditTripDialog
        open={editDialogOpen}
        onClose={handleCancelEdit}
        onSave={handleSaveEdit}
        // Data Props (Component အတွက် လိုအပ်သော အချက်အလက်များ)
        editFormData={editFormData}
        carNumbersData={carNumbersData}
        driverNames={driverNames}
        groupedRoutes={groupedRoutes}
        emptyLocationsOptions={emptyLocationsOptions}
        agentNames={agentNames}
        originalKmTravelled={originalKmTravelled}
        // Logic Props (Component မှ အလုပ်လုပ်ရန် လိုအပ်သော Functions များ)
        setEditFormData={setEditFormData}
        handleEditChange={handleEditChange}
        handleEditCarNoChange={handleEditCarNoChange}
        handleEditPointChange={handleEditPointChange}
        handleEditAddPointChange={handleEditAddPointChange}
        handleEditRemovePointChange={handleEditRemovePointChange}
        // Display Props (တွက်ချက်ပြီးသား တန်ဖိုးများကို ပြသရန်)
        overnightCharges={editFormData.overnightCharges}
        dayOverCharges={editFormData.dayOverCharges}
        pointChangeTotalCharge={editFormData.pointChangeTotalCharge}
        // Helper Functions (format လုပ်ရန်)
        formatMMK={formatMMK}
      />
      <SuccessDialog
        open={successDialogOpen}
        onClose={handleCloseSuccessDialog}
        message={successMessage}
        updatedTrip={updatedTrip}
      />
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" style={{ textAlign: "center" }}>
          {"ခရီးစဉ်မှတ်တမ်း ဖျက်သိမ်းခြင်း"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            <span
              style={{
                color: "orange",
                display: "inline-block",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span style={{ marginRight: "20px" }}>ခရီးစဥ်:</span>
                <span style={{ color: "white" }}>T{tripToDelete?.id}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span style={{ marginRight: "20px" }}>ရက်စွဲ:</span>
                <span style={{ color: "white" }}>
                  {formatDateForDisplay(tripToDelete?.start_date)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span style={{ marginRight: "20px" }}>ကားနံပါတ်:</span>
                <span style={{ color: "white" }}>{tripToDelete?.car_no}</span>
              </div>
              <div style={{ marginTop: "10px" }}>
                ခရီးစဉ်မှတ်တမ်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။
              </div>
            </span>
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
