// myan-san/src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import axios from 'axios'; // For making API requests

function SettingsPage() {
  const API_BASE_URL = 'http://localhost:5001'; // Backend API base URL

  // State variables for export functionality
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null); // To display success/error messages for export

  // State variables for import functionality
  const [selectedFile, setSelectedFile] = useState(null); // To store the file selected by the user for import
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState(null); // To display success/error messages for import

  // Function to handle data export (backup)
  const handleExportData = async () => {
    setIsExporting(true); // Set exporting state to true
    setExportMessage(null); // Clear previous messages

    try {
      // Make a GET request to the backend backup API
      const response = await axios.get(`${API_BASE_URL}/api/backup`, {
        responseType: 'blob', // Important: tells axios to expect a binary response (file)
      });

      // Create a Blob from the response data
      const blob = new Blob([response.data], { type: 'application/json' });

      // Create a download link for the Blob
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate a filename with the current date
      const today = new Date();
      const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
      a.download = `myan_san_backup_${dateString}.json`; // Suggested filename

      // Programmatically click the link to trigger the download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url); // Clean up the URL object

      setExportMessage({ type: 'success', text: 'ဒေတာများကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။' });
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportMessage({ type: 'error', text: `ဒေတာများ သိမ်းဆည်းရာတွင် အမှားရှိခဲ့ပါသည်။: ${error.message}` });
    } finally {
      setIsExporting(false); // Reset exporting state
    }
  };

  // Function to handle file selection for import
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]); // Get the first selected file
    setImportMessage(null); // Clear previous messages
  };

  // Function to handle data import (restore)
  const handleImportData = async () => {
    if (!selectedFile) {
      setImportMessage({ type: 'error', text: 'ကျေးဇူးပြု၍ ပြန်လည်ထည့်သွင်းရန် ဖိုင်ကို ရွေးချယ်ပါ။' });
      return;
    }

    setIsImporting(true); // Set importing state to true
    setImportMessage(null); // Clear previous messages

    const reader = new FileReader(); // Create a FileReader to read the file content

    // Event listener for when the file is loaded
    reader.onload = async (e) => {
      try {
        const fileContent = e.target.result; // Get the content of the file
        const dataToImport = JSON.parse(fileContent); // Parse the content as JSON

        // Make a POST request to the backend restore API
        const response = await axios.post(`${API_BASE_URL}/api/restore`, dataToImport);

        if (response.data.message === 'success') {
          setImportMessage({ type: 'success', text: 'ဒေတာများကို အောင်မြင်စွာ ပြန်လည်ထည့်သွင်းပြီးပါပြီ။' });
          setSelectedFile(null); // Clear selected file
          // Optionally, reload page or refetch data in other components if needed
          window.location.reload(); // Reload the page to reflect changes
        } else {
          setImportMessage({ type: 'error', text: `ဒေတာများ ပြန်လည်ထည့်သွင်းရာတွင် အမှားရှိခဲ့ပါသည်။: ${response.data.error || 'Unknown error'}` });
        }
      } catch (error) {
        console.error('Error importing data:', error);
        setImportMessage({ type: 'error', text: `ဒေတာများ ပြန်လည်ထည့်သွင်းရာတွင် Error ရှိခဲ့ပါသည်။: ${error.message}` });
      } finally {
        setIsImporting(false); // Reset importing state
      }
    };

    // Event listener for file read errors
    reader.onerror = (e) => {
      console.error('File reading error:', e);
      setImportMessage({ type: 'error', text: `ဖိုင်ဖတ်ရာတွင် အမှားရှိခဲ့ပါသည်။: ${e.message}` });
      setIsImporting(false);
    };

    reader.readAsText(selectedFile); // Read the file content as text
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        ဒေတာ စီမံခန့်ခွဲမှု (Data Management)
      </h1>

      {/* Export Data Section */}
      <div className="mb-8 p-6 border rounded-lg shadow-sm bg-gray-50">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          ဒေတာများ သိမ်းဆည်းရန် (Export Data)
        </h2>
        <p className="text-gray-600 mb-4">
          သင့်ရဲ့ ဒေတာအားလုံးကို JSON ဖိုင်တစ်ခုအဖြစ် သိမ်းဆည်းနိုင်ပါတယ်။
          ဒါက ဒေတာတွေ မပျောက်ပျက်အောင် ကာကွယ်ဖို့ အရေးကြီးပါတယ်။
        </p>
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className={`px-6 py-3 rounded-lg shadow-md font-semibold transition duration-300 ease-in-out
            ${isExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
        >
          {isExporting ? 'သိမ်းဆည်းနေပါသည်...' : 'ဒေတာများ သိမ်းဆည်းရန်'}
        </button>
        {exportMessage && (
          <p className={`mt-4 text-sm ${exportMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {exportMessage.text}
          </p>
        )}
      </div>

      {/* Import Data Section */}
      <div className="p-6 border rounded-lg shadow-sm bg-gray-50">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          ဒေတာများ ပြန်လည်ထည့်သွင်းရန် (Import Data)
        </h2>
        <p className="text-gray-600 mb-4">
          သိမ်းဆည်းထားတဲ့ JSON ဖိုင်ကနေ ဒေတာတွေကို ပြန်လည်ထည့်သွင်းနိုင်ပါတယ်။
          ဒေတာများ ထပ်နေခြင်း မဖြစ်စေရန် လက်ရှိဒေတာများကို ဖျက်ပြီးမှ ပြန်လည်ထည့်သွင်းပါမည်။
        </p>
        <input
          type="file"
          accept=".json" // Only allow JSON files
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0 file:text-sm file:font-semibold
            file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
        />
        <button
          onClick={handleImportData}
          disabled={!selectedFile || isImporting}
          className={`mt-4 px-6 py-3 rounded-lg shadow-md font-semibold transition duration-300 ease-in-out
            ${(!selectedFile || isImporting) ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'}`}
        >
          {isImporting ? 'ပြန်လည်ထည့်သွင်းနေပါသည်...' : 'ဒေတာများ ပြန်လည်ထည့်သွင်းရန်'}
        </button>
        {importMessage && (
          <p className={`mt-4 text-sm ${importMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {importMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
