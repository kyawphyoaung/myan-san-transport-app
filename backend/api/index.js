// Vercel အတွက် API တံခါးပေါက်။
// သင်ရေးထားတဲ့ Backend/server.js ထဲက express app ကို ဒီမှာ ခေါ်သုံးထားတာပါ။
const app = require('../backend/server.js');

// Vercel က ဒီ 'app' object ကိုပဲ Server အဖြစ် အသုံးပြုမှာပါ။
module.exports = app;
