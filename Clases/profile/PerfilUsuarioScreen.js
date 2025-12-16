import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import PublicationModal from '../publications/PublicationModal';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { getUserByCarnet } from '../../src/services/users';
import { listPosts } from '../../src/services/posts';

const { width, height } = Dimensions.get('window');

const PerfilUsuarioScreen = ({ route, navigation }) => {
  const { usuario } = route.params || {}; // Usuario seleccionado del buscador
  const { darkMode } = useTheme();
  
  // Validar que el usuario existe
  if (!usuario) {
    const basicStyles = createStyles(darkMode);
    return (
      <View style={[basicStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialIcons name="error" size={48} color="#ff6b6b" />
        <Text style={{ color: darkMode ? '#fff' : '#333', fontSize: 16, marginTop: 10 }}>
          Usuario no encontrado
        </Text>
        <TouchableOpacity
          style={{ marginTop: 20, padding: 10, backgroundColor: '#007AFF', borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [publicaciones, setPublicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarioCompleto, setUsuarioCompleto] = useState(usuario);
  const [estadisticas, setEstadisticas] = useState({
    totalPublicaciones: 0,
    totalMeGusta: 0,
  });

  // Estados para control de video
  const isFocused = useIsFocused();
  const videoRefs = useRef(new Map());
  const publicacionRefs = useRef(new Map());
  const scrollViewRef = useRef(null);
  const [visibleVideoIds, setVisibleVideoIds] = useState(new Set()); // mantenido si futuro auto-play requerido
  const [selectedPost, setSelectedPost] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const scrollTimer = useRef(null);

  const styles = createStyles(darkMode);

  useEffect(() => {
    if (usuario && usuario.carnet) {
      cargarPerfilCompleto();
    }
  }, [usuario?.carnet]);

  // Cargar publicaciones cuando usuarioCompleto cambie
  useEffect(() => {
    if (usuarioCompleto && usuarioCompleto.carnet) {
      cargarPublicaciones();
    }
  }, [usuarioCompleto?.carnet]);

  // Manejar focus de la pantalla para videos
  useEffect(() => {
    if (!isFocused) {
      // Pausar todos los videos cuando se pierde el foco
      videoRefs.current.forEach(async (videoRef) => {
        if (videoRef) {
          try {
            await videoRef.pauseAsync();
          } catch (error) {
            // Ignorar errores
          }
        }
      });
      setVisibleVideoIds(new Set());
    }
  }, [isFocused]);

  // Limpiar refs cuando se desmonta el componente
  useEffect(() => {
    return () => {
      videoRefs.current.clear();
      publicacionRefs.current.clear();
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, []);

  // Actualizar videos visibles al cargar publicaciones
  useEffect(() => {
    // autoplay removido
  }, [publicaciones.length, isFocused]);

  // Detectar cambios en dimensiones de pantalla
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      // Reaccionar a cambios de orientación si es necesario
    });

    return () => subscription?.remove();
  }, []);

  // Función para actualizar videos visibles basado en scroll
  // Eliminado updateVisibleVideos para evitar ReferenceError; se puede reintroducir si se decide auto-play.

  // Manejar scroll
  const handleScroll = useCallback((event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    setScrollY(currentScrollY);
    // debounce sin acción; autoplay removido
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {}, 50);
  }, []);

  const cargarPerfilCompleto = async () => {
    try {
      setLoading(true);
      await Promise.all([
        cargarInformacionUsuario(),
        cargarPublicaciones(),
        cargarEstadisticas(),
      ]);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil del usuario');
    } finally {
      setLoading(false);
    }
  };

  const cargarInformacionUsuario = async () => {
    try {
      if (!usuario?.carnet) return;
      
      // Si ya tenemos información completa, no necesitamos cargar más
      if (usuario.correo || usuario.carrera || usuario.biografia) {
        setUsuarioCompleto(usuario);
        return;
      }

      // Cargar información completa del usuario
      const data = await getUserByCarnet(usuario.carnet);
      setUsuarioCompleto(data || usuario);
    } catch (error) {
      console.error('Error inesperado al cargar información del usuario:', error);
      setUsuarioCompleto(usuario);
    }
  };

  const cargarPublicaciones = async (retryCount = 0) => {
    try {
      const usuarioParaConsulta = usuarioCompleto || usuario;
      if (!usuarioParaConsulta?.carnet) {
        return;
      }

      const all = await listPosts();
      const filtered = (all || [])
        .filter((p) => String(p?.carnet_usuario) === String(usuarioParaConsulta.carnet))
        .sort((a, b) => new Date(b?.fecha_publicacion || 0) - new Date(a?.fecha_publicacion || 0))
        .slice(0, 20);
      setPublicaciones(filtered);
    } catch (error) {
      console.error('Error al cargar publicaciones:', error);
      
      // Reintentar hasta 3 veces en caso de errores de red
      if (retryCount < 3 && (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch'))) {
        console.log(`Reintentando cargar publicaciones (intento ${retryCount + 1}/3)...`);
        setTimeout(() => {
          cargarPublicaciones(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Delay incremental: 2s, 4s, 6s
      }
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const usuarioParaConsulta = usuarioCompleto || usuario;
      if (!usuarioParaConsulta?.carnet) return;

      const all = await listPosts().catch(() => []);
      const totalPubs = (all || []).filter((p) => String(p?.carnet_usuario) === String(usuarioParaConsulta.carnet)).length;
      setEstadisticas({
        totalPublicaciones: totalPubs || 0,
        totalMeGusta: 0, // Por ahora, cuando implementes likes puedes agregarlo
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarPerfilCompleto();
    setRefreshing(false);
  };

  const formatearFecha = (fecha) => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const formatearFechaNacimiento = (fecha) => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  // Función helper para procesar etiquetas de manera segura
  const procesarEtiquetas = (etiquetas) => {
    if (!etiquetas) return [];
    
    // Si ya es un array, devolverlo
    if (Array.isArray(etiquetas)) return etiquetas;
    
    // Si es un string, intentar parsearlo como JSON
    if (typeof etiquetas === 'string') {
      try {
        const parsed = JSON.parse(etiquetas);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        // Si falla el parsing, intentar dividir por comas
        return etiquetas.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }
    
    return [];
  };

  const renderPublicacion = (publicacion, index) => {
    const esVideo = publicacion.tipo_contenido === 'video' || 
                   publicacion.contenido === 'video' ||
                   publicacion.archivo_url?.includes('.mp4') ||
                   publicacion.archivo_url?.includes('.mov');
    const isVisible = visibleVideoIds.has(publicacion.id);

    return (
    <View 
      key={publicacion.id} 
      style={styles.publicacionCard}
      ref={(ref) => {
        if (ref) {
          publicacionRefs.current.set(publicacion.id, ref);
        } else {
          publicacionRefs.current.delete(publicacion.id);
        }
      }}
      onLayout={() => {
        // Actualizar visibilidad inmediatamente cuando cambia el layout
        if (scrollTimer.current) {
          clearTimeout(scrollTimer.current);
        }
  // Eliminado llamado a updateVisibleVideos (no existe). Si se reintroduce autoplay, implementar función primero.
  // scrollTimer.current = setTimeout(() => updateVisibleVideos(), 50);
      }}
    >
      <View style={styles.publicacionHeader}>
        <View style={styles.autorInfo}>
          <Image
            source={{
              uri: usuarioCompleto?.foto_perfil || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'
            }}
            style={styles.avatarPequeno}
          />
          <View style={styles.autorTexto}>
            <Text style={styles.nombreAutor}>{usuarioCompleto?.nombre || 'Usuario'}</Text>
            <Text style={styles.fechaPublicacion}>
              {formatearFecha(publicacion.fecha_publicacion)}
            </Text>
          </View>
        </View>
      </View>
      
      {publicacion.contenido && (
        <Text style={styles.contenidoPublicacion}>
          {publicacion.contenido}
        </Text>
      )}

      {/* Renderizar contenido multimedia */}
      {(publicacion.archivo_url || publicacion.url_imagen) && (
        <View style={styles.mediaContainer}>
          {esVideo ? (
            <View 
              style={styles.videoWrapper}
            >
              <Video
                ref={(ref) => {
                  if (ref) {
                    videoRefs.current.set(publicacion.id, ref);
                  } else {
                    videoRefs.current.delete(publicacion.id);
                  }
                }}
                source={{ uri: publicacion.archivo_url }}
                style={styles.videoPublicacion}
                useNativeControls={false}
                resizeMode="cover"
                shouldPlay={isVisible && isFocused}
                isMuted={isMuted}
                isLooping={true}
              />
              {/* Overlay para controles manuales */}
              <TouchableOpacity
                style={styles.videoOverlay}
                onPress={() => {
                  setVisibleVideoIds(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(publicacion.id)) {
                      newSet.delete(publicacion.id);
                    } else {
                      // Pausar otros videos y reproducir este
                      newSet.clear();
                      newSet.add(publicacion.id);
                    }
                    return newSet;
                  });
                }}
              >
                {!isVisible && (
                  <View style={styles.playButton}>
                    <MaterialIcons 
                      name="play-arrow" 
                      size={50} 
                      color="rgba(255,255,255,0.9)" 
                    />
                  </View>
                )}
              </TouchableOpacity>

              {/* Botón de mute/unmute */}
              <TouchableOpacity
                style={styles.muteButton}
                onPress={() => setIsMuted(!isMuted)}
              >
                <View style={styles.muteButtonBackground}>
                  <MaterialIcons 
                    name={isMuted ? "volume-off" : "volume-up"} 
                    size={20} 
                    color="white" 
                  />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <Image 
              source={{ uri: publicacion.archivo_url || publicacion.url_imagen }}
              style={styles.imagenPublicacion}
              resizeMode="cover"
              onError={(error) => {/* Error logging removido */}}
            />
          )}
        </View>
      )}

      {(() => {
        const etiquetasProcesadas = procesarEtiquetas(publicacion.etiquetas);
        return etiquetasProcesadas.length > 0 && (
          <View style={styles.etiquetasContainer}>
            {etiquetasProcesadas.map((etiqueta, index) => (
              <View key={index} style={styles.etiqueta}>
                <Text style={styles.etiquetaTexto}>#{etiqueta}</Text>
              </View>
            ))}
          </View>
        );
      })()}
    </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* Header del perfil */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={darkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        
        <View style={styles.perfilInfo}>
          <Image
            source={{
              uri: usuarioCompleto?.foto_perfil || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'
            }}
            style={styles.avatarGrande}
          />
          <Text style={styles.nombreUsuario}>{usuarioCompleto?.nombre || 'Usuario'}</Text>
          <Text style={styles.carnetUsuario}>@{usuarioCompleto?.carnet || 'usuario'}</Text>
          
          {/* Información adicional del usuario */}
          <View style={styles.infoAdicionalContainer}>
            {usuarioCompleto?.carrera && (
              <View style={styles.infoAdicional}>
                <MaterialIcons name="school" size={16} color={darkMode ? '#aaa' : '#666'} />
                <Text style={styles.infoTexto}>{usuarioCompleto.carrera}</Text>
              </View>
            )}
            
            {usuarioCompleto?.correo && (
              <View style={styles.infoAdicional}>
                <MaterialIcons name="email" size={16} color={darkMode ? '#aaa' : '#666'} />
                <Text style={styles.infoTexto}>{usuarioCompleto.correo}</Text>
              </View>
            )}
            
            {usuarioCompleto?.fecha_nacimiento && (
              <View style={styles.infoAdicional}>
                <MaterialIcons name="cake" size={16} color={darkMode ? '#aaa' : '#666'} />
                <Text style={styles.infoTexto}>
                  {formatearFechaNacimiento(usuarioCompleto.fecha_nacimiento)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.estadisticasContainer}>
        <View style={styles.estadisticaItem}>
          <Text style={styles.estadisticaNumero}>{estadisticas.totalPublicaciones}</Text>
          <Text style={styles.estadisticaLabel}>Publicaciones</Text>
        </View>
        <View style={styles.estadisticaItem}>
          <Text style={styles.estadisticaNumero}>{estadisticas.totalMeGusta}</Text>
          <Text style={styles.estadisticaLabel}>Me gusta</Text>
        </View>
      </View>

      {/* Biografía del usuario */}
      {usuarioCompleto?.biografia && (
        <View style={styles.biografiaContainer}>
          <Text style={styles.biografiaTitulo}>Biografía</Text>
          <Text style={styles.biografiaTexto}>{usuarioCompleto.biografia}</Text>
        </View>
      )}

      {/* Sección de publicaciones */}
      <View style={styles.publicacionesSection}>
        <Text style={styles.sectionTitle}>Publicaciones</Text>
        
        {publicaciones.length === 0 ? (
          <View style={styles.sinPublicaciones}>
            <MaterialIcons name="post-add" size={48} color="#ccc" />
            <Text style={styles.sinPublicacionesText}>
              Este usuario aún no ha publicado nada
            </Text>
          </View>
        ) : (
          publicaciones.map((publicacion, index) => renderPublicacion(publicacion, index))
        )}
      </View>
    </ScrollView>
  );
};

const createStyles = (darkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkMode ? '#121212' : '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkMode ? '#121212' : '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: darkMode ? '#fff' : '#333',
  },
  headerContainer: {
    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#e0e0e0',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  perfilInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  avatarGrande: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  nombreUsuario: {
    fontSize: 24,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#333',
    marginBottom: 5,
  },
  carnetUsuario: {
    fontSize: 16,
    color: darkMode ? '#aaa' : '#666',
  },
  infoAdicionalContainer: {
    marginTop: 15,
    width: '100%',
  },
  infoAdicional: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  infoTexto: {
    fontSize: 14,
    color: darkMode ? '#ccc' : '#555',
    marginLeft: 8,
    flex: 1,
  },
  estadisticasContainer: {
    flexDirection: 'row',
    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#e0e0e0',
  },
  estadisticaItem: {
    alignItems: 'center',
  },
  estadisticaNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#333',
  },
  estadisticaLabel: {
    fontSize: 14,
    color: darkMode ? '#aaa' : '#666',
    marginTop: 2,
  },
  biografiaContainer: {
    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#e0e0e0',
  },
  biografiaTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#333',
    marginBottom: 10,
  },
  biografiaTexto: {
    fontSize: 15,
    color: darkMode ? '#ccc' : '#555',
    lineHeight: 22,
  },
  publicacionesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#333',
    marginBottom: 15,
  },
  publicacionCard: {
    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  publicacionHeader: {
    marginBottom: 10,
  },
  autorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPequeno: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  autorTexto: {
    flex: 1,
  },
  nombreAutor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#333',
  },
  fechaPublicacion: {
    fontSize: 12,
    color: darkMode ? '#aaa' : '#666',
  },
  contenidoPublicacion: {
    fontSize: 16,
    color: darkMode ? '#fff' : '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  mediaContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    height: Platform.OS === 'web' ? 250 : 200, // Altura ligeramente diferente para web
  },
  imagenPublicacion: {
    width: '100%',
    height: Platform.OS === 'web' ? 250 : 200, // Consistente con video
    borderRadius: 8,
  },
  videoPublicacion: {
    width: '100%',
    height: Platform.OS === 'web' ? 250 : 200, // Consistente con wrapper
    borderRadius: 8,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  muteButtonBackground: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etiquetasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  etiqueta: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  etiquetaTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  sinPublicaciones: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sinPublicacionesText: {
    fontSize: 16,
    color: darkMode ? '#aaa' : '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default PerfilUsuarioScreen;