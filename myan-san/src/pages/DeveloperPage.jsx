// src/pages/DeveloperPage.jsx
import React, { useState } from 'react';
// calculations.js က function ကို import လုပ်သည်
import { autoCalculateOvernightAndDayOver } from '../utils/calculations.js'; 

// စမ်းသပ်ရန် အခြေအနေများ စာရင်း
const testScenarios = [
  { 
    description: "၁။ Import ခရီးစဉ် - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ နေ့လယ် ၁နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ်၁ည နေ့ကျော်မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T13:00:00", 
    routeType: "import", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 1, dayOver: 0 } 
  },
  { 
    description: "၂။ Import ခရီးစဉ် - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ်၁ည ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T14:00:00", 
    routeType: "import", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 1, dayOver: 1 } 
  },
  { 
    description: "၃။ Import ခရီးစဉ် - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ နေ့လယ် ၁နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ်၂ည ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T13:00:00", 
    routeType: "import", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 2, dayOver: 1 } 
  },
  { 
    description: "၄။ Import ခရီးစဉ် - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ်၂ည၊ ၂ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T14:00:00", 
    routeType: "import", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 2, dayOver: 2 } 
  },
  { 
    description: "၅။ Import ခရီးစဉ် - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ နေ့လယ် ၁နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ်၃ည၊ ၂ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T13:00:00", 
    routeType: "import", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 3, dayOver: 2 } 
  },
  { 
    description: "၆။ Import ခရီးစဉ် - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ်၃ည၊ ၃ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T14:00:00", 
    routeType: "import", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 3, dayOver: 3 } 
  },
  
  // 2. Export ခရီးစဉ် (Cargo Type: normal)
  { 
    description: "၇။ Export Normal - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၀ရက်နေ့ ညနေ ၅နာရီမှာ ပြီးဆုံးသည်။ (အသားခ/နေ့ကျော် မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-10T17:00:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 0, dayOver: 0 } 
  },
  { 
    description: "၈။ Export Normal - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (နောက်တစ်ရက် စစ်ဆေးမှုအရ အသားအိပ်/နေ့ကျော် မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T14:00:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 0, dayOver: 0 } 
  },
  { 
    description: "၉။ Export Normal - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (နောက်တစ်ရက် စစ်ဆေးမှုအရ အသားအိပ် နေ့ကျော် မရှိရ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T15:00:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 0, dayOver: 0 } 
  },
  { 
    description: "၁၀။ Export Normal - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၁ ည၊ နေ့ကျော် မရှိရ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T14:00:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 1, dayOver: 0 } 
  },
  { 
    description: "၁၁။ Export Normal - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် 1 ည၊ 1ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T15:00:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 1, dayOver: 1 } 
  },
  { 
    description: "၁၂။ Export Normal - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၂ ည၊ ၁ ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T14:00:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 2, dayOver: 1 } 
  },
  { 
    description: "၁၃။ Export Normal - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၂ ည၊ ၂ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T15:00:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 2, dayOver: 2 } 
  },

  // 3. Export ခရီးစဉ် (Cargo Type: sameDay)
  { 
    description: "၁၄။ Export SameDay - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၀ရက်နေ့ ညနေ ၅နာရီမှာ ပြီးဆုံးသည်။ (အသားခ/နေ့ကျော် မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-10T17:00:00", 
    routeType: "export", 
    cargoType: "sameDay", 
    cargoLoad: null, 
    expected: { overnight: 0, dayOver: 0 } 
  },
  { 
    description: "၁၅။ Export SameDay - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၁ ည၊ နေ့ကျော်မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T14:00:00", 
    routeType: "export", 
    cargoType: "sameDay", 
    cargoLoad: null, 
    expected: { overnight: 1, dayOver: 0 } 
  },
  { 
    description: "၁၆။ Export SameDay - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၁ ည ၊ ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T15:00:00", 
    routeType: "export", 
    cargoType: "sameDay", 
    cargoLoad: null, 
    expected: { overnight: 1, dayOver: 1 } 
  },
  { 
    description: "၁၇။ Export SameDay - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၂ ည၊ ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T14:00:00", 
    routeType: "export", 
    cargoType: "sameDay", 
    cargoLoad: null, 
    expected: { overnight: 2, dayOver: 1 } 
  },
  { 
    description: "၁၈။ Export SameDay - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၂ ည၊ ၂ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T15:00:00", 
    routeType: "export", 
    cargoType: "sameDay", 
    cargoLoad: null, 
    expected: { overnight: 2, dayOver: 2 } 
  },

  // 4. Export ခရီးစဉ် (Cargo Type: custom)
  { 
    description: "၁၉။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၀ရက်နေ့ ညနေ ၅နာရီမှာ ပြီးဆုံးသည်။ (အသားခ/နေ့ကျော် မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-10T17:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-10T11:00:00", 
    expected: { overnight: 0, dayOver: 0 } 
  },
  { 
    description: "၂၀။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၁ ည၊ နေ့ကျော်မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T14:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-10T11:00:00", 
    expected: { overnight: 1, dayOver: 0 } 
  },
  { 
    description: "၂၁။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၁ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၁ ည၊ ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-11T15:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-10T11:00:00", 
    expected: { overnight: 1, dayOver: 1 } 
  },
  { 
    description: "၂၂။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၂ ည၊ ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T14:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-10T11:00:00", 
    expected: { overnight: 2, dayOver: 1 } 
  },
  { 
    description: "၂၃။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၂ ည၊ ၂ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T15:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-10T11:00:00", 
    expected: { overnight: 2, dayOver: 2 } 
  },
  { 
    description: "၂၄။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၃ ည၊ ၂ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T14:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-10T11:00:00", 
    expected: { overnight: 3, dayOver: 2 } 
  },
  { 
    description: "၂၅။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (အသားအိပ် ၃ ည၊ ၃ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T15:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-10T11:00:00", 
    expected: { overnight: 3, dayOver: 3 } 
  },
  
  // Custom Cargo Load Date ခြားပြီး စစ်ခြင်း
  { 
    description: "၂၆။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ နေ့လယ် ၁နာရီမှာ ပြီးဆုံးသည်။ (၁၁ရက်နေ့ မနက် ၅နာရီတွင် ကုန်တင်သည်၊ အသားအိပ် ၁ ည၊ နေ့ကျော်မရှိ)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T13:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-11T05:00:00", 
    expected: { overnight: 1, dayOver: 0 } 
  },
  { 
    description: "၂၇။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၂ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (၁၁ရက်နေ့ မနက် ၅နာရီတွင် ကုန်တင်သည်၊ အသားအိပ် ၁ ည၊ ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-12T15:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-11T05:00:00", 
    expected: { overnight: 1, dayOver: 1 } 
  },
  { 
    description: "၂၈။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ နေ့လယ် ၂နာရီမှာ ပြီးဆုံးသည်။ (၁၁ရက်နေ့ မနက် ၅နာရီတွင် ကုန်တင်သည်၊အသားအိပ် ၂ ည၊ ၁ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T14:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-11T05:00:00", 
    expected: { overnight: 2, dayOver: 1 } 
  },
  { 
    description: "၂၉။ Export Custom - ၁၀ရက်နေ့ မနက် ၁၀နာရီ စပြီး ၁၃ရက်နေ့ ညနေ ၃နာရီမှာ ပြီးဆုံးသည်။ (၁၁ရက်နေ့ မနက် ၅နာရီတွင် ကုန်တင်သည်၊ အသားအိပ် ၂ ည၊ ၂ရက် နေ့ကျော်)", 
    start: "2025-10-10T10:00:00", 
    end: "2025-10-13T15:00:00", 
    routeType: "export", 
    cargoType: "custom", 
    cargoLoad: "2025-10-11T05:00:00", 
    expected: { overnight: 2, dayOver: 2 } 
  },
  { 
    description: "၃၀။ Export Normal - 3ရက်နေ့ မနက် ၁၀နာရီ စပြီး 5ရက်နေ့ ညနေ 6နာရီခွဲမှာ ပြီးဆုံးသည်။ အသားအိပ် ၁ည နေ့ကျော် ၁ည", 
    start: "2025-08-03T10:00:00", 
    end: "2025-08-05T18:30:00", 
    routeType: "export", 
    cargoType: "normal", 
    cargoLoad: null, 
    expected: { overnight: 1, dayOver: 1 } 
  },
];

const DeveloperPage = ({ currentPage, setCurrentPage }) => {
    const [activeTab, setActiveTab] = useState('testing'); // 'testing' is the default tab
    const [testResults, setTestResults] = useState([]);

    const handleRunTests = () => {
        const results = [];
        testScenarios.forEach((scenario) => {
            const { description, start, end, routeType, cargoType, cargoLoad, expected } = scenario;
            
            const tripStartDateStr = start.substring(0, 10);
            const tripStartTimeStr = start.substring(11, 16);
            const tripEndDateStr = end.substring(0, 10);
            const tripEndTimeStr = end.substring(11, 16);
            const cargoLoadDateStr = cargoLoad ? cargoLoad.substring(0, 10) : null;
            const cargoLoadTimeStr = cargoLoad ? cargoLoad.substring(11, 16) : null;

            const actual = autoCalculateOvernightAndDayOver(
                tripStartDateStr,
                tripStartTimeStr,
                tripEndDateStr,
                tripEndTimeStr,
                routeType,
                cargoType,
                cargoLoadDateStr,
                cargoLoadTimeStr
            );

            const isPassed = actual.overnightStayCount === expected.overnight && actual.dayOverDelayedCount === expected.dayOver;
            
            results.push({
                description,
                expected,
                actual,
                isPassed
            });
        });
        setTestResults(results);
    };

    const passedCount = testResults.filter(r => r.isPassed).length;
    const failedCount = testResults.length - passedCount;

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '20px' }}>Developer Tools</h1>

            {/* Tabs for navigation */}
            <div style={{ borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
                <button 
                    onClick={() => setActiveTab('testing')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        backgroundColor: activeTab === 'testing' ? '#007bff' : 'transparent',
                        color: activeTab === 'testing' ? 'white' : 'black',
                        cursor: 'pointer',
                        borderTopLeftRadius: '5px',
                        borderTopRightRadius: '5px',
                        fontWeight: activeTab === 'testing' ? 'bold' : 'normal'
                    }}
                >
                    Testing
                </button>
                {/* Other tabs can go here if needed in the future */}
            </div>

            {activeTab === 'testing' && (
                <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
                    <h2 style={{ marginTop: '0' }}>အသားအိပ်နေ့ကျော် တွက်ချက်မှု စမ်းသပ်ခြင်း</h2>
                    <button 
                        onClick={handleRunTests}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            marginBottom: '20px'
                        }}
                    >
                        Run Tests
                    </button>

                    {testResults.length > 0 && (
                        <>
                            <p style={{ fontWeight: 'bold' }}>
                                <strong>စမ်းသပ်မှုစုစုပေါင်း:</strong> {testResults.length} | 
                                <strong>အောင်မြင်:</strong> <span style={{ color: 'green' }}>{passedCount}</span> | 
                                <strong>ကျရှုံး:</strong> <span style={{ color: 'red' }}>{failedCount}</span>
                            </p>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#e0e0e0' }}>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc' }}>#</th>
                                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc' }}>စမ်းသပ်မှုအခြေအနေ</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ccc' }}>မျှော်မှန်းထားသောရလဒ်</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ccc' }}>တကယ်ရရှိသောရလဒ်</th>
                                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #ccc' }}>အခြေအနေ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {testResults.map((result, index) => (
                                        <tr key={index} style={{ backgroundColor: result.isPassed ? '#f0fff0' : '#fff0f0' }}>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>{index + 1}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>{result.description}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>အသားအိပ်: {result.expected.overnight}, နေ့ကျော်: {result.expected.dayOver}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>အသားအိပ်: {result.actual.overnightStayCount}, နေ့ကျော်: {result.actual.dayOverDelayedCount}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', color: result.isPassed ? 'green' : 'red' }}>
                                                {result.isPassed ? '✅ အောင်မြင်' : '❌ ကျရှုံး'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default DeveloperPage;