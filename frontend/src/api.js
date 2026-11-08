export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export async function request(path, { token, body, method = 'GET', key, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'omit',
      cache: 'no-store',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('We could not connect. Check your connection and try again.', 0);
  }
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Something went wrong. Please try again.', response.status);
  }
  if (!response.ok) {
    // Only known, authored API messages are surfaced. Unexpected responses stay generic.
    const message =
      response.status >= 500
        ? 'Something went wrong. Please try again.'
        : data.error?.message || 'The request could not be completed.';
    throw new ApiError(message, response.status, data.error?.details || []);
  }
  return data;
}
export const money = (cents = 0) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(cents / 100);
export const date = (value) =>
  new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(value));
export const categories = [
  { id: 'design', label: 'Design & creative' },
  { id: 'development', label: 'Development' },
  { id: 'writing', label: 'Writing & translation' },
  { id: 'marketing', label: 'Digital marketing' },
  { id: 'business', label: 'Business' },
];
