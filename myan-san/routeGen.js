// Node.js file system module ကို အသုံးပြုပါ
const fs = require('fs');

// ပေးထားသော routes အုပ်စုများ
const groupedRoutes = {
  "ဆိပ်ကမ်းများ (Ports)": [
    { "id": 1, "route": "အေးရှားဝေါ" },
    { "id": 2, "route": "MIP" },
    { "id": 3, "route": "သီလဝါ" }
  ],
  "English Routes": [
    { "id": 4, "route": "RG" },
    { "id": 5, "route": "RGL/KL-SPT-RGL/KL" },
    { "id": 6, "route": "SEZ/Thilawar Zone" }
  ],
  "ဂ": [
    { "id": 7, "route": "ဂန္ဒီ" }
  ],
  "စ": [
    { "id": 8, "route": "စက်ဆန်း" },
    { "id": 9, "route": "စော်ဘွားကြီးကုန်း" },
    { "id": 10, "route": "ဆင်မလိုက်" },
    { "id": 11, "route": "ဆားမလောက်" }
  ],
  "တ": [
    { "id": 12, "route": "တိုက်ကြီး" },
    { "id": 13, "route": "တောင်ဒဂုံ(ဇုံ ၁/၂/၃)" },
    { "id": 14, "route": "တောင်ဥက္ကလာပ" }
  ],
  "ထ": [
    { "id": 15, "route": "ထန်းတပင်" },
    { "id": 16, "route": "ထောက်ကြန့်" }
  ],
  "ဒ": [
    { "id": 17, "route": "ဒဂုံဆိပ်ကမ်း" }
  ],
  "န": [
    { "id": 18, "route": "ညောင်တန်း" }
  ],
  "ပ": [
    { "id": 19, "route": "ပျဥ်းမပင်" },
    { "id": 20, "route": "ပုစွန်တောင်စျေး" },
    { "id": 21, "route": "ပုလဲလမ်းဆုံ" },
    { "id": 22, "route": "ပဲခူး(မြို့ရှောင်လမ်းအတွင်း)" },
    { "id": 23, "route": "ပဲခူး(မြို့ရှောင်လမ်းအကျော်)" }
  ],
  "ဖ": [
    { "id": 24, "route": "ဖော့ကန်" }
  ],
  "ဘ": [
    { "id": 25, "route": "ဘုရင့်နောင်" }
  ],
  "ဗ": [
    { "id": 26, "route": "ဗိုလ်တထောင်" }
  ],
  "မ": [
    { "id": 27, "route": "မင်္ဂလာဒုံ" },
    { "id": 28, "route": "မြစိမ်းရောင်" },
    { "id": 29, "route": "မြောင်းတကာ" },
    { "id": 30, "route": "မြောက်ဒဂုံ" },
    { "id": 31, "route": "မြောက်ဥက္ကလာပ" },
    { "id": 32, "route": "မှော်ဘီ" }
  ],
  "ရ": [
    { "id": 33, "route": "ရွာသာကြီး" },
    { "id": 34, "route": "ရွှေပြည်သာ" },
    { "id": 35, "route": "ရွှေပေါက်ကံ" },
    { "id": 36, "route": "ရွှေသန်လျင်" },
    { "id": 37, "route": "ရွှေလင်ဗန်း" }
  ],
  "လ": [
    { "id": 38, "route": "လှည်းကူး" },
    { "id": 39, "route": "လှိုင်သာယာ(Zone-1,2,3,4)" },
    { "id": 40, "route": "လှိုင်သာယာ(Zone-5)" },
    { "id": 41, "route": "လှော်ကား" }
  ],
  "သ": [
    { "id": 42, "route": "သာကေတ" },
    { "id": 43, "route": "သာဓုကန်" },
    { "id": 44, "route": "သန်လျင်" },
    { "id": 45, "route": "သရက်ပင်ချောင်" }
  ],
  "ဝ": [
    { "id": 46, "route": "ဝါးတရာ" }
  ],
  "အ": [
    { "id": 47, "route": "အင်းစိန်" },
    { "id": 48, "route": "အင်းတကော်" },
    { "id": 49, "route": "အနော်ရထာ" },
    { "id": 50, "route": "အနောက်ပိုင်းတက္ကသိုလ်" },
    { "id": 51, "route": "အလုံ" },
    { "id": 52, "route": "အောင်ဆန်း" },
    { "id": 53, "route": "အရှေ့ဒဂုံ" }
  ]
};

// ပေးထားသော empty locations များ
const emptyLocationData = [
  { "id": 1, "location": "TKT (5Star)", "charge_40_ft": 45000 },
  { "id": 2, "location": "DIL", "charge_40_ft": 60000 },
  { "id": 2, "location": "ICH", "charge_40_ft": 60000 },
  { "id": 3, "location": "ရွာသာကြီး", "charge_40_ft": 100000 },
  { "id": 3, "location": "RG", "charge_40_ft": 100000 },
  { "id": 4, "location": "သီလဝါ(MITT)", "charge_40_ft": 150000 },
  { "id": 5, "location": "MIP", "charge_40_ft": 30000 },
  { "id": 5, "location": "MEC", "charge_40_ft": 30000 },
  { "id": 5, "location": "Asia World", "charge_40_ft": 30000 },
  { "id": 6, "location": "SML", "charge_40_ft": 45000 },
  { "id": 7, "location": "HTY(HICD/EverGreen)", "charge_40_ft": 70000 },
  { "id": 7, "location": "AZL", "charge_40_ft": 70000 },
  { "id": 7, "location": "ဖော့ကန်(HLA)", "charge_40_ft": 85000 },
  { "id": 9, "location": "HTY(MYCO မုတ္တမ)", "charge_40_ft": 100000 },
  { "id": 9, "location": "HTY(ရွှေလင်ဗန်း)", "charge_40_ft": 100000 },
];

// routes အားလုံးကို တစ်ခုတည်းသော array အဖြစ်ပြောင်းလဲပါ
const allRoutes = Object.values(groupedRoutes).flatMap(group => 
  group.map(item => item.route)
);

const allEmptyLocations = emptyLocationData.map(item => item.location);

const uniqueRoutes = [...new Set(allRoutes)];
const uniqueEmptyLocations = [...new Set(allEmptyLocations)];

// // ဆိပ်ကမ်းများ အဖြစ် သတ်မှတ်ထားတဲ့ နေရာတွေကို ဖယ်ထုတ်ပါ
const portLocations = groupedRoutes["ဆိပ်ကမ်းများ (Ports)"].map(item => item.route);

// // ဖြစ်နိုင်ခြေရှိတဲ့ trip routes အားလုံးကို generate လုပ်ပါ
const allPossibleTrips = [];

for (const origin of uniqueRoutes) {
  for (const destination of uniqueRoutes) {
    if (origin === destination) {
      continue; // origin နဲ့ destination တူရင် ကျော်သွားပါ
    }

    // လားရာ ဆန့်ကျင်ဘက် logic
    const isOriginPort = portLocations.includes(origin);
    const isDestinationPort = portLocations.includes(destination);

    // main trip က port ကနေ စပြီး destination က port မဟုတ်တဲ့အခါ empty location က port ဖြစ်နေရင် ဆန့်ကျင်ဘက်လို့ ယူဆပြီး ထည့်သွင်းခြင်းမပြုပါ
    if (isOriginPort && !isDestinationPort) {
        for (const emptyLocation of uniqueEmptyLocations) {
            if (!portLocations.includes(emptyLocation)) {
                allPossibleTrips.push({
                    "main_trip_origin": origin,
                    "main_trip_destination": destination,
                    "empty_location": emptyLocation
                });
            }
        }
    } else {
        // အခြား trip ပုံစံများအတွက်တော့ စည်းမျဉ်းမရှိဘဲ အားလုံးကို ထည့်ပါ
        for (const emptyLocation of uniqueEmptyLocations) {
            allPossibleTrips.push({
                "main_trip_origin": origin,
                "main_trip_destination": destination,
                "empty_location": emptyLocation
            });
        }
    }
  }
}
// // JSON ဖိုင်အဖြစ် သိမ်းဆည်းမယ့် code ရဲ့အပေါ်မှာ ထည့်ပါ
// console.log('Generated trip count:', allPossibleTrips.length);

// // JSON ဖိုင်အဖြစ် သိမ်းဆည်းပါ
// const jsonContent = JSON.stringify(allPossibleTrips, null, 2);
// fs.writeFileSync('all_possible_trips.json', jsonContent, 'utf8');

// console.log('Filtered JSON file has been generated successfully as all_possible_trips.json!');


// ဆိပ်ကမ်းများ အဖြစ် သတ်မှတ်ထားတဲ့ နေရာတွေကို ရယူပါ
const portLocations_set = new Set(groupedRoutes["ဆိပ်ကမ်းများ (Ports)"].map(item => item.route));

// လားရာတူတဲ့ trips နဲ့ လားရာဆန့်ကျင်ဘက်ဖြစ်တဲ့ trips တွေကို ခွဲခြားသိမ်းဆည်းမယ့် array များ
const normalDirectionTrips = [];
const oppositeDirectionTrips = [];

for (const trip of allPossibleTrips) {
    const isOriginPort = portLocations_set.has(trip.main_trip_origin);
    const isDestinationPort = portLocations_set.has(trip.main_trip_destination);
    const isEmptyLocationPort = portLocations_set.has(trip.empty_location);

    // Logic: Port ကနေ Non-Port ကိုသွားပြီး empty pickup က Port မှာဆိုရင် လားရာဆန့်ကျင်ဘက်လို့ ယူဆပါ
    if (isOriginPort && !isDestinationPort && isEmptyLocationPort) {
        oppositeDirectionTrips.push(trip);
    } 
    // Logic: Non-Port ကနေ Port ကိုသွားပြီး empty pickup က Port မဟုတ်ရင် လားရာဆန့်ကျင်ဘက်လို့ ယူဆပါ
    else if (!isOriginPort && isDestinationPort && !isEmptyLocationPort) {
        oppositeDirectionTrips.push(trip);
    }
    else {
        normalDirectionTrips.push(trip);
    }
}

// ရလဒ် အရေအတွက်ကို console မှာ ပြသပါ
console.log('Total Generated Routes:', allPossibleTrips.length);
console.log('-------------------------------------------');
console.log('Normal Direction Trips:', normalDirectionTrips.length);
console.log('Opposite Direction Trips:', oppositeDirectionTrips.length);

// ရလဒ်တွေကို လိုချင်ရင် JSON ဖိုင်အဖြစ် ထုတ်ပါ
const normalJson = JSON.stringify(normalDirectionTrips, null, 2);
fs.writeFileSync('normal_trips.json', normalJson, 'utf8');

const oppositeJson = JSON.stringify(oppositeDirectionTrips, null, 2);
fs.writeFileSync('opposite_trips.json', oppositeJson, 'utf8');

console.log('Separate JSON files for normal and opposite trips have been generated!');