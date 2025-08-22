// src/utils/calculations.js
import {
  isAfter,
  differenceInCalendarDays, // isSameDay လည်းပါရပါမယ်
  addDays,
  isSameDay
} from 'date-fns';

export const autoCalculateOvernightAndDayOver = (
  tripStartDateStr,
  tripStartTimeStr,
  tripEndDateStr,
  tripEndTimeStr,
  routeType,
  cargoLoadType, // မှတ်ချက်: ခင်ဗျားရဲ့ code မှာ formData.from, formData.to လို့ပါနေတဲ့အတွက် function arguments တွေရဲ့ အစီအစဉ် မှားနေနိုင်ပါတယ်။
  cargoLoadDateStr,
  cargoLoadTimeStr
) => {
  let overnightStayCount = 0;
  let dayOverDelayedCount = 0;

  if (
    !tripStartDateStr ||
    !tripStartTimeStr ||
    !tripEndDateStr ||
    !tripEndTimeStr
  ) {
    return { overnightStayCount: 0, dayOverDelayedCount: 0 };
  }

  try {
    const tripStartDateTime = new Date(`${tripStartDateStr}T${tripStartTimeStr}:00`);
    const tripEndDateTime = new Date(`${tripEndDateStr}T${tripEndTimeStr}:00`);
    
    let effectiveStartDateTimeForCalculation;

    if (routeType === "export") {
      if (cargoLoadType === "sameDay") {
        effectiveStartDateTimeForCalculation = tripStartDateTime;
      } else if (cargoLoadType === "custom") {
        if (!cargoLoadDateStr || !cargoLoadTimeStr) {
          effectiveStartDateTimeForCalculation = tripStartDateTime;
        } else {
          effectiveStartDateTimeForCalculation = new Date(`${cargoLoadDateStr}T${cargoLoadTimeStr}:00`);
        }
      } else if (cargoLoadType === "normal") {
        effectiveStartDateTimeForCalculation = addDays(tripStartDateTime, 1);
      }
    } else { // Import
      effectiveStartDateTimeForCalculation = tripStartDateTime;
    }
    
    if (isAfter(effectiveStartDateTimeForCalculation, tripEndDateTime)) {
        return { overnightStayCount: 0, dayOverDelayedCount: 0 };
    }

    // အသားအိပ်ရက်ကို မှန်ကန်စွာ တွက်ချက်ခြင်း
    const overnightDiff = differenceInCalendarDays(
      tripEndDateTime,
      effectiveStartDateTimeForCalculation
    );
    overnightStayCount = overnightDiff > 0 ? overnightDiff : 0;

    // Export Normal အတွက် logic ကို မှန်ကန်စွာ စစ်ဆေးခြင်း
    if (routeType === "export" && cargoLoadType === "normal") {
      const tripStartDate = new Date(tripStartDateTime.getFullYear(), tripStartDateTime.getMonth(), tripStartDateTime.getDate());
      const tripEndDate = new Date(tripEndDateTime.getFullYear(), tripEndDateTime.getMonth(), tripEndDateTime.getDate());
      if (isSameDay(tripStartDate, tripEndDate)) {
        overnightStayCount = 0;
        dayOverDelayedCount = 0;
      }
    }
    
    // Day Over (နေ့ကျော်) တွက်ချက်ခြင်း
    if (overnightStayCount > 0) {
        let cutoffTimeHour = routeType === "import" ? 13 : 14; 
        let cutoffTimeMinute = 30;
        
        const tripEndCutoff = new Date(tripEndDateTime.getFullYear(), tripEndDateTime.getMonth(), tripEndDateTime.getDate());
        tripEndCutoff.setHours(cutoffTimeHour, cutoffTimeMinute, 0, 0);

        if (isAfter(tripEndDateTime, tripEndCutoff)) {
            dayOverDelayedCount = overnightStayCount; 
        } else {
            dayOverDelayedCount = overnightStayCount - 1; 
        }
    } else {
        dayOverDelayedCount = 0;
    }

    return { overnightStayCount, dayOverDelayedCount };
  } catch (e) {
    console.error("Error in autoCalculateOvernightAndDayOver:", e);
    return { overnightStayCount: 0, dayOverDelayedCount: 0 };
  }
};