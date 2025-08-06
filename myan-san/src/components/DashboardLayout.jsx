// myan-san/src/components/DashboardLayout.jsx
import React, { useState, useRef } from 'react';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  DirectionsCar as DirectionsCarIcon,
  Group as GroupIcon,
  ListAlt as ListAltIcon,
  LocalGasStation as LocalGasStationIcon,
  Settings as SettingsIcon,
  AttachMoney as AttachMoneyIcon,
  MonetizationOn as MonetizationOnIcon
} from '@mui/icons-material';
import { IconButton, Typography, Box, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

// AppProvider ကနေ useContext ကို ရယူဖို့ useApp ကို import လုပ်ပါ
import { useApp } from './AppProvider';

function DashboardLayout({ currentPage, setCurrentPage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const toggleButtonRef = useRef(null);
  let sidebarCloseTimer = useRef(null);

  // useApp hook ကို အသုံးပြုပြီး mode နဲ့ setMode function ကို ရယူပါ
  const { mode, setMode } = useApp();
  const theme = useTheme();

  // Page titles and their corresponding icons
  const pageInfo = {
    home: { title: 'ကားစာရင်း', icon: <HomeIcon sx={{ mr: 1 }} /> },
    carManagement: { title: 'ကားစီမံခန့်ခွဲမှု', icon: <DirectionsCarIcon sx={{ mr: 1 }} /> },
    driverManagement: { title: 'ယာဉ်မောင်း စီမံခန့်ခွဲမှု', icon: <GroupIcon sx={{ mr: 1 }} /> },
    allTrips: { title: 'မှတ်တမ်းများ', icon: <ListAltIcon sx={{ mr: 1 }} /> },
    fuelConsumption: { title: 'ဆီစားနှုန်း', icon: <LocalGasStationIcon sx={{ mr: 1 }} /> },
    routeChargesManagement: { title: 'လမ်းကြောင်းခ စီမံခန့်ခွဲမှု', icon: <AttachMoneyIcon sx={{ mr: 1 }} /> },
    emptyChargeManagement: { title: 'အခွံချ/တင် နှုန်းထား စီမံခန့်ခွဲမှု', icon: <MonetizationOnIcon sx={{ mr: 1 }} /> },
    settings: { title: 'ချိန်ညှိမှုများ', icon: <SettingsIcon sx={{ mr: 1 }} /> },
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const handleMouseEnterButton = () => {
    clearTimeout(sidebarCloseTimer.current);
    setSidebarOpen(true);
  };

  const handleMouseLeaveSidebar = () => {
    sidebarCloseTimer.current = setTimeout(() => {
      setSidebarOpen(false);
    }, 300);
  };

  const handleMouseEnterSidebar = () => {
    clearTimeout(sidebarCloseTimer.current);
  };

  const handleClickCloseButton = () => {
    setSidebarOpen(false);
    clearTimeout(sidebarCloseTimer.current);
  };

  const headerHeight = '64px';
  const sidebarWidth = '256px';

  return (
    <div
      className={`flex min-h-screen font-inter relative ${mode === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
        }`}
    >
      {/* Fixed Top Header (အပြာရောင် ဘားတန်း) */}
      <header
        className="fixed top-0 left-0 w-full h-16 bg-blue-800 text-white shadow-lg flex items-center px-4 z-30"
      >
        <button
          ref={toggleButtonRef}
          onMouseEnter={handleMouseEnterButton}
          onClick={sidebarOpen ? handleClickCloseButton : () => setSidebarOpen(true)}
          className="p-2 mr-4 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 ease-in-out"
        >
          {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <h1 className="text-xl font-semibold text-white flex items-center flex-1">
          {pageInfo[currentPage]?.icon}
          {pageInfo[currentPage]?.title}
        </h1>

        {/* Theme ကို ပြောင်းဖို့ ခလုတ် */}
        <IconButton
          sx={{ ml: 1, color: 'white' }}
          onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        >
          {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </header>

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        className={`fixed top-0 left-0 h-full bg-blue-800 text-white shadow-lg flex flex-col transition-all duration-300 ease-in-out z-20 overflow-hidden pt-16`}
        style={{ width: sidebarOpen ? sidebarWidth : '0px', transform: sidebarOpen ? 'translateX(0)' : `translateX(-${sidebarWidth})` }}
      >
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('home')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'home' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <HomeIcon sx={{ mr: 2 }} />
                {pageInfo.home.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('carManagement')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'carManagement' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <DirectionsCarIcon sx={{ mr: 2 }} />
                {pageInfo.carManagement.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('driverManagement')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'driverManagement' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <GroupIcon sx={{ mr: 2 }} />
                {pageInfo.driverManagement.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('allTrips')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'allTrips' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <ListAltIcon sx={{ mr: 2 }} />
                {pageInfo.allTrips.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('fuelConsumption')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'fuelConsumption' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <LocalGasStationIcon sx={{ mr: 2 }} />
                {pageInfo.fuelConsumption.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('routeChargesManagement')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'routeChargesManagement' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <AttachMoneyIcon sx={{ mr: 2 }} />
                {pageInfo.routeChargesManagement.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('emptyChargeManagement')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'emptyChargeManagement' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <MonetizationOnIcon sx={{ mr: 2 }} />
                {pageInfo.emptyChargeManagement.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('settings')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${currentPage === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'}`}
              >
                <SettingsIcon sx={{ mr: 2 }} />
                {pageInfo.settings.title}
              </button>
            </li>
          </ul>
        </nav>
        <div className="p-4 text-center text-blue-300 text-sm border-t border-blue-700">
          © 2025 Myan San Transport
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out pt-16`}
        style={{ marginLeft: sidebarOpen ? sidebarWidth : '0px' }}
      >
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;