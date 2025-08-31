import React, { useState, useEffect,useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../components/AppProvider';
import { Switch } from '@mui/material';
import { styled } from '@mui/material/styles';


// --- Customized Mock Data (Kept for toggle) ---
const CAR_NUMBERS = [
  '2K-7937', '6B-3776', '2J-5719', '7M-8394', '5M-1548', '6G-8202'
];
const DRIVER_NAMES = [
  'ဝင်းခိုင်', 'အောင်ကိုမင်း', 'သန်းမင်းကို', 'ကျော်ကြီး', 'အောင်ဇင်'
];
const TRIP_TYPES = [
  'ကုန်စည်ပို့ဆောင်ခြင်း', 'အထွေထွေ ပို့ဆောင်ခြင်း', 'မြို့တွင်း ပို့ဆောင်ခြင်း', 'ဆိပ်ကမ်း ကုန်တင်/ချ'
];

// Define Port Locations for mock data Export/Import logic
const MOCK_PORT_LOCATIONS = ['အေးရှားဝေါ', 'MIP', 'သီလဝါ'];

const generateMockTrips = () => {
  const data = [];
  let idCounter = 1;
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-05-31');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + Math.floor(Math.random() * 5) + 1)) {
    const carNo = CAR_NUMBERS[Math.floor(Math.random() * CAR_NUMBERS.length)];
    const driverName = DRIVER_NAMES[Math.floor(Math.random() * DRIVER_NAMES.length)];
    const tripType = TRIP_TYPES[Math.floor(Math.random() * TRIP_TYPES.length)];
    const totalCharge = Math.floor(Math.random() * (700000 - 300000 + 1)) + 300000;
    const fuelCost = Math.floor(totalCharge * (0.10 + Math.random() * 0.05));
    const kmTravelled = Math.floor(Math.random() * (300 - 150 + 1)) + 150;

    // Simulate from_location and to_location to support mock route type breakdown
    const locations = ['ရန်ကုန်', 'မန္တလေး', 'နေပြည်တော်', 'အေးရှားဝေါ', 'MIP', 'သီလဝါ', 'တောင်ကြီး'];
    const fromLocation = locations[Math.floor(Math.random() * locations.length)];
    let toLocation = locations[Math.floor(Math.random() * locations.length)];
    while (toLocation === fromLocation) { // Ensure from and to are different
      toLocation = locations[Math.floor(Math.random() * locations.length)];
    }

    data.push({
      id: idCounter++,
      car_no: carNo,
      start_date: d.toISOString().split('T')[0],
      total_charge: totalCharge,
      fuel_cost: fuelCost,
      driver_name: driverName,
      trip_type: tripType, // Still keep trip_type in mock for consistency
      km_travelled: kmTravelled,
      from_location: fromLocation,
      to_location: toLocation,
    });
  }
  return data;
};
const mockTripsData = generateMockTrips();

const generateMockMaintenance = () => {
  const data = [];
  let idCounter = 1;
  const maintenanceTypes = [
    'အင်ဂျင်ဝိုင်လဲခြင်း', 'တာယာလဲလှယ်ခြင်း', 'ဘရိတ်စစ်ဆေးခြင်း', 'ဘက်ထရီလဲလှယ်ခြင်း',
    'ဆီစစ်စနစ်စစ်ဆေးခြင်း', 'ရေတိုင်ကီပြင်ဆင်ခြင်း', 'မီးစနစ်ပြုပြင်ခြင်း'
  ];
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-05-31');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + Math.floor(Math.random() * 10) + 1)) {
    const carNo = CAR_NUMBERS[Math.floor(Math.random() * CAR_NUMBERS.length)];
    const description = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
    const cost = Math.floor(Math.random() * (300000 - 50000 + 1)) + 50000;

    data.push({
      id: idCounter++,
      car_no: carNo,
      maintenance_date: d.toISOString().split('T')[0],
      description: description,
      cost: cost,
    });
  }
  return data;
};
const mockMaintenanceData = generateMockMaintenance();

const generateMockGeneralExpenses = () => {
  const data = [];
  let idCounter = 1;
  const expenseTypes = [
    'ရုံးသုံးပစ္စည်း', 'လမ်းကြေး', 'ကားဆေးခြင်း', 'အင်တာနက်ဘေလ်',
    'မမျှော်မှန်းနိုင်သောစရိတ်', 'စာရင်းကိုင်စရိတ်', 'လျှပ်စစ်မီးဖိုး'
  ];
  const carRelatedExpenseTypes = ['လမ်းကြေး', 'ကားဆေးခြင်း'];
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-05-31');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + Math.floor(Math.random() * 7) + 1)) {
    const description = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
    const cost = Math.floor(Math.random() * (100000 - 5000 + 1)) + 5000;
    const carNo = carRelatedExpenseTypes.includes(description) ? CAR_NUMBERS[Math.floor(Math.random() * CAR_NUMBERS.length)] : 'N/A';

    data.push({
      id: idCounter++,
      car_no: carNo,
      expense_date: d.toISOString().split('T')[0],
      description: description,
      cost: cost,
    });
  }
  return data;
};
const mockGeneralExpensesData = generateMockGeneralExpenses();

const mockDriverSalaryData = DRIVER_NAMES.map((name, index) => ({
  id: index + 1,
  driver_id: index + 1,
  // Simulate current month's salary to be added to expenses summary
  salary_amount: Math.floor(Math.random() * (400000 - 250000 + 1)) + 250000,
  effective_start_date: '2025-01-01',
  driver_name: name
}));

const generateMockFuelReadings = () => {
  const data = [];
  let idCounter = 1;
  mockTripsData.forEach(trip => {
    const kmPerGallon = (Math.random() * (12 - 8) + 8).toFixed(1);
    data.push({
      id: idCounter++,
      car_no: trip.car_no,
      trip_id: trip.id,
      reading_date: trip.start_date,
      km_per_gallon: parseFloat(kmPerGallon),
    });
  });
  return data;
};
const mockFuelReadingsData = generateMockFuelReadings();

const generateMockFuelLogs = () => {
  const data = [];
  let idCounter = 1;
  // Ensure fuel_amount is a float for mock data as well
  mockTripsData.forEach(trip => {
    data.push({
      id: idCounter++,
      car_no: trip.car_no,
      log_datetime: trip.start_date,
      fuel_amount: parseFloat((trip.fuel_cost / 2500).toFixed(2)), // Ensure it's a number
      fuel_cost: trip.fuel_cost,
    });
  });
  return data;
};
const mockFuelLogsData = generateMockFuelLogs();
// --- End Customized Mock Data ---


// Utility function to get month name
const getMonthName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('my-MM', { month: 'short', year: 'numeric' });
};

// Function to generate distinct colors for charts using a specific theme
const generateThemedColors = (numColors, isDarkMode, baseHue = 240) => {
  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const hue = (baseHue + i * 30) % 360;
    const saturation = isDarkMode ? 50 : 70;
    const lightness = isDarkMode ? (30 + (i * 10) % 50) : (50 - (i * 10) % 40);
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  return colors;
};

// Custom Switch for Material UI to match Tailwind styling
const StyledSwitch = styled(Switch)( ({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.mode === 'dark' ? '#8c55ff' : '#20b852',
        opacity: 1,
        border: 0,
      },
    }, // <-- Corrected: Added the missing closing bracket here
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#8c55ff',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color:
        theme.palette.mode === 'light'
          ? theme.palette.grey[100]
          : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 22,
    height: 22,
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.mode === 'dark' ? '#39393D' : '#E9E9EA',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

// Helper to get mock route type (Export/Import) revenue breakdown
const getMockRouteTypeRevenueData = (trips) => {
  const routeTypeRevenue = {
    'Export': 0,
    'Import': 0,
    'အခြား': 0,
  };

  trips.forEach(trip => {
    let type = 'အခြား';
    const toLocation = trip.to_location;
    const fromLocation = trip.from_location;
    const totalCharge = trip.total_charge || 0;

    if (MOCK_PORT_LOCATIONS.includes(toLocation)) {
      type = 'Export';
    } else if (MOCK_PORT_LOCATIONS.includes(fromLocation)) {
      type = 'Import';
    }
    routeTypeRevenue[type] += totalCharge;
  });

  return Object.keys(routeTypeRevenue).map(name => ({
    name,
    value: routeTypeRevenue[name]
  })).filter(item => item.value > 0);
};

const DashboardPage = () => {
  const { mode } = useApp();
  const isDarkMode = mode === 'dark';

  // Toggle state for mock data
  const [useMockData, setUseMockData] = useState(true);

  // Define theme colors
  // const primaryChartColor = isDarkMode ? '#8c55ff' : '#4a5568';
  const gridStrokeColor = isDarkMode ? '#4a5568' : '#e0e0e0';
  const axisLabelColor = isDarkMode ? '#cbd5e0' : '#4a5568';

  // Dynamic colors for charts based on dark/light mode
  const multiSeriesColors = generateThemedColors(CAR_NUMBERS.length * 2, isDarkMode, 270);
  const singleSeriesColors = generateThemedColors(CAR_NUMBERS.length, isDarkMode, 210);
  const expenseChartColors = generateThemedColors(10, isDarkMode, 300);
  const fuelChartColors = generateThemedColors(CAR_NUMBERS.length, isDarkMode, 90);

  // State to hold processed data for charts
  const [dashboardData, setDashboardData] = useState({
    monthlyTripsData: [],
    carMonthlyRevenueData: [],
    driverNetRevenueData: [],
    revenueBreakdownData: [], // This will now be routeTypeRevenueData
    expensesSummaryData: [],
    expensesByCategoryData: [],
    fuelEfficiencyData: [],
    totalFuelConsumedData: [],
    currentMonthCarRevenue: [],
    // Monthly Summary for top cards
    totalTripsCount: 0,
    totalRevenueSum: 0,
    totalExpensesSum: 0,
    totalNetRevenueSum: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard-data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.message === "success") {
        setDashboardData(result.data);
      } else {
        setError(result.error || "Unknown error fetching data.");
      }
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
      setError("Failed to load real data. Please ensure the backend server is running and accessible at http://localhost:5000.");
      // Fallback to mock data if real data fails
      setUseMockData(true);
      processMockData();
    } finally {
      setLoading(false);
    }
  },[API_BASE_URL]);

  const processMockData = () => {
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth() + 1; // 1-12
    const currentMonthName = getMonthName(new Date().toISOString().split('T')[0]);

    // Mock Monthly Summary for top cards
    const mockMonthlyTrips = mockTripsData.filter(trip => {
      const tripDate = new Date(trip.start_date);
      return tripDate.getFullYear() === currentYear && (tripDate.getMonth() + 1) === currentMonthNum;
    });
    const mockMonthlyTripsCount = mockMonthlyTrips.length;
    const mockMonthlyRevenueSum = mockMonthlyTrips.reduce((sum, trip) => sum + trip.total_charge, 0);

    const mockMonthlyFuelCost = mockFuelLogsData.filter(log => {
      const logDate = new Date(log.log_datetime);
      return logDate.getFullYear() === currentYear && (logDate.getMonth() + 1) === currentMonthNum;
    }).reduce((sum, log) => sum + (log.fuel_cost || 0), 0);

    const mockMonthlyMaintenanceCost = mockMaintenanceData.filter(item => {
      const itemDate = new Date(item.maintenance_date);
      return itemDate.getFullYear() === currentYear && (itemDate.getMonth() + 1) === currentMonthNum;
    }).reduce((sum, item) => sum + (item.cost || 0), 0);

    const mockMonthlyGeneralExpenses = mockGeneralExpensesData.filter(item => {
      const itemDate = new Date(item.expense_date);
      return itemDate.getFullYear() === currentYear && (itemDate.getMonth() + 1) === currentMonthNum;
    }).reduce((sum, item) => sum + (item.cost || 0), 0);

    const mockMonthlyDriverSalaries = mockDriverSalaryData.reduce((sum, driver) => sum + (driver.salary_amount || 0), 0); // Assuming mockDriverSalaryData is for current month

    const mockMonthlyExpensesSum = mockMonthlyFuelCost + mockMonthlyMaintenanceCost + mockMonthlyGeneralExpenses + mockMonthlyDriverSalaries;
    const mockMonthlyNetRevenueSum = mockMonthlyRevenueSum - mockMonthlyExpensesSum;


    // Trips by Car Month (all mock data)
    const tripsByCarMonth = {};
    mockTripsData.forEach(trip => {
      const month = getMonthName(trip.start_date);
      if (!tripsByCarMonth[month]) tripsByCarMonth[month] = {};
      if (!tripsByCarMonth[month][trip.car_no]) tripsByCarMonth[month][trip.car_no] = 0;
      tripsByCarMonth[month][trip.car_no]++;
    });
    const monthlyTrips = Object.keys(tripsByCarMonth).sort((a, b) => new Date(a) - new Date(b)).map(month => ({ month, ...tripsByCarMonth[month] }));

    // Monthly Total & Net Revenue by Car (all mock data)
    const revenueByCarMonth = {};
    mockTripsData.forEach(trip => {
      const month = getMonthName(trip.start_date);
      if (!revenueByCarMonth[month]) revenueByCarMonth[month] = {};
      if (!revenueByCarMonth[month][trip.car_no]) revenueByCarMonth[month][trip.car_no] = { totalRevenue: 0, netRevenue: 0 };
      revenueByCarMonth[month][trip.car_no].totalRevenue += trip.total_charge;
      revenueByCarMonth[month][trip.car_no].netRevenue += (trip.total_charge - trip.fuel_cost);
    });
    const carMonthlyRevenue = Object.keys(revenueByCarMonth).sort((a, b) => new Date(a) - new Date(b)).map(month => {
      const monthData = { month };
      Object.keys(revenueByCarMonth[month]).forEach(carNo => {
        monthData[`${carNo}_total`] = revenueByCarMonth[month][carNo].totalRevenue;
        monthData[`${carNo}_net`] = revenueByCarMonth[month][carNo].netRevenue;
      });
      return monthData;
    });

    // Net Revenue by Driver (all mock data)
    const driverRevenue = {};
    mockTripsData.forEach(trip => {
      if (!driverRevenue[trip.driver_name]) driverRevenue[trip.driver_name] = 0;
      driverRevenue[trip.driver_name] += (trip.total_charge - trip.fuel_cost);
    });
    const driverNetRevenue = Object.keys(driverRevenue).map(driver => ({ driver, netRevenue: driverRevenue[driver] })).sort((a,b) => b.netRevenue - a.netRevenue);

    // Revenue Breakdown by Route Type (Export/Import) - using mock data
    const routeTypeRevenue = getMockRouteTypeRevenueData(mockTripsData);

    // Overall Expenses Summary (all mock data)
    const totalFuelCost = mockFuelLogsData.reduce((sum, log) => sum + log.fuel_cost, 0);
    const totalMaintenanceCost = mockMaintenanceData.reduce((sum, item) => sum + item.cost, 0);
    const totalGeneralExpenses = mockGeneralExpensesData.reduce((sum, item) => sum + item.cost, 0);
    const totalDriverSalaries = mockDriverSalaryData.reduce((sum, item) => sum + item.salary_amount, 0);

    const expensesSummary = [
      { name: 'လောင်စာဆီ ကုန်ကျစရိတ်', value: totalFuelCost },
      { name: 'ပြင်ဆင်စရိတ်', value: totalMaintenanceCost },
      { name: 'အထွေထွေ ကုန်ကျစရိတ်', value: totalGeneralExpenses },
      { name: 'ယာဉ်မောင်း လစာ', value: totalDriverSalaries },
    ];

    // Expenses by Category (all mock data)
    const expensesByCategoryMap = {};
    mockMaintenanceData.forEach(item => {
      if (!expensesByCategoryMap[item.description]) expensesByCategoryMap[item.description] = 0;
      expensesByCategoryMap[item.description] += item.cost;
    });
    mockGeneralExpensesData.forEach(item => {
      if (!expensesByCategoryMap[item.description]) expensesByCategoryMap[item.description] = 0;
      expensesByCategoryMap[item.description] += item.cost;
    });
    const expensesByCategory = Object.keys(expensesByCategoryMap).map(cat => ({ name: cat, value: expensesByCategoryMap[cat] })).sort((a,b) => b.value - a.value);

    // Fuel Efficiency and Total Fuel Consumed (all mock data)
    const carFuelEfficiency = {};
    mockFuelReadingsData.forEach(reading => {
      if (!carFuelEfficiency[reading.car_no]) carFuelEfficiency[reading.car_no] = { totalKmPerGallon: 0, count: 0 };
      carFuelEfficiency[reading.car_no].totalKmPerGallon += reading.km_per_gallon;
      carFuelEfficiency[reading.car_no].count++;
    });
    const fuelEfficiency = Object.keys(carFuelEfficiency).map(carNo => ({
      car_no: carNo,
      avgKmPerGallon: carFuelEfficiency[carNo].count > 0 ? (carFuelEfficiency[carNo].totalKmPerGallon / carFuelEfficiency[carNo].count) : 0,
    })).sort((a, b) => b.avgKmPerGallon - a.avgKmPerGallon);

    const carTotalFuelConsumed = {};
    mockFuelLogsData.forEach(log => {
      if (!carTotalFuelConsumed[log.car_no]) carTotalFuelConsumed[log.car_no] = 0;
      carTotalFuelConsumed[log.car_no] += log.fuel_amount;
    });
    const totalFuelConsumed = Object.keys(carTotalFuelConsumed).map(carNo => ({
      car_no: carNo,
      totalFuelConsumed: carTotalFuelConsumed[carNo],
    })).sort((a, b) => b.totalFuelConsumed - a.totalFuelConsumed);

    // Current Month Car Revenue (Cards) - using mock data
    const currentMonthRevenue = {};
    mockTripsData.filter(trip => getMonthName(trip.start_date) === currentMonthName).forEach(trip => {
      if (!currentMonthRevenue[trip.car_no]) currentMonthRevenue[trip.car_no] = 0;
      currentMonthRevenue[trip.car_no] += (trip.total_charge - trip.fuel_cost);
    });
    const processedCurrentMonthCarRevenue = Object.keys(currentMonthRevenue).map(carNo => ({
      car_no: carNo,
      netRevenue: currentMonthRevenue[carNo]
    }));


    setDashboardData({
      monthlyTripsData: monthlyTrips,
      carMonthlyRevenueData: carMonthlyRevenue,
      driverNetRevenueData: driverNetRevenue,
      revenueBreakdownData: routeTypeRevenue,
      expensesSummaryData: expensesSummary,
      expensesByCategoryData: expensesByCategory,
      fuelEfficiencyData: fuelEfficiency,
      totalFuelConsumedData: totalFuelConsumed,
      currentMonthCarRevenue: processedCurrentMonthCarRevenue,
      // Monthly Summary
      totalTripsCount: mockMonthlyTripsCount,
      totalRevenueSum: mockMonthlyRevenueSum,
      totalExpensesSum: mockMonthlyExpensesSum,
      totalNetRevenueSum: mockMonthlyNetRevenueSum,
    });
    setLoading(false);
  };


  useEffect(() => {
    if (useMockData) {
      processMockData();
    } else {
      fetchDashboardData();
    }
  }, [useMockData,fetchDashboardData]);

  // Determine which car numbers to show based on selected data source
  // const allCarNumbers = CAR_NUMBERS; // Use fixed CAR_NUMBERS for consistency in charts

  const currentMonthLabel = getMonthName(new Date().toISOString().split('T')[0]).split(' ')[0]; // e.g., "May"


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className={`animate-spin rounded-full h-32 w-32 border-b-2 ${isDarkMode ? 'border-purple-500' : 'border-blue-500'}`}></div>
        <p className={`ml-4 text-xl ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data များတင်နေပါသည်...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 text-center ${isDarkMode ? 'text-red-300' : 'text-red-700'} bg-opacity-20 rounded-lg mx-auto max-w-2xl`}>
        <p className="text-lg font-semibold mb-2">Data တင်ရာတွင် အမှားအယွင်းရှိပါသည်။</p>
        <p>{error}</p>
        <button
          onClick={() => setUseMockData(true)}
          className={`mt-4 px-4 py-2 rounded-md ${isDarkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          Mock Data ဖြင့်ကြည့်ရှုရန်
        </button>
      </div>
    );
  }


  return (
    <div className={`p-6 md:p-8 lg:p-10 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} transition-colors duration-300 ease-in-out`}>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold drop-shadow-lg">
          လုပ်ငန်းစွမ်းဆောင်ရည် ခြုံငုံသုံးသပ်ချက်
        </h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm font-medium">Mock Data (On/Off)</span>
          <StyledSwitch
            checked={useMockData}
            onChange={(e) => setUseMockData(e.target.checked)}
            name="useMockData"
            inputProps={{ 'aria-label': 'toggle mock data' }}
          />
        </div>
      </div>

      {/* Top Cards Section - Overall Summary (Monthly) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg transform transition-all duration-300 hover:scale-[1.02]`}>
          <p className="text-sm font-medium opacity-80 mb-2">စုစုပေါင်း ခရီးစဉ်များ ({currentMonthLabel} လစာ)</p>
          <p className="text-3xl font-bold text-my-purple-500">{typeof dashboardData.totalTripsCount === 'number' ? dashboardData.totalTripsCount.toLocaleString() : 'N/A'}</p>
        </div>
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg transform transition-all duration-300 hover:scale-[1.02]`}>
          <p className="text-sm font-medium opacity-80 mb-2">စုစုပေါင်း ဝင်ငွေ (ကျပ်) ({currentMonthLabel} လစာ)</p>
          <p className="text-3xl font-bold text-green-500">{(typeof dashboardData.totalRevenueSum === 'number' ? dashboardData.totalRevenueSum.toLocaleString() : 'N/A')}</p>
        </div>
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg transform transition-all duration-300 hover:scale-[1.02]`}>
          <p className="text-sm font-medium opacity-80 mb-2">စုစုပေါင်း ကုန်ကျစရိတ် (ကျပ်) ({currentMonthLabel} လစာ)</p>
          <p className="text-3xl font-bold text-red-500">{(typeof dashboardData.totalExpensesSum === 'number' ? dashboardData.totalExpensesSum.toLocaleString() : 'N/A')}</p>
        </div>
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg transform transition-all duration-300 hover:scale-[1.02]`}>
          <p className="text-sm font-medium opacity-80 mb-2">စုစုပေါင်း အသားတင်ဝင်ငွေ (ကျပ်) ({currentMonthLabel} လစာ)</p>
          <p className="text-3xl font-bold text-blue-500">{(typeof dashboardData.totalNetRevenueSum === 'number' ? dashboardData.totalNetRevenueSum.toLocaleString() : 'N/A')} </p>
        </div>
      </div>

      {/* Current Month Car Revenue Cards */}
      <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 mb-8 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
        <h3 className="text-xl font-semibold mb-4 text-center">ယခုလ (
          {currentMonthLabel}
          ) ကားတစ်စီးချင်းစီ၏ အသားတင်ဝင်ငွေ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {CAR_NUMBERS.map((carNo, index) => {
            const carRevenue = dashboardData.currentMonthCarRevenue.find(item => item.car_no === carNo);
            const revenue = carRevenue ? carRevenue.netRevenue : 0;
            return (
              <div key={carNo} className={`p-4 rounded-lg flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-yellow-50 text-yellow-900'} shadow-md`}>
                <p className="text-base font-medium opacity-80">{carNo}</p>
                <p className="text-xl font-bold mt-1">{typeof revenue === 'number' ? revenue.toLocaleString() : 'N/A'} ကျပ်</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Trips by Car */}
        <div className={`lg:col-span-2 ${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">လစဉ် ကားတစ်စီးချင်းစီ၏ ခရီးစဉ်အရေအတွက်</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={dashboardData.monthlyTripsData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
              <XAxis dataKey="month" stroke={axisLabelColor} />
              <YAxis stroke={axisLabelColor} />
              <Tooltip
                contentStyle={{ backgroundColor: isDarkMode ? '#2d3748' : '#fff', border: `1px solid ${gridStrokeColor}`, borderRadius: '8px' }}
                labelStyle={{ color: axisLabelColor }}
                itemStyle={{ color: axisLabelColor }}
                formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
              />
              <Legend wrapperStyle={{ color: axisLabelColor }} />
              {CAR_NUMBERS.map((carNo, index) => (
                <Bar key={carNo} dataKey={carNo} fill={multiSeriesColors[index]} radius={[5, 5, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown by Route Type (Export/Import) */}
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">ဝင်ငွေ ခွဲခြမ်းစိတ်ဖြာချက် (Export/Import အလိုက်)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={dashboardData.revenueBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {dashboardData.revenueBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={singleSeriesColors[index % singleSeriesColors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => typeof value === 'number' ? `${value.toLocaleString()} ကျပ်` : value}
                contentStyle={{ backgroundColor: isDarkMode ? '#2d3748' : '#fff', border: `1px solid ${gridStrokeColor}`, borderRadius: '8px' }}
                labelStyle={{ color: axisLabelColor }}
                itemStyle={{ color: axisLabelColor }}
              />
              <Legend wrapperStyle={{ color: axisLabelColor }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Total & Net Revenue by Car */}
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">လစဉ် ကားတစ်စီးချင်းစီ၏ စုစုပေါင်းနှင့် အသားတင်ဝင်ငွေ</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={dashboardData.carMonthlyRevenueData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
              <XAxis dataKey="month" stroke={axisLabelColor} />
              <YAxis stroke={axisLabelColor} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? `${value.toLocaleString()} ကျပ်` : value}
                contentStyle={{ backgroundColor: isDarkMode ? '#2d3748' : '#fff', border: `1px solid ${gridStrokeColor}`, borderRadius: '8px' }}
                labelStyle={{ color: axisLabelColor }}
                itemStyle={{ color: axisLabelColor }}
              />
              <Legend wrapperStyle={{ color: axisLabelColor }} />
              {CAR_NUMBERS.map((carNo, index) => (
                <React.Fragment key={carNo}>
                  <Bar dataKey={`${carNo}_total`} fill={multiSeriesColors[index * 2]} name={`${carNo} (စုစုပေါင်း)`} stackId={`a${index}`} radius={[5, 5, 0, 0]} />
                  <Bar dataKey={`${carNo}_net`} fill={multiSeriesColors[index * 2 + 1]} name={`${carNo} (အသားတင်)`} stackId={`b${index}`} radius={[5, 5, 0, 0]} />
                </React.Fragment>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net Revenue by Driver */}
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">ယာဉ်မောင်းအလိုက် အသားတင်ဝင်ငွေ နှိုင်းယှဉ်ချက်</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={dashboardData.driverNetRevenueData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
              <XAxis type="number" stroke={axisLabelColor} formatter={(value) => typeof value === 'number' ? `${value.toLocaleString()} ကျပ်` : value} />
              <YAxis type="category" dataKey="driver" stroke={axisLabelColor} width={100} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? `${value.toLocaleString()} ကျပ်` : value}
                contentStyle={{ backgroundColor: isDarkMode ? '#2d3748' : '#fff', border: `1px solid ${gridStrokeColor}`, borderRadius: '8px' }}
                labelStyle={{ color: axisLabelColor }}
                itemStyle={{ color: axisLabelColor }}
              />
              <Legend wrapperStyle={{ color: axisLabelColor }} />
              <Bar dataKey="netRevenue" name="အသားတင်ဝင်ငွေ" fill={singleSeriesColors[0]} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Overall Expenses Summary */}
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">ကုန်ကျစရိတ်များ ခြုံငုံသုံးသပ်ချက်</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dashboardData.expensesSummaryData.map((item, index) => (
              <div key={index} className={`p-4 rounded-lg flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-red-50 text-red-900'} shadow-md`}>
                <p className="text-sm font-medium opacity-80">{item.name}</p>
                <p className="text-2xl font-bold mt-1">{typeof item.value === 'number' ? item.value.toLocaleString() : 'N/A'} ကျပ်</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses by Category with Sub-categories */}
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">ကုန်ကျစရိတ် အမျိုးအစားအလိုက် ခွဲခြမ်းစိတ်ဖြာချက်</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={dashboardData.expensesByCategoryData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} interval={0} stroke={axisLabelColor} />
              <YAxis stroke={axisLabelColor} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? `${value.toLocaleString()} ကျပ်` : value}
                contentStyle={{ backgroundColor: isDarkMode ? '#2d3748' : '#fff', border: `1px solid ${gridStrokeColor}`, borderRadius: '8px' }}
                labelStyle={{ color: axisLabelColor }}
                itemStyle={{ color: axisLabelColor }}
              />
              <Legend wrapperStyle={{ color: axisLabelColor }} />
              <Bar dataKey="value" name="ကုန်ကျစရိတ်" fill={expenseChartColors[0]} radius={[5, 5, 0, 0]}>
                {dashboardData.expensesByCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={expenseChartColors[index % expenseChartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fuel Efficiency Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top/Worst Fuel Efficiency Cars */}
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">ဆီစားနှုန်း အကောင်းဆုံး/အဆိုးဆုံး ကားများ (KM/Gallon)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={dashboardData.fuelEfficiencyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
              <XAxis dataKey="car_no" stroke={axisLabelColor} />
              <YAxis stroke={axisLabelColor} label={{ value: 'KM/Gallon', angle: -90, position: 'insideLeft', fill: axisLabelColor }} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? `${value.toFixed(2)} KM/Gallon` : value}
                contentStyle={{ backgroundColor: isDarkMode ? '#2d3748' : '#fff', border: `1px solid ${gridStrokeColor}`, borderRadius: '8px' }}
                labelStyle={{ color: axisLabelColor }}
                itemStyle={{ color: axisLabelColor }}
              />
              <Legend wrapperStyle={{ color: axisLabelColor }} />
              <Bar dataKey="avgKmPerGallon" name="ပျမ်းမျှ KM/Gallon" fill={fuelChartColors[0]} radius={[5, 5, 0, 0]}>
                {dashboardData.fuelEfficiencyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={fuelChartColors[index % fuelChartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Total Fuel Consumed by Car */}
        <div className={`${isDarkMode ? 'bg-gray-800 shadow-purple-900/50' : 'bg-white shadow-blue-200/50'} rounded-xl p-6 shadow-lg transform transition-all duration-300 hover:scale-[1.005]`}>
          <h3 className="text-xl font-semibold mb-4 text-center">စုစုပေါင်း ဆီသုံးစွဲမှု (Gallons)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={dashboardData.totalFuelConsumedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
              <XAxis dataKey="car_no" stroke={axisLabelColor} />
              <YAxis stroke={axisLabelColor} label={{ value: 'Gallons', angle: -90, position: 'insideLeft', fill: axisLabelColor }} />
              <Tooltip
                formatter={(value) => typeof value === 'number' ? `${value.toFixed(2)} Gallons` : value}
                contentStyle={{ backgroundColor: isDarkMode ? '#2d3748' : '#fff', border: `1px solid ${gridStrokeColor}`, borderRadius: '8px' }}
                labelStyle={{ color: axisLabelColor }}
                itemStyle={{ color: axisLabelColor }}
              />
              <Legend wrapperStyle={{ color: axisLabelColor }} />
              <Bar dataKey="totalFuelConsumed" name="စုစုပေါင်း ဆီသုံးစွဲမှု" fill={fuelChartColors[1]} radius={[5, 5, 0, 0]}>
                {dashboardData.totalFuelConsumedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={fuelChartColors[(index + 1) % fuelChartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
