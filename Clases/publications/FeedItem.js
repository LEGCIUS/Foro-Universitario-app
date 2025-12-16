import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, AppState, TextInput, Modal, FlatList, ScrollView, Pressable, Alert, Share } from 'react-native';
import { Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Asset } from 'expo-asset';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Etiquetas from '../components/Etiquetas';
import CommentsModal from '../components/CommentsModal';
import { useNavigation } from '@react-navigation/native';
import { ApiError } from '../../src/services/api';
import { getMe, getUserByCarnet } from '../../src/services/users';
import { createComment, deleteComment, listComments } from '../../src/services/comments';
import { getPostLikeState, likePost, unlikePost } from '../../src/services/likes';
import { deletePost, reportPost } from '../../src/services/posts';

const { width } = Dimensions.get('window');

function formatRelativeTime(iso) {
  try {
    const date = new Date(iso);
    const diff = Math.max(0, Date.now() - date.getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'justo ahora';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  } catch {
    return '';
  }
}

export default function FeedItem({ item, isVisible, isScreenFocused, closeSignal }) {
  const { darkMode } = useTheme();
  const navigation = useNavigation();
  const hideControlsTimeout = useRef(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);
  const [saved, setSaved] = useState(false);
  const [carnet, setCarnet] = useState(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const captionText = (item.text || '').trim();
  const isTextOnly = !item.mediaUrl || !(['image','video'].includes(item.mediaType));
  const showMore = captionText.length > 160;

  const [status, setStatus] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [thumbUri, setThumbUri] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportText, setReportText] = useState('');
  // Eliminar publicación propia
  const [deletePostModalVisible, setDeletePostModalVisible] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deleted, setDeleted] = useState(false);
  // Comentarios (modal básico)
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentCount, setCommentCount] = useState(item.comentarios_count || 0);
  const [deleteCommentModalVisible, setDeleteCommentModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const profileCacheRef = useRef(new Map()); // carnet -> { nombre, apellido, foto_perfil }
  const videoRef = useRef(null);
  const thumbCacheRef = useRef(new Map());
  const prefetchingRef = useRef(new Set());

  // Cierra el menú si está abierto (helper para reutilizar)
  const closeMenu = () => setMenuOpen(false);

  // Cerrar menú si se pierde foco de la pantalla del feed (prop isScreenFocused ya controla video)
  useEffect(() => {
    if (!isScreenFocused) {
      closeMenu();
    }
  }, [isScreenFocused]);

  // Cerrar menú si el item deja de ser visible (por scroll / cambio de página)
  useEffect(() => {
    if (!isVisible) {
      closeMenu();
    }
  }, [isVisible]);

  // Cerrar menú cuando llega una señal externa (scroll, búsqueda, filtro, etc.)
  useEffect(() => {
    if (closeSignal !== undefined) {
      closeMenu();
    }
  }, [closeSignal]);

  // Determinar si soy dueño de la publicación
  const isOwner = useMemo(() => {
    const ownerCarnet = item?.userId || item?.carnet || item?.carnet_usuario || item?.usuario_carnet || null;
    return !!(carnet && ownerCarnet && String(carnet) === String(ownerCarnet));
  }, [carnet, item?.userId, item?.carnet, item?.carnet_usuario, item?.usuario_carnet]);

  // Cargar estado de likes al montar o cuando el item se hace visible
  useEffect(() => {
    if (isVisible && item.id) {
      (async () => {
        try {
          const [meRes, likeState] = await Promise.all([
            getMe().catch(() => null),
            getPostLikeState(item.id).catch(() => null),
          ]);
          if (meRes?.carnet) setCarnet(meRes.carnet);
          if (likeState) {
            setLiked(!!likeState.liked);
            setLikeCount(typeof likeState.count === 'number' ? likeState.count : 0);
          }
        } catch (e) {
          console.warn('Error loading like state:', e);
        }
      })();
    }
  }, [isVisible, item.id]);

  // Función para navegar al perfil del usuario
  const handleNavigateToProfile = async () => {
    try {
      closeMenu(); // Cerrar menú si está abierto
      let currentUserCarnet = carnet;
      if (!currentUserCarnet) {
        const me = await getMe().catch(() => null);
        if (me?.carnet) {
          currentUserCarnet = me.carnet;
          setCarnet(me.carnet);
        }
      }
      
      // Si es el usuario actual, navegar a la pestaña Perfil
      if (currentUserCarnet === item.userId) {
  navigation.navigate('MainTabs', { screen: 'Perfil' });
      } else {
        // Si es otro usuario, navegar a ViewUserProfile
        navigation.navigate('ViewUserProfile', { userId: item.userId });
      }
    } catch (error) {
      console.error('Error al navegar al perfil:', error);
    }
  };

  const prefetchVideo = async (uri) => {
    if (!uri || prefetchingRef.current.has(uri)) return;
    try {
      prefetchingRef.current.add(uri);
      await Asset.fromURI(uri).downloadAsync();
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (item.mediaType !== 'video' || !item.mediaUrl) return;
      const cached = thumbCacheRef.current.get(item.mediaUrl);
      if (cached) {
        if (!cancelled) setThumbUri(cached);
        return;
      }
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(item.mediaUrl, { time: 1000 });
        if (!cancelled) {
          thumbCacheRef.current.set(item.mediaUrl, uri);
          setThumbUri(uri);
        }
      } catch {}
    };
    run();
    return () => { cancelled = true; };
  }, [item.mediaUrl, item.mediaType]);

  useEffect(() => {
    if (item.mediaType === 'video' && item.mediaUrl) {
      prefetchVideo(item.mediaUrl);
    }
  }, [item.mediaType, item.mediaUrl]);

  const renderRichText = (text) => {
    const parts = [];
    const regex = /(#[A-Za-z0-9_]+)|(@[A-Za-z0-9_\.]+)/g;
    let lastIndex = 0; let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIndex) {
        parts.push(<Text key={`t-${lastIndex}`}>{text.slice(lastIndex, m.index)}</Text>);
      }
      const token = m[0];
      const isTag = token.startsWith('#');
      parts.push(
        <Text
          key={`m-${m.index}`}
          style={isTag ? styles.tagText : styles.mentionText}
        >
          {token}
        </Text>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(<Text key={`t-end`}>{text.slice(lastIndex)}</Text>);
    return parts;
  };

  const handleLike = async () => {
    try {
      const postId = item.id;
      if (!postId) return;

      if (liked) {
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        const state = await unlikePost(postId);
        setLiked(!!state.liked);
        setLikeCount(state.count);
      } else {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        const state = await likePost(postId);
        setLiked(!!state.liked);
        setLikeCount(state.count);
      }
    } catch (err) {
      console.error('handleLike error:', err);
      if (err instanceof ApiError && err.status === 401) {
        try { Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para dar like.'); } catch {}
      }
      try {
        const state = await getPostLikeState(item.id);
        setLiked(!!state.liked);
        setLikeCount(state.count);
      } catch (_) {}
    }
  };

  const openComments = async () => {
    try {
      if (!item?.id) return;
      const rows = await listComments(item.id);

      const cache = profileCacheRef.current;
      const uniqueCarnets = Array.from(new Set(rows.map(r => r.usuario_carnet).filter(Boolean)));
      const missing = uniqueCarnets.filter(c => !cache.has(c));
      if (missing.length > 0) {
        const profs = await Promise.allSettled(missing.map((c) => getUserByCarnet(String(c))));
        profs.forEach((r, idx) => {
          if (r.status !== 'fulfilled') return;
          const c = missing[idx];
          cache.set(String(c), {
            nombre: r.value?.nombre,
            apellido: r.value?.apellido,
            foto_perfil: r.value?.foto_perfil,
          });
        });
      }

      const enriched = rows.map(r => {
        const fromUser = r.user
          ? { nombre: r.user.nombre, apellido: r.user.apellido, foto_perfil: r.user.foto_perfil }
          : (cache.get(String(r.usuario_carnet)) || null);
        const displayName = fromUser ? `${fromUser.nombre || ''} ${fromUser.apellido || ''}`.trim() : r.usuario_carnet;
        const avatarUrl = fromUser?.foto_perfil || null;
        return {
          id: r.id,
          usuario: r.usuario_carnet,
          displayName: displayName || r.usuario_carnet,
          avatarUrl,
          texto: r.texto,
          created_at: r.created_at,
          likes_count: r.likes_count || 0,
        };
      });

      setComments(enriched);
      setCommentCount(enriched.length);
      setCommentModalVisible(true);
    } catch {}
  };

  const handleAddComment = async () => {
    try {
      const text = newComment.trim();
      if (!text || !item?.id) return;
      await createComment(item.id, text);
      setNewComment('');
      await openComments();
    } catch {}
  };

  const handleDeleteComment = async (commentItem) => {
    setCommentToDelete(commentItem);
    setDeleteCommentModalVisible(true);
  };

  const confirmDeleteComment = async () => {
    try {
      if (!commentToDelete || !item?.id) return;

      if (!commentToDelete.id) throw new Error('Comentario sin id');
      await deleteComment(commentToDelete.id);
      await openComments();
      setDeleteCommentModalVisible(false);
      setCommentToDelete(null);
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
      setDeleteCommentModalVisible(false);
      setCommentToDelete(null);
    }
  };

  // Compartir publicación (imagen/video o solo texto)
  const handleShare = async () => {
    try {
      const title = item?.userName ? `Publicación de ${item.userName}` : 'Publicación';
      const baseText = (item?.text && item.text.trim()) ? item.text.trim() : title;
      const mediaUrl = item?.mediaUrl || '';
      const message = mediaUrl ? `${baseText}\n${mediaUrl}` : baseText;
      await Share.share({ title, message });
    } catch (e) {
      // opcional: podríamos mostrar un Alert si falla
    }
  };

  const handlePlaybackStatusUpdate = (s) => {
    setStatus(s);
    setIsPlaying(s.isPlaying);
    setIsBuffering(s.isBuffering);
    if (typeof s.durationMillis === 'number') setDurationMillis(s.durationMillis);
    if (typeof s.positionMillis === 'number') setPositionMillis(s.positionMillis);
    if (s.didJustFinish) {
      videoRef.current?.setPositionAsync(0);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (!isVisible && item.mediaType === 'video') {
      videoRef.current?.pauseAsync();
      videoRef.current?.setPositionAsync(0);
      setIsPlaying(false);
    }
  }, [isVisible, item.mediaType]);

  useEffect(() => {
    if (item.mediaType !== 'video') return;
    if (isVisible && isScreenFocused) {
      setIsMuted(false);
      videoRef.current?.setIsMutedAsync(false);
      videoRef.current?.playAsync();
      setIsPlaying(true);
    } else {
      videoRef.current?.pauseAsync();
      videoRef.current?.setPositionAsync(0);
      setIsPlaying(false);
    }
  }, [isVisible, isScreenFocused, item.mediaType]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        videoRef.current?.pauseAsync();
        videoRef.current?.setPositionAsync(0);
        setIsPlaying(false);
        setMenuOpen(false);
      }
    });
    return () => sub.remove && sub.remove();
  }, []);

  useEffect(() => {
    videoRef.current?.setIsMutedAsync(!!isMuted);
  }, [isMuted]);

  // Si ya fue eliminada, no renderizar
  if (deleted) return null;

  const handleDeletePost = () => {
    closeMenu();
    if (!isOwner) return; // seguridad
    setDeletePostModalVisible(true);
  };

  const confirmDeletePost = async () => {
    try {
      if (!item?.id) return;
      setDeletingPost(true);
      await deletePost(item.id);
      // 3) Ocultar del feed
      setDeletingPost(false);
      setDeletePostModalVisible(false);
      setDeleted(true);
    } catch (err) {
      setDeletingPost(false);
      setDeletePostModalVisible(false);
      try { Alert.alert('Error', err?.message || 'No se pudo eliminar la publicación.'); } catch {}
    }
  };

  return (
    <>
      <View style={{ position: 'relative' }}>

        <View style={[styles.feedCard, darkMode && { backgroundColor: '#171717' }]}>
          <View style={[styles.postHeader, { zIndex: 200, elevation: 8 }]}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={handleNavigateToProfile}
              activeOpacity={0.7}
            >
              {item.userAvatar ? (
                <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
              ) : (
                <View
                  style={[
                    styles.postAvatar,
                    { backgroundColor: darkMode ? '#2d3748' : '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <Text style={{ color: darkMode ? '#fff' : '#1e293b', fontWeight: '700', fontSize: 14 }}>
                    {(item.userName || item.userId || item.carnet || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={[styles.postUser, darkMode && styles.postUserDark]}>{item.userName || 'Usuario'}</Text>
                <Text style={[styles.postTime, darkMode && styles.postTimeDark]}>{formatRelativeTime(item.fecha)}</Text>
              </View>
            </TouchableOpacity>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity onPress={() => setMenuOpen((v) => !v)}>
                <MaterialIcons name="more-vert" size={22} color={darkMode ? '#ddd' : '#444'} />
              </TouchableOpacity>
              {menuOpen && (
                <View style={{
                  position: 'absolute',
                  top: 26,
                  right: 0,
                  backgroundColor: darkMode ? '#1f1f1f' : '#fff',
                  borderRadius: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  minWidth: 160,
                  elevation: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  borderWidth: darkMode ? 0 : 1,
                  borderColor: '#e5e7eb',
                  zIndex: 9999,
                }}>
                  {isOwner ? (
                    <TouchableOpacity
                      onPress={handleDeletePost}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6 }}
                    >
                      <MaterialIcons name="delete" size={18} color="#FF3B30" />
                      <Text style={{ marginLeft: 8, color: '#FF3B30', fontWeight: '600' }}>Eliminar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        closeMenu();
                        setReportModalVisible(true);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6 }}
                    >
                      <MaterialIcons name="flag" size={18} color="#FF3B30" />
                      <Text style={{ marginLeft: 8, color: '#FF3B30', fontWeight: '600' }}>Reportar</Text>
                    </TouchableOpacity>
                  )}
                  
                </View>
              )}
            </View>
          </View>

          {isTextOnly && !!captionText && (
            <>
              <Text style={styles.captionText} numberOfLines={captionExpanded ? 0 : 8}>
                {renderRichText(captionText)}
              </Text>
              {showMore && (
                <TouchableOpacity onPress={() => { closeMenu(); setCaptionExpanded((e) => !e); }} activeOpacity={0.8}>
                  <Text style={[styles.showMoreText, darkMode && { color: '#9aa0b0' }]}>
                    {captionExpanded ? 'Ver menos' : 'Ver más'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {item.mediaUrl && (item.mediaType === 'video' || item.mediaType === 'image') && (
            <View style={[styles.mediaBox, darkMode && styles.mediaBoxDark]}>
              {item.mediaType === 'video' ? (
                <View style={{ width: '100%', height: '100%' }}>
                  <Video
                    ref={videoRef}
                    source={{ uri: item.mediaUrl }}
                    style={{ width: '100%', height: '100%' }}
                    useNativeControls={false}
                    resizeMode="cover"
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    onLoadStart={() => { setIsBuffering(true); }}
                    onLoad={() => { setIsBuffering(false); }}
                    onReadyForDisplay={() => setIsBuffering(false)}
                    shouldPlay={isVisible && isScreenFocused}
                    isMuted={isMuted}
                    isLooping={false}
                    usePoster={!!thumbUri}
                    posterSource={thumbUri ? { uri: thumbUri } : undefined}
                  />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={(e) => {
                      closeMenu();
                      if (!durationMillis) return;
                      const x = e.nativeEvent.locationX;
                      const ratio = barWidth ? Math.min(1, Math.max(0, x / barWidth)) : 0;
                      videoRef.current?.setPositionAsync(Math.floor(ratio * durationMillis));
                    }}
                    onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                    style={{ position: 'absolute', left: 12, right: 12, bottom: 12, height: 10, justifyContent: 'center' }}
                  >
                    <View style={{ height: 4, backgroundColor: '#ffffff90', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: 4, width: `${durationMillis ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100)) : 0}%`, backgroundColor: '#007AFF', borderRadius: 2 }} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { closeMenu(); setIsMuted((m) => !m); }}
                    style={{ position: 'absolute', right: 12, bottom: 28, backgroundColor: '#0008', padding: 8, borderRadius: 20 }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name={isMuted ? 'volume-off' : 'volume-up'} size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <Image source={{ uri: item.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              )}
            </View>
          )}

          <View style={styles.actionsRow}>
            <View style={styles.actionsLeft}>
              <TouchableOpacity onPress={() => { closeMenu(); handleLike(); }} activeOpacity={0.7} style={styles.actionBtnRow}>
                <FontAwesome name={liked ? 'heart' : 'heart-o'} size={22} color={liked ? '#e74c3c' : (darkMode ? '#eee' : '#222')} />
                <Text style={[styles.inlineCount, darkMode && styles.inlineCountDark]}>{Math.max(0, likeCount)}</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={styles.actionBtnRow} onPress={() => { closeMenu(); openComments(); }}>
                <MaterialIcons name="comment" size={20} color={darkMode ? '#fff' : '#222'} />
                <Text style={[styles.inlineCount, darkMode && styles.inlineCountDark]}>{Math.max(0, commentCount)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.actionBtnRow}
                onPress={() => { closeMenu(); handleShare(); }}
              >
                <MaterialIcons name="share" size={22} color={darkMode ? '#fff' : '#222'} />
                <Text style={[styles.actionText, darkMode && styles.actionTextDark]}></Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { closeMenu(); setSaved((s) => !s); }}>
              <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={26} color={darkMode ? '#eee' : '#222'} />
            </TouchableOpacity>
          </View>
          {/* Removed separate comment count line; counts now inline */}
          {!isTextOnly && !!captionText && (
            <>
              <Text style={[styles.captionText, darkMode && styles.captionTextDark]} numberOfLines={captionExpanded ? 0 : 2}>
                {renderRichText(captionText)}
              </Text>
              {showMore && (
                <TouchableOpacity activeOpacity={0.8} onPress={() => { closeMenu(); setCaptionExpanded((e) => !e); }}>
                  <Text style={[styles.showMoreText, darkMode && { color: '#9aa0b0' }]}>
                    {captionExpanded ? 'Ver menos' : 'Ver más'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {item.etiquetas && item.etiquetas.length > 0 && (
            <Etiquetas
              etiquetasSeleccionadas={item.etiquetas}
              mostrarSoloSeleccionadas={true}
              estiloPersonalizado={{
                container: { paddingHorizontal: 12, paddingVertical: 8 },
                etiqueta: { backgroundColor: 'transparent', borderRadius: 12, marginRight: 6, marginBottom: 4 },
                texto: { fontSize: 12, color: '#007AFF' },
              }}
            />
          )}

          <Text style={[styles.postTimeFooter, darkMode && styles.postTimeFooterDark]}>{formatRelativeTime(item.fecha)}</Text>
        </View>
      </View>

      {/* Modal de reporte (bloqueante, siempre con descripción opcional) */}
      <Modal
        transparent
        animationType="fade"
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', alignItems:'center' }} onPress={() => setReportModalVisible(false)}>
          <Pressable style={{ width:'90%', maxWidth:420, backgroundColor: darkMode ? '#1b1b1b' : '#fff', borderRadius:20, padding:20 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontSize:18, fontWeight:'700', marginBottom:6, color: darkMode ? '#fff' : '#111' }}>Reportar publicación</Text>
            <Text style={{ fontSize:14, color: darkMode ? '#ccc' : '#444', marginBottom:14 }}>Selecciona un motivo y agrega una descripción (opcional):</Text>

            <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:16 }}>
              {['Contenido inapropiado','Spam','Acoso','Información falsa','Otro'].map((motivo) => (
                <TouchableOpacity
                  key={motivo}
                  onPress={() => setReportReason(motivo)}
                  style={{
                    backgroundColor: reportReason === motivo ? (darkMode ? '#2563eb' : '#1d4ed8') : (darkMode ? '#2d2d2d' : '#f1f5f9'),
                    paddingHorizontal:14,
                    paddingVertical:8,
                    borderRadius:18,
                    marginRight:8,
                    marginBottom:8,
                  }}
                >
                  <Text style={{ color: reportReason === motivo ? '#fff' : (darkMode ? '#ddd' : '#333'), fontSize:13, fontWeight:'600' }}>{motivo}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={reportText}
              onChangeText={setReportText}
              placeholder="Describe el motivo (opcional)"
              placeholderTextColor={darkMode ? '#777' : '#888'}
              multiline
              style={{
                backgroundColor: darkMode ? '#2a2a2a' : '#f8fafc',
                borderRadius:12,
                padding:12,
                minHeight:80,
                color: darkMode ? '#fff' : '#111',
                textAlignVertical:'top',
                marginBottom:16,
                fontSize:14
              }}
            />

            <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
              <TouchableOpacity
                onPress={() => { setReportModalVisible(false); }}
                style={{ paddingVertical:10, paddingHorizontal:18, borderRadius:14, backgroundColor: darkMode ? '#333' : '#e2e8f0', marginRight:10 }}
              >
                <Text style={{ color: darkMode ? '#fff' : '#111', fontWeight:'600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await reportPost(item.id, {
                      motivo: reportReason,
                      detalle: reportText.trim() || undefined,
                    });
                    setReportModalVisible(false);
                    setReportText('');
                    setReportReason('Contenido inapropiado');
                  } catch (err) {
                    // Optional: show toast
                    if (err instanceof ApiError && err.status === 401) {
                      try { Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para reportar.'); } catch {}
                    }
                  }
                }}
                disabled={!reportReason}
                style={{
                  paddingVertical:10,
                  paddingHorizontal:20,
                  borderRadius:14,
                  backgroundColor: (!reportReason) ? (darkMode ? '#1f2937' : '#94a3b8') : '#dc2626'
                }}
              >
                <Text style={{ color:'#fff', fontWeight:'700' }}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal estilizado para eliminar publicación propia */}
      <Modal transparent animationType="fade" visible={deletePostModalVisible} onRequestClose={() => setDeletePostModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setDeletePostModalVisible(false)}>
          <Pressable style={{ width: '85%', maxWidth: 400, backgroundColor: darkMode ? '#1a1a2e' : '#fff', borderRadius: 16, padding: 24, elevation: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: darkMode ? '#e5e7eb' : '#1a1a2e', marginBottom: 12, textAlign: 'center' }}>Eliminar publicación</Text>
            <Text style={{ fontSize: 15, color: darkMode ? '#cbd5e1' : '#666', marginBottom: 24, textAlign: 'center' }}>¿Estás seguro de que quieres eliminar esta publicación?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity disabled={deletingPost} onPress={() => setDeletePostModalVisible(false)} style={{ flex: 1, paddingVertical: 12, backgroundColor: darkMode ? '#333' : '#e5e5e5', borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: darkMode ? '#e5e7eb' : '#222', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={deletingPost} onPress={confirmDeletePost} style={{ flex: 1, paddingVertical: 12, backgroundColor: '#FF3B30', borderRadius: 10, alignItems: 'center', opacity: deletingPost ? 0.7 : 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{deletingPost ? 'Eliminando…' : 'Eliminar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal reutilizable de comentarios */}
      <CommentsModal
        visible={commentModalVisible}
        darkMode={darkMode}
        comments={comments}
        commentCount={commentCount}
        newComment={newComment}
        onChangeNewComment={setNewComment}
        onSubmitNewComment={handleAddComment}
        onRequestClose={() => setCommentModalVisible(false)}
        meCarnet={carnet}
        onPressAvatar={async (carnetUser) => {
          const me = carnet;
          setCommentModalVisible(false);
          if (me && me === carnetUser) {
            navigation.navigate('MainTabs', { screen: 'Perfil' });
          } else {
            navigation.navigate('ViewUserProfile', { userId: carnetUser });
          }
        }}
        onLongPressComment={(c) => {
          if (!c) return;
          const isMyComment = carnet && c.usuario === carnet;
          if (isMyComment) handleDeleteComment(c);
        }}
      />

      {/* Modal estilizado para eliminar comentario */}
      <Modal transparent animationType="fade" visible={deleteCommentModalVisible} onRequestClose={() => setDeleteCommentModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setDeleteCommentModalVisible(false)}>
          <Pressable style={{ width: '85%', maxWidth: 400, backgroundColor: darkMode ? '#1a1a2e' : '#fff', borderRadius: 16, padding: 24, elevation: 10 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: darkMode ? '#e5e7eb' : '#1a1a2e', marginBottom: 12, textAlign: 'center' }}>Eliminar comentario</Text>
            <Text style={{ fontSize: 15, color: darkMode ? '#cbd5e1' : '#666', marginBottom: 24, textAlign: 'center' }}>¿Estás seguro de que quieres eliminar este comentario?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity onPress={() => setDeleteCommentModalVisible(false)} style={{ flex: 1, paddingVertical: 12, backgroundColor: darkMode ? '#333' : '#e5e5e5', borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: darkMode ? '#e5e7eb' : '#222', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteComment} style={{ flex: 1, paddingVertical: 12, backgroundColor: '#FF3B30', borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      
    </>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 24,
    paddingBottom: 8,
    width: '100%',
    alignSelf: 'stretch',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  postUser: { color: '#111', fontWeight: '600', fontSize: 14 },
  postUserDark: { color: '#fff' },
  postTime: { color: '#888', fontSize: 12, marginTop: 2 },
  postTimeDark: { color: '#bbb' },
  mediaBox: { width: '100%', aspectRatio: 1, backgroundColor: '#f0f0f0' },
  mediaBoxDark: { backgroundColor: '#0f1720' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10 },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  actionBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#222', fontSize: 14 },
  actionTextDark: { color: '#ffffff' },
  countUnderAction: { fontSize: 11, color: '#444', marginTop: 2, textAlign: 'center' }, // legacy not used now
  inlineCount: { fontSize: 13, color: '#444', marginLeft: 6, fontWeight: '500' },
  inlineCountDark: { color: '#ddd' },
  likesText: { color: '#111', fontWeight: '600', fontSize: 14, paddingHorizontal: 12, marginTop: 6 },
  likesTextDark: { color: '#ddd' },
  captionText: { color: '#111', fontSize: 14, paddingHorizontal: 12, marginTop: 4 },
  captionTextDark: { color: '#e6e6e6' },
  captionUser: { fontWeight: '600' },
  showMoreText: { color: '#666', fontSize: 13, marginTop: 6, paddingHorizontal: 12 },
  tagText: { color: '#1976D2', fontWeight: '600' },
  mentionText: { color: '#1976D2' },
  postTimeFooter: { color: '#999', fontSize: 12, paddingHorizontal: 12, marginTop: 6 },
  postTimeFooterDark: { color: '#9aa0b0' },
  // Eliminado menuBackdrop porque ahora cerramos el menú por eventos directos
});
