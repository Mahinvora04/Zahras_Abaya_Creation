const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const apiOrigin = new URL(apiBaseUrl, 'http://localhost:5173').origin;

export default function mediaUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/uploads/')) return new URL(value, apiOrigin).toString();
  return value;
}
