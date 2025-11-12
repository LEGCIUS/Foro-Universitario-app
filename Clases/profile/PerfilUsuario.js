import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView, Modal, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { supabase } from '../../Supabase/supabaseClient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Etiquetas from '../components/Etiquetas';
import CommentsModal from '../components/CommentsModal';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Video } from 'expo-av';
import CreatePublicationModal from '../publications/CreatePublicationModal';
import PublicationModal from '../publications/PublicationModal';

const Tab = createMaterialTopTabNavigator();

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function PerfilUsuario({ navigation }) {
  const { darkMode } = useTheme();
  const responsive = useResponsive();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevaBio, setNuevaBio] = useState('');
  const [nuevaFoto, setNuevaFoto] = useState('');
  const [unreadDeletion, setUnreadDeletion] = useState(null);
  const TabNavigatorRef = useRef(null);

  const fetchUsuario = async () => {
    setLoading(true);
    const carnet = await AsyncStorage.getItem('carnet');
    if (!carnet) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('carnet', carnet)
      .single();
    if (!error && data) {
      setUsuario(data);
      setNuevaBio(data.biografia || '');
      setNuevaFoto(data.foto_perfil || '');
    }
    setLoading(false);
  };

  useFocusEffect(
    React.useCallback(() => { fetchUsuario(); }, [])
  );

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!usuario?.carnet) return;
        const { data, error } = await supabase
          .from('notificaciones')
          .select('id, titulo, mensaje, data, created_at')
          .eq('carnet', usuario.carnet)
          .eq('tipo', 'publicacion_eliminada')
          .eq('leido', false)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          setUnreadDeletion(data[0]);
        } else {
          setUnreadDeletion(null);
        }
      } catch (_) {}
    };
    fetchNotifications();
  }, [usuario?.carnet]);

  const pickImageAndUpload = async () => {
    let result;
    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const file = asset.file || asset;
        const fileName = file.name || 'perfil.jpg';
        const fileType = file.type || 'image/jpeg';
        const filePath = `${usuario.carnet}/${fileName}`;
        const { data, error } = await supabase.storage
          .from('fotos-perfil')
          .upload(filePath, file, { contentType: fileType, upsert: true });
        if (error) { Alert.alert('Error', error.message || 'No se pudo subir la imagen'); return; }
        const { data: publicData } = supabase.storage.from('fotos-perfil').getPublicUrl(data.path);
        setNuevaFoto(publicData.publicUrl);
      }
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const fileName = uri.split('/').pop();
        const fileType = fileName.split('.').pop();
        const filePath = `${usuario.carnet}/perfil.${fileType}`;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const fileBuffer = Buffer.from(base64, 'base64');
        const { data, error } = await supabase.storage
          .from('fotos-perfil')
          .upload(filePath, fileBuffer, { contentType: `image/${fileType}`, upsert: true });
        if (error || !data) { Alert.alert('Error al subir la imagen', error?.message || 'No se pudo subir la imagen al storage.'); return; }
        const { data: publicData } = supabase.storage.from('fotos-perfil').getPublicUrl(filePath);
        if (!publicData || !publicData.publicUrl) { Alert.alert('Error', 'No se pudo obtener la URL pública de la imagen.'); return; }
        const urlConTimestamp = publicData.publicUrl + `?t=${Date.now()}`;
        setNuevaFoto(urlConTimestamp);
        await supabase.from('usuarios').update({ foto_perfil: urlConTimestamp }).eq('carnet', usuario.carnet);
        setUsuario({ ...usuario, foto_perfil: urlConTimestamp });
      }
    }
  };

  const handleGuardar = async () => {
    setLoading(true);
    await supabase.from('usuarios').update({ biografia: nuevaBio, foto_perfil: nuevaFoto }).eq('carnet', usuario.carnet);
    setLoading(false);
    setUsuario({ ...usuario, biografia: nuevaBio, foto_perfil: nuevaFoto });
  };

  if (loading) {
    return (
      <LinearGradient colors={["#e0eafc", "#cfdef3"]} style={styles.gradient}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </LinearGradient>
    );
  }

  if (!usuario) {
    return (
      <LinearGradient colors={["#e0eafc", "#cfdef3"]} style={styles.gradient}>
        <View style={styles.center}>
          <Text>No se pudo cargar el perfil.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={darkMode ? ["#232526", "#414345"] : ["#e0eafc", "#cfdef3"]}
      style={styles.gradient}
    >
      <View style={[styles.perfilContainer, darkMode && { backgroundColor: "#181818" }]}>
        {unreadDeletion && (
          <View style={[styles.noticeBar, { backgroundColor: darkMode ? '#2b1d1d' : '#FEF2F2', borderColor: darkMode ? '#5b2d2d' : '#FCA5A5' }]}>
            <Text style={[styles.noticeTitle, { color: darkMode ? '#fecaca' : '#991B1B' }]}>
              {unreadDeletion.titulo || 'Tu publicación fue eliminada'}
            </Text>
            <Text style={[styles.noticeText, { color: darkMode ? '#fef2f2' : '#7F1D1D' }]}>
              {unreadDeletion.mensaje || 'Una de tus publicaciones fue eliminada por un administrador. Revisa tu correo para más detalles.'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await supabase.from('notificaciones').update({ leido: true }).eq('id', unreadDeletion.id);
                  } catch (_) {}
                  setUnreadDeletion(null);
                }}
                style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#DC2626', borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.leftAligned}>
          <TouchableOpacity onPress={pickImageAndUpload}>
            <View style={styles.avatarShadow}>
              {nuevaFoto ? (
                <Image source={{ uri: nuevaFoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{usuario.nombre[0]}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text style={[
            styles.nombre,
            darkMode && { color: "#fff" }
          ]}>{usuario.nombre} {usuario.apellido}</Text>
        </View>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: { backgroundColor: darkMode ? "#181818" : "#fff" },
            tabBarLabelStyle: { color: darkMode ? "#fff" : "#222" },
            tabBarIndicatorStyle: { backgroundColor: "#007AFF" },
          }}
        >
          <Tab.Screen name="Información">
            {() => <InfoTab usuario={usuario} darkMode={darkMode} />}
          </Tab.Screen>
          <Tab.Screen name="Publicaciones">
            {() => <PublicacionesTab usuario={usuario} darkMode={darkMode} />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </LinearGradient>
  );
}

function InfoTab({ usuario, darkMode }) {
  const navigation = useNavigation();
  const responsive = useResponsive();
  
  const formatearFecha = (fecha) => {
    if (!fecha) return 'No especificada';
    const date = new Date(fecha);
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-ES', opciones);
  };

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  return (
    <ScrollView style={{ 
      flex: 1, 
      backgroundColor: darkMode ? "#181818" : "#fff", 
      padding: responsive.spacing.lg 
    }}>
      {/* Botón de editar perfil */}
      <TouchableOpacity
        style={[styles.editButton, { 
          backgroundColor: darkMode ? '#1e40af' : '#007AFF',
          paddingVertical: responsive.spacing.md,
          paddingHorizontal: responsive.spacing.lg,
          marginBottom: responsive.spacing.lg,
        }]}
        onPress={() => navigation.navigate('EditarPerfil', { usuario })}
      >
        <MaterialIcons name="edit" size={responsive.getValue(18, 20, 22)} color="#fff" />
        <Text style={[styles.editButtonText, { fontSize: responsive.fontSize.md }]}>Editar Perfil</Text>
      </TouchableOpacity>

      {/* Biografía */}
      {usuario.biografia && (
        <View style={[styles.infoCard, { 
          backgroundColor: darkMode ? '#1e1e1e' : '#f8fafc',
          padding: responsive.spacing.lg,
          marginBottom: responsive.spacing.md,
          borderRadius: responsive.getValue(12, 14, 16),
        }]}>
          <View style={[styles.cardHeader, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="person" size={responsive.getValue(20, 22, 24)} color="#007AFF" />
            <Text style={[styles.cardTitle, { 
              fontSize: responsive.fontSize.lg,
            }, darkMode && { color: "#fff" }]}>Biografía</Text>
          </View>
          <Text style={[styles.cardText, { 
            color: darkMode ? '#cbd5e1' : '#475569',
            fontSize: responsive.fontSize.md,
            lineHeight: responsive.getValue(20, 22, 24),
          }]}>
            {usuario.biografia}
          </Text>
        </View>
      )}

      {/* Gustos e Intereses */}
      {usuario.gustos && (
        <View style={[styles.infoCard, { 
          backgroundColor: darkMode ? '#1e1e1e' : '#f8fafc',
          padding: responsive.spacing.lg,
          marginBottom: responsive.spacing.md,
          borderRadius: responsive.getValue(12, 14, 16),
        }]}>
          <View style={[styles.cardHeader, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="favorite" size={responsive.getValue(20, 22, 24)} color="#007AFF" />
            <Text style={[styles.cardTitle, { 
              fontSize: responsive.fontSize.lg,
            }, darkMode && { color: "#fff" }]}>Gustos e Intereses</Text>
          </View>
          <Text style={[styles.cardText, { 
            color: darkMode ? '#cbd5e1' : '#475569',
            fontSize: responsive.fontSize.md,
            lineHeight: responsive.getValue(20, 22, 24),
          }]}>
            {usuario.gustos}
          </Text>
        </View>
      )}

      {/* Información Personal */}
      <View style={[styles.infoCard, { 
        backgroundColor: darkMode ? '#1e1e1e' : '#f8fafc',
        padding: responsive.spacing.lg,
        marginBottom: responsive.spacing.md,
        borderRadius: responsive.getValue(12, 14, 16),
      }]}>
        <View style={[styles.cardHeader, { marginBottom: responsive.spacing.md }]}>
          <MaterialIcons name="info" size={responsive.getValue(20, 22, 24)} color="#007AFF" />
          <Text style={[styles.cardTitle, { 
            fontSize: responsive.fontSize.lg,
          }, darkMode && { color: "#fff" }]}>Información Personal</Text>
        </View>
        <View style={styles.infoList}>
          <View style={[styles.infoRow, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="email" size={responsive.getValue(18, 20, 20)} color="#007AFF" />
            <Text style={[styles.infoText, { fontSize: responsive.fontSize.sm }]}>{usuario.correo}</Text>
          </View>
          {usuario.fecha_nacimiento && (
            <>
              <View style={[styles.infoRow, { marginBottom: responsive.spacing.sm }]}>
                <MaterialIcons name="cake" size={responsive.getValue(18, 20, 20)} color="#007AFF" />
                <Text style={[styles.infoText, { fontSize: responsive.fontSize.sm }]}>
                  Cumpleaños: {formatearFecha(usuario.fecha_nacimiento)}
                  {calcularEdad(usuario.fecha_nacimiento) && ` (${calcularEdad(usuario.fecha_nacimiento)} años)`}
                </Text>
              </View>
            </>
          )}
          <View style={[styles.infoRow, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="school" size={responsive.getValue(18, 20, 20)} color="#007AFF" />
            <Text style={[styles.infoText, { fontSize: responsive.fontSize.sm }]}>{usuario.carrera || 'Carrera no especificada'}</Text>
          </View>
          <View style={[styles.infoRow, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="badge" size={responsive.getValue(18, 20, 20)} color="#007AFF" />
            <Text style={[styles.infoText, { fontSize: responsive.fontSize.sm }]}>Carnet: {usuario.carnet}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function PublicacionesTab({ usuario, darkMode }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showZoom, setShowZoom] = useState(false);
  const navigation = useNavigation();

  // Modal de publicación usando CreatePublicationModal
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Likes y comentarios visuales
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [deleteCommentModalVisible, setDeleteCommentModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const profileCacheRef = useRef(new Map());
  const [carnet, setCarnet] = useState(null);
  const [videoKey, setVideoKey] = useState(0);
  const videoRef = useRef(null);

  // Estado del menú (solo eliminar, no reportar en perfil propio)
  const [menuVisible, setMenuVisible] = useState(null);

  // Confirmación estilizada para eliminar
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [pendingDeletePost, setPendingDeletePost] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      if (!usuario.carnet || usuario.carnet === "Fotos") {
        setPosts([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('publicaciones')
        .select('*')
        .eq('carnet_usuario', usuario.carnet)
        .order('fecha_publicacion', { ascending: false });

      if (!error && data) {
        const mapped = data.map(pub => {
          // Parse etiquetas similar a HomeScreen
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
        setPosts(mapped);
      }
      setLoading(false);
    };
    fetchPosts();
  }, [usuario.carnet]);

  // Realtime: reflejar inserciones/actualizaciones/eliminaciones al instante para este usuario
  useEffect(() => {
    if (!usuario?.carnet) return;
    const channel = supabase
      .channel(`perfil-publicaciones-${usuario.carnet}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'publicaciones',
        filter: `carnet_usuario=eq.${usuario.carnet}`,
      }, (payload) => {
        setPosts((prev) => {
          if (payload.eventType === 'DELETE') {
            const delId = payload.old?.id;
            return prev.filter((p) => p.id !== delId);
          }
          const pub = payload.new;
          const others = prev.filter((p) => p.id !== pub.id);
          const next = [pub, ...others];
          next.sort((a,b) => new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion));
          return next;
        });
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [usuario?.carnet]);

  // Helpers
  const extractMultimediaPath = (publicUrl) => {
    if (!publicUrl) return null;
    try {
      const u = new URL(publicUrl);
      const marker = '/object/public/multimedia/';
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) return decodeURIComponent(u.pathname.substring(idx + marker.length));
      const parts = publicUrl.split('?')[0].split('/multimedia/');
      if (parts[1]) return decodeURIComponent(parts[1]);
    } catch (_) {
      const parts = (publicUrl || '').split('?')[0].split('/multimedia/');
      if (parts[1]) return decodeURIComponent(parts[1]);
    }
    return null;
  };

  const handleDeletePost = (post) => {
    setPendingDeletePost(post);
    setConfirmDeleteVisible(true);
  };

  const performDeletePost = async () => {
    const post = pendingDeletePost;
    if (!post) return;
    try {
      // 1) Eliminar archivo del storage si existe
      const storagePath = extractMultimediaPath(post.archivo_url);
      if (storagePath) {
        await supabase.storage.from('multimedia').remove([storagePath]);
      }
      // 2) Eliminar fila en la base de datos
      await supabase
        .from('publicaciones')
        .delete()
        .eq('id', post.id)
        .eq('carnet_usuario', usuario.carnet);
      // 3) Actualizar UI
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
  setSelectedPost(null);
  setConfirmDeleteVisible(false);
  setPendingDeletePost(null);
    } catch (err) {
      setConfirmDeleteVisible(false);
      setPendingDeletePost(null);
  Alert.alert('Error', 'No se pudo eliminar la publicación.');
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteVisible(false);
    setPendingDeletePost(null);
  };

  // Cargar estado de likes y conteos cuando se selecciona una publicación
  useEffect(() => {
    if (!selectedPost?.id) return;
    (async () => {
      try {
        let c = carnet;
        if (!c) {
          c = await AsyncStorage.getItem('carnet');
          if (c) setCarnet(c);
        }
        if (c) {
          const { data: mine } = await supabase
            .from('likes')
            .select('id')
            .eq('publicacion_id', selectedPost.id)
            .eq('usuario_carnet', c)
            .maybeSingle();
          setLiked(!!mine);
        }
        const { data: pubRow } = await supabase
          .from('publicaciones')
          .select('likes_count, comentarios_count')
          .eq('id', selectedPost.id)
          .maybeSingle();
        if (pubRow) {
          if (typeof pubRow.likes_count === 'number') setLikeCount(pubRow.likes_count);
          if (typeof pubRow.comentarios_count === 'number') setCommentCount(pubRow.comentarios_count);
        }
      } catch (e) {
        console.warn('Error cargando likes/comentarios:', e);
      }
    })();
  }, [selectedPost]);

  const handleLike = async () => {
    try {
      const postId = selectedPost?.id;
      if (!postId) return;
      let c = carnet;
      if (!c) {
        c = await AsyncStorage.getItem('carnet');
        if (!c) return;
        setCarnet(c);
      }
      if (liked) {
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('publicacion_id', postId)
          .eq('usuario_carnet', c);
        if (error) {
          setLiked(true);
          setLikeCount((prev) => prev + 1);
        }
      } else {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        const { error } = await supabase
          .from('likes')
          .upsert({ publicacion_id: postId, usuario_carnet: c }, { onConflict: 'publicacion_id,usuario_carnet', ignoreDuplicates: true });
        if (error) {
          setLiked(false);
          setLikeCount((prev) => Math.max(0, prev - 1));
        }
      }
      const { data: pubData } = await supabase
        .from('publicaciones')
        .select('likes_count, comentarios_count')
        .eq('id', postId)
        .maybeSingle();
      if (pubData) {
        if (typeof pubData.likes_count === 'number') setLikeCount(pubData.likes_count);
        if (typeof pubData.comentarios_count === 'number') setCommentCount(pubData.comentarios_count);
      }
      const { data: mine } = await supabase
        .from('likes')
        .select('id')
        .eq('publicacion_id', postId)
        .eq('usuario_carnet', c)
        .maybeSingle();
      setLiked(!!mine);
    } catch (err) {
      console.error('handleLike perfil error:', err);
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
        // actualizar conteo
        const { data: pubRow, error: pubErr } = await supabase
          .from('publicaciones')
          .select('comentarios_count')
          .eq('id', selectedPost.id)
          .maybeSingle();
        if (!pubErr && pubRow && typeof pubRow.comentarios_count === 'number') {
          setCommentCount(pubRow.comentarios_count);
        } else {
          setCommentCount(rows.length);
        }
      }
      setCommentModalVisible(true);
    } catch (e) {
      console.error('openComments perfil error:', e);
    }
  };

  const handleAddComment = async () => {
    try {
      const text = newComment.trim();
      if (!text || !selectedPost?.id) return;
      let c = carnet || (await AsyncStorage.getItem('carnet'));
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
      console.error('Error eliminar comentario perfil:', err);
      setDeleteCommentModalVisible(false);
      setCommentToDelete(null);
    }
  };

  const handlePublished = async () => {
    setShowPublishModal(false);
    // Recargar publicaciones
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .eq('carnet_usuario', usuario.carnet)
      .order('fecha_publicacion', { ascending: false });
    if (!error && data) {
      setPosts(data);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Agrupa publicaciones en filas de dos
  const filas = [];
  for (let i = 0; i < posts.length; i += 2) {
    filas.push(posts.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: darkMode ? "#181818" : "#fff", padding: 12 }}>
        <TouchableOpacity
          style={[
            {
              backgroundColor: darkMode ? "#007AFF" : "#222",
              padding: 10,
              borderRadius: 8,
              marginBottom: 16,
              alignSelf: 'flex-start'
            },
            darkMode && styles.uploadButtonDark
          ]}
          onPress={() => setShowPublishModal(true)}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Subir publicación</Text>
        </TouchableOpacity>
        {posts.length === 0 ? (
          <Text style={[styles.infoText, darkMode && { color: "#fff" }]}>No hay publicaciones.</Text>
        ) : (
          filas.map((fila, idx) => (
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
                    setVideoKey(0);
                    setLiked(false);
                    setLikeCount(0);
                    setCommentCount(0);
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
            </View>
          )))
        }
      </ScrollView>
      
      {/* Modal para subir publicación */}
      <CreatePublicationModal
        visible={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublished={handlePublished}
      />
      
      {/* Modal para ver publicación seleccionada (reutilizable) */}
      <PublicationModal
        visible={!!selectedPost}
        darkMode={darkMode}
        post={selectedPost}
        onClose={() => { setSelectedPost(null); setMenuVisible(null); }}
        liked={liked}
        likesCount={likeCount}
        onPressLike={() => handleLike()}
        commentCount={commentCount}
        onPressComments={() => openComments()}
        canDelete={true}
        onPressDelete={() => handleDeletePost(selectedPost)}
        canReport={false}
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
        meCarnet={carnet || usuario.carnet}
        onPressAvatar={(carnetUser) => {
          setCommentModalVisible(false);
          setSelectedPost(null);
          if (!carnetUser) return;
          if (carnetUser === usuario.carnet) {
            // Ya estamos en el perfil propio, solo cerrar modales
            return;
          }
          navigation.navigate('ViewUserProfile', { userId: carnetUser });
        }}
        onLongPressComment={(c) => {
          if (!c) return;
          const mine = (c.usuario === (carnet || usuario.carnet));
          if (mine) handleDeleteComment(c);
        }}
      />
      
      {/* Confirmación para eliminar comentario */}
      <Modal transparent visible={deleteCommentModalVisible} animationType="fade" onRequestClose={() => setDeleteCommentModalVisible(false)}>
        <View style={styles.confirmModalContainer}>
          <View style={[styles.confirmModalContent, darkMode && styles.confirmModalContentDark]}>
            <Text style={[styles.confirmTitle, darkMode && styles.confirmTitleDark]}>Eliminar comentario</Text>
            <Text style={[styles.confirmText, darkMode && styles.confirmTextDark]}>¿Deseas eliminar este comentario? Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity style={[styles.confirmButton, styles.confirmCancelButton, darkMode && styles.confirmCancelButtonDark]} onPress={() => setDeleteCommentModalVisible(false)}>
                <Text style={[styles.confirmButtonText, darkMode && styles.confirmButtonTextDark]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, styles.confirmDeleteButton]} onPress={confirmDeleteComment}>
                <Text style={[styles.confirmButtonText, { fontWeight: '700', color: '#fff' }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Confirmación estilizada para eliminar publicación */}
      <Modal transparent visible={confirmDeleteVisible} animationType="fade" onRequestClose={cancelDelete}>
        <View style={styles.confirmModalContainer}>
          <View style={[styles.confirmModalContent, darkMode && styles.confirmModalContentDark]}>
            <Text style={[styles.confirmTitle, darkMode && styles.confirmTitleDark]}>Eliminar publicación</Text>
            <Text style={[styles.confirmText, darkMode && styles.confirmTextDark]}>¿Estás seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity style={[styles.confirmButton, styles.confirmCancelButton, darkMode && styles.confirmCancelButtonDark]} onPress={cancelDelete}>
                <Text style={[styles.confirmButtonText, darkMode && styles.confirmButtonTextDark]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, styles.confirmDeleteButton]} onPress={performDeletePost}>
                <Text style={[styles.confirmButtonText, { fontWeight: '700', color: '#fff' }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  perfilContainer: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 0,
  },

  leftAligned: {
    alignItems: 'flex-start',
    paddingLeft: 24,
    paddingRight: 24,
    width: '100%',
  },

  avatarShadow: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 60,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },

  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: { fontSize: 40, color: '#888' },

  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#0e141b',
    alignSelf: 'flex-start',
  },

  infoList: { marginBottom: 12, alignSelf: 'flex-start' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 15, color: '#4e7397', marginLeft: 8, alignSelf: 'flex-start' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#222',
    alignSelf: 'flex-start',
  },

  statsList: { marginBottom: 12, alignSelf: 'flex-start' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statsText: { fontSize: 15, color: '#4e7397', marginLeft: 8, alignSelf: 'flex-start' },

  quickList: { marginBottom: 12, alignSelf: 'flex-start' },
  quickRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  quickText: { fontSize: 15, color: '#4e7397', marginLeft: 8, alignSelf: 'flex-start' },

  noticeBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    overflow: 'visible',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },

  modalText: {
    color: '#444',
  },

  // Dark mode variations
  modalContentDark: {
    backgroundColor: '#121212',
  },
  modalTitleDark: {
    color: '#fff',
  },
  modalTextDark: {
    color: '#ddd',
  },
  inputDark: {
    backgroundColor: '#222',
    color: '#fff',
    borderColor: '#333',
  },
  buttonDark: {
    backgroundColor: '#1f6feb',
  },
  mediaButtonDark: {
    backgroundColor: '#1f6feb',
  },
  uploadButtonDark: {
    backgroundColor: '#1e4e8a',
  },
  overlayMenuDark: {
    backgroundColor: '#1b1b1b',
    borderColor: '#2b2b2b',
  },
  overlayMenuTextDark: {
    color: '#fff',
  },
  overlayButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  confirmModalContentDark: {
    backgroundColor: '#111',
  },
  confirmTextDark: {
    color: '#ddd',
  },
  confirmTitleDark: {
    color: '#fff',
  },
  confirmButtonTextDark: {
    color: '#fff',
  },

  input: {
    height: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    color: '#222',
  },

  charCount: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    textAlign: 'right',
  },

  previewContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },

  previewMedia: {
    width: '100%',
    height: 400,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#000',
  },

  clearPreviewButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 6,
  },

  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },

  mediaButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginHorizontal: 4,
  },

  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  buttonDark: {
    backgroundColor: '#1f6feb',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  fullMediaModalContent: {
    width: '96%',
    maxWidth: 500,
    height: 500,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
  },

  fullMedia: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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

  // Estilos para modal de confirmación
  confirmModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
  },

  confirmModalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },

  confirmModalContentDark: {
    backgroundColor: '#111',
  },

  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#222',
  },

  confirmTitleDark: {
    color: '#fff',
  },

  confirmText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },

  confirmTextDark: {
    color: '#ddd',
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    marginHorizontal: 6,
  },

  confirmCancelButton: {
    backgroundColor: '#EEE',
  },

  confirmDeleteButton: {
    backgroundColor: '#FF3B30',
  },

  confirmButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },

  confirmButtonTextDark: {
    color: '#fff',
  },

  confirmCancelButtonDark: {
    backgroundColor: '#333',
  },

  // Textos de likes / comentarios
  likesText: {
    color: '#ffffffff',
    fontSize: 14,
  },
  likesTextDark: {
    color: '#ddd',
  },

  // Placeholder de comentarios (sin comentarios)
  placeholderText: {
    color: '#888',
    fontSize: 13,
  },
  placeholderTextDark: {
    color: '#aaa',
  },

  // Item de comentario
  commentItem: {
    marginBottom: 6,
  },
  commentItemDark: {
    // estilos vacíos intencionales: los Text internos manejan color
  },

  commentAuthor: {
    fontWeight: '700',
    color: '#ffffffff',
  },
  commentAuthorDark: {
    color: '#fff',
  },

  commentText: {
    color: '#ffffffff',
  },
  commentTextDark: {
    color: '#e6e6e6',
  },

  // Actions row (perfil modal)
  actionsRowProfile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4 },
  actionsLeftProfile: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  actionBtnRowProfile: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineCountProfile: { fontSize: 13, color: '#444', marginLeft: 6, fontWeight: '500' },
  inlineCountProfileDark: { color: '#ddd' },
});

