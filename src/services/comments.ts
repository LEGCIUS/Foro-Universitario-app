import { apiRequest } from './api';

export type CommentUser = {
  carnet: string;
  nombre?: string;
  apellido?: string;
  foto_perfil?: string | null;
};

export type Comment = {
  id: string | number;
  publicacion_id: string | number;
  usuario_carnet: string;
  texto: string;
  created_at?: string;
  likes_count?: number;
  user?: CommentUser;
};

export type Reply = {
  id: string | number;
  comentario_id: string | number;
  usuario_carnet: string;
  texto: string;
  created_at?: string;
  likes_count?: number;
  user?: CommentUser;
};

function normalizeComment(row: any): Comment {
  return {
    id: row?.id,
    publicacion_id: row?.publicacion_id ?? row?.postId,
    usuario_carnet: row?.usuario_carnet ?? row?.carnet ?? row?.userId,
    texto: row?.texto ?? row?.contenido ?? row?.message ?? '',
    created_at: row?.created_at,
    likes_count: row?.likes_count,
    user: row?.user,
  };
}

function normalizeReply(row: any): Reply {
  return {
    id: row?.id,
    comentario_id: row?.comentario_id ?? row?.commentId,
    usuario_carnet: row?.usuario_carnet ?? row?.carnet ?? row?.userId,
    texto: row?.texto ?? row?.contenido ?? row?.message ?? '',
    created_at: row?.created_at,
    likes_count: row?.likes_count,
    user: row?.user,
  };
}

export async function listComments(postId: string | number): Promise<Comment[]> {
  const qs = new URLSearchParams({ postId: String(postId) });
  const data = await apiRequest<any>(`/comments?${qs.toString()}`, { method: 'GET' });
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return rows.map(normalizeComment);
}

export async function createComment(postId: string | number, texto: string): Promise<Comment> {
  const data = await apiRequest<any>('/comments', {
    method: 'POST',
    body: { postId, texto },
  });
  return normalizeComment(data);
}

export async function deleteComment(commentId: string | number): Promise<void> {
  await apiRequest<void>(`/comments/${encodeURIComponent(String(commentId))}`, { method: 'DELETE' });
}

export async function listReplies(commentId: string | number): Promise<Reply[]> {
  const data = await apiRequest<any>(`/comments/${encodeURIComponent(String(commentId))}/replies`, { method: 'GET' });
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return rows.map(normalizeReply);
}

export async function createReply(commentId: string | number, texto: string): Promise<Reply> {
  const data = await apiRequest<any>(`/comments/${encodeURIComponent(String(commentId))}/replies`, {
    method: 'POST',
    body: { texto },
  });
  return normalizeReply(data);
}

export async function deleteReply(replyId: string | number): Promise<void> {
  await apiRequest<void>(`/comments/replies/${encodeURIComponent(String(replyId))}`, { method: 'DELETE' });
}
