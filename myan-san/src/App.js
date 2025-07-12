// myan-san/src/App.js
import React, { useState } from 'react';
import HomePage from './pages/HomePage';
import CarManagementPage from './pages/CarManagementPage';
import DriverManagementPage from './pages/DriverManagementPage';
import AllTripsPage from './pages/AllTripsPage'; // AllTripsPage ကို import လုပ်ပါ။
import FuelConsumptionPage from './pages/FuelConsumptionPage'; // FuelConsumptionPage ကို import လုပ်ပါ။
import DashboardLayout from './components/DashboardLayout';

function App() {
  // 'home', 'carManagement', 'driverManagement', 'allTrips', 'fuelConsumption' စသည်ဖြင့် လက်ရှိ page ကို ထိန်းချုပ်ရန်
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
      case 'fuelConsumption': // FuelConsumptionPage အတွက် case အသစ် ထည့်သွင်းခြင်း
        return <FuelConsumptionPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="App">
      <DashboardLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
        {renderPage()}
      </DashboardLayout>
    </div>
  );
}

export default App;
