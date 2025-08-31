// myan-san/src/pages/AllTripsPage.jsx
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
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
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
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
import axios from "axios";
import { addDays, format, parseISO } from "date-fns";
import { saveAs } from "file-saver";
import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { formatDateForDisplay } from "../utils/formatDate";

// Static data များကို import လုပ်ခြင်း
import carNumbersData from "../data/carNumbers.json";
import emptyContainerLocationsData from "../data/emptyContainerLocations.json";
import groupedRoutes from "../data/groupedRoutes.json";
import kmData from "../data/kmData.json";
import { formatMMK } from "../utils/currencyFormatter";
import EditTripDialog from "./EditTripDialog";

// Table Header Cells
const headCells = [
  { id: "id", numeric: true, disablePadding: true, label: "No." },
  { id: "date", numeric: false, disablePadding: false, label: "Date" },
  { id: "car_no", numeric: false, disablePadding: false, label: "Car No" },
  // { id: 'driver_name', numeric: false, disablePadding: false, label: 'ယာဉ်မောင်း' },
  {
    id: "from_location",
    numeric: false,
    disablePadding: false,
    label: "မှ (From)",
  },
  {
    id: "to_location",
    numeric: false,
    disablePadding: false,
    label: "သို့ (To)",
  },
  {
    id: "route_charge",
    numeric: true,
    disablePadding: false,
    label: "လမ်းကြောင်းခ",
  },
  {
    id: "empty_pickup_charge",
    numeric: true,
    disablePadding: false,
    label: "အခွံတင်/ချ",
  },
  {
    id: "empty_dropoff_charge",
    numeric: true,
    disablePadding: false,
    label: "အခွံချခ",
  },
  {
    id: "overnight_status",
    numeric: false,
    disablePadding: false,
    label: "အသား/အခွံ အိပ်",
  },
  {
    id: "day_over_status",
    numeric: false,
    disablePadding: false,
    label: "နေ့ကျော်/ပြီး",
  },
  { id: "remarks", numeric: false, disablePadding: false, label: "မှတ်ချက်" },
  {
    id: "total_charge",
    numeric: true,
    disablePadding: false,
    label: "စုစုပေါင်း",
  },
  {
    id: "km_travelled",
    numeric: true,
    disablePadding: false,
    label: "KM သွားခဲ့မှု",
  },
  {
    id: "actions",
    numeric: false,
    disablePadding: false,
    label: "လုပ်ဆောင်ချက်များ",
  },
];

function AllTripsPage() {
  const [allTrips, setAllTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [settings, setSettings] = useState({});
  const [currentRouteCharges, setCurrentRouteCharges] = useState([]);
  const [driverNames, setDriverNames] = useState([]);
  const [carDriverAssignments, setCarDriverAssignments] = useState([]);
  // const [originalKmTravelled, setOriginalKmTravelled] = useState(0);

  const [filter, setFilter] = useState({
    searchCarNo: "",
    searchFrom: "",
    searchTo: "",
    searchRemarks: "",
    startDate: "",
    endDate: "",
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
    date: "",
    carNo: "",
    from: "",
    to: "",
    emptyContainer: "",
    emptyDropoffCharge: 0,
    overnightStay: false,
    dayOverDelayed: false,
    remarks: "",
    driverName: "",
    routeCharge: 0,
    kmTravelled: 0,
  });

  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("date");
  const [showFilters, setShowFilters] = useState(false); // State for filter section visibility
  const [portLocationsSet, setPortLocationsSet] = useState(new Set());
  // const [emptyChargeData, setEmptyChargeData] = useState(null);
  const [emptyLocationsOptions, setEmptyLocationsOptions] = useState([]);
  const [agentNames, setAgentNames] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

  // Fetch active empty charges data
  const fetchEmptyChargeData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/empty-charges/active`);
      const data = res.data.data.emptyCharges;
      // setEmptyChargeData(data);
      setEmptyLocationsOptions(
        data.empty_locations_charges.map((loc) => loc.location)
      );
      setPortLocationsSet(new Set(data.port_locations));
    } catch (err) {
      console.error("Error fetching active empty charges data:", err);
      setError(
        "အခွံချ/အခွံတင် စျေးနှုန်းများ ရယူရာတွင် အမှားအယွင်းရှိခဲ့ပါသည်။"
      );
      // setEmptyChargeData(null);
    }
  }, [API_BASE_URL]);

  // Agent အမည်များကို Backend မှ fetch လုပ်ရန် function
  const fetchAgentNames = useCallback(async () => {
    try {
      const agents = ["ဖိုးချမ်း", "ကိုစိုင်း", "ကျော်သူနိုင်", "ကိုစိုင်း"]; // Placeholder list
      setAgentNames(agents);
    } catch (error) {
      console.error("Error fetching agent names:", error);
    }
  }, []);

  const getRouteDisplay = (trip) => {
    const { to_location, point_change_locations } = trip;
    let routeStops = [];

    let intermediateStops = [];
    try {
      // Attempt to parse the JSON string into an array.
      // If it's already an array, this will also work.
      intermediateStops = JSON.parse(point_change_locations);
      // If parsing fails (e.g., if it's not a valid JSON string),
      // intermediateStops will remain an empty array due to the catch block.
    } catch (e) {
      console.error("Error parsing point_change_locations:", e);
    }

    // Ensure intermediateStops is a valid array before proceeding
    const stops = Array.isArray(intermediateStops) ? intermediateStops : [];
    let route_Type = "";
    if (portLocationsSet.has(trip.from_location)) {
      route_Type = "import";
    } else if (portLocationsSet.has(trip.to_location)) {
      route_Type = "export";
    }

    if (route_Type === "export" && stops.length > 0) {
      // For 'export' route, add intermediate stops before the destination
      stops.forEach((point) => {
        routeStops.push(point.location);
      });
      // Add the final destination
      routeStops.push(to_location);
    } else if (route_Type === "import" && stops.length > 0) {
      // For 'import' route, add intermediate stops after the destination
      // Add the destination first
      routeStops.push(to_location);
      // Add the intermediate stops
      stops.forEach((point) => {
        routeStops.push(point.location);
      });
    } else {
      // Default case: from -> to
      routeStops.push(to_location);
    }

    // Join all the locations with an arrow
    return routeStops.join(" → ");
  };

  const grandTotalCharge = filteredTrips.reduce(
    (sum, trip) => sum + (trip.total_charge || 0),
    0
  );

  const applyFilters = useCallback(
    (trips, currentFilter, currentOrderBy, currentOrder) => {
      let tempFilteredTrips = trips.filter((trip) => {
        const matchesCarNo = currentFilter.searchCarNo
          ? trip.car_no === currentFilter.searchCarNo
          : true;
        const matchesFrom = currentFilter.searchFrom
          ? trip.from_location === currentFilter.searchFrom
          : true;
        const matchesTo = currentFilter.searchTo
          ? trip.to_location === currentFilter.searchTo
          : true;
        const matchesRemarks = currentFilter.searchRemarks
          ? trip.remarks
              .toLowerCase()
              .includes(currentFilter.searchRemarks.toLowerCase())
          : true;

        const tripDate = new Date(trip.date);
        const startDate = currentFilter.startDate
          ? new Date(currentFilter.startDate)
          : null;
        const endDate = currentFilter.endDate
          ? new Date(currentFilter.endDate)
          : null;

        const matchesDateRange =
          (!startDate || tripDate >= startDate) &&
          (!endDate || tripDate <= endDate);

        return (
          matchesCarNo &&
          matchesFrom &&
          matchesTo &&
          matchesRemarks &&
          matchesDateRange
        );
      });

      // Apply sorting
      const sortedTrips = tempFilteredTrips.sort((a, b) => {
        const aValue = a[currentOrderBy];
        const bValue = b[currentOrderBy];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return currentOrder === "asc" ? aValue - bValue : bValue - aValue;
        } else {
          return currentOrder === "asc"
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
        }
      });

      setFilteredTrips(sortedTrips);
    },
    []
  );

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
  }, [filter, orderBy, order, applyFilters, API_BASE_URL]);

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

  useEffect(() => {
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
      fetchCarDriverAssignments();
      fetchEmptyChargeData();
      fetchAgentNames();
    };

    fetchInitialData();
  }, [
    fetchTrips,
    fetchDriverNames,
    fetchCarDriverAssignments,
    fetchAgentNames,
    fetchEmptyChargeData,
    API_BASE_URL,
  ]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter((prevFilter) => {
      const newFilter = { ...prevFilter, [name]: value };
      applyFilters(allTrips, newFilter, orderBy, order);
      return newFilter;
    });
  };

  // Handle Sort Change from dropdowns
  const handleSortChange = (event) => {
    const { name, value } = event.target;
    if (name === "orderBy") {
      setOrderBy(value);
      applyFilters(allTrips, filter, value, order);
    } else if (name === "order") {
      setOrder(value);
      applyFilters(allTrips, filter, orderBy, value);
    }
  };

  const handleResetFilters = () => {
    const initialFilterState = {
      searchCarNo: "",
      searchFrom: "",
      searchTo: "",
      searchRemarks: "",
      startDate: "",
      endDate: "",
    };
    setFilter(initialFilterState);
    setOrder("asc");
    setOrderBy("date");
    applyFilters(allTrips, initialFilterState, "date", "asc");
    setSelectedRows(new Set());
  };

  const getRouteCharge = useCallback(
    (from, to) => {
      const route = currentRouteCharges.find((r) => r.route === to);
      if (route) {
        if (from === "အေးရှားဝေါ" || from === "MIP") {
          return route.MIP_AWPT_40;
        } else if (from === "သီလဝါ") {
          return route.MIIT_40;
        }
        if (from === "သီလဝါ" && to === "MIP") {
          const sezThilawarRoute = currentRouteCharges.find(
            (r) => r.route === "SEZ/Thilawar Zone"
          );
          return sezThilawarRoute ? sezThilawarRoute.MIP_AWPT_40 : 0;
        }
      }
      return 0;
    },
    [currentRouteCharges]
  );

  const calculateTotalCharge = useCallback(
    (
      routeCharge,
      emptyDropoffCharge,
      overnightStatusBoolean,
      dayOverStatusBoolean,
      currentCarNo,
      emptyContainerId // Pass emptyContainerId for same direction logic
    ) => {
      let total = parseFloat(routeCharge || 0);
      total += parseFloat(emptyDropoffCharge || 0);

      let calculatedEmptyPickupCharge =
        emptyContainerLocationsData.find((loc) => loc.id === emptyContainerId)
          ?.charge || 0;
      const isSameDirection = (from, to, emptyLocId) => {
        const emptyLocName = emptyContainerLocationsData.find(
          (loc) => loc.id === emptyLocId
        )?.name;
        if (
          from === "MIP" &&
          to === "တောင်ဒဂုံ(ဇုံ ၁/၂/၃)" &&
          emptyLocName === "DIL/ICH"
        )
          return true;
        if (from === "DIL/ICH" && to === "သီလဝါ" && emptyLocName === "MIP")
          return true;
        return false;
      };

      // Use editFormData.from and editFormData.to for calculation if editing, otherwise use default
      const currentFrom = editingTripId ? editFormData.from : ""; // Placeholder, actual value comes from form
      const currentTo = editingTripId ? editFormData.to : ""; // Placeholder, actual value comes from form

      if (
        emptyContainerId &&
        isSameDirection(currentFrom, currentTo, emptyContainerId)
      ) {
        calculatedEmptyPickupCharge = 0;
      }
      total += calculatedEmptyPickupCharge;

      const overnightDayoverCombinedCharge = parseFloat(
        settings.overnight_dayover_combined_charge || 0
      );
      const gepOvernightCharge = parseFloat(settings.gep_overnight_charge || 0);
      const nineKOvernightCharge = parseFloat(
        settings["9k_overnight_charge"] || 0
      );

      const overnightStatus = overnightStatusBoolean ? "အသားအိပ်" : "No";
      const dayOverStatus = dayOverStatusBoolean ? "နေ့ကျော်" : "No";

      if (overnightStatus === "အသားအိပ်" && dayOverStatus === "နေ့ကျော်") {
        total += overnightDayoverCombinedCharge;
      } else if (overnightStatus === "အသားအိပ်") {
        if (currentCarNo.startsWith("GEP")) {
          total += gepOvernightCharge;
        } else if (currentCarNo.startsWith("9K")) {
          total += nineKOvernightCharge;
        }
      }
      return total;
    },
    [settings, editingTripId, editFormData.from, editFormData.to]
  );

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
    setEditDialogOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;

    setEditFormData((prevData) => {
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

  const handleEditCarNoChange = (e) => {
    const carNo = e.target.value;
    const assignedDriver = carDriverAssignments.find(
      (assignment) => assignment.car_no === carNo
    );
    setEditFormData((prevData) => ({
      ...prevData,
      carNo: carNo,
      driverName: assignedDriver ? assignedDriver.driver_name : "",
    }));
  };

  useEffect(() => {
    if (editFormData.from && editFormData.to) {
      const newRouteCharge = getRouteCharge(editFormData.from, editFormData.to);
      const newKmTravelled =
        kmData.find(
          (k) =>
            k.start_point === editFormData.from &&
            k.destination_point === editFormData.to
        )?.km_value || 0;
      setEditFormData((prevData) => ({
        ...prevData,
        routeCharge: newRouteCharge,
        kmTravelled: newKmTravelled,
      }));
    } else {
      setEditFormData((prevData) => ({
        ...prevData,
        routeCharge: 0,
        kmTravelled: 0,
      }));
    }
  }, [editFormData.from, editFormData.to, getRouteCharge]);

  const handleSaveEdit = async () => {
    setError(null);
    setSuccessMessage(null);

    if (
      !editFormData.date ||
      !editFormData.carNo ||
      !editFormData.from ||
      !editFormData.to ||
      !editFormData.driverName
    ) {
      setError("လိုအပ်သော အချက်အလက်များကို ပြည့်စုံစွာ ဖြည့်သွင်းပါ။");
      return;
    }

    const calculatedRouteCharge = getRouteCharge(
      editFormData.from,
      editFormData.to
    );
    const emptyPickupChargeVal =
      emptyContainerLocationsData.find(
        (loc) => loc.id === editFormData.emptyContainer
      )?.charge || 0;
    const calculatedKmTravelled =
      kmData.find(
        (k) =>
          k.start_point === editFormData.from &&
          k.destination_point === editFormData.to
      )?.km_value || 0;
    const emptyDropoffCharge = parseFloat(editFormData.emptyDropoffCharge || 0);

    let remarks = editFormData.remarks;
    // const isSameDirection = (from, to, emptyLocId) => {
    //   const emptyLocName = emptyContainerLocationsData.find(loc => loc.id === emptyLocId)?.name;
    //   if (from === 'MIP' && to === 'တောင်ဒဂုံ(ဇုံ ၁/၂/၃)' && emptyLocName === 'DIL/ICH') return true;
    //   if (from === 'DIL/ICH' && to === 'သီလဝါ' && emptyLocName === 'MIP') return true;
    //   return false;
    // };

    // let finalEmptyPickupChargeForCalculation = emptyPickupChargeVal;
    // if (editFormData.emptyContainer && isSameDirection(editFormData.from, editFormData.to, editFormData.emptyContainer)) {
    //   finalEmptyPickupChargeForCalculation = 0;
    //   remarks += (remarks ? "; " : "") + "အခွံတင်/ချ - လားရာတူသောကြောင့် ဝန်ဆောင်ခ မရရှိပါ။";
    // }

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
      overnight_status: editFormData.overnightStay ? "အသားအိပ်" : "No",
      day_over_status: editFormData.dayOverDelayed ? "နေ့ကျော်" : "No",
      remarks: remarks,
      total_charge: totalCharge,
      km_travelled: calculatedKmTravelled,
      fuel_amount: 0,
      fuel_cost: 0,
      driverName: editFormData.driverName,
      is_manual_edited: 1,
    };

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/trips/${editingTripId}`,
        tripDataToUpdate
      );

      if (response.status === 200) {
        setSuccessMessage("ခရီးစဉ်မှတ်တမ်း အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။");
        setEditingTripId(null);
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
        `ခရီးစဉ်မှတ်တမ်း ပြင်ဆင်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.message}. Backend API (PUT /api/trips/:id) မရှိခြင်းကြောင့် ဖြစ်နိုင်ပါသည်။`
      );
      console.error("Error saving trip edit:", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingTripId(null);
    setEditDialogOpen(false);
    setEditFormData({
      date: "",
      carNo: "",
      from: "",
      to: "",
      emptyContainer: "",
      overnightStay: false,
      dayOverDelayed: false,
      remarks: "",
      driverName: "",
      routeCharge: 0,
      emptyPickupCharge: 0,
      emptyDropoffCharge: 0,
      kmTravelled: 0,
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
        `ခရီးစဉ်မှတ်တမ်းကို ဖျက်ပစ်ရာတွင် အမှားဖြစ်ပွားခဲ့ပါသည်။: ${err.message}. Backend API (DELETE /api/trips/:id) မရှိခြင်းကြောင့် ဖြစ်နိုင်ပါသည်။`
      );
      console.error("Error deleting trip:", err);
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
    const worksheet = XLSX.utils.json_to_sheet(
      filteredTrips?.map((trip) => ({
        "No.": trip.id,
        Date: trip.date,
        "Car No": trip.car_no,
        "မှ (From)": trip.from_location,
        "သို့ (To)": trip.to_location,
        "ကားခ (Route Charge)": trip.route_charge,
        "အခွံတင်/ချ (Empty Charge)": trip.empty_pickup_charge,
        "အခွံချခ (Empty Drop-off Charge)": trip.empty_dropoff_charge,
        "အသား/အခွံ အိပ်": trip.overnight_status,
        "နေ့ကျော်/ပြီး": trip.day_over_status,
        မှတ်ချက်: trip.remarks,
        စုစုပေါင်း: trip.total_charge,
        "KM သွားခဲ့မှု": trip.km_travelled,
        ယာဉ်မောင်း: trip.driver_name,
      }))
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

  return (
    <Box
      sx={{
        bgcolor: "background.paper", // bg-white ကိုအစားထိုး
        boxShadow: 3, // shadow-md ကိုအစားထိုး
        borderRadius: 2, // rounded-lg ကိုအစားထိုး
        p: 3, // p-6 ကိုအစားထိုး (MUI spacing scale အရ 1 => 8px, 3 => 24px ဖြစ်ပါတယ်)
        width: "100%", // w-full ကိုအစားထိုး
        overflowX: "auto", // overflow-x-auto ကိုအစားထိုး
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <h2 className="text-2xl font-semibold">
          ခရီးစဉ်မှတ်တမ်းများ (အားလုံး)
        </h2>
      </Box>

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

      {/* Sorting and Export Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Sort by:
        </Typography>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Field</InputLabel>
          <Select
            name="orderBy"
            value={orderBy}
            onChange={handleSortChange}
            label="Field"
          >
            {headCells
              .filter((cell) => cell.id !== "actions" && cell.id !== "id")
              ?.map((cell) => (
                <MenuItem key={cell.id} value={cell.id}>
                  {cell.label}
                </MenuItem>
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
          sx={{ py: 1, px: 2, fontSize: "0.875rem" }}
        >
          Excel Export
        </Button>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="contained"
          color="primary"
          sx={{ py: 1, px: 2, fontSize: "0.875rem" }}
        >
          {showFilters ? "Filter များ ဖျောက်ရန်" : "Filter များ ပြသရန်"}
        </Button>
      </Box>

      {/* Data Filtering Inputs (Conditional rendering) */}
      {showFilters && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                lg: "repeat(5, 1fr)",
              },
              gap: 2,
            }}
          >
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>ကားနံပါတ် ရှာဖွေရန်</InputLabel>
              <Select
                name="searchCarNo"
                value={filter.searchCarNo}
                onChange={handleFilterChange}
                label="ကားနံပါတ် ရှာဖွေရန်"
              >
                <MenuItem value="">အားလုံး</MenuItem>
                {carNumbersData?.map((car, index) => (
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
                {Object.keys(groupedRoutes).flatMap((groupName) => [
                  <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                  ...groupedRoutes[groupName]?.map((route) => (
                    <MenuItem key={route.id} value={route.route}>
                      {route.route}
                    </MenuItem>
                  )),
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
                {Object.keys(groupedRoutes).flatMap((groupName) => [
                  <ListSubheader key={groupName}>{groupName}</ListSubheader>,
                  ...groupedRoutes[groupName].map((route) => (
                    <MenuItem key={route.id} value={route.route}>
                      {route.route}
                    </MenuItem>
                  )),
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
                <TableCell sx={{ fontWeight: "bold" }}>လမ်းကြောင်းခ</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>အခွံတင်/ချ</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>အသား/အခွံအိပ်</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>နေ့ကျော်/ပြီး</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>မှတ်ချက်</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>စုစုပေါင်း</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTrips.length === 0 ? (
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
                filteredTrips.map((trip, index) => {
                  const isSelected = selectedRows.has(trip.id);
                  // const combinedEmptyCharge = (trip.empty_pickup_charge || 0) + (trip.empty_dropoff_charge || 0); // Not used directly here

                  // --- Updated Display Remarks Logic for Table ---
                  let displayRemarks = "";
                  // let cargoLoadRemark = "";
                  let routeType = "none";
                  if (portLocationsSet.has(trip.from_location)) {
                    routeType = "import";
                  } else if (portLocationsSet.has(trip.to_location)) {
                    routeType = "export";
                  }

                  if (routeType === "export") {
                    if (trip.cargo_load_type === "normal") {
                      // const cargoLoadDateObj = parseISO(trip.cargo_load_date);
                      // cargoLoadRemark = `အသားတင် ${format(
                      //   cargoLoadDateObj,
                      //   "MM-dd"
                      // )} `;
                    } else if (trip.cargo_load_type === "sameDay") {
                      // cargoLoadRemark = "ပတ်မောင်း ";
                    } else if (trip.cargo_load_type === "custom") {
                      // const cargoLoadDateObj = parseISO(trip.cargo_load_date);
                      // cargoLoadRemark = `အသားတင် ${format(
                      //   cargoLoadDateObj,
                      //   "MM-dd"
                      // )} `;
                    }
                  }

                  // let tripTypeRemark = "";
                  // if (trip.trip_type === "tinSit") {
                  //   tripTypeRemark = "တင်စစ် ";
                  // } else if (trip.trip_type === "pointPyaat") {
                  //   tripTypeRemark = "ပွိုင့်ပျက် ";
                  // }

                  //return ထဲက filtered Trips ထဲက ပွိုင့်ချိန်း
                  // let pointChangeRemark = "";
                  // let parsedPointChangeLocations = [];
                  try {
                    const raw = trip.point_change_locations;
                    const parsed = raw ? JSON.parse(raw) : [];

                    // ✅ သေချာစစ်တာ — array ဖြစ်မှသာ assign လုပ်မယ်
                    if (Array.isArray(parsed)) {
                      // parsedPointChangeLocations = parsed;
                    } else {
                      console.warn(
                        "point_change_locations ဟာ array မဟုတ်ပါ:",
                        parsed
                      );
                      // parsedPointChangeLocations = [];
                    }
                  } catch (e) {
                    console.error(
                      "point_change_locations ကို JSON parse လုပ်တဲ့အချိန် error:",
                      e
                    );
                    // parsedPointChangeLocations = [];
                  }

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
                              ${trip.agent_name ? trip.agent_name : ""}`.trim();

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

                  displayRemarks = remarksParts.join(" ");

                  return (
                    <TableRow
                      key={trip.id}
                      selected={isSelected}
                      sx={{ "&:hover": "" }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{"T" + trip.id}</TableCell>
                      <TableCell>
                        {formatDateForDisplay(trip.start_date)}
                      </TableCell>
                      <TableCell>{trip.car_no}</TableCell>
                      <TableCell>{trip.from_location}</TableCell>
                      <TableCell>{getRouteDisplay(trip)}</TableCell>
                      <TableCell>{formatMMK(trip.route_charge)}</TableCell>
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
                      <TableCell>{displayRemarks}</TableCell>
                      <TableCell>{formatMMK(trip.total_charge)}</TableCell>
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
                })
              )}
              {/* Grand Total Row */}
              {filteredTrips.length > 0 && (
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
                  <TableCell colSpan={1}></TableCell>{" "}
                  {/* Empty cell for Action column */}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
        // Logic Props (Component မှ အလုပ်လုပ်ရန် လိုအပ်သော Functions များ)
        handleEditChange={handleEditChange}
        handleEditCarNoChange={handleEditCarNoChange}
        handleEditPointChange={handleEditPointChange}
        handleEditAddPointChange={handleEditAddPointChange}
        handleEditRemovePointChange={handleEditRemovePointChange}
        // FIX: setEditFormData ကို ထည့်ပါ
        setEditFormData={setEditFormData}
        // FIX: originalKmTravelled ကို ထည့်ပါ
        // originalKmTravelled={originalKmTravelled}
        // Display Props (တွက်ချက်ပြီးသား တန်ဖိုးများကို ပြသရန်)
        overnightCharges={editFormData.overnightCharges}
        dayOverCharges={editFormData.dayOverCharges}
        pointChangeTotalCharge={editFormData.pointChangeTotalCharge}
        // Helper Functions (format လုပ်ရန်)
        formatMMK={formatMMK}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"ခရီးစဉ်မှတ်တမ်း ဖျက်သိမ်းခြင်း"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ရက်စွဲ {tripToDelete?.date}၊ ကားနံပါတ် {tripToDelete?.car_no}{" "}
            ခရီးစဉ်မှတ်တမ်းကို ဖျက်သိမ်းမှာ သေချာပါသလား။
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
