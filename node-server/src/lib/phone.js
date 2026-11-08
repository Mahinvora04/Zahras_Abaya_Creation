function normalizePhone(value) {
  let compact = String(value).trim().replace(/[ ()-.]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;

  let digits;
  if (compact.startsWith('+91')) digits = compact.slice(3);
  else if (compact.startsWith('+')) digits = null;
  else if (compact.startsWith('91') && compact.length === 12) digits = compact.slice(2);
  else digits = compact;

  if (!digits || !/^[6-9][0-9]{9}$/.test(digits)) {
    throw Object.assign(new Error('Enter a valid 10-digit Indian mobile number'), { status: 400 });
  }
  return `+91${digits}`;
}

module.exports = { normalizePhone };
