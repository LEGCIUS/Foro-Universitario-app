import { getToken, clearToken } from './token';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function getBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (!raw) {
    throw new Error('Falta EXPO_PUBLIC_API_URL (usa EXPO_PUBLIC_API_URL en tu entorno)');
  }
  return raw.replace(/\/+$/, '');
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>): string {
  const base = getBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${p}`);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  return url.toString();
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: Json;
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const auth = options.auth !== false;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const parsedBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

  if (!res.ok) {
    // Si el backend marca token inválido/expirado, limpiamos.
    if (res.status === 401) {
      await clearToken();
    }
    const message =
      (parsedBody && typeof parsedBody === 'object' && (parsedBody as any).message) ||
      (parsedBody && typeof parsedBody === 'object' && (parsedBody as any).error) ||
      `HTTP ${res.status}`;
    throw new ApiError(String(message), res.status, parsedBody);
  }

  return parsedBody as T;
}

type UploadImageResult = { url: string };

export async function uploadImage(file: { uri: string; name?: string; type?: string }): Promise<UploadImageResult> {
  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'image.jpg',
    type: file.type || 'image/jpeg',
  } as any);

  const res = await fetch(buildUrl('/upload/image'), {
    method: 'POST',
    headers,
    body: form,
  });

  const contentType = res.headers.get('content-type') || '';
  const parsedBody = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => '');

  if (!res.ok) {
    if (res.status === 401) await clearToken();
    const message =
      (parsedBody && typeof parsedBody === 'object' && (parsedBody as any).message) ||
      (parsedBody && typeof parsedBody === 'object' && (parsedBody as any).error) ||
      `HTTP ${res.status}`;
    throw new ApiError(String(message), res.status, parsedBody);
  }

  // Backend debe devolver { url }
  if (!parsedBody || typeof parsedBody !== 'object' || !(parsedBody as any).url) {
    throw new ApiError('Respuesta inválida en /upload/image (se esperaba { url })', 500, parsedBody);
  }

  return parsedBody as UploadImageResult;
}
