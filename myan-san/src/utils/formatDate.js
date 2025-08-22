export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  
  // year string ရဲ့ နောက်ဆုံး ဂဏန်းနှစ်လုံးကိုပဲ ယူလိုက်ပါမယ်။
  const shortYear = year.slice(-2);
  
  // dd-mm-yy ပုံစံအတိုင်း စုစည်းလိုက်ပါမယ်။
  return `${day}.${month}.${shortYear}`;
};