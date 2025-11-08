import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, AppState, TextInput } from 'react-native';
import { Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Asset } from 'expo-asset';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Etiquetas from '../components/Etiquetas';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase/supabaseClient';
import { useNavigation } from '@react-navigation/native';

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

  // Función para navegar al perfil del usuario
  const handleNavigateToProfile = async () => {
    try {
      closeMenu(); // Cerrar menú si está abierto
      const currentUserCarnet = await AsyncStorage.getItem('carnet');
      
      // Si es el usuario actual, navegar a la pestaña Perfil
      if (currentUserCarnet === item.userId) {
        navigation.navigate('Perfil');
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

  const handleLike = () => {
    setLiked((p) => !p);
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
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
              <Image source={{ uri: item.userAvatar || 'https://i.pravatar.cc/100' }} style={styles.postAvatar} />
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
                <Text style={[styles.actionText, darkMode && styles.actionTextDark, liked && { color: '#e74c3c' }]}>Me gusta</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={styles.actionBtnRow} onPress={closeMenu}>
                <FontAwesome name="comment-o" size={20} color={darkMode ? '#fff' : '#222'} />
                <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>Comentar</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} style={styles.actionBtnRow} onPress={closeMenu}>
                <MaterialIcons name="share" size={22} color={darkMode ? '#fff' : '#222'} />
                <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>Compartir</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { closeMenu(); setSaved((s) => !s); }}>
              <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={26} color={darkMode ? '#eee' : '#222'} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.likesText, darkMode && styles.likesTextDark]}>{Math.max(0, likeCount)} Me gusta</Text>
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

      {/* Modal de reporte */}
      {reportModalVisible && (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <View style={{ width: '96%', maxWidth: 420, backgroundColor: darkMode ? '#171717' : '#fff', borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: darkMode ? '#fff' : '#111', marginBottom: 12 }}>Reportar publicación</Text>
              <Text style={{ fontSize: 14, color: darkMode ? '#ccc' : '#444', marginBottom: 10 }}>Indica el motivo del reporte.</Text>
              {['Contenido inapropiado','Violencia','Odio o acoso','Spam o engaño','Otro'].map((motivo) => (
                <TouchableOpacity
                  key={motivo}
                  onPress={() => setReportReason(motivo)}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: reportReason === motivo ? '#FF3B30' : (darkMode ? '#333' : '#e5e7eb'), backgroundColor: reportReason === motivo ? (darkMode ? '#2a1b1b' : '#ffeceb') : 'transparent' }}
                >
                  <Text style={{ color: darkMode ? '#eee' : '#222', fontWeight: reportReason === motivo ? '700' : '500' }}>{motivo}</Text>
                </TouchableOpacity>
              ))}
              <Text style={{ fontSize: 14, color: darkMode ? '#ccc' : '#444', marginTop: 6, marginBottom: 6 }}>Comentario (opcional)</Text>
              <TextInput
                value={reportText}
                onChangeText={setReportText}
                placeholder="Describe el problema (opcional)"
                placeholderTextColor={darkMode ? '#888' : '#999'}
                multiline
                style={{ minHeight: 80, borderWidth: 1, borderColor: darkMode ? '#333' : '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: darkMode ? '#111' : '#fafafa', color: darkMode ? '#fff' : '#111', textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
                <TouchableOpacity onPress={() => { closeMenu(); setReportModalVisible(false); }} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginRight: 8, backgroundColor: darkMode ? '#333' : '#eee' }}>
                  <Text style={{ color: darkMode ? '#fff' : '#111', fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const carnet = await AsyncStorage.getItem('carnet');
                      if (!carnet) throw new Error('No se encontró el usuario actual');
                      const payload = {
                        publicacion_id: item.id,
                        carnet_reporta: carnet,
                        carnet_publica: item.userId || null,
                        motivo: reportReason,
                        detalle: reportText || null,
                        created_at: new Date().toISOString(),
                      };
                      const { error } = await supabase.from('reportes_publicaciones').insert([payload]);
                      if (error) throw error;
                      closeMenu();
                      setReportModalVisible(false);
                      setReportText('');
                      setReportReason('Contenido inapropiado');
                    } catch (err) {
                      // Optional: show toast
                    }
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#FF3B30' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar reporte</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
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
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  actionBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#222', fontSize: 14 },
  actionTextDark: { color: '#ffffff' },
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
