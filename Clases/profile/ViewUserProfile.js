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
import CommentsModal from '../components/CommentsModal';
import Etiquetas from '../components/Etiquetas';
import PublicationModal from '../publications/PublicationModal';
// Eliminado zoom avanzado: usamos solo Image ampliada

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
        .select('contenido, usuario_carnet, created_at')
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
          return { usuario: r.usuario_carnet, displayName, avatarUrl, texto: r.contenido, created_at: r.created_at };
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

  const styles = createStyles(darkMode);

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
      >
        {/* Header del perfil */}
        <View style={styles.headerContainer}>
          <View style={styles.perfilInfo}>
          <TouchableOpacity onPress={() => setShowProfilePicZoom(true)}>
            {usuario?.foto_perfil ? (
              <Image
                source={{ uri: usuario.foto_perfil }}
                style={styles.avatarGrande}
              />
            ) : (
              <View style={[styles.avatarGrande, { backgroundColor: darkMode ? '#2d3748' : '#cbd5e1', alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: darkMode ? '#fff' : '#1e293b', fontWeight: '700', fontSize: 40 }}>
                  {(usuario?.nombre || usuario?.carnet || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
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
