import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet, Image, TouchableOpacity, Platform, Modal, Alert, ScrollView, Dimensions, Animated, Linking, AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio, Video } from 'expo-av';
import { Asset } from 'expo-asset';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '../../Supabase/supabaseClient';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
const { width } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';

// Añadir imports para tema y gradiente
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';
import Etiquetas from '../Etiquetas';
import BuscadorUsuarios from '../BuscadorUsuarios';

// Esta mierda ya la devolvi a 20 antes de que se joda todo
// Si vuelve a joderse, gogo.
// Ayuda: Me estou dando cuenta que el error viene de aqui
// Asi que lo dejo en 2024
// Si vuelve a joderse, gogo. Ayuda: Me estou dando cuenta que el error viene de aqui
// Asi que lo dejo en 2024
// Si vuelve a joderse, gogo. Ayuda: Me estou dando cuenta que el error viene de aqui     



global.Buffer = global.Buffer || Buffer;

export default function HomeScreen({ onLogout, navigation }) {
  const isFocused = useIsFocused();

  // obtener modo oscuro
  const { darkMode } = useTheme();

  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([]);
  const [etiquetasFiltro, setEtiquetasFiltro] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  // Cache en memoria para miniaturas de video
  const thumbCacheRef = useRef(new Map()); // key: mediaUrl, value: localUri
  // Control de prefetch para videos cercanos al viewport
  const prefetchingRef = useRef(new Set()); // de mediaUrl
  const prefetchVideo = useCallback(async (uri) => {
    if (!uri || prefetchingRef.current.has(uri)) return;
    try {
      prefetchingRef.current.add(uri);
      await Asset.fromURI(uri).downloadAsync();
    } catch (_) {
      // ignorar fallos de prefetch
    }
  }, []);

  // Helper: mapear fila de publicaciones a modelo para el feed con datos de usuario
  const mapPublicationToPost = useCallback(async (pub) => {
    let userName = 'Usuario';
    let userAvatar = 'https://i.pravatar.cc/100';
    if (pub?.carnet_usuario) {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nombre, foto_perfil')
        .eq('carnet', pub.carnet_usuario)
        .single();
      if (!userError && userData) {
        userName = userData.nombre || userName;
        userAvatar = userData.foto_perfil || userAvatar;
      }
    }
    // Parsear etiquetas de forma segura
    let etiquetas = [];
    try {
      if (pub.etiquetas && typeof pub.etiquetas === 'string') {
        // Si comienza con '[', es JSON array
        if (pub.etiquetas.startsWith('[')) {
          etiquetas = JSON.parse(pub.etiquetas);
        } else {
          // Si no, asumimos que está separado por comas
          etiquetas = pub.etiquetas.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
      } else if (Array.isArray(pub.etiquetas)) {
        etiquetas = pub.etiquetas;
      }
    } catch (error) {
      console.warn('Error parsing etiquetas for post', pub.id, error);
      // Como fallback, tratar como string separado por comas
      if (pub.etiquetas && typeof pub.etiquetas === 'string') {
        etiquetas = pub.etiquetas.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else {
        etiquetas = [];
      }
    }

    return {
      id: pub.id,
      text: pub.titulo,
      mediaUrl: pub.archivo_url,
      mediaType: pub.contenido,
      fecha: pub.fecha_publicacion,
      userId: pub.carnet_usuario,
      userName,
      userAvatar,
      etiquetas,
    };
  }, []);

  const fetchPostsFromDB = useCallback(async (retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('publicaciones')
        .select('*')
        .order('fecha_publicacion', { ascending: false });

      if (error) {
        throw error;
      }

      const postsWithUser = await Promise.all(data.map(mapPublicationToPost));
      setPosts(postsWithUser);
    } catch (error) {
      console.error('Error al obtener publicaciones:', error);
      
      // Reintentar hasta 3 veces en caso de errores de red
      if (retryCount < 3 && (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch'))) {
        console.log(`Reintentando obtener publicaciones (intento ${retryCount + 1}/3)...`);
        setTimeout(() => {
          fetchPostsFromDB(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Delay incremental: 2s, 4s, 6s
      }
    }
  }, [mapPublicationToPost]);

  // Cargar archivos del bucket al montar el componente
  useEffect(() => {
    fetchPostsFromDB();
  }, [fetchPostsFromDB]);

  // Refrescar al enfocar la pantalla (por si hubo cambios mientras no estaba visible)
  useEffect(() => {
    if (isFocused) {
      fetchPostsFromDB();
    }
  }, [isFocused, fetchPostsFromDB]);

  // Suscripción en tiempo real a publicaciones (insert/update/delete)
  useEffect(() => {
    const channel = supabase
      .channel('publicaciones-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones' }, async (payload) => {
        try {
          if (payload.eventType === 'DELETE') {
            const delId = payload.old?.id;
            setPosts((prev) => prev.filter((p) => p.id !== delId));
            return;
          }
          const pub = payload.new;
          const post = await mapPublicationToPost(pub);
          setPosts((prev) => {
            const others = prev.filter((p) => p.id !== post.id);
            const next = [post, ...others];
            next.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
            return next;
          });
        } catch (e) {
          // En caso de fallo, recargar lista completa como fallback
          fetchPostsFromDB();
        }
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [mapPublicationToPost, fetchPostsFromDB]);

  // Configurar modo de audio para evitar que siga activo en background
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch (_) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // (DEBUG eliminado)

  // Elegir imagen/video/audio y mostrar previsualización
  const pickMedia = async (type) => {
    let result;
    if (type === 'audio') {
      // Solo funciona en web y Android, no iOS
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            setPreviewMedia({
              uri: URL.createObjectURL(file),
              file,
              type: 'audio',
              name: file.name,
            });
            setMediaType('audio');
          }
        };
        input.click();
      } else {
        alert('La subida de audio solo está soportada en web por ahora.');
      }
      return;
    }

    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image'
          ? ['image']
          : type === 'video'
          ? ['video']
          : ['image', 'video'],
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setPreviewMedia(asset);
        setMediaType(asset.type?.startsWith('video') ? 'video' : 'image');
      }
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          type === 'image'
            ? ImagePicker.MediaTypeOptions.Images
            : type === 'video'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled) {
        setPreviewMedia(result.assets[0]);
        setMediaType(result.assets[0].type?.startsWith('video') ? 'video' : 'image');
      }
    }
  };

  // Subir publicación con texto y/o media
  const handleAddPost = async () => {
    if (!newPost.trim() && !previewMedia) return;
    setUploading(true);
    try {
      // Obtener carnet del usuario actual
      const carnet = await AsyncStorage.getItem('carnet');
      if (!carnet) throw new ReferenceError("No se encontró el carnet del usuario");
      let publicUrl = null;
      // Si hay media, subir a Supabase Storage y obtener la URL pública
      if (previewMedia?.uri) {
        const uri = previewMedia.uri;
        const fileName = uri.split('/').pop();
        const fileType = fileName.split('.').pop();
        const filePath = `${carnet}/publicaciones/${Date.now()}_${fileName}`;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        const fileBuffer = Buffer.from(base64, 'base64');
        const { data, error: uploadError } = await supabase.storage
          .from('multimedia')
          .upload(filePath, fileBuffer, {
            contentType: mediaType === 'video' ? `video/${fileType}` : `image/${fileType}`,
            cacheControl: '3600', // 1 hour (seconds) - ajusta según necesites
            upsert: true,
          });
        if (uploadError) {
          Alert.alert('Error', uploadError.message || 'No se pudo subir el archivo');
          setUploading(false);
          return;
        }
        const { data: publicData } = supabase
          .storage
          .from('multimedia')
          .getPublicUrl(filePath);
        publicUrl = publicData.publicUrl + `?t=${Date.now()}`;
      }
      // Guardar publicación con la URL pública
      const { error } = await supabase
        .from('publicaciones')
        .insert([
          {
            titulo: newPost,
            archivo_url: publicUrl,
            contenido: previewMedia ? mediaType : 'text',
            fecha_publicacion: new Date().toISOString(),
            carnet_usuario: carnet,
            etiquetas: JSON.stringify(etiquetasSeleccionadas),
          },
        ]);
      if (error) {
        Alert.alert('Error', 'No se pudo publicar.');
        console.error('Error al publicar:', error);
      } else {
        setNewPost('');
        setPreviewMedia(null);
        setMediaType(null);
        setShowPublishModal(false);
        setEtiquetasSeleccionadas([]);
        fetchPostsFromDB();
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error inesperado.');
      console.error('Error inesperado:', err);
    }
    setUploading(false);
  };

  // Helpers UI
  const formatNumber = (n) => {
    if (typeof n !== 'number') return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  };

  const formatRelativeTime = (iso) => {
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
  };

  const formatCount = (n) => {
    try {
      return new Intl.NumberFormat('en-US').format(Number(n || 0));
    } catch {
      return String(n || 0);
    }
  };

  // Componente funcional para cada publicación del feed (UI estilo Instagram)
  const FeedItem = ({ item, isVisible, isScreenFocused }) => {
      // leer tema dentro del item para aplicar colores a su UI
      const { darkMode } = useTheme();
       const hideControlsTimeout = useRef(null);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes || 0);
    const [saved, setSaved] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState(item.comments || []);

    const [status, setStatus] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showBufferingUI, setShowBufferingUI] = useState(false);
  const bufferingTimerRef = useRef(null);
  const [hasError, setHasError] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [durationMillis, setDurationMillis] = useState(0);
    const [positionMillis, setPositionMillis] = useState(0);
    const [barWidth, setBarWidth] = useState(0);
    const videoRef = useRef(null);
    const captionText = (item.text || '').trim();
    const isTextOnly = !item.mediaUrl || !(['image','video'].includes(item.mediaType));
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const showMore = captionText.length > 160;
    const [thumbUri, setThumbUri] = useState(null);
  // Menú y reporte
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportText, setReportText] = useState('');

    // Generar o recuperar miniatura del video para mostrar instantáneamente
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
        } catch (_) {
          // si falla, dejamos el placeholder por defecto
        }
      };
      run();
      return () => { cancelled = true; };
    }, [item.mediaUrl, item.mediaType]);

    // Prefetch del video del item actual para minimizar carga visible
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
            onPress={() => Alert.alert(isTag ? 'Hashtag' : 'Mención', token)}
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
      if (s.error) setHasError(true);
      if (s.didJustFinish) {
        videoRef.current?.setPositionAsync(0);
        setIsPlaying(false);
      }
    };

    // Pausar y resetear cuando salga de vista
    useEffect(() => {
      if (!isVisible && item.mediaType === 'video') {
        videoRef.current?.pauseAsync();
        videoRef.current?.setPositionAsync(0);
        setIsPlaying(false);
      }
    }, [isVisible, item.mediaType]);

    // Autoplay si visible y enfocado; reset al perder foco/visibilidad
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

    // App en background
    useEffect(() => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active') {
          videoRef.current?.pauseAsync();
          videoRef.current?.setPositionAsync(0);
          setIsPlaying(false);
        }
      });
      return () => sub.remove && sub.remove();
    }, []);

    useEffect(() => {
      videoRef.current?.setIsMutedAsync(!!isMuted);
    }, [isMuted]);

    // Cleanup
    useEffect(() => () => {
      videoRef.current?.pauseAsync?.();
      videoRef.current?.unloadAsync?.();
    }, []);

    return (
      <>
      <View style={[styles.feedCard, darkMode && { backgroundColor: '#171717' }]}>
        {/* Header */}
  <View style={[styles.postHeader, { zIndex: 200, elevation: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: item.userAvatar || 'https://i.pravatar.cc/100' }} style={styles.postAvatar} />
            <View>
              <Text style={[styles.postUser, darkMode && styles.postUserDark]}>{item.userName || 'Usuario'}</Text>
              <Text style={[styles.postTime, darkMode && styles.postTimeDark]}>{formatRelativeTime(item.fecha)}</Text>
            </View>
          </View>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => setMenuOpen((v) => !v)}>
              <MaterialIcons name="more-vert" size={22} color={darkMode ? '#ddd' : '#444'} />
            </TouchableOpacity>
            {menuOpen && (
              <View
                style={{
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
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setMenuOpen(false);
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

        {/* Texto destacado si no hay media */}
        {isTextOnly && !!captionText && (
          <>
            <Text style={styles.captionText} numberOfLines={captionExpanded ? 0 : 8}>
              <Text style={styles.captionUser}>{(item.userName || 'usuario')}</Text> {renderRichText(captionText)}
            </Text>
            {showMore && (
              <TouchableOpacity onPress={() => setCaptionExpanded((e) => !e)} activeOpacity={0.8}>
                <Text style={[
                  styles.showMoreText,
                  darkMode && { color: '#9aa0b0' }
                ]}>
                  {captionExpanded ? 'Ver menos' : 'Ver más'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Media (solo si hay imagen o video) */}
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
                  onLoadStart={() => { setIsBuffering(true); setHasError(false); }}
                  onLoad={() => { setIsBuffering(false); }}
                  onReadyForDisplay={() => setIsBuffering(false)}
                  shouldPlay={isVisible && isScreenFocused}
                  isMuted={isMuted}
                  isLooping={false}
                  usePoster={!!thumbUri}
                  posterSource={thumbUri ? { uri: thumbUri } : undefined}
                />

                {/* progress */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={(e) => {
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

                {/* mute */}
                <TouchableOpacity
                  onPress={() => setIsMuted((m) => !m)}
                  style={{ position: 'absolute', right: 12, bottom: 28, backgroundColor: darkMode ? '#0008' : '#0008', padding: 8, borderRadius: 20 }}
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

        {/* Acciones */}
        <View style={styles.actionsRow}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity onPress={handleLike} activeOpacity={0.7} style={styles.actionBtnRow}>
              <FontAwesome name={liked ? 'heart' : 'heart-o'} size={22} color={liked ? '#e74c3c' : (darkMode ? '#eee' : '#222')} />
              <Text style={[styles.actionText, darkMode && styles.actionTextDark, liked && { color: '#e74c3c' }]}>Me gusta</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} style={styles.actionBtnRow}>
              <FontAwesome name="comment-o" size={20} color={darkMode ? '#fff' : '#222'} />
              <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>Comentar</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} style={styles.actionBtnRow}>
              <MaterialIcons name="share" size={22} color={darkMode ? '#fff' : '#222'} />
              <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>Compartir</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSaved((s) => !s)}>
            <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={26} color={darkMode ? '#eee' : '#222'} />
          </TouchableOpacity>
        </View>
        {/* Likes */}
        <Text style={[styles.likesText, darkMode && styles.likesTextDark]}>{formatCount(Math.max(0, likeCount))} Me gusta</Text>
        {/* Caption bajo media (si hay media) con ver más */}
        {!isTextOnly && !!captionText && (
          <>
            <Text style={[styles.captionText, darkMode && styles.captionTextDark]} numberOfLines={captionExpanded ? 0 : 2}>
              <Text style={styles.captionUser}>{(item.userName || 'usuario')}</Text> {renderRichText(captionText)}
            </Text>
            {showMore && (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setCaptionExpanded((e) => !e)}>
                <Text style={[
                  styles.showMoreText,
                  darkMode && { color: '#9aa0b0' }
                ]}>
                  {captionExpanded ? 'Ver menos' : 'Ver más'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Etiquetas */}
        {item.etiquetas && item.etiquetas.length > 0 && (
          <Etiquetas 
            etiquetasSeleccionadas={item.etiquetas}
            mostrarSoloSeleccionadas={true}
            estiloPersonalizado={{
              container: { paddingHorizontal: 12, paddingVertical: 8 },
              etiqueta: { 
                backgroundColor: 'transparent', // Sin fondo
                borderRadius: 12,
                marginRight: 6,
                marginBottom: 4
              },
              texto: { 
                fontSize: 12,
                color: '#007AFF' // Azul para ambos modos
              }
            }}
          />
        )}

        {/* Comentarios */}
        {comments.length > 0 && (
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.viewCommentsText}>Ver los {comments.length} comentarios</Text>
          </TouchableOpacity>
        )}
        {/* Tiempo */}
        <Text style={[styles.postTimeFooter, darkMode && styles.postTimeFooterDark]}>{formatRelativeTime(item.fecha)}</Text>
  </View>
  {/* Modal de reporte */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressOut={() => setReportModalVisible(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: '96%',
              maxWidth: 420,
              backgroundColor: darkMode ? '#171717' : '#fff',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: darkMode ? '#fff' : '#111', marginBottom: 12 }}>
              Reportar publicación
            </Text>
            <Text style={{ fontSize: 14, color: darkMode ? '#ccc' : '#444', marginBottom: 10 }}>
              Indica el motivo del reporte.
            </Text>
            {['Contenido inapropiado','Violencia','Odio o acoso','Spam o engaño','Otro'].map((motivo) => (
              <TouchableOpacity
                key={motivo}
                onPress={() => setReportReason(motivo)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: reportReason === motivo ? '#FF3B30' : (darkMode ? '#333' : '#e5e7eb'),
                  backgroundColor: reportReason === motivo ? (darkMode ? '#2a1b1b' : '#ffeceb') : 'transparent',
                }}
              >
                <Text style={{ color: darkMode ? '#eee' : '#222', fontWeight: reportReason === motivo ? '700' : '500' }}>{motivo}</Text>
              </TouchableOpacity>
            ))}
            <Text style={{ fontSize: 14, color: darkMode ? '#ccc' : '#444', marginTop: 6, marginBottom: 6 }}>Comentario (opcional)</Text>
            <TextInput
              value={reportText}
              onChangeText={setReportText}
              placeholder="Describe brevemente el problema"
              placeholderTextColor={darkMode ? '#888' : '#999'}
              multiline
              style={{
                minHeight: 80,
                borderWidth: 1,
                borderColor: darkMode ? '#333' : '#e5e7eb',
                borderRadius: 10,
                padding: 10,
                color: darkMode ? '#fff' : '#111',
                backgroundColor: darkMode ? '#111' : '#fafafa',
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginRight: 8, backgroundColor: darkMode ? '#333' : '#eee' }}>
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
                    setReportModalVisible(false);
                    setReportText('');
                    setReportReason('Contenido inapropiado');
                    Alert.alert('Gracias', 'Tu reporte ha sido enviado. Nuestro equipo lo revisará.');
                  } catch (err) {
                    Alert.alert('Error', err.message || 'No se pudo enviar el reporte. Verifica tu conexión.');
                  }
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#FF3B30' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar reporte</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
  </Modal>
  </>
     );
   };
  // Memoizar FeedItem para reducir re-renders si props no cambian
  const MemoFeedItem = useMemo(() => React.memo(FeedItem, (prev, next) => {
    const a = prev.item, b = next.item;
    return (
      a?.id === b?.id &&
      a?.mediaUrl === b?.mediaUrl &&
      a?.mediaType === b?.mediaType &&
      a?.text === b?.text &&
      prev.isVisible === next.isVisible &&
      prev.isScreenFocused === next.isScreenFocused
    );
  }), []);

  // Filtrar publicaciones por etiquetas seleccionadas
  const publicacionesFiltradas = useMemo(() => {
    if (etiquetasFiltro.length === 0) {
      return posts; // Si no hay filtros, mostrar todas
    }
    
    return posts.filter(post => {
      if (!post.etiquetas || post.etiquetas.length === 0) return false;
      // Verificar si al menos una etiqueta del filtro está en la publicación
      return etiquetasFiltro.some(filtro => 
        post.etiquetas.some(etiqueta => 
          etiqueta.toLowerCase().includes(filtro.toLowerCase())
        )
      );
    });
  }, [posts, etiquetasFiltro]);

  // Mostrar todas las publicaciones (con o sin media)
  const publicacionesValidas = publicacionesFiltradas;
  // Trackear items visibles para lazy-load de videos
  const [visibleIds, setVisibleIds] = useState(new Set());
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 75 });
  
  // Referencias para mantener valores actuales
  const postsRef = useRef(posts);
  const prefetchVideoRef = useRef(prefetchVideo);
  
  // Actualizar referencias cuando cambien los valores
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
  
  useEffect(() => {
    prefetchVideoRef.current = prefetchVideo;
  }, [prefetchVideo]);
  
  // Crear una referencia estable para onViewableItemsChanged
  const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
    const ids = new Set(viewableItems.map(v => v.item.id));
    setVisibleIds(ids);
    // Prefetch de videos cercanos (±2 posiciones alrededor de lo visible)
    try {
      const currentPosts = postsRef.current;
      const currentPrefetchVideo = prefetchVideoRef.current;
      
      const visibleIndexes = viewableItems
        .map(v => currentPosts.findIndex(p => p.id === v.item.id))
        .filter(i => i >= 0);
      const targets = new Set();
      for (const idx of visibleIndexes) {
        for (let d = -2; d <= 2; d++) {
          const t = idx + d;
          if (t >= 0 && t < currentPosts.length) targets.add(t);
        }
      }
      for (const t of targets) {
        const p = currentPosts[t];
        if (p?.mediaType === 'video' && p?.mediaUrl) {
          currentPrefetchVideo(p.mediaUrl);
        }
      }
    } catch (_) {
      // ignorar
    }
  });

  // Función estable que no cambia entre renders
  const onViewableItemsChanged = onViewableItemsChangedRef.current;

  // Memoizar renderItem y pasar isVisible a FeedItem
  const renderFeedItem = useCallback(({ item }) => (
    <MemoFeedItem item={item} isVisible={visibleIds.has(item.id)} isScreenFocused={isFocused} />
  ), [visibleIds, isFocused, MemoFeedItem]);
  return (
    <LinearGradient
      colors={darkMode ? ['#232526', '#414345'] : ['#ffffff', '#f7fbff']}
      style={{ flex: 1 }}
    >
      <View style={[styles.header, { backgroundColor: darkMode ? 'transparent' : '#fff' }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: darkMode ? '#fff' : '#000' }]}>Foro Universitario</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setMostrarBuscador(true)}
            >
              <MaterialIcons 
                name="search" 
                size={24} 
                color={darkMode ? '#fff' : '#000'} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, etiquetasFiltro.length > 0 && styles.filterButtonActive]}
              onPress={() => setMostrarFiltros(true)}
            >
              <MaterialIcons 
                name="filter-list" 
                size={24} 
                color={etiquetasFiltro.length > 0 ? '#007AFF' : (darkMode ? '#fff' : '#000')} 
              />
              {etiquetasFiltro.length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{etiquetasFiltro.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <FlatList
        data={publicacionesValidas}
        renderItem={renderFeedItem}
        keyExtractor={item => (item.id ? item.id.toString() : Math.random().toString())}
        contentContainerStyle={[styles.feed, { paddingBottom: 80 }]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        initialNumToRender={4}
        maxToRenderPerBatch={8}
        windowSize={7}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfigRef.current}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: darkMode ? '#2b2b2b' : '#eaeaea' }]} />
        )}
      />
      {/* Botón flotante para publicar */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: '#007AFF', shadowColor: '#007AFF' }]} onPress={() => setShowPublishModal(true)} activeOpacity={0.8}>
        <FontAwesome name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Modal de publicación (full-screen) */}
      <Modal visible={showPublishModal} animationType="slide" transparent={false}>
        <View style={styles.createModalContainer}>
          {/* Header */}
          <View style={styles.createHeader}>
            <TouchableOpacity onPress={() => setShowPublishModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={28} color="#111" />
            </TouchableOpacity>
            <Text style={styles.createHeaderTitle}>Crear Publicación</Text>
            <TouchableOpacity
              disabled={uploading || (!newPost.trim() && !previewMedia)}
              onPress={async () => { await handleAddPost(); }}
            >
              <Text style={[styles.createPublishAction, (uploading || (!newPost.trim() && !previewMedia)) && styles.createPublishActionDisabled]}>
                {uploading ? 'Publicando…' : 'Publicar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

          {/* Preview grande */}
          <View style={styles.previewLargeContainer}>
            {previewMedia ? (
              mediaType === 'video' && typeof Video !== 'undefined' ? (
                <Video source={{ uri: previewMedia.uri }} style={styles.previewLargeMedia} useNativeControls resizeMode="cover" />
              ) : (
                <Image source={{ uri: previewMedia.uri }} style={styles.previewLargeMedia} resizeMode="cover" />
              )
            ) : (
              <View style={[styles.previewLargeMedia, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f2f2' }]}>
                <MaterialIcons name="image" size={56} color="#c4c4c4" />
              </View>
            )}
            {previewMedia && (
              <TouchableOpacity
                onPress={() => { setPreviewMedia(null); setMediaType(null); }}
                style={styles.removeMediaBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Botón – seleccionar de la galería */}
          <TouchableOpacity
            style={styles.galleryPickerRow}
            onPress={() => pickMedia('all')}
            activeOpacity={0.8}
          >
            <View style={styles.galleryIconWrap}>
              <MaterialIcons name="image" size={18} color="#1976D2" />
            </View>
            <Text style={styles.galleryPickerText}>Seleccionar de la galería</Text>
          </TouchableOpacity>

          {/* Descripción */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="Escribe una descripción..."
            placeholderTextColor="#9aa0a6"
            value={newPost}
            onChangeText={setNewPost}
            multiline
          />

          {/* Componente de Etiquetas */}
          <Etiquetas 
            etiquetasSeleccionadas={etiquetasSeleccionadas}
            onEtiquetasChange={setEtiquetasSeleccionadas}
            maxEtiquetas={5}
            estiloPersonalizado={{
              container: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
              etiqueta: { borderRadius: 20 },
              texto: { fontSize: 13 }
            }}
          />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Filtros por Etiquetas */}
      <Modal visible={mostrarFiltros} animationType="slide" transparent={true}>
        <View style={styles.filterModalOverlay}>
          <View style={[styles.filterModalContent, { backgroundColor: darkMode ? '#222' : '#fff' }]}>
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: darkMode ? '#fff' : '#000' }]}>
                Filtrar por Etiquetas
              </Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <MaterialIcons name="close" size={24} color={darkMode ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>

            <Etiquetas 
              etiquetasSeleccionadas={etiquetasFiltro}
              onEtiquetasChange={setEtiquetasFiltro}
              maxEtiquetas={10}
              estiloPersonalizado={{
                container: { paddingVertical: 0 },
                etiqueta: { borderRadius: 20 },
                texto: { fontSize: 14 }
              }}
            />

            <View style={styles.filterModalButtons}>
              <TouchableOpacity 
                style={[styles.filterModalButton, styles.clearButton]}
                onPress={() => {
                  setEtiquetasFiltro([]);
                  setMostrarFiltros(false);
                }}
              >
                <Text style={styles.clearButtonText}>Limpiar Filtros</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterModalButton, styles.applyButton]}
                onPress={() => setMostrarFiltros(false)}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Buscador de Usuarios */}
      <BuscadorUsuarios 
        visible={mostrarBuscador}
        onClose={() => setMostrarBuscador(false)}
        onUsuarioSeleccionado={(usuario) => {
          // Navegar al perfil del usuario seleccionado
          setMostrarBuscador(false);
          navigation.navigate('PerfilUsuario', { usuario });
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 18,
    marginBottom: 8,
  },
  addPostContainer: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  mediaButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  buttonText: {
    color: '#fff',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#464646ff',
    marginTop: 2,
    marginBottom: 4,
  },
  previewContainer: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
    position: 'relative',
  },
  previewMedia: {
    width: 180,
    height: 180,
    borderRadius: 8,
  },
  clearPreviewButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  feed: {
    paddingBottom: 16,
  },
  // Mejora visual en la lista de publicaciones con video
  postCard: {
    backgroundColor: '#fff', // Cambiado de #1e1e1eff a #fff
    borderRadius: 18,
    marginBottom: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  feedCard: {
    backgroundColor: '#fff', // Cambiado de #171717ff a #fff
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
  postUser: {
    color: '#111',
    fontWeight: '600',
    fontSize: 14,
  },
  postUserDark: {
    color: '#fff',
  },
  postTime: {
    color: '#888', // Cambiado de #000000ff a #888
    fontSize: 12,
    marginTop: 2,
  },
  postTimeDark: {
    color: '#bbb',
  },
  mediaBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  mediaBoxDark: {
    backgroundColor: '#0f1720',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#222',
    fontSize: 14,
  },
  actionTextDark: {
    color: '#ffffff',
  },
  likesText: {
    color: '#111',
    fontWeight: '600',
    fontSize: 14,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  likesTextDark: {
    color: '#ddd',
  },
  captionText: {
    color: '#111',
    fontSize: 14,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  captionTextDark: {
    color: '#e6e6e6',
  },
  captionUser: {
    fontWeight: '600',
  },
  viewCommentsText: {
    color: '#666',
    fontSize: 14,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  viewCommentsTextDark: {
    color: '#bbb',
  },
  postTimeFooter: {
    color: '#999',
    fontSize: 12,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  postTimeFooterDark: {
    color: '#9aa0b0',
  },
  textOnlyCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eaeaea', // Cambiado de #000000ff a #eaeaea
    backgroundColor: '#fff', // Cambiado de #292929ff a #fff
    borderRadius: 12,
    padding: 12,
  },
  showMoreText: {
    color: '#666', // Cambiado de #090909ff a #666
    fontSize: 13,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  tagText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  mentionText: {
    color: '#1976D2',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  feedUser: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  feedMediaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    width: width,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  feedMedia: {
    width: width,
    height: width,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  // row with action icons and stats
  feedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 5,
    backgroundColor: 'transparent',
  },
  leftActionsRow: { flexDirection: 'row', alignItems: 'center' },
  feedText: {
    fontSize: 15,
    color: '#333',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  // legacy: feedActions removed
  feedActionBtn: {
    marginRight: 18,
  },
  feedStats: {
    fontSize: 13,
    color: '#888',
    marginLeft: 12,
    marginTop: 4,
  },
  // Estilos para likes y comentarios
  commentsSection: {
    marginTop: 10,
    paddingHorizontal: 12,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 4,
  },
  commentText: {
    color: '#333',
    fontSize: 15,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f2f6fa',
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    marginRight: 6,
  },
  commentSendBtn: {
    padding: 6,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#007AFF',
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  modalContentDark: {
    backgroundColor: '#121212',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#007AFF',
    textAlign: 'center',
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#eaeaea', // color por defecto
    width: '100%',
  },
  // Crear Publicación - estilos nuevos
  createModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  createHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  createHeaderTitleDark: {
    color: '#fff',
  },
  createPublishAction: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  createPublishActionDisabled: {
    color: '#b3d4ff',
  },
  previewLargeContainer: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  previewLargeMedia: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPickerRow: {
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e4e6eb',
    backgroundColor: '#fff',
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  galleryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  galleryPickerText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionInput: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e4e6eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#0f172a',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  descriptionInputDark: {
    color: '#fff',
  },
  
  // Estilos para el header con filtros
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Estilos para el modal de filtros
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  filterModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  clearButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#007AFF',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});


