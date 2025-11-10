import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet, TouchableOpacity, Platform, Modal, Dimensions, Animated, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { supabase } from '../../Supabase/supabaseClient';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
const { width } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';

// Añadir imports para tema y gradiente
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import Etiquetas from '../components/Etiquetas';
import BuscadorUsuarios from '../components/BuscadorUsuarios';
import FeedList from '../publications/FeedList';
import CreatePublicationModal from '../publications/CreatePublicationModal';

// Esta mierda ya la devolvi a 20 antes de que se joda todo
// Si vuelve a joderse, gogo.
// Ayuda: Me estou dando cuenta que el error viene de aqui
// Asi que lo dejo en 2024
// Si vuelve a joderse, gogo. Ayuda: Me estou dando cuenta que el error viene de aqui
// Asi que lo dejo en 2024
// Si vuelve a joderse, gogo. Ayuda: Me estou dando cuenta que el error viene de aqui     



// Buffer polyfill no longer needed here after refactor

export default function HomeScreen({ onLogout, navigation }) {
  const isFocused = useIsFocused();
  const { darkMode } = useTheme();
  const responsive = useResponsive();

  // Guardar medidas del header tal como quedan en el primer render y no volver a recalcular
  const insets = useSafeAreaInsets();
  const initialHeaderCaptured = useRef(false);
  const [fixedHeaderHeight, setFixedHeaderHeight] = useState(Platform.OS === 'android' ? 80 : 60);
  const [fixedHeaderPaddingTop, setFixedHeaderPaddingTop] = useState(Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0));

  useEffect(() => {
    if (initialHeaderCaptured.current) return;
    // Capturamos lo que el sistema nos da en el primer render y lo fijamos
    const padTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : (insets.top || 0);
    const base = Platform.OS === 'android' ? 80 : 60;
    setFixedHeaderPaddingTop(padTop);
    setFixedHeaderHeight(base); // si quieres ajustar la base inicial, cámbialo aquí
    initialHeaderCaptured.current = true;
  }, []);

  const [posts, setPosts] = useState([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [etiquetasFiltro, setEtiquetasFiltro] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);
  // Token para forzar cierre de menús (FeedItem) ante acciones globales como buscar/filtrar
  const [feedInteractionToken, setFeedInteractionToken] = useState(0);
  const slideAnimFiltros = useRef(new Animated.Value(600)).current;

  // Video prefetch is handled inside FeedItem now

  // Helper: mapear fila de publicaciones a modelo para el feed con datos de usuario
  const mapPublicationToPost = useCallback(async (pub) => {
    let userName = 'Usuario';
    let userAvatar = null;
    if (pub?.carnet_usuario) {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nombre, foto_perfil')
        .eq('carnet', pub.carnet_usuario)
        .single();
      if (!userError && userData) {
        userName = userData.nombre || userName;
        userAvatar = userData.foto_perfil || null;
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

  // Animación del modal de filtros
  useEffect(() => {
    if (mostrarFiltros) {
      slideAnimFiltros.setValue(600);
      Animated.spring(slideAnimFiltros, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnimFiltros, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [mostrarFiltros]);

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

  // List rendering is now handled by the modular FeedList component.

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
  // Feed viewability and rendering are encapsulated in FeedList now.

  return (
    <LinearGradient
      colors={darkMode ? ['#111111ff', '#1d1e1fff'] : ['#ffffff', '#f7fbff']}
      style={{ flex: 1 }}
    >
      {/* Reservar safe-area / status bar aquí — constante siempre */}
      <View style={{ paddingTop: Math.max(10, insets.top + 4), backgroundColor: darkMode ? '#111' : '#fff' }}>
        <View style={styles.header}>
          {/* Título y botones mantienen la misma distribución inicial */}
          <Text style={[styles.headerTitle, { color: darkMode ? '#ffffffff' : '#000000ff' }]}>Foro Universitario</Text>

          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => { setFeedInteractionToken(t => t + 1); setMostrarBuscador(true); }}
            >
              <MaterialIcons name="search" 
              size={24} 
              color={darkMode ? '#ffffffff' : '#000000ff'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.filterButton,
                etiquetasFiltro.length > 0 && { backgroundColor: 'rgba(0,122,255,0.1)' }
              ]}
              onPress={() => { setFeedInteractionToken(t => t + 1); setMostrarFiltros(true); }}
            >
              <MaterialIcons name="filter-list" 
              size={24} 
               color={etiquetasFiltro.length > 0 ? '#007AFF' : (darkMode ? '#ffffffff' : '#000000ff')} 
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
      <FeedList
        posts={publicacionesValidas}
        isScreenFocused={isFocused}
        closeSignal={feedInteractionToken}
      />
      {/* Botón flotante para publicar */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: '#007AFF', shadowColor: '#007AFF' }]} onPress={() => setShowPublishModal(true)} activeOpacity={0.8}>
        <FontAwesome name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Modal de publicación (full-screen) */}
      {showPublishModal && (
        <CreatePublicationModal
          visible={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onPublished={() => { setShowPublishModal(false); fetchPostsFromDB(); }}
        />
      )}

      {/* Modal de Filtros por Etiquetas */}
      <Modal
        visible={mostrarFiltros}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMostrarFiltros(false)}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setMostrarFiltros(false)}
        >
          <Animated.View
            style={[
              styles.filterModalContent,
              { backgroundColor: darkMode ? '#222' : '#fff' },
              { transform: [{ translateY: slideAnimFiltros }] }
            ]}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.filterModalHeader}>
                <Text style={[styles.filterModalTitle, { color: darkMode ? '#ffffffff' : '#000000ff' }]}>
                  Filtrar por Etiquetas
                </Text>
                <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                  <MaterialIcons name="close" size={24} color={darkMode ? '#ffffffff' : '#000000ff'} />
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
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between', // título a la izquierda, botones a la derecha
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left', // asegurar alineación izquierda
    // quitar flex:1 para que no ocupe todo el espacio
  },
  headerButtons: {
    // quitar position: 'absolute' para que participe del layout natural
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
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
  createModalContainerDark: {
    backgroundColor: '#0b0f14',
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
  createPublishActionDark: {
    color: '#66b2ff',
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
  previewLargeContainerDark: {
    backgroundColor: '#111',
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
  galleryPickerRowDark: {
    borderColor: '#333',
    backgroundColor: '#0f1720',
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
  galleryIconWrapDark: {
    backgroundColor: '#0b2640',
  },
  galleryPickerText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryPickerTextDark: {
    color: '#dbeafe',
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
    backgroundColor: '#121212',
    borderColor: '#333',
  },
  
  // Estilos para el header con filtros
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 48, // altura fija del contenido
    paddingVertical: 4,
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
    color: '#000',
  },
  filterModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  filterModalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
