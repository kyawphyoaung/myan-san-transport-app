export const myformatDate = (dateString) => {
    // dateString ကနေ Date object တစ်ခု တည်ဆောက်ပါ
    const date = new Date(dateString);

    // Month နာမည်တွေကို array ထဲ ထည့်ထားပါ
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // date, month, year တွေကို ထုတ်ယူပါ
    const day = date.getDate().toString().padStart(2, '0');
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    // လိုချင်တဲ့ format အတိုင်း ပြန်ပေါင်းစပ်ပါ
    return `${day}/${month}/${year}`;
};