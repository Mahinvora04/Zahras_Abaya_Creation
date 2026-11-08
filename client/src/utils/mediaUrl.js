import { API_ORIGIN } from './apiBaseUrl';

export default function mediaUrl(value) {
  if (typeof value !== 'string' || !value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('/uploads/')) return new URL(value, API_ORIGIN).toString();
  return value;
}
