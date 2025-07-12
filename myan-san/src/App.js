// myan-san/src/App.js
import React, { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import HomePage from './pages/HomePage';
import CarManagementPage from './pages/CarManagementPage';
import DriverManagementPage from './pages/DriverManagementPage';
import AllTripsPage from './pages/AllTripsPage'; // Make sure this is imported if you have it
import FuelConsumptionPage from './pages/FuelConsumptionPage'; // Make sure this is imported if you have it
import SettingsPage from './pages/SettingsPage'; // NEW: Import SettingsPage

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
      case 'fuelConsumption': // Assuming you might have a dedicated fuel consumption page
        return <FuelConsumptionPage />;
      case 'settings': // NEW: Render SettingsPage
        return <SettingsPage />;
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
