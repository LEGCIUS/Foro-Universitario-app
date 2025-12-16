import { apiRequest } from './api';
import { setToken, clearToken } from './token';

type LoginResponse = {
  token?: string;
  access_token?: string;
  user?: any;
};

export async function loginWithCarnet(payload: { carnet: string; password: string }) {
  const data = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      carnet: String(payload.carnet).trim(),
      password: payload.password,
    },
    auth: false,
  });

  const token = data.token || data.access_token;
  if (!token) {
    throw new Error('Respuesta inválida del login (no viene token)');
  }

  await setToken(token);
  return { token, user: data.user };
}

export async function register(payload: {
  carnet: string;
  nombre: string;
  apellido: string;
  correo: string;
  carrera?: string | null;
}) {
  // El backend decide si genera contraseña o requiere una.
  return apiRequest('/auth/register', {
    method: 'POST',
    body: {
      carnet: String(payload.carnet).trim(),
      nombre: String(payload.nombre).trim(),
      apellido: String(payload.apellido).trim(),
      correo: String(payload.correo).trim().toLowerCase(),
      carrera: payload.carrera ? String(payload.carrera).trim() : null,
    },
    auth: false,
  });
}

export async function logout() {
  await clearToken();
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiRequest<void>('/users/me/password', {
    method: 'PUT',
    body: input,
  });
}
