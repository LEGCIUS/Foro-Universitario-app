import React, { useState, useEffect, useRef, useCallback } from 'react';
import {View,Text,StyleSheet,ScrollView,Image,TouchableOpacity,ActivityIndicator,Dimensions,RefreshControl,TextInput,Alert,Modal,Platform,StatusBar,TouchableWithoutFeedback,FlatList} from 'react-native';
import { Linking } from 'react-native';
// styles global para uso en todos los componentes
let styles;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../Supabase/supabaseClient';
import CommentsModal from '../components/CommentsModal';
import Etiquetas from '../components/Etiquetas';
import PublicationModal from '../publications/PublicationModal';
import CustomAlert from '../components/CustomAlert';
// Eliminado zoom avanzado: usamos solo Image ampliada

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ViewUserProfile = ({ route, navigation }) => {
  const { userId } = route.params || {}; // carnet del usuario a ver
  const { darkMode } = useTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  // Estado para mostrar sección activa (publicaciones o ventas)
  const [mostrarSeccion, setMostrarSeccion] = useState('publicaciones');

  const [usuario, setUsuario] = useState(null);
  const [publicaciones, setPublicaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [miCarnet, setMiCarnet] = useState(null); // Carnet del usuario logueado
  const [estadisticas, setEstadisticas] = useState({
    totalPublicaciones: 0,
    totalMeGusta: 0,
  });

  // Estado global para CustomAlert
  const [alert, setAlert] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => setAlert(a => ({ ...a, visible: false }))
  });

  // Estados para control de video
  // Eliminado tracking de visibilidad de videos (no necesario aquí tras refactor)
  // Limpieza de estados relacionados al error updateVisibleVideos
  const scrollViewRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const scrollTimer = useRef(null);
  const [videoKey, setVideoKey] = useState(0);
  const [showZoom, setShowZoom] = useState(false);

  // Estados para modal de publicación seleccionada
  const [selectedPost, setSelectedPost] = useState(null);
  const [likes, setLikes] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [deleteCommentModalVisible, setDeleteCommentModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const profileCacheRef = useRef(new Map());
  
  // Estado para zoom de foto de perfil
  const [showProfilePicZoom, setShowProfilePicZoom] = useState(false);

  // Estados para menú y reporte
  const [menuVisible, setMenuVisible] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportText, setReportText] = useState('');
  
  // Estado para menú del header
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  // Cargar mi carnet al montar
  useEffect(() => {
    const fetchMyCarnet = async () => {
      const c = await AsyncStorage.getItem('carnet');
      setMiCarnet(c);
    };
    fetchMyCarnet();
  }, []);

  // Cargar perfil cuando cambia userId o cuando la pantalla gana foco
  useEffect(() => {
    if (userId && isFocused) {
      cargarPerfil();
    }
  }, [userId, isFocused]);

  // Cargar likes y comentarios cuando se selecciona una publicación
  useEffect(() => {
    if (!selectedPost?.id) return;

    const loadLikesAndComments = async () => {
      try {
        const postId = selectedPost.id;
        let c = miCarnet;
        if (!c) {
          c = await AsyncStorage.getItem('carnet');
        }

        // Cargar likes
        const { data: likesData, error: likesError } = await supabase
          .from('publicaciones')
          .select('likes_count')
          .eq('id', postId)
          .maybeSingle();

        if (!likesError && likesData) {
          setLikes(likesData.likes_count || 0);
        }

        // Verificar si el usuario dio like
        if (c) {
          const { data: myLike } = await supabase
            .from('likes')
            .select('id')
            .eq('publicacion_id', postId)
            .eq('usuario_carnet', c)
            .maybeSingle();
          setLikedByMe(!!myLike);
        }

        // Cargar conteo de comentarios
        const { data: pubData } = await supabase
          .from('publicaciones')
          .select('comentarios_count')
          .eq('id', postId)
          .maybeSingle();

        if (pubData) {
          setCommentCount(pubData.comentarios_count || 0);
        }
      } catch (error) {
        console.error('Error al cargar likes/comentarios:', error);
      }
    };

    loadLikesAndComments();
  }, [selectedPost]);

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

      // Parsear etiquetas
      const mapped = (data || []).map(pub => {
        let etiquetas = [];
        try {
          if (pub.etiquetas && typeof pub.etiquetas === 'string') {
            if (pub.etiquetas.startsWith('[')) {
              etiquetas = JSON.parse(pub.etiquetas);
            } else {
              etiquetas = pub.etiquetas.split(',').map(t => t.trim()).filter(t => t.length > 0);
            }
          } else if (Array.isArray(pub.etiquetas)) {
            etiquetas = pub.etiquetas;
          }
        } catch (e) {
          if (pub.etiquetas && typeof pub.etiquetas === 'string') {
            etiquetas = pub.etiquetas.split(',').map(t => t.trim()).filter(t => t.length > 0);
          }
        }
        return { ...pub, etiquetas };
      });

      setPublicaciones(mapped);
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

  const handleLike = async () => {
    try {
      const postId = selectedPost?.id;
      if (!postId) return;
      let c = miCarnet;
      if (!c) {
        c = await AsyncStorage.getItem('carnet');
        if (!c) return;
      }
      if (likedByMe) {
        setLikedByMe(false);
        setLikes((prev) => Math.max(0, prev - 1));
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('publicacion_id', postId)
          .eq('usuario_carnet', c);
        if (error) {
          setLikedByMe(true);
          setLikes((prev) => prev + 1);
        }
      } else {
        setLikedByMe(true);
        setLikes((prev) => prev + 1);
        const { error } = await supabase
          .from('likes')
          .upsert({ publicacion_id: postId, usuario_carnet: c }, { onConflict: 'publicacion_id,usuario_carnet', ignoreDuplicates: true });
        if (error) {
          setLikedByMe(false);
          setLikes((prev) => Math.max(0, prev - 1));
        }
      }
      const { data: pubData } = await supabase
        .from('publicaciones')
        .select('likes_count, comentarios_count')
        .eq('id', postId)
        .maybeSingle();
      if (pubData) {
        if (typeof pubData.likes_count === 'number') setLikes(pubData.likes_count);
        if (typeof pubData.comentarios_count === 'number') setCommentCount(pubData.comentarios_count);
      }
      const { data: mine } = await supabase
        .from('likes')
        .select('id')
        .eq('publicacion_id', postId)
        .eq('usuario_carnet', c)
        .maybeSingle();
      setLikedByMe(!!mine);
    } catch (err) {
      console.error('handleLike ViewUserProfile error:', err);
    }
  };

  const openComments = async () => {
    try {
      if (!selectedPost?.id) return;
      const { data, error } = await supabase
        .from('comentarios')
        .select('id, contenido, usuario_carnet, created_at, likes_count')
        .eq('publicacion_id', selectedPost.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (!error) {
        const rows = data || [];
        const uniqueCarnets = Array.from(new Set(rows.map(r => r.usuario_carnet).filter(Boolean)));
        const cache = profileCacheRef.current;
        const missing = uniqueCarnets.filter(c => !cache.has(c));
        if (missing.length > 0) {
          const { data: usuariosData, error: usuariosErr } = await supabase
            .from('usuarios')
            .select('carnet, nombre, apellido, foto_perfil')
            .in('carnet', missing);
          if (!usuariosErr && Array.isArray(usuariosData)) {
            usuariosData.forEach(u => {
              cache.set(u.carnet, { nombre: u.nombre, apellido: u.apellido, foto_perfil: u.foto_perfil });
            });
          }
        }
        const enriched = rows.map(r => {
          const prof = cache.get(r.usuario_carnet);
          const displayName = prof ? `${prof.nombre || ''} ${prof.apellido || ''}`.trim() : r.usuario_carnet;
          const avatarUrl = prof?.foto_perfil || null;
          return { 
            id: r.id,
            usuario: r.usuario_carnet, 
            displayName, 
            avatarUrl, 
            texto: r.contenido, 
            created_at: r.created_at,
            likes_count: r.likes_count || 0
          };
        });
        setComments(enriched);
        const { data: pubRow } = await supabase
          .from('publicaciones')
          .select('comentarios_count')
          .eq('id', selectedPost.id)
          .maybeSingle();
        if (pubRow && typeof pubRow.comentarios_count === 'number') {
          setCommentCount(pubRow.comentarios_count);
        } else {
          setCommentCount(rows.length);
        }
      }
      setCommentModalVisible(true);
    } catch (e) {
      console.error('openComments ViewUserProfile error:', e);
    }
  };

  const handleAddComment = async () => {
    try {
      const text = newComment.trim();
      if (!text || !selectedPost?.id) return;
      let c = miCarnet || (await AsyncStorage.getItem('carnet'));
      if (!c) return;
      const { error } = await supabase
        .from('comentarios')
        .insert({ publicacion_id: selectedPost.id, usuario_carnet: c, contenido: text });
      if (!error) {
        setNewComment('');
        await openComments();
      }
    } catch {}
  };

  const handleDeleteComment = (commentItem) => {
    setCommentToDelete(commentItem);
    setDeleteCommentModalVisible(true);
  };

  const confirmDeleteComment = async () => {
    try {
      if (!commentToDelete || !selectedPost?.id) return;
      const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('publicacion_id', selectedPost.id)
        .eq('usuario_carnet', commentToDelete.usuario)
        .eq('contenido', commentToDelete.texto)
        .eq('created_at', commentToDelete.created_at);
      if (error) throw error;
      await openComments();
      setDeleteCommentModalVisible(false);
      setCommentToDelete(null);
    } catch (err) {
      console.error('Error eliminar comentario ViewUserProfile:', err);
      setDeleteCommentModalVisible(false);
      setCommentToDelete(null);
    }
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

  styles = createStyles(darkMode);

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
    <View style={{ flex: 1, backgroundColor: darkMode ? '#111' : '#f5f5f5' }}>
      {/* Header fijo estilo HomeScreen */}
      <View style={{ paddingTop: Math.max(10, insets.top + 4), backgroundColor: darkMode ? '#111' : '#fff', borderBottomWidth: 1, borderBottomColor: darkMode ? '#333' : '#eee' }}>
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Limpiar toda la pila de ViewUserProfile y resetear a Inicio
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs', params: { screen: 'Inicio' } }],
                })
              );
            }}
          >
            <MaterialIcons name="arrow-back" size={26} color={darkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          
          <View style={{ flex: 1 }} />
          
          <View style={{ position: 'relative' }}>
            <TouchableOpacity
              style={styles.headerMenuButton}
              onPress={() => setHeaderMenuOpen(!headerMenuOpen)}
            >
              <MaterialIcons name="more-vert" size={24} color={darkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
            
            {headerMenuOpen && (
              <View style={[styles.headerMenu, darkMode && styles.headerMenuDark]}>
                <TouchableOpacity
                  style={styles.headerMenuItem}
                  onPress={() => {
                    setHeaderMenuOpen(false);
                    setReportModalVisible(true);
                  }}
                >
                  <MaterialIcons name="flag" size={18} color="#FF3B30" />
                  <Text style={[styles.headerMenuText, darkMode && styles.headerMenuTextDark]}>Reportar usuario</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header del perfil: foto izquierda + info derecha */}
        <View style={styles.headerContainer}>
          <View style={styles.perfilRow}>
            {/* Foto de perfil */}
            <TouchableOpacity onPress={() => setShowProfilePicZoom(true)}>
              {usuario?.foto_perfil ? (
                <Image
                  source={{ uri: usuario.foto_perfil }}
                  style={styles.avatarGrande}
                />
              ) : (
                <View style={[styles.avatarGrande, { backgroundColor: darkMode ? '#2d3748' : '#cbd5e1', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: darkMode ? '#fff' : '#1e293b', fontWeight: '700', fontSize: 32 }}>
                    {(usuario?.nombre || usuario?.carnet || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Información a la derecha */}
            <View style={styles.infoCompact}>
              <Text style={styles.nombreCompact}>{`${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() || 'Usuario'}</Text>
              
              <View style={styles.infoRowCompact}>
                <MaterialIcons name="badge" size={14} color={darkMode ? '#aaa' : '#666'} style={{ marginRight: 6 }} />
                <Text style={styles.infoTextCompact} numberOfLines={1}>
                  {usuario?.carnet || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRowCompact}>
                <MaterialIcons name="email" size={14} color={darkMode ? '#aaa' : '#666'} style={{ marginRight: 6 }} />
                <Text style={styles.infoTextCompact} numberOfLines={1}>
                  {usuario?.correo || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRowCompact}>
                <MaterialIcons name="school" size={14} color={darkMode ? '#aaa' : '#666'} style={{ marginRight: 6 }} />
                <Text style={styles.infoTextCompact} numberOfLines={2}>
                  {usuario?.carrera || 'Sin especificar'}
                </Text>
              </View>

              {usuario?.fecha_nacimiento && (
                <View style={styles.infoRowCompact}>
                  <MaterialIcons name="cake" size={14} color={darkMode ? '#aaa' : '#666'} style={{ marginRight: 6 }} />
                  <Text style={styles.infoTextCompact} numberOfLines={1}>
                    {(() => {
                      try {
                        const fechaSolo = usuario.fecha_nacimiento.split('T')[0];
                        const [anio, mes, dia] = fechaSolo.split('-').map(Number);
                        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                        return `${dia} de ${meses[mes - 1]}`;
                      } catch {
                        return usuario.fecha_nacimiento;
                      }
                    })()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

      {/* Biografía (si existe) */}
      {usuario?.biografia && (
        <View style={[styles.bioCard, darkMode && styles.bioCardDark]}>
          <Text style={[styles.bioTitle, darkMode && styles.bioTitleDark]}>Biografía</Text>
          <Text style={[styles.bioText, darkMode && styles.bioTextDark]}>{usuario.biografia}</Text>
        </View>
      )}

      {/* Gustos e Intereses (si existen) */}
      {usuario?.gustos && (
        <View style={[styles.bioCard, darkMode && styles.bioCardDark]}>
          <Text style={[styles.bioTitle, darkMode && styles.bioTitleDark]}>Gustos e Intereses</Text>
          <Text style={[styles.bioText, darkMode && styles.bioTextDark]}>{usuario.gustos}</Text>
        </View>
      )}


      {/* Botones para ver publicaciones y ventas */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20,
            marginHorizontal: 10,
          }}
          onPress={() => setMostrarSeccion('publicaciones')}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Publicaciones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: '#34C759',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20,
            marginHorizontal: 10,
          }}
          onPress={() => setMostrarSeccion('ventas')}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Ventas</Text>
        </TouchableOpacity>
      </View>

      {/* Mostrar la sección seleccionada */}
      {mostrarSeccion === 'publicaciones' && (
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
      )}
      {mostrarSeccion === 'ventas' && (
        <View style={styles.publicacionesSection}>
          <Text style={styles.sectionTitle}>Ventas</Text>
          {/* Aquí se mostraría la información de ventas del usuario */}
          <VentasUsuario userId={userId} setAlert={setAlert} alert={alert} />
        </View>
      )}

      {/* Modal para ver publicación seleccionada (reutilizable) */}
      <PublicationModal
        visible={!!selectedPost}
        darkMode={darkMode}
        post={selectedPost}
        onClose={() => { setSelectedPost(null); setMenuVisible(null); }}
        liked={likedByMe}
        likesCount={likes}
        onPressLike={handleLike}
        commentCount={commentCount}
        onPressComments={openComments}
        canDelete={false}
        canReport={!!(selectedPost && selectedPost.carnet_usuario !== miCarnet)}
        onPressReport={() => setReportModalVisible(true)}
        sharePayload={{ title: selectedPost?.titulo, message: selectedPost?.descripcion || selectedPost?.titulo, url: selectedPost?.archivo_url }}
      />

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
        meCarnet={miCarnet}
        onPressAvatar={(carnetUser) => {
          setCommentModalVisible(false);
          setSelectedPost(null);
          if (!carnetUser) return;
          if (carnetUser === miCarnet) {
            // Si es mi propio perfil, navegar al tab de Perfil
            navigation.navigate('MainTabs', { screen: 'Perfil' });
          } else if (carnetUser === userId) {
            // Si es el perfil que ya estamos viendo, solo cerrar modales
            return;
          } else {
            // Navegar al perfil de otro usuario
            navigation.push('ViewUserProfile', { userId: carnetUser });
          }
        }}
        onLongPressComment={(c) => {
          if (!c) return;
          const mine = (c.usuario === miCarnet);
          if (mine) handleDeleteComment(c);
        }}
      />
      
      {/* Confirmación para eliminar comentario */}
      <Modal transparent visible={deleteCommentModalVisible} animationType="fade" onRequestClose={() => setDeleteCommentModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 20 }}>
          <View style={{ width: '100%', maxWidth: 420, backgroundColor: darkMode ? '#111' : '#fff', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: darkMode ? '#fff' : '#222' }}>Eliminar comentario</Text>
            <Text style={{ fontSize: 14, color: darkMode ? '#ddd' : '#444', textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>¿Deseas eliminar este comentario? Esta acción no se puede deshacer.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center', marginHorizontal: 6, backgroundColor: darkMode ? '#333' : '#EEE' }} onPress={() => setDeleteCommentModalVisible(false)}>
                <Text style={{ color: darkMode ? '#fff' : '#111', fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center', marginHorizontal: 6, backgroundColor: '#FF3B30' }} onPress={confirmDeleteComment}>
                <Text style={{ fontWeight: '700', color: '#fff', fontSize: 16 }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
                    setTimeout(() => {
                      setAlert({
                        visible: true,
                        type: 'success',
                        title: '¡Gracias!',
                        message: 'Tu reporte ha sido enviado. Revisaremos el contenido.',
                        onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
                      });
                      setReportText('');
                      setReportReason('Contenido inapropiado');
                    }, 300);
                  } catch (err) {
                    setAlert({
                      visible: true,
                      type: 'error',
                      title: 'Error',
                      message: err.message || 'No se pudo enviar el reporte.',
                      onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
                    });
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
            {usuario?.foto_perfil ? (
              <Image
                source={{ uri: usuario.foto_perfil }}
                style={{ width:'100%', height:'100%', resizeMode:'contain' }}
              />
            ) : (
              <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
                <Text style={{ color:'#fff', fontSize:120, fontWeight:'700' }}>
                  {(usuario?.nombre || usuario?.carnet || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
    {/* CustomAlert global para feedback */}
    <CustomAlert
      visible={alert.visible}
      type={alert.type}
      title={alert.title}
      message={alert.message}
      onConfirm={alert.onConfirm}
      onClose={alert.onConfirm}
    />
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
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerDark: {
    backgroundColor: darkMode ? '#111' : '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    flex: 1,
  },
  headerTitleDark: {
    color: '#fff',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerMenuButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minWidth: 120,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 9999,
  },
  headerMenuDark: {
    backgroundColor: '#1f1f1f',
    borderColor: '#333',
  },
  headerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerMenuText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  headerMenuTextDark: {
    color: '#FF3B30',
  },
  perfilInfo: {
    alignItems: 'center',
  },
  perfilRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  avatarGrande: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ddd',
    marginRight: 16,
  },
  infoCompact: {
    flex: 1,
    justifyContent: 'center',
  },
  nombreCompact: {
    fontSize: 20,
    fontWeight: '700',
    color: darkMode ? '#fff' : '#000',
    marginBottom: 8,
  },
  infoRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoTextCompact: {
    fontSize: 13,
    color: darkMode ? '#bbb' : '#555',
    flex: 1,
  },
  bioCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef1f5',
  },
  bioCardDark: {
    backgroundColor: '#1a1a1a',
    borderWidth: 0,
  },
  bioTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  bioTitleDark: {
    color: '#fff',
  },
  bioText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  bioTextDark: {
    color: '#bbb',
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
  infoCard: {
    backgroundColor: darkMode ? '#1a1a1a' : '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: darkMode ? 0 : 1,
    borderColor: '#eef1f5',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    width: 80,
    color: darkMode ? '#aaa' : '#666',
    fontSize: 13,
    marginRight: 6,
  },
  infoValue: {
    flex: 1,
    color: darkMode ? '#fff' : '#111',
    fontSize: 14,
    fontWeight: '600',
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
});


// Componente para mostrar ventas del usuario
const VentasUsuario = ({ userId, setAlert }) => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { darkMode } = useTheme();
  const [productos, setProductos] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imagenIndex, setImagenIndex] = useState(0);
  const flatListRef = React.useRef(null);
  // Estado para modal de reporte de producto (separado del global)
  const [reportProductoModalVisible, setReportProductoModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportText, setReportText] = useState('');
  // Formatear hora_inicio_venta ("HH:MM") a hora local amigable
  const formatHoraVenta = (horaStr) => {
    if (!horaStr) return null;
    try {
      const [h, m] = String(horaStr).split(':');
      const d = new Date();
      d.setHours(parseInt(h || '0', 10), parseInt(m || '0', 10), 0, 0);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(horaStr);
    }
  };
  const fetchProductos = async () => {
    setLoadingVentas(true);
    if (!userId) {
      setProductos([]);
      setLoadingVentas(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('usuario_carnet', userId)
        .order('fecha_publicacion', { ascending: false });
      if (!error && data) {
        setProductos(data);
      } else if (error) {
        console.error('Error al cargar productos:', error);
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
    } finally {
      setLoadingVentas(false);
    }
  };
  useEffect(() => {
    fetchProductos();
    // eslint-disable-next-line
  }, [userId]);
  if (loadingVentas) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: darkMode ? '#121212' : '#f5f7fb' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  if (productos.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: darkMode ? '#121212' : '#f5f7fb' }}>
        <MaterialIcons name="shopping-cart" size={64} color={darkMode ? '#555' : '#ccc'} />
        <Text style={{ fontSize: 16, color: darkMode ? '#999' : '#666', marginTop: 16, textAlign: 'center' }}>
          Este usuario no tiene productos a la venta
        </Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#121212' : '#f5f7fb' }} contentContainerStyle={{ padding: 12 }}>
        {productos.map((producto) => (
          <TouchableOpacity
            key={producto.id}
            style={{
              backgroundColor: darkMode ? '#1e1e1e' : '#fff',
              borderRadius: 12,
              marginBottom: 12,
              overflow: 'hidden',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
            onPress={() => {
              setProductoSeleccionado(producto);
              setImagenIndex(0);
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            {/* Imagen del producto */}
            <View style={{ position: 'relative' }}>
              {producto.foto_url && Array.isArray(producto.foto_url) && producto.foto_url.length > 0 ? (
                <Image
                  source={{ uri: producto.foto_url[0] }}
                  style={{ width: '100%', height: 200, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: '100%', height: 200, backgroundColor: darkMode ? '#2a2a2a' : '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                  <MaterialIcons name="image" size={64} color={darkMode ? '#555' : '#ccc'} />
                </View>
              )}
              {/* Indicador de múltiples imágenes */}
              {producto.foto_url && Array.isArray(producto.foto_url) && producto.foto_url.length > 1 && (
                <View style={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  backgroundColor: 'rgba(0, 0, 0, 0.7)', 
                  paddingHorizontal: 8, 
                  paddingVertical: 4, 
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <MaterialIcons name="photo-library" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>
                    {producto.foto_url.length}
                  </Text>
                </View>
              )}
            </View>
            {/* Información del producto */}
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: darkMode ? '#fff' : '#111', marginBottom: 8 }} numberOfLines={2}>
                {producto.nombre}
              </Text>
              <View style={{ 
                backgroundColor: darkMode ? '#243244' : '#e6f0ff', 
                borderColor: darkMode ? '#314463' : '#dbeafe',
                borderWidth: 1,
                paddingHorizontal: 12, 
                paddingVertical: 8, 
                borderRadius: 8,
                alignSelf: 'flex-start',
                marginBottom: 12
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: darkMode ? '#7fb0ff' : '#2563EB' }}>
                  Precio: ₡{producto.precio}
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: darkMode ? '#aaa' : '#666', marginBottom: 12, lineHeight: 20 }} numberOfLines={3}>
                {producto.descripcion}
              </Text>
              {/* Información adicional */}
              <View style={{ borderTopWidth: 1, borderTopColor: darkMode ? '#333' : '#eee', paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialIcons name="person" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
                  <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                    <Text style={{ fontWeight: '600' }}>Vendedor:</Text> {producto.nombre_vendedor}
                  </Text>
                </View>
                {producto.telefono && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialIcons name="phone" size={16} color="#25D366" />
                    <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                      {producto.telefono}
                    </Text>
                  </View>
                )}
                {producto.categoria && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialIcons name="category" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
                    <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                      <Text style={{ fontWeight: '600' }}>Categoría:</Text> {producto.categoria}
                    </Text>
                  </View>
                )}
                {producto.hora_inicio_venta && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialIcons name="schedule" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
                    <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                      <Text style={{ fontWeight: '600' }}>Inicio de venta: </Text>
                      {formatHoraVenta(producto.hora_inicio_venta)}
                    </Text>
                  </View>
                )}
                {producto.fecha_publicacion && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <MaterialIcons name="event" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
                    <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                      Publicado: {new Date(producto.fecha_publicacion).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {/* Modal con el detalle del producto */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setModalVisible(false);
            setProductoSeleccionado(null);
            setImagenIndex(0);
          }}
        >
          <TouchableWithoutFeedback onPress={() => {
            setModalVisible(false);
            setProductoSeleccionado(null);
            setImagenIndex(0);
          }}>
            <View style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={{
                  width: '90%',
                  maxWidth: 500,
                  backgroundColor: darkMode ? '#1f2937' : '#fff',
                  borderRadius: 20,
                  padding: 20,
                  maxHeight: '90%',
                  position: 'relative',
                }}>
                  {/* Botón de reportar arriba a la derecha */}
                  {productoSeleccionado && (
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 18, right: 18, zIndex: 10, backgroundColor: 'rgba(255,59,48,0.85)', borderRadius: 20, padding: 8 }}
                      onPress={() => setReportProductoModalVisible(true)}
                    >
                      <MaterialIcons name="flag" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {productoSeleccionado && (
                      <>
                        <View style={{ alignItems: 'center', marginBottom: 12, position: 'relative', width: '100%' }}>
                          {Array.isArray(productoSeleccionado.foto_url) && productoSeleccionado.foto_url.length > 0 ? (
                            <View style={{ width: Dimensions.get('window').width * 0.9, maxWidth: 500, alignSelf: 'center', position: 'relative' }}>
                              <FlatList
                                ref={flatListRef}
                                data={productoSeleccionado.foto_url}
                                horizontal
                                pagingEnabled
                                keyExtractor={(uri, idx) => uri + idx}
                                showsHorizontalScrollIndicator={false}
                                snapToInterval={Dimensions.get('window').width * 0.9}
                                decelerationRate="fast"
                                onScroll={(e) => {
                                  const x = e.nativeEvent.contentOffset.x;
                                  const w = e.nativeEvent.layoutMeasurement.width;
                                  const idx = Math.round(x / w);
                                  if (idx !== imagenIndex) {
                                    setImagenIndex(idx);
                                  }
                                }}
                                scrollEventThrottle={16}
                                renderItem={({ item, index }) => (
                                  <View style={{ width: Dimensions.get('window').width * 0.9, maxWidth: 500 }}>
                                    <Image
                                      source={{ uri: item }}
                                      style={{ width: '100%', height: 230, borderRadius: 16 }}
                                      resizeMode="cover"
                                    />
                                  </View>
                                )}
                              />
                              {/* Flechas de navegación */}
                              {productoSeleccionado.foto_url.length > 1 && (
                                <>
                                  <TouchableOpacity
                                    style={[styles.carouselArrow, styles.carouselArrowLeft, { opacity: imagenIndex === 0 ? 0.3 : 1, position: 'absolute', top: '45%', left: 8, zIndex: 20 }]}
                                    onPress={() => {
                                      if (imagenIndex > 0) {
                                        setImagenIndex(imagenIndex - 1);
                                        flatListRef.current?.scrollToIndex({ index: imagenIndex - 1, animated: true });
                                      }
                                    }}
                                    activeOpacity={0.7}
                                    disabled={imagenIndex === 0}
                                  >
                                    <MaterialIcons name="chevron-left" size={36} color="#fff" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, elevation: 4 }} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.carouselArrow, styles.carouselArrowRight, { opacity: imagenIndex === productoSeleccionado.foto_url.length - 1 ? 0.3 : 1, position: 'absolute', top: '45%', right: 8, zIndex: 20 }]}
                                    onPress={() => {
                                      if (imagenIndex < productoSeleccionado.foto_url.length - 1) {
                                        setImagenIndex(imagenIndex + 1);
                                        flatListRef.current?.scrollToIndex({ index: imagenIndex + 1, animated: true });
                                      }
                                    }}
                                    activeOpacity={0.7}
                                    disabled={imagenIndex === productoSeleccionado.foto_url.length - 1}
                                  >
                                    <MaterialIcons name="chevron-right" size={36} color="#fff" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, elevation: 4 }} />
                                  </TouchableOpacity>
                                </>
                              )}
                              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                                {productoSeleccionado.foto_url.map((_, idx) => (
                                  <View
                                    key={idx}
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 4,
                                      backgroundColor: idx === imagenIndex ? '#007AFF' : '#ccc',
                                      marginHorizontal: 4,
                                    }}
                                  />
                                ))}
                              </View>
                              <Text style={{ marginTop: 6, color: darkMode ? '#94a3b8' : '#64748b' }}>
                                {imagenIndex + 1} / {productoSeleccionado.foto_url?.length || 1}
                              </Text>
                            </View>
                          ) : (
                            <View style={{ width: '100%', height: 230, backgroundColor: darkMode ? '#2a2a2a' : '#f0f0f0', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                              <MaterialIcons name="image" size={48} color={darkMode ? '#555' : '#ccc'} />
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: darkMode ? '#fff' : '#0f172a', marginBottom: 8 }}>
                          {productoSeleccionado.nombre}
                        </Text>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#007AFF', marginBottom: 12 }}>
                          Precio: ₡{productoSeleccionado.precio}
                        </Text>
                        <Text style={{ fontSize: 15, color: darkMode ? '#cbd5e1' : '#334155', marginBottom: 12 }}>
                          {productoSeleccionado.descripcion}
                        </Text>
                        <Text style={{ fontSize: 14, color: darkMode ? '#cbd5e1' : '#475569', marginBottom: 16 }}>
                          Vendedor: <Text style={{ color: darkMode ? '#fff' : '#0e141b', fontWeight: 'bold' }}>{productoSeleccionado.nombre_vendedor}</Text>
                        </Text>
                        {productoSeleccionado?.hora_inicio_venta && (
                          <Text style={{ fontSize: 14, color: darkMode ? '#cbd5e1' : '#475569', marginBottom: 16 }}>
                            <Text style={{ fontWeight: '700', color: darkMode ? '#7fb0ff' : '#2563EB' }}>Inicio de venta: </Text>
                            {formatHoraVenta(productoSeleccionado.hora_inicio_venta)}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#25D366',
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center',
                            marginBottom: 10,
                          }}
                          onPress={() => {
                            const num = (productoSeleccionado?.telefono || '').toString().replace(/\D/g, '');
                            if (!num) return Alert.alert('Teléfono no disponible');
                            const url = `https://wa.me/${num}?text=${encodeURIComponent(productoSeleccionado?.mensaje_whatsapp || 'Hola, estoy interesado.')}`;
                            Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Contactar por WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#007AFF',
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center',
                          }}
                          onPress={() => {
                            setModalVisible(false);
                            setProductoSeleccionado(null);
                            setImagenIndex(0);
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Cerrar</Text>
                        </TouchableOpacity>
                                        {/* Modal de reporte de producto */}
                                        <Modal
                                          visible={reportProductoModalVisible}
                                          transparent
                                          animationType="fade"
                                          onRequestClose={() => setReportProductoModalVisible(false)}
                                        >
                                          <TouchableOpacity
                                            activeOpacity={1}
                                            onPressOut={() => setReportProductoModalVisible(false)}
                                            style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', padding:16 }}
                                          >
                                            <TouchableOpacity
                                              activeOpacity={1}
                                              style={{ width:'96%', maxWidth:420, backgroundColor: darkMode ? '#1c1c1e':'#fff', borderRadius:18, padding:18 }}
                                              onPress={() => {}}
                                            >
                                              <Text style={{ fontSize:18, fontWeight:'700', color: darkMode ? '#fff':'#111', marginBottom:10 }}>Reportar producto</Text>
                                              <Text style={{ fontSize:14, color: darkMode ? '#ccc':'#444', marginBottom:12 }}>Selecciona un motivo. Tu reporte es anónimo.</Text>
                                              {['Contenido inapropiado','Violencia','Hate o acoso','Spam o engaño','Otro'].map(motivo => (
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
                                                <TouchableOpacity onPress={() => setReportProductoModalVisible(false)} style={{ paddingVertical:10, paddingHorizontal:16, borderRadius:10, marginRight:8, backgroundColor: darkMode ? '#333':'#eee' }}>
                                                  <Text style={{ color: darkMode ? '#fff':'#111', fontWeight:'600' }}>Cancelar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                  onPress={async () => {
                                                    try {
                                                      const carnet = await AsyncStorage.getItem('carnet');
                                                      if (!carnet || !productoSeleccionado) throw new Error('No se pudo identificar al usuario o el producto');
                                                      const payload = {
                                                        producto_id: productoSeleccionado?.id || null,
                                                        carnet_reporta: carnet,
                                                        carnet_publica: productoSeleccionado?.usuario_carnet || null,
                                                        motivo: reportReason,
                                                        detalle: reportText || null,
                                                        created_at: new Date().toISOString(),
                                                      };
                                                      const { error } = await supabase.from('reportes_ventas').insert([payload]);
                                                      if (error) throw error;
                                                      setAlert({
                                                        visible: true,
                                                        type: 'success',
                                                        title: 'Reporte enviado',
                                                        message: 'Gracias. Revisaremos el reporte.',
                                                        onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
                                                      });
                                                      setReportProductoModalVisible(false);
                                                      setReportText('');
                                                      setReportReason('Contenido inapropiado');
                                                    } catch (err) {
                                                      console.error('Error al enviar reporte:', err);
                                                      setAlert({
                                                        visible: true,
                                                        type: 'error',
                                                        title: 'Error',
                                                        message: 'No se pudo enviar el reporte. Intenta de nuevo.',
                                                        onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
                                                      });
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
                      </>
                    )}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </ScrollView>
      {/* CustomAlert eliminado aquí, solo se renderiza globalmente en ViewUserProfile */}
    </View>
  );
};

export default ViewUserProfile;
