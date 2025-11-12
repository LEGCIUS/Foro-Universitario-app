import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../Supabase/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Asegurar carnet disponible aunque el padre no lo pase aún
  useEffect(() => {
    const ensureCarnet = async () => {
      try {
        if (!meCarnet && visible) {
          const c = await AsyncStorage.getItem('carnet');
          if (c) setMyCarnet(c);
        }
      } catch (e) {
        // noop
      }
    };
    ensureCarnet();
  }, [visible, meCarnet]);

  // Cargar likes cuando cambian los comentarios o se abre el modal
  useEffect(() => {
    if (visible && comments.length > 0) {
      loadLikesForComments();
    }
  }, [visible, comments, meCarnet, myCarnet]);

  const loadLikesForComments = async () => {
    try {
      const commentIds = comments.map(c => c.id).filter(Boolean);
      if (commentIds.length === 0) return;

      const likesMap = {};
      const myLikesMap = {};

      // FUENTE DE VERDAD: siempre contar desde likes_comentarios (ignora likes_count de comentarios)
      const { data: allLikesRows, error: allLikesErr } = await supabase
        .from('likes_comentarios')
        .select('comentario_id')
        .in('comentario_id', commentIds);
      
      if (!allLikesErr && Array.isArray(allLikesRows)) {
        // Agrupar manualmente para obtener el conteo real
        const grouped = {};
        allLikesRows.forEach(r => { 
          grouped[r.comentario_id] = (grouped[r.comentario_id] || 0) + 1; 
        });
        // Inicializar todos los IDs en 0, luego sobreescribir con el conteo real
        commentIds.forEach(id => { likesMap[id] = grouped[id] || 0; });
      } else {
        // Si falla, inicializar todos en 0
        commentIds.forEach(id => { likesMap[id] = 0; });
      }

      // Verificar si yo di like a cada comentario (consulta única si tenemos carnet)
      const userCarnet = meCarnet || myCarnet;
      if (userCarnet) {
        const { data: myLikesRows } = await supabase
          .from('likes_comentarios')
          .select('comentario_id')
          .eq('usuario_carnet', userCarnet)
          .in('comentario_id', commentIds);
        if (Array.isArray(myLikesRows)) {
          const setIds = new Set(myLikesRows.map(r => r.comentario_id));
          commentIds.forEach(id => { myLikesMap[id] = setIds.has(id); });
        }
      }

      setCommentLikes(likesMap);
      setLikedByMe(myLikesMap);
    } catch (error) {
      console.error('Error loading comment likes:', error);
    }
  };

  // Recalcula todos los conteos desde la tabla likes_comentarios (ÚNICA fuente de verdad)
  const refreshAllLikeCounts = async () => {
    try {
      const commentIds = comments.map(c => c.id).filter(Boolean);
      if (commentIds.length === 0) return;
      
      const { data, error } = await supabase
        .from('likes_comentarios')
        .select('comentario_id')
        .in('comentario_id', commentIds);
      
      if (error) return;
      
      // Agrupar manualmente (data trae todas las filas)
      const grouped = {};
      if (Array.isArray(data)) {
        data.forEach(row => {
          grouped[row.comentario_id] = (grouped[row.comentario_id] || 0) + 1;
        });
      }
      
      // Inicializar en 0 los que no tienen likes
      const finalCounts = {};
      commentIds.forEach(id => {
        finalCounts[id] = grouped[id] || 0;
      });
      
      setCommentLikes(finalCounts);
    } catch (e) {
      console.error('Error refreshing like counts:', e);
    }
  };

  const handleLikeComment = async (commentId) => {
    const actorCarnet = meCarnet || myCarnet;
    if (!actorCarnet || !commentId) return;

    try {
      const isLiked = likedByMe[commentId];

      // Actualización optimista
      setLikedByMe(prev => ({ ...prev, [commentId]: !isLiked }));
      setCommentLikes(prev => ({ 
        ...prev, 
        [commentId]: Math.max(0, (prev[commentId] || 0) + (isLiked ? -1 : 1))
      }));

      if (isLiked) {
        // Quitar like
        const { error } = await supabase
          .from('likes_comentarios')
          .delete()
          .eq('comentario_id', commentId)
          .eq('usuario_carnet', actorCarnet);

        if (error) {
          // Revertir en caso de error
          setLikedByMe(prev => ({ ...prev, [commentId]: true }));
          setCommentLikes(prev => ({ 
            ...prev, 
            [commentId]: (prev[commentId] || 0) + 1
          }));
        }
      } else {
        // Dar like
        const { error } = await supabase
          .from('likes_comentarios')
          .insert({
            comentario_id: commentId,
            usuario_carnet: actorCarnet,
          }, { returning: 'representation' });

        if (error) {
          // Revertir en caso de error
          setLikedByMe(prev => ({ ...prev, [commentId]: false }));
          setCommentLikes(prev => ({ 
            ...prev, 
            [commentId]: Math.max(0, (prev[commentId] || 0) - 1)
          }));
        }
      }

      // Recalcular TODOS los conteos (evita desincronización por valores artificiales)
      await refreshAllLikeCounts();
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  if (!visible) return null;

  const renderItem = ({ item }) => {
    // Importante: no usar || porque 0 es falsy; si 0, se caía a item.likes_count y mostraba 1
    const likesCount = (commentLikes[item.id] !== undefined)
      ? commentLikes[item.id]
      : (item.likes_count || 0);
    const isLiked = likedByMe[item.id] || false;

    return (
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
              <TextInput
                value={newComment}
                onChangeText={onChangeNewComment}
                placeholder="Escribe un comentario..."
                placeholderTextColor={darkMode ? '#888' : '#888'}
                style={styles.input}
                multiline
              />
              <TouchableOpacity
                onPress={onSubmitNewComment}
                disabled={!newComment.trim()}
                style={[styles.sendBtn, { opacity: newComment.trim() ? 1 : 0.5 }]}
              >
                <MaterialIcons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
  commentRow: { flexDirection:'row', marginBottom:12, alignItems:'flex-start' },
  avatar: { width:36, height:36, borderRadius:18, marginRight:10 },
  avatarFallback: { backgroundColor: darkMode ? '#333' : '#e0e0e0', justifyContent:'center', alignItems:'center' },
  avatarLetter: { fontSize:14, fontWeight:'700', color: darkMode ? '#fff' : '#222' },
  commentAuthor: { fontSize:13, fontWeight:'600', color: darkMode ? '#fff' : '#111' },
  commentText: { fontSize:13, color: darkMode ? '#ddd' : '#333', marginTop:2 },
  commentDate: { fontSize:11, color: darkMode ? '#888' : '#666', marginTop:2 },
  likeButton: { flexDirection:'row', alignItems:'center', gap:4, marginLeft:8, marginRight:8, paddingHorizontal:2 },
  likeCount: { fontSize:11, color: darkMode ? '#888' : '#666', fontWeight:'500' },
  likeCountActive: { color:'#e74c3c', fontWeight:'600' },
  emptyText: { textAlign:'center', color: darkMode ? '#999' : '#666', marginTop:4 },
  inputRow: { flexDirection:'row', marginTop:12, alignItems:'flex-end' },
  input: { flex:1, borderWidth:1, borderColor: darkMode ? '#333' : '#e0e0e0', borderRadius:10, padding:10, minHeight:40, maxHeight:120, color: darkMode ? '#fff' : '#111', backgroundColor: darkMode ? '#111' : '#fafafa' },
  sendBtn: { marginLeft:8, backgroundColor:'#007AFF', paddingVertical:10, paddingHorizontal:14, borderRadius:10, justifyContent:'center', alignItems:'center' },
});
