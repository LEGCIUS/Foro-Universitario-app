//Antes de hacer el commit, asegurarme de avisar a los demas por si estan trabajando en el mismo archivo
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { supabase } from '../../Supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext'; 
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Video } from 'expo-av';
import CreatePublicationModal from '../publications/CreatePublicationModal';

const Tab = createMaterialTopTabNavigator();

export default function PerfilUsuario({ navigation }) {
  const { darkMode } = useTheme();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevaBio, setNuevaBio] = useState('');
  const [nuevaFoto, setNuevaFoto] = useState('');
  const [unreadDeletion, setUnreadDeletion] = useState(null);

  const fetchUsuario = async () => {
    setLoading(true);
    // Recupera el carnet guardado en AsyncStorage
    const carnet = await AsyncStorage.getItem('carnet');
    if (!carnet) {
      setLoading(false);
      return;
    }
    // Consulta los datos del usuario en Supabase
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
    React.useCallback(() => {
      fetchUsuario();
    }, [])
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
      } catch (_) {
        // Si la tabla no existe o falla, no bloquea el perfil
      }
    };
    fetchNotifications();
  }, [usuario?.carnet]);

  // Cambiar foto de perfil
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
          .upload(filePath, file, {
            contentType: fileType,
            upsert: true,
          });
        if (error) {
          Alert.alert('Error', error.message || 'No se pudo subir la imagen');
          return;
        }
        const { data: publicData } = supabase
          .storage
          .from('fotos-perfil')
          .getPublicUrl(data.path);
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
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        const fileBuffer = Buffer.from(base64, 'base64');
        const { data, error } = await supabase.storage
          .from('fotos-perfil')
          .upload(filePath, fileBuffer, {
            contentType: `image/${fileType}`,
            upsert: true,
          });
        if (error || !data) {
          Alert.alert('Error al subir la imagen', error?.message || 'No se pudo subir la imagen al storage.');
          return;
        }
        const { data: publicData } = supabase
          .storage
          .from('fotos-perfil')
          .getPublicUrl(filePath);
        if (!publicData || !publicData.publicUrl) {
          Alert.alert('Error', 'No se pudo obtener la URL pública de la imagen.');
          return;
        }
        const urlConTimestamp = publicData.publicUrl + `?t=${Date.now()}`;
        setNuevaFoto(urlConTimestamp);
        await supabase
          .from('usuarios')
          .update({ foto_perfil: urlConTimestamp })
          .eq('carnet', usuario.carnet);
        setUsuario({ ...usuario, foto_perfil: urlConTimestamp });
      }
    }
  };

  const handleGuardar = async () => {
    setLoading(true);
    await supabase
      .from('usuarios')
      .update({ biografia: nuevaBio, foto_perfil: nuevaFoto })
      .eq('carnet', usuario.carnet);
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
  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? "#181818" : "#fff", padding: 24 }}>
      <Text style={[styles.sectionTitle, darkMode && { color: "#fff" }]}>Estudiante</Text>
      <View style={styles.infoList}>
        <View style={styles.infoRow}><MaterialIcons name="email" size={20} color="#007AFF" /><Text style={styles.infoText}>{usuario.correo}</Text></View>
        <View style={styles.infoRow}><MaterialIcons name="phone" size={20} color="#007AFF" /><Text style={styles.infoText}>+506 8888 8888</Text></View>
        <View style={styles.infoRow}><MaterialIcons name="location-on" size={20} color="#007AFF" /><Text style={styles.infoText}>San José, Costa Rica</Text></View>
      </View>
      <Text style={[styles.sectionTitle, darkMode && { color: "#fff" }]}>Estadísticas</Text>
      <View style={styles.statsList}>
        <View style={styles.statsRow}><MaterialIcons name="school" size={20} color="#007AFF" /><Text style={styles.statsText}>Cursos: 12</Text></View>
        <View style={styles.statsRow}><MaterialIcons name="emoji-events" size={20} color="#007AFF" /><Text style={styles.statsText}>Logros: 5</Text></View>
      </View>
      <Text style={[styles.sectionTitle, darkMode && { color: "#fff" }]}>Accesos rápidos</Text>
      <View style={styles.quickList}>
        <View style={styles.quickRow}><MaterialIcons name="settings" size={20} color="#007AFF" /><Text style={styles.quickText}>Configuración</Text></View>
        <View style={styles.quickRow}><MaterialIcons name="notifications" size={20} color="#007AFF" /><Text style={styles.quickText}>Notificaciones</Text></View>
      
        <View style={styles.quickRow}><MaterialIcons name="history" size={20} color="#007AFF" /><Text style={styles.quickText}>Historial</Text></View>
      </View>
    </ScrollView>
  );
}

function PublicacionesTab({ usuario, darkMode }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showZoom, setShowZoom] = useState(false);

  // Modal de publicación usando CreatePublicationModal
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Likes y comentarios visuales
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
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
        setPosts(data);
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
      Alert.alert('Eliminada', 'La publicación se eliminó correctamente.');
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
      
      {/* Modal para ver publicación seleccionada */}
      <Modal
        visible={!!selectedPost}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedPost(null);
          setMenuVisible(null); // Añadir esto
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => {
            setSelectedPost(null);
            setMenuVisible(null); // Añadir esto
          }}
        >
          <View style={styles.centeredView}>
            <TouchableOpacity
              activeOpacity={1}
              style={[styles.modalContent, darkMode && styles.modalContentDark]}
              onPress={() => setMenuVisible(null)}
            >
             
              {/* Menú de tres puntos en el modal */}
              {selectedPost && (
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
                          handleDeletePost(selectedPost);
                        }}
                        style={styles.overlayMenuItem}
                      >
                        <MaterialIcons name="delete" size={18} color="#FF3B30" />
                        <Text style={[styles.overlayMenuText, darkMode && styles.overlayMenuTextDark, { color: '#FF3B30' }]}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              {selectedPost?.contenido === 'image' && (
                <>
                  <TouchableOpacity onPress={() => {
                    setShowZoom(true);
                    setMenuVisible(null);
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
                    onRequestClose={() => {
                      setShowZoom(false);
                      setMenuVisible(null);
                    }}
                  >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
                      <TouchableOpacity 
                        activeOpacity={1} 
                        style={{ flex: 1 }} 
                        onPress={() => {
                          setShowZoom(false);
                          setMenuVisible(null);
                        }}
                      >
                        <Image
                          source={{ uri: selectedPost.archivo_url }}
                          style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                        />
                      </TouchableOpacity>
                    </View>
                  </Modal>
                </>
              )}
              {selectedPost?.contenido === 'video' && (
                <Video
                  key={videoKey}
                  ref={videoRef}
                  source={{ uri: selectedPost.archivo_url }}
                  style={styles.previewMedia}
                  useNativeControls
                  resizeMode="contain"
                  onEnd={() => setVideoKey(prev => prev + 1)}
                />
              )}
              <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>{selectedPost?.titulo}</Text>
              <Text style={[styles.modalText, darkMode && styles.modalTextDark, { fontSize: 15, marginBottom: 8 }]}>
                {selectedPost?.descripcion || selectedPost?.titulo}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setLikes(likes + 1)} style={{ marginRight: 8 }}>
                  <MaterialIcons name="thumb-up" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={[styles.likesText, darkMode && styles.likesTextDark]}>{likes} Me gusta</Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 8, color: darkMode ? '#fff' : '#222' }]}>Comentarios:</Text>
              <ScrollView style={{ maxHeight: 80, marginBottom: 8 }}>
                {comments.length === 0 ? (
                  <Text style={[styles.placeholderText, darkMode && styles.placeholderTextDark]}>Sin comentarios.</Text>
                ) : (
                  comments.map((c, idx) => (
                    <Text key={idx} style={[styles.commentItem, darkMode && styles.commentItemDark]}>
                      <Text style={[styles.commentAuthor, darkMode && styles.commentAuthorDark]}>{c.usuario || 'Usuario'}: </Text>
                      <Text style={[styles.commentText, darkMode && styles.commentTextDark]}>{c.texto}</Text>
                    </Text>
                  ))
                )}
              </ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1, height: 36, marginBottom: 0 }, darkMode && styles.inputDark]}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor={darkMode ? "#bbb" : "#999"}
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
      
      {/* Confirmación estilizada para eliminar */}
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
});

