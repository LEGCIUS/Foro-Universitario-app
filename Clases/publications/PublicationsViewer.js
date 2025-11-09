import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, TextInput, ScrollView, Dimensions, Modal, Alert } from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function PublicationsViewer({ route, navigation }) {
  const theme = useTheme?.();
  const themeDark = theme?.darkMode ?? false;
  const paramDark = route?.params?.darkMode;
  const darkMode = typeof paramDark === 'boolean' ? paramDark : themeDark;

  const { posts, initialIndex = 0 } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [likes, setLikes] = useState(posts[initialIndex]?.likes || 0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [comments, setComments] = useState(posts[initialIndex]?.comentarios || []);
  const [commentCount, setCommentCount] = useState(posts[initialIndex]?.comentarios_count || comments.length || 0);
  const [newComment, setNewComment] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [carnet, setCarnet] = useState(null);
  const flatListRef = useRef();
  const videoRefs = useRef([]);

  const onViewableItemsChanged = React.useRef(async ({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index;
      setCurrentIndex(idx);
      const post = posts[idx] || {};
      const postId = post.id || post.publicacion_id || post.uuid;
      if (postId) {
        await Promise.all([
          fetchLikes(postId),
          fetchComments(postId),
        ]);
      } else {
        setComments(post?.comentarios || []);
      }
    }
  });

  const viewConfigRef = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleLike = async () => {
    try {
      const post = posts[currentIndex] || {};
      const postId = post.id || post.publicacion_id || post.uuid;
      if (!postId) return;
      let c = carnet;
      if (!c) {
        c = await AsyncStorage.getItem('carnet');
        if (!c) {
          Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para dar like.');
          return;
        }
        setCarnet(c);
      }

      console.log('handleLike', { postId, carnet: c });

      if (likedByMe) {
        // Optimistic
        setLikedByMe(false);
        setLikes((prev) => Math.max(0, prev - 1));
        const { error: delErr } = await supabase
          .from('likes')
          .delete()
          .eq('publicacion_id', postId)
          .eq('usuario_carnet', c);
        if (delErr) {
          console.error('Error DELETE like supabase:', delErr);
          Alert.alert('Error al quitar like', delErr.message || '');
        }
      } else {
        setLikedByMe(true);
        setLikes((prev) => prev + 1);
        // Intentar UPSERT para evitar duplicados silenciosos
        const { data: insData, error } = await supabase
          .from('likes')
          .upsert({ publicacion_id: postId, usuario_carnet: c }, { onConflict: 'publicacion_id,usuario_carnet', ignoreDuplicates: true })
          .select('id')
          .maybeSingle();
        if (error) {
          console.error('Error UPSERT like supabase:', error);
          Alert.alert('Error al dar like', error.message || '');
        } else {
          console.log('UPSERT like ok', insData);
        }
      }
      // Re-sincronizar con valor definitivo (trigger debe actualizar likes_count)
      await fetchLikes(postId);
    } catch (err) {
      console.error('Error al togglear like:', err);
      await refreshCurrentPostStates();
    }
  };

  const handleAddComment = async () => {
    try {
      const text = newComment.trim();
      if (!text) return;
      const post = posts[currentIndex] || {};
      const postId = post.id || post.publicacion_id || post.uuid;
      if (!postId) return;
      let c = carnet;
      if (!c) {
        c = await AsyncStorage.getItem('carnet');
        if (!c) {
          Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para comentar.');
          return;
        }
        setCarnet(c);
      }
      const { error } = await supabase
        .from('comentarios')
        .insert({ publicacion_id: postId, usuario_carnet: c, contenido: text });
      if (error) throw error;
      setNewComment('');
      await fetchComments(postId);
    } catch (err) {
      console.error('Error al comentar:', err);
      Alert.alert('Error', err.message || 'No se pudo publicar el comentario');
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.detailContainer, darkMode && styles.detailContainerDark]}>
      <View style={styles.headerRow}>
        <View style={[styles.avatarPlaceholder, darkMode && styles.avatarPlaceholderDark]}>
          <Text style={[styles.avatarLetter, darkMode && { color: '#e5e7eb' }]}>{(item.usuario_nombre || item.usuario || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.username, darkMode && styles.usernameDark]}>{item.usuario_nombre || item.usuario || 'Usuario'}</Text>
      </View>
      <View style={styles.mediaContainer}>
        {item.contenido === 'image' && item.archivo_url && (
          <Image source={{ uri: item.archivo_url }} style={styles.feedMedia} resizeMode="cover" />
        )}
        {item.contenido === 'video' && item.archivo_url && (
          <Video ref={ref => videoRefs.current[index] = ref} source={{ uri: item.archivo_url }} style={styles.feedMedia} useNativeControls resizeMode="cover" isLooping />
        )}
      </View>
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
            <MaterialIcons name={likedByMe ? 'favorite' : 'favorite-border'} size={26} color={likedByMe ? '#ff4d6d' : (darkMode ? '#eee' : '#222')} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialIcons name="chat-bubble-outline" size={26} color={darkMode ? '#eee' : '#222'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MaterialIcons name="share" size={26} color={darkMode ? '#eee' : '#222'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionBtn}>
          <MaterialIcons name="bookmark-border" size={26} color={darkMode ? '#eee' : '#222'} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.captionTitle, darkMode && styles.captionTitleDark]}>{item.titulo}</Text>
      <View style={styles.likesRow}>
        <Text style={[styles.likesText, darkMode && styles.likesTextDark]}>{likes} Me gusta</Text>
      </View>
  <Text style={[styles.commentsTitle, darkMode && styles.commentsTitleDark]}>Comentarios ({commentCount}):</Text>
      <ScrollView style={styles.commentsList}>
        {comments.length === 0 ? (
          <Text style={{ color: darkMode ? '#aaa' : '#888' }}>Sin comentarios.</Text>
        ) : (
          comments.map((c, idx) => (
            <Text key={idx} style={{ marginBottom: 2, color: darkMode ? '#e5e7eb' : '#222' }}>
              <Text style={{ fontWeight: 'bold' }}>{c.usuario}: </Text>
              {c.texto}
            </Text>
          ))
        )}
      </ScrollView>
      <View style={styles.commentInputRow}>
        <TextInput
          style={[styles.input, darkMode && styles.inputDark, { flex: 1, height: 40, marginBottom: 0, color: darkMode ? '#e5e7eb' : '#222' }]}
          placeholder="Escribe un comentario..."
          placeholderTextColor={darkMode ? '#8b93a3' : '#888'}
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity onPress={handleAddComment} style={{ marginLeft: 8 }}>
          <MaterialIcons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  React.useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (video && idx !== currentIndex) {
        video.pauseAsync && video.pauseAsync();
      }
    });
  }, [currentIndex]);

  const fetchLikes = async (postId) => {
    try {
      const c = carnet || (await AsyncStorage.getItem('carnet'));
      if (c && !carnet) setCarnet(c);

      // 1) Traer likes_count desde publicaciones (evita contar filas)
      const { data: pubData, error: pubErr } = await supabase
        .from('publicaciones')
        .select('likes_count')
        .eq('id', postId)
        .maybeSingle();
      if (!pubErr && pubData && typeof pubData.likes_count === 'number') {
        setLikes(pubData.likes_count);
      }

      // 2) Saber si YO ya di like
      if (c) {
        const { data: mine, error: mineErr } = await supabase
          .from('likes')
          .select('id')
          .eq('publicacion_id', postId)
          .eq('usuario_carnet', c)
          .maybeSingle();
        if (!mineErr) setLikedByMe(!!mine);
      } else {
        setLikedByMe(false);
      }
    } catch (e) {
      console.warn('fetchLikes error', e);
    }
  };

  const fetchComments = async (postId) => {
    try {
      const [commentsRes, pubRes] = await Promise.all([
        supabase
          .from('comentarios')
          .select('contenido, usuario_carnet, created_at')
          .eq('publicacion_id', postId)
          .order('created_at', { ascending: true })
          .limit(50),
        supabase
          .from('publicaciones')
          .select('comentarios_count')
          .eq('id', postId)
          .maybeSingle(),
      ]);
      if (commentsRes.error) throw commentsRes.error;
      setComments((commentsRes.data || []).map(r => ({ usuario: r.usuario_carnet, texto: r.contenido, created_at: r.created_at })));
      if (!pubRes.error && pubRes.data && typeof pubRes.data.comentarios_count === 'number') {
        setCommentCount(pubRes.data.comentarios_count);
      } else {
        setCommentCount((commentsRes.data || []).length);
      }
    } catch (e) {
      console.warn('fetchComments error', e);
    }
  };

  const refreshCurrentPostStates = async () => {
    const post = posts[currentIndex] || {};
    const postId = post.id || post.publicacion_id || post.uuid;
    if (postId) {
      await Promise.all([fetchLikes(postId), fetchComments(postId)]);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const c = await AsyncStorage.getItem('carnet');
        if (c) setCarnet(c);
        const post = posts[currentIndex] || posts[0] || {};
        const postId = post.id || post.publicacion_id || post.uuid;
        if (postId) await Promise.all([fetchLikes(postId), fetchComments(postId)]);
      } catch (e) {
        console.warn('init viewer error', e);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al volver a enfocar esta pantalla, re-sincroniza likes y comentarios del post visible
  useFocusEffect(
    useCallback(() => {
      const post = posts[currentIndex] || posts[0] || {};
      const postId = post.id || post.publicacion_id || post.uuid;
      if (postId) {
        refreshCurrentPostStates();
      }
      return () => {};
    }, [currentIndex, posts])
  );

  return (
    <View style={[styles.overlay, darkMode && styles.overlayDark]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeButton, darkMode && styles.closeButtonDark]}>
        <MaterialIcons name="close" size={32} color={darkMode ? '#fff' : '#FF3B30'} />
      </TouchableOpacity>
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item, idx) => (item?.id ? String(item.id) : String(idx))}
        pagingEnabled
        horizontal={false}
        initialScrollIndex={initialIndex}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewConfigRef.current}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        snapToInterval={height}
        decelerationRate="fast"
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => { flatListRef.current?.scrollToIndex({ index, animated: true }); }, 100);
        }}
      />

      <Modal visible={!!selectedPost} transparent animationType="fade" onRequestClose={() => setSelectedPost(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setSelectedPost(null)}>
          <View style={styles.centeredView}>
            <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
              {selectedPost?.contenido === 'image' && (
                <Image source={{ uri: selectedPost.archivo_url }} style={styles.modalMedia} resizeMode="contain" />
              )}
              {selectedPost?.contenido === 'video' && (
                <Video source={{ uri: selectedPost.archivo_url }} style={styles.modalMedia} useNativeControls resizeMode="contain" isLooping />
              )}
              <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>{selectedPost?.titulo}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#f7f9fc' },
  overlayDark: { backgroundColor: '#0b0f14' },
  closeButton: { position: 'absolute', top: 20, right: 18, zIndex: 30, backgroundColor: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 18, elevation: 6 },
  closeButtonDark: { backgroundColor: 'rgba(0,0,0,0.6)' },
  detailContainer: { width, height, justifyContent: 'flex-start', alignItems: 'stretch', paddingTop: 18, paddingBottom: 18, paddingHorizontal: 0, backgroundColor: '#f7f9fc' },
  detailContainerDark: { backgroundColor: '#0b0f14' },
  mediaContainer: { width, aspectRatio: 1, borderRadius: 0, overflow: 'hidden', marginBottom: 6, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  feedMedia: { width, height: width },
  modalMedia: { width: 320, height: 320, borderRadius: 12, marginBottom: 12 },
  headerRow: { width: '100%', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6eef8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarPlaceholderDark: { backgroundColor: '#1f2937' },
  avatarLetter: { fontWeight: '700', color: '#0b2545' },
  username: { fontSize: 16, fontWeight: '700', color: '#0b2545' },
  usernameDark: { color: '#e5e7eb' },
  actionsRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  leftActions: { flexDirection: 'row' },
  actionBtn: { marginRight: 12 },
  captionTitle: { fontSize: 16, fontWeight: '700', color: '#0b2545', paddingHorizontal: 10, marginBottom: 6 },
  captionTitleDark: { color: '#e5e7eb' },
  likesText: { color: '#222', paddingHorizontal: 10, marginBottom: 6 },
  likesTextDark: { color: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 8, color: '#0b2545', textAlign: 'left', alignSelf: 'stretch', marginLeft: 6 },
  likesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'stretch', marginLeft: 6 },
  commentsTitle: { fontWeight: '700', marginBottom: 6, color: '#233547', alignSelf: 'flex-start', marginLeft: 6 },
  commentsTitleDark: { color: '#e5e7eb' },
  commentsList: { maxHeight: 120, marginBottom: 8, alignSelf: 'stretch', paddingHorizontal: 6 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'stretch', paddingHorizontal: 6 },
  input: { borderColor: '#e1e7ef', borderWidth: 1, borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  inputDark: { borderColor: '#333', backgroundColor: '#111' },
  button: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, alignSelf: 'stretch' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  modalContent: { backgroundColor: '#fff', borderRadius: 14, padding: 18, width: '92%', maxWidth: 420, alignItems: 'center', elevation: 10 },
  modalContentDark: { backgroundColor: '#121212' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#0b2545', textAlign: 'center' },
  modalTitleDark: { color: '#e5e7eb' },
});