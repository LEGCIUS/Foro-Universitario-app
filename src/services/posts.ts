import { apiRequest } from './api';

export type Post = {
  id: string | number;
  titulo: string;
  archivo_url?: string | null;
  contenido?: string | null;
  fecha_publicacion?: string;
  carnet_usuario?: string;
  etiquetas?: string[];
  likes_count?: number;
  comments_count?: number;
};

export async function listPosts(): Promise<Post[]> {
  return apiRequest<Post[]>('/posts', { method: 'GET' });
}

export async function getPost(id: string | number): Promise<Post> {
  return apiRequest<Post>(`/posts/${encodeURIComponent(String(id))}`, { method: 'GET' });
}

export async function createPost(input: {
  titulo: string;
  archivo_url?: string | null;
  contenido?: string | null;
  etiquetas?: string[];
}): Promise<Post> {
  return apiRequest<Post>('/posts', {
    method: 'POST',
    body: input,
  });
}

export async function deletePost(id: string | number): Promise<void> {
  await apiRequest<void>(`/posts/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  });
}

export async function reportPost(id: string | number, input: { motivo: string; detalle?: string }): Promise<void> {
  await apiRequest<void>(`/posts/${encodeURIComponent(String(id))}/report`, {
    method: 'POST',
    body: input,
  });
}
