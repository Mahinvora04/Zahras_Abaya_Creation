const { ObjectId } = require('mongodb');

const oid = (value) =>
  ObjectId.isValid(String(value || '')) ? new ObjectId(String(value)) : null;

function json(value) {
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(json);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, json(item)]));
  }
  return value;
}

function userJson(user) {
  const result = json(user);
  if (result) {
    delete result.password;
    delete result.google_sub;
  }
  return result;
}

const safeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { json, oid, safeRegex, userJson };
