import { apiRequest } from './api';

export type MeUser = {
  carnet: string;
  nombre?: string;
  apellido?: string;
  correo?: string;
  carrera?: string | null;
  foto_perfil?: string | null;
  biografia?: string | null;
  rol?: string | null;
  is_admin?: boolean | string | number | null;
};

export async function getMe(): Promise<MeUser> {
  return apiRequest<MeUser>('/users/me', { method: 'GET' });
}

export async function updateMeProfile(input: {
  nombre?: string;
  apellido?: string;
  correo?: string;
  carrera?: string | null;
  biografia?: string | null;
  foto_perfil?: string | null;
}): Promise<MeUser> {
  return apiRequest<MeUser>('/users/me', {
    method: 'PATCH',
    body: input,
  });
}

export async function getUserByCarnet(carnet: string): Promise<MeUser> {
  return apiRequest<MeUser>(`/users/${encodeURIComponent(carnet)}`, { method: 'GET' });
}

export async function searchUsers(query: string): Promise<MeUser[]> {
  const qs = new URLSearchParams({ q: query });
  return apiRequest<MeUser[]>(`/users/search?${qs.toString()}`, { method: 'GET' });
}
