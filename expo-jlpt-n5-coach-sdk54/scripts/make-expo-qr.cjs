const fs = require('fs');
const path = require('path');
const QRCode = require('../node_modules/qrcode-terminal/vendor/QRCode');
const QRErrorCorrectLevel = require('../node_modules/qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel');

const value = process.argv[2] ?? 'exp://172.20.10.2:8082';
const qr = new QRCode(-1, QRErrorCorrectLevel.M);
qr.addData(value);
qr.make();

const count = qr.getModuleCount();
const scale = 12;
const margin = 4;
const size = (count + margin * 2) * scale;
let rects = '';

for (let row = 0; row < count; row += 1) {
  for (let col = 0; col < count; col += 1) {
    if (qr.isDark(row, col)) {
      rects += `<rect x="${(col + margin) * scale}" y="${(row + margin) * scale}" width="${scale}" height="${scale}"/>`;
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
const out = path.resolve('expo-go-qr.svg');
fs.writeFileSync(out, svg);
console.log(out);
