import { apiRequest } from './api';

export type Notification = {
  id: string | number;
  carnet?: string;
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  data?: any;
  created_at?: string;
  leido?: boolean;
};

function normalizeNotification(row: any): Notification {
  return {
    id: row?.id,
    carnet: row?.carnet,
    tipo: row?.tipo,
    titulo: row?.titulo,
    mensaje: row?.mensaje,
    data: row?.data,
    created_at: row?.created_at,
    leido: row?.leido,
  };
}

export async function listNotifications(params?: {
  tipo?: string;
  unread?: boolean;
  limit?: number;
}): Promise<Notification[]> {
  const qs = new URLSearchParams();
  if (params?.tipo) qs.set('tipo', params.tipo);
  if (params?.unread !== undefined) qs.set('unread', params.unread ? 'true' : 'false');
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));

  const data = await apiRequest<any>(`/notifications${qs.toString() ? `?${qs.toString()}` : ''}`, { method: 'GET' });
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return rows.map(normalizeNotification);
}

export async function markNotificationRead(id: string | number): Promise<void> {
  await apiRequest<void>(`/notifications/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: { leido: true },
  });
}
