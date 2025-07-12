// TRANSPORT/fontConverter.js
const fs = require('fs');
const path = require('path');

// NotoSansMyanmar-Regular.ttf ဖိုင်၏ တည်နေရာကို မှန်ကန်စွာ ထည့်သွင်းပါ။
// ဥပမာ: သင့်ရဲ့ font ဖိုင်ကို TRANSPORT/myan-san/src/assets/fonts ထဲမှာ ထားရင်
const fontPath = path.resolve(__dirname, 'myan-san', 'src', 'assets', 'fonts', 'NotoSansMyanmar-Regular.ttf');
const outputPath = path.resolve(__dirname, 'myan-san', 'src', 'utils', 'NotoSansMyanmarBase64.js');

fs.readFile(fontPath, { encoding: 'base64' }, (err, data) => {
  if (err) {
    console.error('Error reading font file:', err);
    return;
  }

  const jsContent = `export const NotoSansMyanmarBase64 = '${data}';`;

  fs.writeFile(outputPath, jsContent, (err) => {
    if (err) {
      console.error('Error writing output file:', err);
      return;
    }
    console.log('NotoSansMyanmar-Regular.ttf has been converted to Base64 and saved to NotoSansMyanmarBase64.js');
    console.log('File saved at:', outputPath);
  });
});