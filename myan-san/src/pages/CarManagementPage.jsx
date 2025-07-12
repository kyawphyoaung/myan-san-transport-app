// myan-san/src/pages/CarManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { formatMMK } from '../utils/currencyFormatter';
import carNumbersData from '../data/carNumbers.json'; // carNumbers.json ကို import လုပ်ပါ။

function CarManagementPage() {
  const API_BASE_URL = 'http://localhost:5001';

  const [uniqueCarNumbers, setUniqueCarNumbers] = useState([]);
  const [selectedCarNo, setSelectedCarNo] = useState('');
  const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance', 'fuel', 'general'

  // Car Maintenance Log အတွက် state များ
  const [maintenanceData, setMaintenanceData] = useState({
    carNo: '',
    maintenanceDate: '',
    description: '',
    otherDescription: '',
    cost: '',
  });
  const [carMaintenanceRecords, setCarMaintenanceRecords] = useState([]);

  // Fuel Log အတွက် state များ
  const [fuelLogData, setFuelLogData] = useState({
    carNo: '',
    logDate: '',
    fuelAmount: '',
    fuelCost: '',
    remarks: '',
  });
  const [fuelLogs, setFuelLogs] = useState([]);

  // General Expense Log အတွက် state များ
  const [generalExpenseData, setGeneralExpenseData] = useState({
    carNo: '',
    expenseDate: '',
    description: '',
    otherDescription: '', // For "Other" option in description
    cost: '',
    remarks: '',
  });
  const [generalExpenses, setGeneralExpenses] = useState([]);

  // General Expense Description Options
  const generalExpenseDescriptions = [
    'ယဥ်ရပ်နားခ',
    'ကျွတ်ဖာ',
    'ယဥ်မောင်းထမင်းဖိုး',
    'အိမ်စာရိတ်ဖိုး',
    'လိုင်စင်',
    'အခြား (Other)'
  ];

  // Unique Car Numbers များကို Backend မှ fetch လုပ်ခြင်းနှင့် carNumbersData ဖြင့် ပေါင်းစပ်ခြင်း
  useEffect(() => {
    const fetchAndCombineCarNumbers = async () => {
      const allCarNumbersSet = new Set();

      // Step 1: Add car numbers from static carNumbersData.json
      carNumbersData.forEach(car => allCarNumbersSet.add(car.number));

      // Step 2: Fetch unique car numbers from backend (from trips, maintenance, fuel_logs, assignments, general_expenses)
      try {
        const response = await fetch(`${API_BASE_URL}/api/unique-car-numbers`);
        const data = await response.json();
        if (data.message === "success") {
          data.data.forEach(car => allCarNumbersSet.add(car));
        } else {
          console.error("Failed to fetch unique car numbers from backend:", data.error);
        }
      } catch (error) {
        console.error("Error fetching unique car numbers from backend:", error);
      }

      const sortedCarNumbers = Array.from(allCarNumbersSet).sort();
      setUniqueCarNumbers(sortedCarNumbers);

      // Set default selected car number if not already set
      if (sortedCarNumbers.length > 0 && !selectedCarNo) {
        setSelectedCarNo(sortedCarNumbers[0]);
        setMaintenanceData(prev => ({ ...prev, carNo: sortedCarNumbers[0] }));
        setFuelLogData(prev => ({ ...prev, carNo: sortedCarNumbers[0] }));
        setGeneralExpenseData(prev => ({ ...prev, carNo: sortedCarNumbers[0] }));
      }

      // Set default date for new entries
      const today = new Date().toISOString().split('T')[0];
      setMaintenanceData(prev => ({ ...prev, maintenanceDate: today }));
      setFuelLogData(prev => ({ ...prev, logDate: today }));
      setGeneralExpenseData(prev => ({ ...prev, expenseDate: today }));
    };

    fetchAndCombineCarNumbers();
  }, []); // Run once on component mount

  // Selected Car No ပြောင်းလဲသောအခါ သက်ဆိုင်ရာ records များကို fetch လုပ်ခြင်း
  useEffect(() => {
    if (selectedCarNo) {
      fetchCarMaintenanceRecords(selectedCarNo);
      fetchFuelLogs(selectedCarNo);
      fetchGeneralExpenses(selectedCarNo);
    }
  }, [selectedCarNo]);

  // Car Maintenance Records များကို fetch လုပ်ခြင်း
  const fetchCarMaintenanceRecords = async (carNo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/car-maintenance/${carNo}`);
      const data = await response.json();
      if (data.message === "success") {
        setCarMaintenanceRecords(data.data);
        console.log(`Fetched Maintenance Records for ${carNo}:`, data.data);
      } else {
        console.error(`Failed to fetch maintenance records for ${carNo}:`, data.error);
      }
    } catch (error) {
      console.error(`Error fetching maintenance records for ${carNo}:`, error);
    }
  };

  // Fuel Logs များကို fetch လုပ်ခြင်း
  const fetchFuelLogs = async (carNo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fuel-logs/${carNo}`);
      const data = await response.json();
      if (data.message === "success") {
        setFuelLogs(data.data);
        console.log(`Fetched Fuel Logs for ${carNo}:`, data.data);
      } else {
        console.error(`Failed to fetch fuel logs for ${carNo}:`, data.error);
      }
    } catch (error) {
      console.error(`Error fetching fuel logs for ${carNo}:`, error);
    }
  };

  // General Expenses များကို fetch လုပ်ခြင်း
  const fetchGeneralExpenses = async (carNo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/general-expenses/${carNo}`);
      const data = await response.json();
      if (data.message === "success") {
        setGeneralExpenses(data.data);
        console.log(`Fetched General Expenses for ${carNo}:`, data.data);
      } else {
        console.error(`Failed to fetch general expenses for ${carNo}:`, data.error);
      }
    } catch (error) {
      console.error(`Error fetching general expenses for ${carNo}:`, error);
    }
  };

  // Car No Dropdown အတွက် Handle Change
  const handleCarNoChange = (e) => {
    const car = e.target.value;
    setSelectedCarNo(car);
    setMaintenanceData(prev => ({ ...prev, carNo: car }));
    setFuelLogData(prev => ({ ...prev, carNo: car }));
    setGeneralExpenseData(prev => ({ ...prev, carNo: car }));
  };

  // Maintenance Form Input Change
  const handleMaintenanceChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue = (name === 'cost') ? value.replace(/,/g, '') : value;

    if (name === "description" && cleanedValue === "အခြား (Other)") {
      setMaintenanceData(prev => ({ ...prev, description: cleanedValue, otherDescription: '' }));
    } else if (name === "otherDescription") {
      setMaintenanceData(prev => ({ ...prev, otherDescription: cleanedValue }));
    } else {
      setMaintenanceData(prev => ({ ...prev, [name]: cleanedValue }));
    }
  };

  // Fuel Log Form Input Change
  const handleFuelLogChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue = (name === 'fuelAmount' || name === 'fuelCost') ? value.replace(/,/g, '') : value;
    setFuelLogData(prev => ({ ...prev, [name]: cleanedValue }));
  };

  // General Expense Form Input Change
  const handleGeneralExpenseChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue = (name === 'cost') ? value.replace(/,/g, '') : value;

    if (name === "description" && value === "အခြား (Other)") {
      setGeneralExpenseData(prev => ({ ...prev, description: value, otherDescription: '' }));
    } else if (name === "otherDescription") {
      setGeneralExpenseData(prev => ({ ...prev, otherDescription: cleanedValue }));
    } else {
      setGeneralExpenseData(prev => ({ ...prev, [name]: cleanedValue }));
    }
  };

  // Add Maintenance Record
  const handleAddMaintenance = async () => {
    let finalDescription = maintenanceData.description;
    if (maintenanceData.description === "အခြား (Other)") {
      finalDescription = maintenanceData.otherDescription;
    }

    if (!maintenanceData.carNo || !maintenanceData.maintenanceDate || !finalDescription || !maintenanceData.cost) {
      alert('ကျေးဇူးပြု၍ ထိန်းသိမ်းစောင့်ရှောက်မှု အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/car-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: maintenanceData.carNo,
          maintenanceDate: maintenanceData.maintenanceDate,
          description: finalDescription,
          cost: parseFloat(maintenanceData.cost), // Ensure cost is a number
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
        fetchCarMaintenanceRecords(selectedCarNo); // Refresh records
        setMaintenanceData({ // Clear form
          carNo: selectedCarNo, // Keep selected car
          maintenanceDate: new Date().toISOString().split('T')[0], // Reset to today's date
          description: '',
          otherDescription: '',
          cost: '',
        });
      } else {
        alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding maintenance record:", error);
      alert(`ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း ထည့်သွင်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  // Add Fuel Log
  const handleAddFuelLog = async () => {
    if (!fuelLogData.carNo || !fuelLogData.logDate || !fuelLogData.fuelAmount || !fuelLogData.fuelCost) {
      alert('ကျေးဇူးပြု၍ ဆီသုံးစွဲမှု အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/fuel-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: fuelLogData.carNo,
          logDate: fuelLogData.logDate,
          fuelAmount: parseFloat(fuelLogData.fuelAmount), // Ensure fuelAmount is a number
          fuelCost: parseFloat(fuelLogData.fuelCost), // Ensure fuelCost is a number
          remarks: fuelLogData.remarks,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('ဆီသုံးစွဲမှု မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
        fetchFuelLogs(selectedCarNo); // Refresh logs
        setFuelLogData({ // Clear form
          carNo: selectedCarNo, // Keep selected car
          logDate: new Date().toISOString().split('T')[0], // Reset to today's date
          fuelAmount: '',
          fuelCost: '',
          remarks: '',
        });
      } else {
        alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding fuel log:", error);
      alert(`ဆီသုံးစွဲမှု မှတ်တမ်း ထည့်သွင်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };

  // Add General Expense
  const handleAddGeneralExpense = async () => {
    let finalDescription = generalExpenseData.description;
    if (generalExpenseData.description === "အခြား (Other)") {
      finalDescription = generalExpenseData.otherDescription;
    }

    if (!generalExpenseData.carNo || !generalExpenseData.expenseDate || !finalDescription || !generalExpenseData.cost) {
      alert('ကျေးဇူးပြု၍ အထွေထွေအသုံးစာရိတ် အချက်အလက်များကို ပြည့်စုံစွာ ထည့်သွင်းပါ။');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/general-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carNo: generalExpenseData.carNo,
          expenseDate: generalExpenseData.expenseDate,
          description: finalDescription,
          cost: parseFloat(generalExpenseData.cost), // Ensure cost is a number
          remarks: generalExpenseData.remarks,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('အထွေထွေအသုံးစာရိတ် မှတ်တမ်း အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ။');
        fetchGeneralExpenses(selectedCarNo); // Refresh logs
        setGeneralExpenseData({ // Clear form
          carNo: selectedCarNo, // Keep selected car
          expenseDate: new Date().toISOString().split('T')[0], // Reset to today's date
          description: '',
          otherDescription: '',
          cost: '',
          remarks: '',
        });
      } else {
        alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ထည့်သွင်းရာတွင် အမှားအယွင်းရှိခဲ့သည်: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding general expense:", error);
      alert(`အထွေထွေအသုံးစာရိတ် မှတ်တမ်း ထည့်သွင်းရာတွင် Error ရှိခဲ့သည်: ${error.message}`);
    }
  };


  // Calculate Grand Total for Maintenance Costs
  const maintenanceGrandTotal = carMaintenanceRecords.reduce((sum, record) => sum + record.cost, 0);

  // Calculate Grand Total for Fuel Costs
  const fuelGrandTotal = fuelLogs.reduce((sum, log) => sum + log.fuel_cost, 0);

  // Calculate Grand Total for General Expenses
  const generalExpenseGrandTotal = generalExpenses.reduce((sum, expense) => sum + expense.cost, 0);


  return (
    <>
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
          ကားစီမံခန့်ခွဲမှု (Car Management)
        </h1>

        {/* Car Selection */}
        <div className="mb-6">
          <label htmlFor="selectCarNo" className="block text-lg font-medium text-gray-700 mb-2">
            ကားနံပါတ် ရွေးချယ်ပါ
          </label>
          <select
            id="selectCarNo"
            name="selectCarNo"
            value={selectedCarNo}
            onChange={handleCarNoChange}
            className="mt-1 block w-full md:w-1/2 lg:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
          >
            <option value="">ကားနံပါတ် ရွေးပါ</option>
            {uniqueCarNumbers.map((car, index) => (
              <option key={index} value={car}>
                {car}
              </option>
            ))}
          </select>
        </div>

        {selectedCarNo && (
          <>
            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 text-lg font-medium ${activeTab === 'maintenance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('maintenance')}
              >
                ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း
              </button>
              <button
                className={`py-2 px-4 text-lg font-medium ${activeTab === 'fuel' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('fuel')}
              >
                ဆီသုံးစွဲမှု မှတ်တမ်း
              </button>
              <button
                className={`py-2 px-4 text-lg font-medium ${activeTab === 'general' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('general')}
              >
                အထွေထွေအသုံးစာရိတ်
              </button>
            </div>

            {/* Tab Content - Maintenance */}
            {activeTab === 'maintenance' && (
              <>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">
                  {selectedCarNo} အတွက် ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်း
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-blue-50 rounded-lg items-end">
                  <div>
                    <label htmlFor="maintenanceDate" className="block text-sm font-medium text-gray-700 mb-1">
                      ရက်စွဲ (Date)
                    </label>
                    <input
                      type="date"
                      id="maintenanceDate"
                      name="maintenanceDate"
                      value={maintenanceData.maintenanceDate}
                      onChange={handleMaintenanceChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      ဖော်ပြချက် (Description)
                    </label>
                    <select
                      id="description"
                      name="description"
                      value={maintenanceData.description}
                      onChange={handleMaintenanceChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    >
                      <option value="">ဖော်ပြချက် ရွေးပါ</option>
                      {/* maintenanceDescriptionsData ကို တိုက်ရိုက်သုံးပါမည်။ */}
                      {['တာယာလဲလှယ်ခြင်း', 'ဘက်ထရီအိုးလဲလှယ်ခြင်း', 'အင်ဂျင်ဝိုင်လဲလှယ်ခြင်း', 'ဂီယာဘောက်စ် ပြုပြင်ခြင်း', 'ဘရိတ်စနစ် ပြုပြင်ခြင်း', 'ဘရိတ်ဆီဖြည့်ခြင်း', 'ဘရိတ်ဆီလဲလှယ်ခြင်း', 'လေအိတ်လဲလှယ်ခြင်း', 'ဝါယာရိန်းနှင့် အာရုံခံကိရိယာများ ပြုပြင်ခြင်း', 'ကိုယ်ထည် ပြုပြင်ခြင်း/ဆေးမှုတ်ခြင်း', 'အခြား (Other)'].map((desc, index) => (
                        <option key={index} value={desc}>
                          {desc}
                        </option>
                      ))}
                    </select>
                    {maintenanceData.description === "အခြား (Other)" && (
                      <input
                        type="text"
                        id="otherDescription"
                        name="otherDescription"
                        value={maintenanceData.otherDescription}
                        onChange={handleMaintenanceChange}
                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        placeholder="အခြား ဖော်ပြချက် ထည့်ပါ..."
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
                      ကုန်ကျစရိတ် (Cost)
                    </label>
                    <input
                      type="text"
                      id="cost"
                      name="cost"
                      value={maintenanceData.cost.toLocaleString('en-US')}
                      onChange={handleMaintenanceChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 50,000"
                    />
                    {maintenanceData.cost && !isNaN(parseFloat(maintenanceData.cost.replace(/,/g, ''))) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatMMK(parseFloat(maintenanceData.cost.replace(/,/g, '')))}
                      </p>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={handleAddMaintenance}
                      className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 ease-in-out w-full"
                    >
                      ထိန်းသိမ်းစောင့်ရှောက်မှု ထည့်ရန်
                    </button>
                  </div>
                </div>

                {/* Car Maintenance Records Table */}
                <div className="overflow-x-auto mb-8">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No.</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ရက်စွဲ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ဖော်ပြချက်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ကုန်ကျစရိတ်</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carMaintenanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                            ထိန်းသိမ်းစောင့်ရှောက်မှု မှတ်တမ်းများ မရှိသေးပါ။
                          </td>
                        </tr>
                      ) : (
                        carMaintenanceRecords.map((record, index) => (
                          <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-800">{index + 1}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{record.maintenance_date}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{record.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{record.cost.toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                      {/* Grand Total Row for Maintenance */}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td colSpan="3" className="px-4 py-2 text-right text-sm text-gray-800">
                          စုစုပေါင်း ကုန်ကျစရိတ် (Grand Total):
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {maintenanceGrandTotal.toLocaleString()} ({formatMMK(maintenanceGrandTotal)})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Tab Content - Fuel */}
            {activeTab === 'fuel' && (
              <>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">
                  {selectedCarNo} အတွက် ဆီသုံးစွဲမှု မှတ်တမ်း
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-yellow-50 rounded-lg items-end">
                  <div>
                    <label htmlFor="fuelLogDate" className="block text-sm font-medium text-gray-700 mb-1">
                      ရက်စွဲ (Date)
                    </label>
                    <input
                      type="date"
                      id="fuelLogDate"
                      name="logDate"
                      value={fuelLogData.logDate}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuelAmount" className="block text-sm font-medium text-gray-700 mb-1">
                      ဆီပမာဏ (ဂါလံ/လီတာ)
                    </label>
                    <input
                      type="number"
                      id="fuelAmount"
                      name="fuelAmount"
                      value={fuelLogData.fuelAmount.toLocaleString('en-US')}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 10"
                    />
                  </div>
                  <div>
                    <label htmlFor="fuelCost" className="block text-sm font-medium text-gray-700 mb-1">
                      ဆီကုန်ကျငွေ
                    </label>
                    <input
                      type="text"
                      id="fuelCost"
                      name="fuelCost"
                      value={fuelLogData.fuelCost.toLocaleString('en-US')}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 50,000"
                    />
                    {fuelLogData.fuelCost && !isNaN(parseFloat(fuelLogData.fuelCost.replace(/,/g, ''))) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatMMK(parseFloat(fuelLogData.fuelCost.replace(/,/g, '')))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="fuelRemarks" className="block text-sm font-medium text-gray-700 mb-1">
                      မှတ်ချက်
                    </label>
                    <input
                      type="text"
                      id="fuelRemarks"
                      name="remarks"
                      value={fuelLogData.remarks}
                      onChange={handleFuelLogChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="မှတ်ချက်..."
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleAddFuelLog}
                      className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition duration-300 ease-in-out w-full"
                    >
                      ဆီဖြည့် မှတ်တမ်း ထည့်ရန်
                    </button>
                  </div>
                </div>

                {/* Fuel Logs Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No.</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ရက်စွဲ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ဆီပမာဏ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ဆီကုန်ကျငွေ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">မှတ်ချက်</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fuelLogs.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                            ဆီသုံးစွဲမှု မှတ်တမ်းများ မရှိသေးပါ။
                          </td>
                        </tr>
                      ) : (
                        fuelLogs.map((log, index) => (
                          <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-800">{index + 1}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{log.log_date}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{log.fuel_amount.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{log.fuel_cost.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{log.remarks}</td>
                          </tr>
                        ))
                      )}
                      {/* Grand Total Row for Fuel Logs */}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td colSpan="3" className="px-4 py-2 text-right text-sm text-gray-800">
                          စုစုပေါင်း ဆီကုန်ကျငွေ (Grand Total):
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {fuelGrandTotal.toLocaleString()} ({formatMMK(fuelGrandTotal)})
                        </td>
                        <td></td> {/* Empty cell for remarks column */}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Tab Content - General Expenses */}
            {activeTab === 'general' && (
              <>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">
                  {selectedCarNo} အတွက် အထွေထွေအသုံးစာရိတ်
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-purple-50 rounded-lg items-end">
                  <div>
                    <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 mb-1">
                      ရက်စွဲ (Date)
                    </label>
                    <input
                      type="date"
                      id="expenseDate"
                      name="expenseDate"
                      value={generalExpenseData.expenseDate}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="generalDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      ဖော်ပြချက် (Description)
                    </label>
                    <select
                      id="generalDescription"
                      name="description"
                      value={generalExpenseData.description}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    >
                      <option value="">ဖော်ပြချက် ရွေးပါ</option>
                      {generalExpenseDescriptions.map((desc, index) => (
                        <option key={index} value={desc}>
                          {desc}
                        </option>
                      ))}
                    </select>
                    {generalExpenseData.description === "အခြား (Other)" && (
                      <input
                        type="text"
                        id="generalOtherDescription"
                        name="otherDescription"
                        value={generalExpenseData.otherDescription}
                        onChange={handleGeneralExpenseChange}
                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        placeholder="အခြား ဖော်ပြချက် ထည့်ပါ..."
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="generalCost" className="block text-sm font-medium text-gray-700 mb-1">
                      ကုန်ကျစရိတ် (Cost)
                    </label>
                    <input
                      type="text"
                      id="generalCost"
                      name="cost"
                      value={generalExpenseData.cost.toLocaleString('en-US')}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="ဥပမာ: 15,000"
                    />
                    {generalExpenseData.cost && !isNaN(parseFloat(generalExpenseData.cost.replace(/,/g, ''))) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatMMK(parseFloat(generalExpenseData.cost.replace(/,/g, '')))}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="generalRemarks" className="block text-sm font-medium text-gray-700 mb-1">
                      မှတ်ချက်
                    </label>
                    <input
                      type="text"
                      id="generalRemarks"
                      name="remarks"
                      value={generalExpenseData.remarks}
                      onChange={handleGeneralExpenseChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                      placeholder="မှတ်ချက်..."
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleAddGeneralExpense}
                      className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-300 ease-in-out w-full"
                    >
                      အသုံးစာရိတ် ထည့်ရန်
                    </button>
                  </div>
                </div>

                {/* General Expenses Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No.</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ရက်စွဲ</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ဖော်ပြချက်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ကုန်ကျစရိတ်</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">မှတ်ချက်</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generalExpenses.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                            အထွေထွေအသုံးစာရိတ် မှတ်တမ်းများ မရှိသေးပါ။
                          </td>
                        </tr>
                      ) : (
                        generalExpenses.map((expense, index) => (
                          <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-800">{index + 1}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{expense.expense_date}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{expense.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{expense.cost.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-800">{expense.remarks}</td>
                          </tr>
                        ))
                      )}
                      {/* Grand Total Row for General Expenses */}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <td colSpan="3" className="px-4 py-2 text-right text-sm text-gray-800">
                          စုစုပေါင်း အထွေထွေအသုံးစာရိတ် (Grand Total):
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {generalExpenseGrandTotal.toLocaleString()} ({formatMMK(generalExpenseGrandTotal)})
                        </td>
                        <td></td> {/* Empty cell for remarks column */}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default CarManagementPage;
