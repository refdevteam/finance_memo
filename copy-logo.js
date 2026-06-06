const fs = require('fs');

const src = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\1af170df-ccb2-4f2c-be03-246aa17a635c\\fimo_logo_1780710969362.png';
const dest512 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-512.png';
const dest192 = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public\\icon-192.png';

try {
  fs.copyFileSync(src, dest512);
  fs.copyFileSync(src, dest192);
  console.log('Logo copied successfully!');
} catch (err) {
  console.error('Error copying logo:', err);
}
