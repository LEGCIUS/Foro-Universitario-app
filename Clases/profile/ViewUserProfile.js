import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../Supabase/supabaseClient';
// Eliminado zoom avanzado: usamos solo Image ampliada

const { width } = Dimensions.get('window');

const ViewUserProfile = ({ route, navigation }) => {
  const { userId } = route.params || {}; // carnet del usuario a ver
  const { darkMode } = useTheme();
  const isFocused = useIsFocused();

  const [usuario, setUsuario] = useState(null);
  const [publicaciones, setPublicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [miCarnet, setMiCarnet] = useState(null); // Carnet del usuario logueado
  const [estadisticas, setEstadisticas] = useState({
    totalPublicaciones: 0,
    totalMeGusta: 0,
  });

  // Estados para control de video
  const videoRefs = useRef(new Map());
  const publicacionRefs = useRef(new Map());
  const scrollViewRef = useRef(null);
  const [visibleVideoIds, setVisibleVideoIds] = useState(new Set());
  const [isMuted, setIsMuted] = useState(false);
  const scrollTimer = useRef(null);

  // Estados para modal de publicación seleccionada
  const [selectedPost, setSelectedPost] = useState(null);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showZoom, setShowZoom] = useState(false);
  const [videoKey, setVideoKey] = useState(0);
  
  // Estado para zoom de foto de perfil
  const [showProfilePicZoom, setShowProfilePicZoom] = useState(false);

  // Estados para menú y reporte
  const [menuVisible, setMenuVisible] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportText, setReportText] = useState('');

  const styles = createStyles(darkMode);

  useEffect(() => {
    const obtenerMiCarnet = async () => {
      const carnet = await AsyncStorage.getItem('carnet');
      setMiCarnet(carnet);
    };
    obtenerMiCarnet();
  }, []);

  useEffect(() => {
    if (userId) {
      cargarPerfil();
    }
  }, [userId]);

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
    } else {
      // Cuando vuelve el foco, actualizar videos visibles
      setTimeout(() => updateVisibleVideos(), 100);
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
    if (publicaciones.length > 0 && isFocused) {
      setTimeout(() => updateVisibleVideos(), 200);
    }
  }, [publicaciones.length, isFocused]);

  const updateVisibleVideos = useCallback(() => {
    if (!publicaciones.length || !isFocused) return;
    
    const newVisibleIds = new Set();
    let processed = 0;
    const videosCount = publicaciones.filter(p => 
      p.contenido === 'video' || 
      p.archivo_url?.includes('.mp4') || 
      p.archivo_url?.includes('.mov')
    ).length;
    
    if (videosCount === 0) return;
    
    publicaciones.forEach((publicacion) => {
      const esVideo = publicacion.contenido === 'video' || 
                     publicacion.archivo_url?.includes('.mp4') || 
                     publicacion.archivo_url?.includes('.mov');
      
      if (!esVideo) return;
      
      const publicacionRef = publicacionRefs.current.get(publicacion.id);
      if (publicacionRef) {
        publicacionRef.measure((x, y, width, height, pageX, pageY) => {
          if (pageY !== undefined && pageY !== null) {
            const videoTop = pageY;
            const videoBottom = pageY + height;
            const screenHeight = Dimensions.get('window').height;
            
            const visibleTop = Math.max(videoTop, 0);
            const visibleBottom = Math.min(videoBottom, screenHeight);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const percentVisible = visibleHeight / height;
            
            if (percentVisible >= 0.6) {
              newVisibleIds.add(publicacion.id);
            }
          }
          
          processed++;
          if (processed === videosCount) {
            setVisibleVideoIds(prev => {
              const hasChanges = prev.size !== newVisibleIds.size || 
                                [...newVisibleIds].some(id => !prev.has(id)) ||
                                [...prev].some(id => !newVisibleIds.has(id));
              return hasChanges ? newVisibleIds : prev;
            });
          }
        });
      } else {
        processed++;
      }
    });
  }, [publicaciones, isFocused]);

  const handleScroll = useCallback((event) => {
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }
    scrollTimer.current = setTimeout(() => {
      updateVisibleVideos();
    }, 50);
  }, [updateVisibleVideos]);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      await Promise.all([
        cargarInformacionUsuario(),
        cargarPublicaciones(),
        cargarEstadisticas(),
      ]);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarInformacionUsuario = async () => {
    try {
      if (!userId) return;

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('carnet', userId)
        .single();

      if (error) {
        console.error('Error al cargar información del usuario:', error);
        return;
      }

      setUsuario(data);
    } catch (error) {
      console.error('Error inesperado al cargar información del usuario:', error);
    }
  };

  const cargarPublicaciones = async (retryCount = 0) => {
    try {
      if (!userId) return;
      
      const { data, error } = await supabase
        .from('publicaciones')
        .select('*')
        .eq('carnet_usuario', userId)
        .order('fecha_publicacion', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      setPublicaciones(data || []);
    } catch (error) {
      console.error('Error al cargar publicaciones:', error);
      
      if (retryCount < 3 && (error.message?.includes('timeout') || error.message?.includes('network') || error.message?.includes('fetch'))) {
        console.log(`Reintentando cargar publicaciones (intento ${retryCount + 1}/3)...`);
        setTimeout(() => {
          cargarPublicaciones(retryCount + 1);
        }, 2000 * (retryCount + 1));
      }
    }
  };

  const cargarEstadisticas = async () => {
    try {
      if (!userId) return;
      
      const { count: totalPubs, error: errorPubs } = await supabase
        .from('publicaciones')
        .select('*', { count: 'exact', head: true })
        .eq('carnet_usuario', userId);

      if (errorPubs) {
        console.error('Error al contar publicaciones:', errorPubs);
      }

      setEstadisticas({
        totalPublicaciones: totalPubs || 0,
        totalMeGusta: 0,
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarPerfil();
    setRefreshing(false);
  };

  const renderPublicacionGrid = () => {
    // Agrupa publicaciones en filas de dos
    const filas = [];
    for (let i = 0; i < publicaciones.length; i += 2) {
      filas.push(publicaciones.slice(i, i + 2));
    }

    return filas.map((fila, idx) => (
      <View key={idx} style={{ flexDirection: 'row', marginBottom: 10 }}>
        {fila.map((pub, j) => (
          <TouchableOpacity
            key={j}
            style={{
              flex: 1,
              aspectRatio: 1,
              marginHorizontal: 4,
              backgroundColor: '#e7edf3',
              borderRadius: 8,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => {
              setSelectedPost(pub);
              setLikes(pub.likes || 0);
              setComments(pub.comentarios || []);
              setVideoKey(0);
            }}
          >
            {pub.contenido === 'image' && pub.archivo_url && (
              <Image
                source={{ uri: pub.archivo_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}
            {pub.contenido === 'video' && pub.archivo_url && (
              <Video
                source={{ uri: pub.archivo_url }}
                style={{ width: '100%', height: '100%' }}
                useNativeControls={false}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        ))}
        {fila.length === 1 && (
          <View
            style={{
              flex: 1,
              aspectRatio: 1,
              marginHorizontal: 4,
              backgroundColor: 'transparent',
              borderRadius: 8,
            }}
          />
        )}
      </View>
    ));
  };

  const renderPublicacion = (publicacion, index) => {
    const esVideo = publicacion.contenido === 'video' || 
                   publicacion.archivo_url?.includes('.mp4') || 
                   publicacion.archivo_url?.includes('.mov');
    const esImagen = publicacion.contenido === 'imagen' || 
                    publicacion.archivo_url?.includes('.jpg') || 
                    publicacion.archivo_url?.includes('.jpeg') || 
                    publicacion.archivo_url?.includes('.png');
    const isVisible = visibleVideoIds.has(publicacion.id);

    return (
      <View 
        key={publicacion.id}
        ref={(ref) => {
          if (ref && esVideo) {
            publicacionRefs.current.set(publicacion.id, ref);
          }
        }}
        style={styles.publicacionCard}
      >
        {/* Texto de la publicación */}
        {publicacion.titulo && (
          <Text style={styles.publicacionTexto}>{publicacion.titulo}</Text>
        )}

        {/* Media (imagen o video) */}
        {esImagen && publicacion.archivo_url && (
          <Image 
            source={{ uri: publicacion.archivo_url }} 
            style={styles.publicacionMedia}
            resizeMode="cover"
          />
        )}

        {esVideo && publicacion.archivo_url && (
          <View style={styles.videoContainer}>
            <Video
              ref={(ref) => {
                if (ref) {
                  videoRefs.current.set(publicacion.id, ref);
                }
              }}
              source={{ uri: publicacion.archivo_url }}
              style={styles.publicacionMedia}
              resizeMode="cover"
              shouldPlay={isVisible && isFocused}
              isLooping
              isMuted={isMuted}
              useNativeControls={false}
            />
            <TouchableOpacity
              style={styles.muteButton}
              onPress={() => setIsMuted(!isMuted)}
            >
              <MaterialIcons 
                name={isMuted ? 'volume-off' : 'volume-up'} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Fecha de publicación */}
        <Text style={styles.publicacionFecha}>
          {new Date(publicacion.fecha_publicacion).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <MaterialIcons name="error" size={48} color="#ff6b6b" />
        <Text style={styles.errorText}>Usuario no encontrado</Text>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header fijo que sigue al scroll */}
      <View style={[styles.fixedHeader, darkMode && styles.fixedHeaderDark]}>
        <TouchableOpacity
          style={styles.fixedBackButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={darkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

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
          <View style={styles.perfilInfo}>
          <TouchableOpacity onPress={() => setShowProfilePicZoom(true)}>
            <Image
              source={{
                uri: usuario?.foto_perfil || `https://i.pravatar.cc/150?u=${usuario?.carnet || 'default'}`
              }}
              style={styles.avatarGrande}
            />
          </TouchableOpacity>
          <Text style={styles.nombreUsuario}>{usuario?.nombre || 'Usuario'}</Text>
          <Text style={styles.carnetUsuario}>@{usuario?.carnet || 'usuario'}</Text>
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
          renderPublicacionGrid()
        )}
      </View>

      {/* Modal para ver publicación seleccionada */}
      <Modal
        visible={!!selectedPost}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedPost(null);
          setMenuVisible(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => {
            setSelectedPost(null);
            setMenuVisible(null);
          }}
        >
          <View style={styles.centeredView}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContent, darkMode && styles.modalContentDark]}
              onPress={() => setMenuVisible(null)}
            >
             
              {/* Menú de tres puntos en el modal */}
              {selectedPost && selectedPost.carnet_usuario !== miCarnet && (
                <View style={styles.overlayButtons}>
                  <TouchableOpacity 
                    onPress={() => setMenuVisible(menuVisible === selectedPost.id ? null : selectedPost.id)}
                    style={styles.overlayButton}
                  >
                    <MaterialIcons name="more-vert" size={24} color="#fff" />
                  </TouchableOpacity>

                  {menuVisible === selectedPost.id && (
                    <View style={[styles.overlayMenu, darkMode && styles.overlayMenuDark]}>
                      <TouchableOpacity
                        onPress={() => {
                          setMenuVisible(null);
                          setReportModalVisible(true);
                        }}
                        style={styles.overlayMenuItem}
                      >
                        <MaterialIcons name="flag" size={18} color="#FF3B30" />
                        <Text style={[styles.overlayMenuText, darkMode && styles.overlayMenuTextDark, { color: '#FF3B30' }]}>Reportar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              {selectedPost?.contenido === 'image' && (
                <>
                  <TouchableOpacity onPress={() => {
                    setMenuVisible(null);
                    setShowZoom(true);
                  }}>
                    <Image
                      source={{ uri: selectedPost.archivo_url }}
                      style={styles.previewMedia}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Modal
                    visible={showZoom}
                    transparent={true}
                    onRequestClose={() => setShowZoom(false)}
                  >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
                      <TouchableOpacity activeOpacity={1} style={{ flex:1 }} onPress={() => setShowZoom(false)}>
                        <Image
                          source={{ uri: selectedPost.archivo_url }}
                          style={{ width:'100%', height:'100%', resizeMode:'contain' }}
                        />
                      </TouchableOpacity>
                    </View>
                  </Modal>
                </>
              )}
              {selectedPost?.contenido === 'video' && (
                <Video
                  key={videoKey}
                  source={{ uri: selectedPost.archivo_url }}
                  style={styles.previewMedia}
                  useNativeControls
                  resizeMode="contain"
                  onEnd={() => setVideoKey(prev => prev + 1)}
                />
              )}
              <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>
                {selectedPost?.titulo}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setLikes(likes + 1)} style={{ marginRight: 8 }}>
                  <MaterialIcons name="thumb-up" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={[styles.likesText, darkMode && styles.likesTextDark]}>
                  {likes} Me gusta
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 8, color: darkMode ? '#fff' : '#222', fontSize: 16 }]}>
                Comentarios:
              </Text>
              <ScrollView style={{ maxHeight: 80, marginBottom: 8 }}>
                {comments.length === 0 ? (
                  <Text style={[styles.placeholderText, darkMode && styles.placeholderTextDark]}>
                    Sin comentarios.
                  </Text>
                ) : (
                  comments.map((c, idx) => (
                    <Text key={idx} style={[styles.commentItem, darkMode && styles.commentItemDark]}>
                      <Text style={[styles.commentAuthor, darkMode && styles.commentAuthorDark]}>
                        {c.usuario || 'Usuario'}:{' '}
                      </Text>
                      <Text style={[styles.commentText, darkMode && styles.commentTextDark]}>
                        {c.texto}
                      </Text>
                    </Text>
                  ))
                )}
              </ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[
                    styles.commentInput,
                    darkMode && styles.commentInputDark
                  ]}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor={darkMode ? '#bbb' : '#999'}
                  value={newComment}
                  onChangeText={setNewComment}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (newComment.trim()) {
                      setComments([...comments, { usuario: 'Tú', texto: newComment }]);
                      setNewComment('');
                    }
                  }}
                  style={{ marginLeft: 8 }}
                >
                  <MaterialIcons name="send" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de reporte de publicación */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressOut={() => setReportModalVisible(false)}
          style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:16 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ width:'96%', maxWidth:420, backgroundColor: darkMode ? '#1c1c1e':'#fff', borderRadius:18, padding:18 }}
            onPress={() => {}}
          >
            <Text style={{ fontSize:18, fontWeight:'700', color: darkMode ? '#fff':'#111', marginBottom:10 }}>Reportar publicación</Text>
            <Text style={{ fontSize:14, color: darkMode ? '#ccc':'#444', marginBottom:12 }}>Selecciona un motivo. Tu reporte es anónimo.</Text>
            {['Contenido inapropiado','Violencia','Odio o acoso','Spam o engaño','Otro'].map(motivo => (
              <TouchableOpacity
                key={motivo}
                onPress={() => setReportReason(motivo)}
                style={{
                  paddingVertical:10,
                  paddingHorizontal:12,
                  borderRadius:10,
                  marginBottom:8,
                  borderWidth:1,
                  borderColor: reportReason === motivo ? '#FF3B30' : (darkMode ? '#333':'#e5e7eb'),
                  backgroundColor: reportReason === motivo ? (darkMode ? '#2a1b1b':'#ffeceb') : 'transparent'
                }}
              >
                <Text style={{ color: darkMode ? '#eee':'#222', fontWeight: reportReason === motivo ? '700':'500' }}>{motivo}</Text>
              </TouchableOpacity>
            ))}
            <Text style={{ fontSize:14, color: darkMode ? '#ccc':'#444', marginTop:6, marginBottom:6 }}>Comentario (opcional)</Text>
            <TextInput
              value={reportText}
              onChangeText={setReportText}
              placeholder="Describe brevemente el problema"
              placeholderTextColor={darkMode ? '#888':'#999'}
              multiline
              style={{ minHeight:80, borderWidth:1, borderColor: darkMode ? '#333':'#e5e7eb', borderRadius:10, padding:10, color: darkMode ? '#fff':'#111', backgroundColor: darkMode ? '#111':'#fafafa' }}
            />
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop:14 }}>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ paddingVertical:10, paddingHorizontal:16, borderRadius:10, marginRight:8, backgroundColor: darkMode ? '#333':'#eee' }}>
                <Text style={{ color: darkMode ? '#fff':'#111', fontWeight:'600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const carnet = await AsyncStorage.getItem('carnet');
                    if (!carnet || !selectedPost) throw new Error('No se pudo identificar al usuario o la publicación');
                    if (selectedPost.carnet_usuario === carnet) throw new Error('No puedes reportar tu propia publicación');
                    const payload = {
                      publicacion_id: selectedPost.id,
                      carnet_reporta: carnet,
                      carnet_publica: selectedPost.carnet_usuario || null,
                      motivo: reportReason,
                      detalle: reportText || null,
                      created_at: new Date().toISOString(),
                    };
                    const { error } = await supabase.from('reportes_publicaciones').insert([payload]);
                    if (error) throw error;
                    setReportModalVisible(false);
                    setReportText('');
                    setReportReason('Contenido inapropiado');
                    Alert.alert('Gracias','Tu reporte ha sido enviado. Revisaremos el contenido.');
                  } catch (err) {
                    Alert.alert('Error', err.message || 'No se pudo enviar el reporte.');
                  }
                }}
                style={{ paddingVertical:10, paddingHorizontal:16, borderRadius:10, backgroundColor:'#FF3B30' }}
              >
                <Text style={{ color:'#fff', fontWeight:'700' }}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      
      {/* Modal para ver foto de perfil en grande */}
      <Modal
        visible={showProfilePicZoom}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfilePicZoom(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <TouchableOpacity activeOpacity={1} style={{ flex:1 }} onPress={() => setShowProfilePicZoom(false)}>
            <Image
              source={{ uri: usuario?.foto_perfil || `https://i.pravatar.cc/500?u=${usuario?.carnet || 'default'}` }}
              style={{ width:'100%', height:'100%', resizeMode:'contain' }}
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
};

const createStyles = (darkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkMode ? '#111' : '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: darkMode ? '#fff' : '#333',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: darkMode ? '#fff' : '#333',
  },
  backButtonError: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerContainer: {
    backgroundColor: darkMode ? '#1a1a1a' : '#fff',
  paddingTop: 85,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#eee',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 15,
    zIndex: 10,
    padding: 8,
  },
  perfilInfo: {
    alignItems: 'center',
  },
  avatarGrande: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    backgroundColor: '#ddd',
  },
  nombreUsuario: {
    fontSize: 24,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
    marginBottom: 5,
  },
  carnetUsuario: {
    fontSize: 16,
    color: darkMode ? '#aaa' : '#666',
  },
  estadisticasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: darkMode ? '#1a1a1a' : '#fff',
    marginBottom: 10,
  },
  estadisticaItem: {
    alignItems: 'center',
  },
  estadisticaNumero: {
    fontSize: 22,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
  },
  estadisticaLabel: {
    fontSize: 14,
    color: darkMode ? '#aaa' : '#666',
    marginTop: 5,
  },
  publicacionesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
    marginBottom: 15,
  },
  sinPublicaciones: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sinPublicacionesText: {
    marginTop: 10,
    fontSize: 16,
    color: darkMode ? '#888' : '#666',
    textAlign: 'center',
  },
  publicacionCard: {
    backgroundColor: darkMode ? '#1a1a1a' : '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  publicacionTexto: {
    fontSize: 16,
    color: darkMode ? '#fff' : '#000',
    marginBottom: 10,
    lineHeight: 22,
  },
  publicacionMedia: {
    width: '100%',
    height: width * 0.8,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#ddd',
  },
  videoContainer: {
    position: 'relative',
  },
  muteButton: {
    position: 'absolute',
    bottom: 20,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  publicacionFecha: {
    fontSize: 12,
    color: darkMode ? '#888' : '#999',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    width: '96%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  modalContentDark: {
    backgroundColor: '#121212',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  modalTitleDark: {
    color: '#fff',
  },
  previewMedia: {
    width: '100%',
    height: 400,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#000',
  },
  likesText: {
    color: '#222',
    fontSize: 14,
  },
  likesTextDark: {
    color: '#ddd',
  },
  placeholderText: {
    color: '#888',
    fontSize: 13,
  },
  placeholderTextDark: {
    color: '#aaa',
  },
  commentItem: {
    marginBottom: 6,
  },
  commentItemDark: {},
  commentAuthor: {
    fontWeight: '700',
    color: '#222',
  },
  commentAuthorDark: {
    color: '#fff',
  },
  commentText: {
    color: '#444',
  },
  commentTextDark: {
    color: '#e6e6e6',
  },
  commentInput: {
    flex: 1,
    height: 36,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f9f9f9',
    color: '#222',
  },
  commentInputDark: {
    backgroundColor: '#222',
    color: '#fff',
    borderColor: '#333',
  },
  overlayButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
    alignItems: 'flex-end',
  },

  overlayButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    padding: 8,
  },

  overlayMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 120,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 30,
  },

  overlayMenuDark: {
    backgroundColor: '#1b1b1b',
    borderColor: '#2b2b2b',
  },

  overlayMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 120,
  },

  overlayMenuText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },

  overlayMenuTextDark: {
    color: '#fff',
  },

  fixedHeader: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
  height: 70,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
  paddingBottom: 8,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  fixedHeaderDark: {
    backgroundColor: '#1a1a1a',
    borderBottomColor: '#333',
  },

  fixedBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fixedHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },

  fixedHeaderTitleDark: {
    color: '#fff',
  },
});

export default ViewUserProfile;
