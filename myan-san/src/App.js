// myan-san/src/App.js
import React, { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import HomePage from './pages/HomePage';
import CarManagementPage from './pages/CarManagementPage';
import DriverManagementPage from './pages/DriverManagementPage';
import AllTripsPage from './pages/AllTripsPage';
import FuelConsumptionPage from './pages/FuelConsumptionPage';
import SettingsPage from './pages/SettingsPage';
import RouteChargesManagementPage from './pages/RouteChargesManagementPage'; // NEW: Import RouteChargesManagementPage

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // Default page is 'home'

  // This function will render the correct page based on currentPage state
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
      case 'settings':
        return <SettingsPage />;
      case 'routeChargesManagement': // NEW: Render RouteChargesManagementPage
        return <RouteChargesManagementPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderPage()}
    </DashboardLayout>
  );
}

export default App;
