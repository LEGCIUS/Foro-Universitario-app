import { apiRequest } from './api';

export type AdminReport = {
  id: string | number;
  tipo_reporte: 'publicacion' | 'producto' | string;
  created_at: string;
  motivo?: string;
  detalle?: string;
  publicacion_id?: string | number;
  producto_id?: string | number;
  id_contenido?: string | number;
  carnet_reporta?: string;
  usuario_reportante?: string;
  carnet_publica?: string;
  usuario_publica?: string;
  estado?: string;
  // Campos legacy opcionales
  motivo_original?: string;
  tabla_origen?: string;
};

function normalizeReport(row: any): AdminReport {
  const tipo = row?.tipo_reporte || row?.type || row?.tipo || 'publicacion';
  return {
    ...row,
    id: row?.id,
    tipo_reporte: tipo,
    created_at: row?.created_at || row?.fecha || new Date().toISOString(),
    publicacion_id: row?.publicacion_id ?? row?.postId ?? row?.contentId,
    producto_id: row?.producto_id ?? row?.productId,
    id_contenido: row?.id_contenido,
    motivo: row?.motivo,
    detalle: row?.detalle,
    carnet_reporta: row?.carnet_reporta,
    usuario_reportante: row?.usuario_reportante,
    carnet_publica: row?.carnet_publica,
    usuario_publica: row?.usuario_publica,
    estado: row?.estado,
    motivo_original: row?.motivo_original,
    tabla_origen: row?.tabla_origen,
  };
}

export async function listAdminReports(params?: { limit?: number }): Promise<AdminReport[]> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));

  const data = await apiRequest<any>(`/admin/reports${qs.toString() ? `?${qs.toString()}` : ''}`, { method: 'GET' });
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return rows.map(normalizeReport);
}

export async function deleteAdminReport(reportId: string | number): Promise<void> {
  await apiRequest<void>(`/admin/reports/${encodeURIComponent(String(reportId))}`, { method: 'DELETE' });
}

export async function adminDeleteContent(input: {
  contentType: 'publicacion' | 'producto';
  contentId: string | number;
  reportId?: string | number;
  motivo: string;
  detalle: string;
  base_reglamentaria?: string | null;
  enlace?: string | null;
}): Promise<void> {
  await apiRequest<void>('/admin/moderation/delete', {
    method: 'POST',
    body: input,
  });
}
