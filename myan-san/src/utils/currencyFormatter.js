// myan-san/src/utils/currencyFormatter.js

export const formatMMK = (amount) => {
  if (isNaN(amount) || amount === null || amount === '') {
    return '';
  }
  const num = parseInt(amount, 10); // Ensure integer for unit breakdown
  if (num === 0) return '0 ကျပ်';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  let parts = [];
  let remaining = absNum;

  // Define units in descending order of value
  const units = [
    { value: 100000, name: 'သိန်း' }, // 1 သိန်း = 100,000
    { value: 10000, name: 'သောင်း' }, // 1 သောင်း = 10,000
    { value: 1000, name: 'ထောင်' },  // 1 ထောင် = 1,000
    { value: 1, name: 'ကျပ်' }     // 1 ကျပ် = 1
  ];

  for (const unit of units) {
    if (remaining >= unit.value) {
      const count = Math.floor(remaining / unit.value);
      if (count > 0) { // Only add if count is greater than 0
        parts.push(`${count.toLocaleString()} ${unit.name}`);
        remaining %= unit.value;
      }
    }
  }

  // If the number was less than 1000 and no other units were added, just show in Kyats
  if (absNum < 1000 && parts.length === 0) {
    return `${sign}${absNum.toLocaleString()} ကျပ်`;
  }

  // If there's a remaining amount (e.g., 45200 -> 4 သောင်း 5 ထောင် 200 ကျပ်)
  // This should be handled by the 'ကျပ်' unit if it's the last unit.
  // However, if the remaining is not 0 after processing 'ထောင်', it means it's less than 1000.
  // So, if remaining > 0 at this point, it must be the 'ကျပ်' amount that wasn't fully captured by larger units.
  if (remaining > 0 && units.every(u => remaining < u.value || u.name === 'ကျပ်')) {
      // This condition ensures we only add 'ကျပ်' if it's the leftover amount not fitting into larger units
      // and if it wasn't already handled by the explicit 'ကျပ်' unit in the loop (which it should be if value is 1)
      // A safer check is if the last part is not 'ကျပ်' and there's remaining
      if (parts.length > 0 && parts[parts.length - 1].indexOf('ကျပ်') === -1 && remaining > 0) {
          parts.push(`${remaining.toLocaleString()} ကျပ်`);
      } else if (parts.length === 0 && remaining > 0) { // For numbers like 500
          parts.push(`${remaining.toLocaleString()} ကျပ်`);
      }
  }


  return sign + parts.join(' '); // Join with space for readability "4 သောင်း 5 ထောင်"
};