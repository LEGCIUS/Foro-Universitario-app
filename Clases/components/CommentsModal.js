import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, Image, StyleSheet, Dimensions, Pressable, Alert } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { ApiError } from '../../src/services/api';
import { getMe } from '../../src/services/users';
import { createReply, deleteReply, listReplies } from '../../src/services/comments';
import {
  getCommentLikeState,
  getReplyLikeState,
  likeComment,
  likeReply,
  unlikeComment,
  unlikeReply,
} from '../../src/services/likes';

/*
  Props:
  - visible: boolean
  - darkMode: boolean
  - comments: [{ id, usuario, displayName, avatarUrl, texto, created_at, likes_count }]
  - commentCount: number
  - newComment: string
  - onChangeNewComment: fn
  - onSubmitNewComment: fn
  - onRequestClose: fn
  - meCarnet: string | null
  - onPressAvatar: (carnetUsuario) => void
  - onLongPressComment: (commentObj) => void
*/

export default function CommentsModal({
  visible,
  darkMode = false,
  comments = [],
  commentCount = 0,
  newComment = '',
  onChangeNewComment,
  onSubmitNewComment,
  onRequestClose,
  meCarnet,
  onPressAvatar,
  onLongPressComment,
}) {
  const styles = createStyles(darkMode);
  
  // Estado para manejar likes localmente
  const [commentLikes, setCommentLikes] = useState({});
  const [likedByMe, setLikedByMe] = useState({});
  const [myCarnet, setMyCarnet] = useState(null);
  
  // Estado para respuestas
  const [replies, setReplies] = useState({}); // { comentario_id: [respuesta1, respuesta2, ...] }
  const [replyingTo, setReplyingTo] = useState(null); // { id, displayName } del comentario al que se responde
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState({}); // { comentario_id: boolean }
  
  // Estado para likes de respuestas
  const [replyLikes, setReplyLikes] = useState({}); // { respuesta_id: count }
  const [replyLikedByMe, setReplyLikedByMe] = useState({}); // { respuesta_id: boolean }

  // Modal estilizado para eliminar respuesta
  const [deleteReplyModalVisible, setDeleteReplyModalVisible] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState(null);

  // Asegurar carnet disponible aunque el padre no lo pase aún
  useEffect(() => {
    const ensureCarnet = async () => {
      try {
        if (!meCarnet && visible && !myCarnet) {
          const me = await getMe();
          if (me?.carnet) setMyCarnet(me.carnet);
        }
      } catch (e) {
        // noop
      }
    };
    ensureCarnet();
  }, [visible, meCarnet, myCarnet]);

  // Cargar likes cuando cambian los comentarios o se abre el modal
  useEffect(() => {
    if (visible && comments.length > 0) {
      loadLikesForComments();
      loadRepliesForComments();
    }
  }, [visible, comments, meCarnet, myCarnet]);

  const loadLikesForComments = async () => {
    try {
      const commentIds = comments.map(c => c.id).filter(Boolean);
      if (commentIds.length === 0) return;

      const likesMap = {};
      const myLikesMap = {};

      const results = await Promise.allSettled(
        commentIds.map(async (id) => {
          const state = await getCommentLikeState(id);
          return { id, state };
        })
      );

      results.forEach((r) => {
        if (r.status !== 'fulfilled') return;
        likesMap[r.value.id] = r.value.state.count;
        myLikesMap[r.value.id] = r.value.state.liked;
      });

      // Asegurar IDs sin respuesta
      commentIds.forEach((id) => {
        if (likesMap[id] === undefined) likesMap[id] = 0;
        if (myLikesMap[id] === undefined) myLikesMap[id] = false;
      });

      setCommentLikes(likesMap);
      setLikedByMe(myLikesMap);
    } catch (error) {
      console.error('Error loading comment likes:', error);
    }
  };

  const loadRepliesForComments = async () => {
    try {
      const commentIds = comments.map(c => c.id).filter(Boolean);
      if (commentIds.length === 0) return;

      const repliesMap = {};
      const allReplyIds = [];

      const results = await Promise.allSettled(
        commentIds.map(async (commentId) => {
          const items = await listReplies(commentId);
          return { commentId, items };
        })
      );

      results.forEach((r) => {
        if (r.status !== 'fulfilled') return;
        const commentId = r.value.commentId;
        const mapped = (r.value.items || []).map((reply) => {
          const displayName = reply?.user
            ? `${reply.user.nombre || ''} ${reply.user.apellido || ''}`.trim() || reply.usuario_carnet
            : reply.usuario_carnet;
          const avatarUrl = reply?.user?.foto_perfil || null;
          const row = {
            id: reply.id,
            comentario_id: reply.comentario_id ?? commentId,
            usuario_carnet: reply.usuario_carnet,
            contenido: reply.texto,
            created_at: reply.created_at,
            displayName,
            avatarUrl,
          };
          if (row.id) allReplyIds.push(row.id);
          return row;
        });
        repliesMap[commentId] = mapped;
      });

      setReplies(repliesMap);

      if (allReplyIds.length > 0) {
        await loadLikesForReplies(allReplyIds);
      } else {
        setReplyLikes({});
        setReplyLikedByMe({});
      }
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const loadLikesForReplies = async (replyIds) => {
    try {
      if (replyIds.length === 0) return;

      const likesMap = {};
      const myLikesMap = {};

      const results = await Promise.allSettled(
        replyIds.map(async (id) => {
          const state = await getReplyLikeState(id);
          return { id, state };
        })
      );

      results.forEach((r) => {
        if (r.status !== 'fulfilled') return;
        likesMap[r.value.id] = r.value.state.count;
        myLikesMap[r.value.id] = r.value.state.liked;
      });

      replyIds.forEach((id) => {
        if (likesMap[id] === undefined) likesMap[id] = 0;
        if (myLikesMap[id] === undefined) myLikesMap[id] = false;
      });

      setReplyLikes(likesMap);
      setReplyLikedByMe(myLikesMap);
    } catch (error) {
      console.error('Error loading reply likes:', error);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !replyingTo) return;

    try {
      const data = await createReply(replyingTo.id, replyText.trim());
      const displayName = data?.user
        ? `${data.user.nombre || ''} ${data.user.apellido || ''}`.trim() || data.usuario_carnet
        : data.usuario_carnet;
      const avatarUrl = data?.user?.foto_perfil || null;
      const newReply = {
        id: data.id,
        comentario_id: data.comentario_id ?? replyingTo.id,
        usuario_carnet: data.usuario_carnet,
        contenido: data.texto,
        created_at: data.created_at,
        displayName,
        avatarUrl,
      };

      // Actualizar estado local - asegurar que el nuevo array se crea correctamente
      setReplies(prev => {
        const existingReplies = prev[replyingTo.id] || [];
        return {
          ...prev,
          [replyingTo.id]: [...existingReplies, newReply],
        };
      });
      
      // Inicializar likes para la nueva respuesta
      if (newReply.id) {
        setReplyLikes(prev => ({ ...prev, [newReply.id]: 0 }));
        setReplyLikedByMe(prev => ({ ...prev, [newReply.id]: false }));
      }

      // Mostrar las respuestas automáticamente
      setShowReplies(prev => ({ ...prev, [replyingTo.id]: true }));

      // Limpiar
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting reply:', error);
      if (error instanceof ApiError && error.status === 401) {
        Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para responder.');
      }
    }
  };

  const handleLikeReply = async (replyId) => {
    if (!replyId) return;

    try {
      const isLiked = replyLikedByMe[replyId];

      // Actualización optimista
      setReplyLikedByMe(prev => ({ ...prev, [replyId]: !isLiked }));
      setReplyLikes(prev => ({ 
        ...prev, 
        [replyId]: Math.max(0, (prev[replyId] || 0) + (isLiked ? -1 : 1))
      }));

      const state = isLiked ? await unlikeReply(replyId) : await likeReply(replyId);
      setReplyLikedByMe(prev => ({ ...prev, [replyId]: state.liked }));
      setReplyLikes(prev => ({ ...prev, [replyId]: state.count }));
    } catch (error) {
      console.error('Error handling reply like:', error);
      if (error instanceof ApiError && error.status === 401) {
        Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para dar like.');
      }
    }
  };

  const handleDeleteReply = (replyObj) => {
    const actorCarnet = meCarnet || myCarnet;
    if (!actorCarnet || !replyObj) return;
    if (replyObj.usuario_carnet !== actorCarnet) return; // Solo propias
    setReplyToDelete(replyObj);
    setDeleteReplyModalVisible(true);
  };

  const confirmDeleteReply = async () => {
    const actorCarnet = meCarnet || myCarnet;
    const replyObj = replyToDelete;
    if (!actorCarnet || !replyObj) { setDeleteReplyModalVisible(false); return; }
    setDeleteReplyModalVisible(false);
    try {
      // Optimista: quitar de UI primero
      setReplies(prev => {
        const arr = prev[replyObj.comentario_id] || [];
        return { ...prev, [replyObj.comentario_id]: arr.filter(r => r.id !== replyObj.id) };
      });
      // Limpiar likes locales asociados
      setReplyLikes(prev => { const copy = { ...prev }; delete copy[replyObj.id]; return copy; });
      setReplyLikedByMe(prev => { const copy = { ...prev }; delete copy[replyObj.id]; return copy; });

      await deleteReply(replyObj.id);
    } catch (e) {
      await loadRepliesForComments();
    } finally {
      setReplyToDelete(null);
    }
  };

  const cancelDeleteReply = () => {
    setDeleteReplyModalVisible(false);
    setReplyToDelete(null);
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleReplyPress = (comment) => {
    setReplyingTo({ id: comment.id, displayName: comment.displayName || comment.usuario });
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const handleLikeComment = async (commentId) => {
    if (!commentId) return;

    try {
      const isLiked = likedByMe[commentId];

      // Actualización optimista
      setLikedByMe(prev => ({ ...prev, [commentId]: !isLiked }));
      setCommentLikes(prev => ({ 
        ...prev, 
        [commentId]: Math.max(0, (prev[commentId] || 0) + (isLiked ? -1 : 1))
      }));

      const state = isLiked ? await unlikeComment(commentId) : await likeComment(commentId);
      setLikedByMe(prev => ({ ...prev, [commentId]: state.liked }));
      setCommentLikes(prev => ({ ...prev, [commentId]: state.count }));
    } catch (error) {
      console.error('Error handling like:', error);
      if (error instanceof ApiError && error.status === 401) {
        Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para dar like.');
      }
    }
  };

  if (!visible) return null;

  const renderItem = ({ item }) => {
    // Importante: no usar || porque 0 es falsy; si 0, se caía a item.likes_count y mostraba 1
    const likesCount = (commentLikes[item.id] !== undefined)
      ? commentLikes[item.id]
      : (item.likes_count || 0);
    const isLiked = likedByMe[item.id] || false;
    const commentReplies = replies[item.id] || [];
    const repliesVisible = showReplies[item.id] || false;

    return (
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => onLongPressComment && onLongPressComment(item)}
          style={styles.commentRow}
        >
          <TouchableOpacity onPress={() => onPressAvatar && onPressAvatar(item.usuario)}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{(item.displayName || item.usuario || 'U').charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.commentAuthor} numberOfLines={1}>{item.displayName || item.usuario}</Text>
                <Text style={styles.commentText}>{item.texto}</Text>
                {!!item.created_at && (
                  <Text style={styles.commentDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                )}
                {/* Botones de acción */}
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => handleReplyPress(item)} style={styles.replyButton}>
                    <Text style={styles.replyButtonText}>Responder</Text>
                  </TouchableOpacity>
                  {commentReplies.length > 0 && (
                    <TouchableOpacity onPress={() => toggleReplies(item.id)} style={styles.replyButton}>
                      <Text style={styles.replyButtonText}>
                        {repliesVisible ? 'Ocultar' : `Ver ${commentReplies.length}`} {commentReplies.length === 1 ? 'respuesta' : 'respuestas'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => handleLikeComment(item.id)}
                style={styles.likeButton}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 12 }}
              >
                <FontAwesome 
                  name={isLiked ? 'heart' : 'heart-o'} 
                  size={14} 
                  color={isLiked ? '#e74c3c' : (darkMode ? '#888' : '#666')} 
                />
                {likesCount > 0 && (
                  <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
                    {likesCount}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Respuestas anidadas */}
        {repliesVisible && commentReplies.length > 0 && (
          <View style={styles.repliesContainer}>
            {commentReplies.map((reply) => {
              const replyLikesCount = replyLikes[reply.id] ?? 0;
              const isReplyLiked = replyLikedByMe[reply.id] || false;
              return (
                <View key={reply.id} style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.commentRow}
                    onLongPress={() => handleDeleteReply(reply)}
                  >
                    <TouchableOpacity onPress={() => onPressAvatar && onPressAvatar(reply.usuario_carnet)}>
                      {reply.avatarUrl ? (
                        <Image source={{ uri: reply.avatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                          <Text style={styles.avatarLetter}>{(reply.displayName || reply.usuario_carnet || 'U').charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.commentAuthor} numberOfLines={1}>{reply.displayName || reply.usuario_carnet}</Text>
                          <Text style={styles.commentText}>{reply.contenido}</Text>
                          {!!reply.created_at && (
                            <Text style={styles.commentDate}>{new Date(reply.created_at).toLocaleDateString()}</Text>
                          )}
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleLikeReply(reply.id)}
                          style={styles.likeButton}
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 12 }}
                        >
                          <FontAwesome 
                            name={isReplyLiked ? 'heart' : 'heart-o'} 
                            size={14} 
                            color={isReplyLiked ? '#e74c3c' : (darkMode ? '#888' : '#666')} 
                          />
                          {replyLikesCount > 0 && (
                            <Text style={[styles.likeCount, isReplyLiked && styles.likeCountActive]}>
                              {replyLikesCount}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        {/* Fondo clickable para cerrar */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <View style={styles.card}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>Comentarios</Text>
          </View>
          <View style={{ flex: 1 }}>
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id || `${item.usuario}-${item.created_at}`}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>Aún no hay comentarios.</Text>
              )}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            />
            <View style={styles.inputRow}>
              {replyingTo && (
                <View style={styles.replyingToBar}>
                  <Text style={styles.replyingToText}>
                    Respondiendo a <Text style={styles.replyingToName}>{replyingTo.displayName}</Text>
                  </Text>
                  <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="close" size={18} color={darkMode ? '#888' : '#666'} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <TextInput
                  value={replyingTo ? replyText : newComment}
                  onChangeText={replyingTo ? setReplyText : onChangeNewComment}
                  placeholder={replyingTo ? "Escribe una respuesta..." : "Escribe un comentario..."}
                  placeholderTextColor={darkMode ? '#888' : '#888'}
                  style={styles.input}
                  multiline
                />
                <TouchableOpacity
                  onPress={replyingTo ? handleSubmitReply : onSubmitNewComment}
                  disabled={replyingTo ? !replyText.trim() : !newComment.trim()}
                  style={[styles.sendBtn, { opacity: (replyingTo ? replyText.trim() : newComment.trim()) ? 1 : 0.5 }]}
                >
                  <MaterialIcons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
      {/* Modal estilizado para eliminar respuesta */}
      <Modal transparent animationType="fade" visible={deleteReplyModalVisible} onRequestClose={cancelDeleteReply}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={cancelDeleteReply}>
          <Pressable style={{ width: '85%', maxWidth: 400, backgroundColor: darkMode ? '#1a1a2e' : '#fff', borderRadius: 16, padding: 24, elevation: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: darkMode ? '#e5e7eb' : '#1a1a2e', marginBottom: 12, textAlign: 'center' }}>Eliminar respuesta</Text>
            <Text style={{ fontSize: 15, color: darkMode ? '#cbd5e1' : '#666', marginBottom: 24, textAlign: 'center' }}>¿Estás seguro de que quieres eliminar esta respuesta?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity onPress={cancelDeleteReply} style={{ flex: 1, paddingVertical: 12, backgroundColor: darkMode ? '#333' : '#e5e5e5', borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: darkMode ? '#e5e7eb' : '#222', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteReply} style={{ flex: 1, paddingVertical: 12, backgroundColor: '#FF3B30', borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const H = Dimensions.get('window').height;
const createStyles = (darkMode) => StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end', alignItems:'stretch' },
  card: { width:'100%', maxWidth:'100%', maxHeight: Math.floor(H * 0.9), minHeight: Math.floor(H * 0.6), backgroundColor: darkMode ? '#181818' : '#fff', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16 },
  grabber: { alignSelf:'center', width:48, height:4, borderRadius:2, backgroundColor: darkMode ? '#444' : '#ddd', marginBottom:8 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  title: { fontSize:16, fontWeight:'700', color: darkMode ? '#fff' : '#111' },
  closeBtn: { display:'none' },
  commentRow: { flexDirection:'row', alignItems:'flex-start', paddingRight: 8 },
  avatar: { width:36, height:36, borderRadius:18, marginRight:10 },
  avatarFallback: { backgroundColor: darkMode ? '#333' : '#e0e0e0', justifyContent:'center', alignItems:'center' },
  avatarLetter: { fontSize:14, fontWeight:'700', color: darkMode ? '#fff' : '#222' },
  commentAuthor: { fontSize:13, fontWeight:'600', color: darkMode ? '#fff' : '#111' },
  commentText: { fontSize:13, color: darkMode ? '#ddd' : '#333', marginTop:2 },
  commentDate: { fontSize:11, color: darkMode ? '#888' : '#666', marginTop:2 },
  actionRow: { flexDirection:'row', marginTop:6, gap:12 },
  replyButton: { paddingVertical:2 },
  replyButtonText: { fontSize:12, color:'#007AFF', fontWeight:'500' },
  likeButton: { flexDirection:'row', alignItems:'center', gap:4, marginLeft:8, marginRight:8, paddingHorizontal:2 },
  likeCount: { fontSize:11, color: darkMode ? '#888' : '#666', fontWeight:'500' },
  likeCountActive: { color:'#e74c3c', fontWeight:'600' },
  repliesContainer: { marginLeft:46, marginTop:8, paddingLeft:12, borderLeftWidth:0 },
  replyRow: { flexDirection:'row', marginBottom:10, alignItems:'flex-start' },
  replyAvatar: { width:28, height:28, borderRadius:14, marginRight:8 },
  replyAvatarLetter: { fontSize:12, fontWeight:'700', color: darkMode ? '#fff' : '#222' },
  replyAuthor: { fontSize:12, fontWeight:'600', color: darkMode ? '#fff' : '#111' },
  replyText: { fontSize:12, color: darkMode ? '#ddd' : '#333', marginTop:1 },
  replyDate: { fontSize:10, color: darkMode ? '#888' : '#666', marginTop:2 },
  replyLikeButton: { flexDirection:'row', alignItems:'center', gap:3, marginLeft:6, paddingHorizontal:2 },
  replyLikeCount: { fontSize:10, color: darkMode ? '#888' : '#666', fontWeight:'500' },
  replyingToBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:6, paddingHorizontal:10, backgroundColor: darkMode ? '#222' : '#f0f0f0', borderRadius:8, marginBottom:8 },
  replyingToText: { fontSize:12, color: darkMode ? '#aaa' : '#666' },
  replyingToName: { fontWeight:'600', color: darkMode ? '#fff' : '#111' },
  emptyText: { textAlign:'center', color: darkMode ? '#999' : '#666', marginTop:4 },
  inputRow: { flexDirection:'column', marginTop:12 },
  input: { flex:1, borderWidth:1, borderColor: darkMode ? '#333' : '#e0e0e0', borderRadius:10, padding:10, minHeight:40, maxHeight:120, color: darkMode ? '#fff' : '#111', backgroundColor: darkMode ? '#111' : '#fafafa' },
  sendBtn: { marginLeft:8, backgroundColor:'#007AFF', paddingVertical:10, paddingHorizontal:14, borderRadius:10, justifyContent:'center', alignItems:'center' },
});
