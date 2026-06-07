const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\1af170df-ccb2-4f2c-be03-246aa17a635c';
const srcLogo = path.join(baseDir, 'media__1780856774634.png');
const srcMascot = path.join(baseDir, 'media__1780856779571.png');

const destDir = 'd:\\Data\\My SSD\\Documents\\My-Project\\fimo\\finance_memo\\public';
const destLogo = path.join(destDir, 'logo-circle.png');
const destMascot = path.join(destDir, 'mascot.png');
const dest512 = path.join(destDir, 'icon-512.png');
const dest192 = path.join(destDir, 'icon-192.png');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (fs.existsSync(srcLogo)) {
    fs.copyFileSync(srcLogo, destLogo);
    fs.copyFileSync(srcLogo, dest512);
    fs.copyFileSync(srcLogo, dest192);
    console.log('✅ Berhasil menyalin Logo baru ke folder public/');
  } else {
    console.error('❌ File sumber Logo tidak ditemukan di:', srcLogo);
  }

  if (fs.existsSync(srcMascot)) {
    fs.copyFileSync(srcMascot, destMascot);
    console.log('✅ Berhasil menyalin Mascot baru ke folder public/');
  } else {
    console.error('❌ File sumber Mascot tidak ditemukan di:', srcMascot);
  }
} catch (error) {
  console.error('❌ Gagal menyalin file:', error);
}
