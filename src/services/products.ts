import { apiRequest } from './api';

export type Product = {
  id: string | number;
  nombre: string;
  descripcion?: string;
  precio?: number;
  categoria?: string;
  foto_url?: string[];
  nombre_vendedor?: string;
  telefono?: string;
  mensaje_whatsapp?: string;
  hora_inicio_venta?: string | null;
  usuario_carnet?: string;
};

export async function listProducts(): Promise<Product[]> {
  return apiRequest<Product[]>('/products', { method: 'GET' });
}

export async function getProduct(id: string | number): Promise<Product> {
  return apiRequest<Product>(`/products/${encodeURIComponent(String(id))}`, { method: 'GET' });
}

export async function createProduct(input: Omit<Product, 'id'>): Promise<Product> {
  return apiRequest<Product>('/products', { method: 'POST', body: input });
}

export async function updateProduct(id: string | number, input: Partial<Omit<Product, 'id'>>): Promise<Product> {
  return apiRequest<Product>(`/products/${encodeURIComponent(String(id))}`, { method: 'PATCH', body: input });
}

export async function deleteProduct(id: string | number): Promise<void> {
  await apiRequest<void>(`/products/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
}

export async function reportProduct(id: string | number, input: { motivo: string; detalle?: string }): Promise<void> {
  await apiRequest<void>(`/products/${encodeURIComponent(String(id))}/report`, { method: 'POST', body: input });
}
