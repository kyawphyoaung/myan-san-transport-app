// myan-san/src/components/DashboardLayout.jsx
import React, { useState, useRef } from 'react'; // useRef ကို ထည့်သွင်းပါ။
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Home as HomeIcon, // Home icon
  DirectionsCar as DirectionsCarIcon, // Car icon
  Group as GroupIcon, // Driver icon
  ListAlt as ListAltIcon, // List/Records icon
  LocalGasStation as LocalGasStationIcon, // Fuel Consumption icon - NEW
  Settings as SettingsIcon // Settings icon - NEW
} from '@mui/icons-material';

function DashboardLayout({ currentPage, setCurrentPage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default to closed
  const sidebarRef = useRef(null); // Sidebar element ကို ကိုင်တွယ်ရန်
  const toggleButtonRef = useRef(null); // Toggle button element ကို ကိုင်တွယ်ရန်
  let sidebarCloseTimer = useRef(null); // Sidebar ပိတ်ရန် timer ကို ကိုင်တွယ်ရန်

  // Page titles and their corresponding icons
  const pageInfo = {
    home: { title: 'ကားစာရင်း', icon: <HomeIcon sx={{ mr: 1 }} /> },
    carManagement: { title: 'ကားစီမံခန့်ခွဲမှု', icon: <DirectionsCarIcon sx={{ mr: 1 }} /> },
    driverManagement: { title: 'ယာဉ်မောင်း စီမံခန့်ခွဲမှု', icon: <GroupIcon sx={{ mr: 1 }} /> },
    allTrips: { title: 'မှတ်တမ်းများ', icon: <ListAltIcon sx={{ mr: 1 }} /> },
    fuelConsumption: { title: 'ဆီစားနှုန်း မှတ်တမ်း', icon: <LocalGasStationIcon sx={{ mr: 1 }} /> }, // NEW
    settings: { title: 'ဒေတာ စီမံခန့်ခွဲမှု', icon: <SettingsIcon sx={{ mr: 1 }} /> }, // NEW
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false); // Page ပြောင်းတာနဲ့ Sidebar ကို auto-hide လုပ်ပါ။
  };

  const handleMouseEnterButton = () => {
    clearTimeout(sidebarCloseTimer.current); // Timer ရှိရင် clear လုပ်ပါ။
    setSidebarOpen(true); // Mouse တင်တာနဲ့ Sidebar ကို ဖွင့်ပါ။
  };

  const handleMouseLeaveSidebar = () => {
    // Sidebar ပိတ်ရန် timer စပါ။ ဥပမာ 300ms ပြီးရင် ပိတ်ပါ။
    sidebarCloseTimer.current = setTimeout(() => {
      setSidebarOpen(false);
    }, 300);
  };

  const handleMouseEnterSidebar = () => {
    clearTimeout(sidebarCloseTimer.current); // Sidebar ထဲကို Mouse ဝင်လာရင် timer ကို clear လုပ်ပါ။
  };

  const handleClickCloseButton = () => {
    setSidebarOpen(false); // Close icon ကို နှိပ်ရင် ချက်ချင်းပိတ်ပါ။
    clearTimeout(sidebarCloseTimer.current); // Timer ရှိရင် clear လုပ်ပါ။
  };

  const headerHeight = '64px'; // Header ၏ အမြင့်ကို သတ်မှတ်ပါ။
  const sidebarWidth = '256px'; // Sidebar ၏ အကျယ်ကို သတ်မှတ်ပါ။

  return (
    <div className="flex min-h-screen bg-gray-100 font-inter relative">
      {/* Fixed Top Header (အပြာရောင် ဘားတန်း) */}
      <header
        className="fixed top-0 left-0 w-full h-16 bg-blue-800 text-white shadow-lg flex items-center px-4 z-30"
      >
        <button
          ref={toggleButtonRef}
          onMouseEnter={handleMouseEnterButton} // Mouse hover နဲ့ ဖွင့်ရန်
          onClick={sidebarOpen ? handleClickCloseButton : () => setSidebarOpen(true)} // Click နဲ့လည်း ဖွင့်/ပိတ် လုပ်နိုင်ရန်
          className="p-2 mr-4 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 ease-in-out"
        >
          {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <h1 className="text-xl font-semibold text-white flex items-center"> {/* flex items-center ထည့်ပါ */}
          {pageInfo[currentPage]?.icon} {/* Icon ကို ဖော်ပြပါ */}
          {pageInfo[currentPage]?.title}
        </h1>
      </header>

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnterSidebar} // Sidebar ထဲကို Mouse ဝင်လာရင် timer ကို clear လုပ်ရန်
        onMouseLeave={handleMouseLeaveSidebar} // Sidebar ကနေ Mouse ထွက်သွားရင် ပိတ်ရန်
        className={`fixed top-0 left-0 h-full bg-blue-800 text-white shadow-lg flex flex-col transition-all duration-300 ease-in-out z-20 overflow-hidden pt-16`} /* pt-16 သည် Header အောက်တွင် နေရာယူရန် */
        style={{ width: sidebarOpen ? sidebarWidth : '0px', transform: sidebarOpen ? 'translateX(0)' : `translateX(-${sidebarWidth})` }}
      >
        <nav className="flex-1 px-4 py-6 overflow-y-auto"> {/* Sidebar content တွင် scrollbar လိုအပ်ပါက */}
          <ul>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('home')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${ // Added flex and items-center
                  currentPage === 'home' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'
                }`}
              >
                <HomeIcon sx={{ mr: 2 }} />
                {pageInfo.home.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('carManagement')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${ // Added flex and items-center
                  currentPage === 'carManagement' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'
                }`}
              >
                <DirectionsCarIcon sx={{ mr: 2 }} />
                {pageInfo.carManagement.title}
              </button>
            </li>
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('driverManagement')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${ // Added flex and items-center
                  currentPage === 'driverManagement' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'
                }`}
              >
                <GroupIcon sx={{ mr: 2 }} />
                {pageInfo.driverManagement.title}
              </button>
            </li>
            {/* AllTripsPage အတွက် navigation link အသစ် */}
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('allTrips')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${ // Added flex and items-center
                  currentPage === 'allTrips' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'
                }`}
              >
                <ListAltIcon sx={{ mr: 2 }} />
                {pageInfo.allTrips.title}
              </button>
            </li>
            {/* NEW: Fuel Consumption Page navigation link */}
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('fuelConsumption')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${
                  currentPage === 'fuelConsumption' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'
                }`}
              >
                <LocalGasStationIcon sx={{ mr: 2 }} />
                {pageInfo.fuelConsumption.title}
              </button>
            </li>
            {/* NEW: Settings Page navigation link */}
            <li className="mb-2">
              <button
                onClick={() => handlePageChange('settings')}
                className={`flex items-center w-full text-left px-4 py-2 rounded-md transition duration-300 ease-in-out ${
                  currentPage === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:text-white hover:bg-blue-700'
                }`}
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
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out pt-16`} /* pt-16 သည် Header အမြင့်အတွက် */
        style={{ marginLeft: sidebarOpen ? sidebarWidth : '0px' }} /* Sidebar ၏ width အလိုက် Main content ၏ left margin ကို ချိန်ညှိပါပြီ။ */
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
