// myan-san/src/App.js
import React, { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import HomePage from './pages/HomePage';
import CarManagementPage from './pages/CarManagementPage';
import DriverManagementPage from './pages/DriverManagementPage';
import AllTripsPage from './pages/AllTripsPage';
import FuelConsumptionPage from './pages/FuelConsumptionPage';
import SettingsPage from './pages/SettingsPage';
import RouteChargesManagementPage from './pages/RouteChargesManagementPage';
import EmptyChargeManagementPage from './pages/EmptyChargeManagementPage';
import DeveloperPage from './pages/DeveloperPage'; // DeveloperPage ကို import လုပ်သည်
import './index.css';

// LocalizationProvider နဲ့ AdapterDayjs ကို import လုပ်ပါမယ်။
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'carManagement':
        return <CarManagementPage />;
      case 'driverManagement':
        return <DriverManagementPage />;
      case 'allTrips':
        return <AllTripsPage />;
      case 'fuelConsumption':
        return <FuelConsumptionPage />;
      case 'routeChargesManagement':
        return <RouteChargesManagementPage />;
      case 'emptyChargeManagement':
        return <EmptyChargeManagementPage />;
      case 'settings':
        return <SettingsPage />;
      case 'developer': // DeveloperPage အတွက် case အသစ် ထည့်သွင်းသည်
        return <DeveloperPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DashboardLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
        {renderPage()}
      </DashboardLayout>
    </LocalizationProvider>
  );
}

export default App;