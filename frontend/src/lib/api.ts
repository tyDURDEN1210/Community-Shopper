const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL =
  configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : '/api/v1';

let memoryToken: string | null = localStorage.getItem('cc_token');

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  if (token) {
    localStorage.setItem('cc_token', token);
  } else {
    localStorage.removeItem('cc_token');
  }
}

export function getAuthToken(): string | null {
  return memoryToken;
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'CampusCart');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (memoryToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    const message =
      payload?.error?.message || `Request failed with status ${response.status}`;
    const code = payload?.error?.code || 'API_ERROR';
    const details = payload?.error?.details;
    throw new ApiClientError(message, response.status, code, details);
  }

  return payload.data as T;
}
