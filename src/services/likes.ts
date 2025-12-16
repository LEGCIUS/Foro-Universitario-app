import { apiRequest } from './api';

export type LikeState = {
  liked: boolean;
  count: number;
};

function normalizeLikeState(data: any): LikeState {
  const liked = Boolean(data?.liked ?? data?.isLiked ?? data?.likedByMe ?? false);
  const countRaw = data?.count ?? data?.likes_count ?? data?.likesCount;
  const count = Number.isFinite(Number(countRaw)) ? Number(countRaw) : 0;
  return { liked, count };
}

export async function getPostLikeState(postId: string | number): Promise<LikeState> {
  const qs = new URLSearchParams({ postId: String(postId) });
  const data = await apiRequest<any>(`/likes/state?${qs.toString()}`, { method: 'GET' });
  return normalizeLikeState(data);
}

export async function likePost(postId: string | number): Promise<LikeState> {
  const data = await apiRequest<any>('/likes', {
    method: 'POST',
    body: { postId },
  });
  return normalizeLikeState(data);
}

export async function unlikePost(postId: string | number): Promise<LikeState> {
  const qs = new URLSearchParams({ postId: String(postId) });
  const data = await apiRequest<any>(`/likes?${qs.toString()}`, {
    method: 'DELETE',
  });
  return normalizeLikeState(data);
}

// Comentarios
export async function getCommentLikeState(commentId: string | number): Promise<LikeState> {
  const qs = new URLSearchParams({ commentId: String(commentId) });
  const data = await apiRequest<any>(`/likes/comments/state?${qs.toString()}`, { method: 'GET' });
  return normalizeLikeState(data);
}

export async function likeComment(commentId: string | number): Promise<LikeState> {
  const data = await apiRequest<any>('/likes/comments', {
    method: 'POST',
    body: { commentId },
  });
  return normalizeLikeState(data);
}

export async function unlikeComment(commentId: string | number): Promise<LikeState> {
  const qs = new URLSearchParams({ commentId: String(commentId) });
  const data = await apiRequest<any>(`/likes/comments?${qs.toString()}`, { method: 'DELETE' });
  return normalizeLikeState(data);
}

// Respuestas
export async function getReplyLikeState(replyId: string | number): Promise<LikeState> {
  const qs = new URLSearchParams({ replyId: String(replyId) });
  const data = await apiRequest<any>(`/likes/replies/state?${qs.toString()}`, { method: 'GET' });
  return normalizeLikeState(data);
}

export async function likeReply(replyId: string | number): Promise<LikeState> {
  const data = await apiRequest<any>('/likes/replies', {
    method: 'POST',
    body: { replyId },
  });
  return normalizeLikeState(data);
}

export async function unlikeReply(replyId: string | number): Promise<LikeState> {
  const qs = new URLSearchParams({ replyId: String(replyId) });
  const data = await apiRequest<any>(`/likes/replies?${qs.toString()}`, { method: 'DELETE' });
  return normalizeLikeState(data);
}
