const crypto = require('crypto');

function normalizePhone(phone) {
  if (!phone) return null;
  let p = String(phone).replace(/[^0-9+]/g, '');
  if (p.startsWith('+251')) p = '0' + p.substring(4);
  else if (p.startsWith('251')) p = '0' + p.substring(3);
  else if (p.startsWith('9') && p.length === 9) p = '0' + p;
  return p;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateReferralCode(telegramId) {
  const base = telegramId ? String(telegramId).slice(-6) : Math.random().toString(36).substring(2, 8).toUpperCase();
  return ('BX' + base).slice(0, 10);
}

function generateCartellaNumbers() {
  function getRandomUnique(min, max, count) {
    const nums = [];
    while (nums.length < count) {
      const r = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!nums.includes(r)) nums.push(r);
    }
    return nums;
  }

  const b = getRandomUnique(1, 15, 5);
  const i = getRandomUnique(16, 30, 5);
  const n = getRandomUnique(31, 45, 4);
  const g = getRandomUnique(46, 60, 5);
  const o = getRandomUnique(61, 75, 5);

  return [
    [b[0], i[0], n[0], g[0], o[0]],
    [b[1], i[1], n[1], g[1], o[1]],
    [b[2], i[2], 'FREE', g[2], o[2]],
    [b[3], i[3], n[2], g[3], o[3]],
    [b[4], i[4], n[3], g[4], o[4]]
  ];
}

module.exports = {
  normalizePhone,
  escapeHTML,
  generateReferralCode,
  generateCartellaNumbers
};
