import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet, Image, TouchableOpacity, Platform, Modal, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-audio';
import { Video } from 'expo-av';
import { supabase } from '../../Supabase/supabaseClient';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Esta mierda ya la devolvi a 20 antes de que se joda todo
// Si vuelve a joderse, gogo.
// Ayuda: Me estou dando cuenta que el error viene de aqui
// Asi que lo dejo en 2024
// Si vuelve a joderse, gogo. Ayuda: Me estou dando cuenta que el error viene de aqui
// Asi que lo dejo en 2024
// Si vuelve a joderse, gogo. Ayuda: Me estou dando cuenta que el error viene de aqui     




global.Buffer = global.Buffer || Buffer;

export default function HomeScreen({ onLogout, navigation }) {


  const [posts, setPosts] = useState([
    { id: '1', text: '¡Bienvenido al foro universitario!' },
    { id: '2', text: 'Recuerda revisar las reglas antes de publicar.' },
  ]);
  const [newPost, setNewPost] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const fetchPostsFromDB = useCallback(async () => {
    const { data, error } = await supabase
      .from('publicaciones')
      .select('*')
      .order('fecha_publicacion', { ascending: false });

    if (error) {
      console.error('Error al obtener publicaciones:', error);
      return;
    }

    // Obtener datos de usuario para cada publicación desde la tabla usuarios
    const postsWithUser = await Promise.all(
      data.map(async pub => {
        let userName = 'Usuario';
        let userAvatar = 'https://i.pravatar.cc/100';
        if (pub.carnet_usuario) {
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
        return {
          id: pub.id,
          text: pub.titulo,
          mediaUrl: pub.archivo_url,
          mediaType: pub.contenido,
          fecha: pub.fecha_publicacion,
          userId: pub.carnet_usuario,
          userName,
          userAvatar,
        };
      })
    );
    setPosts(postsWithUser);
  }, []);

  // Cargar archivos del bucket al montar el componente
  useEffect(() => {
    fetchPostsFromDB();
  }, [fetchPostsFromDB]);

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
            contenido: mediaType,
            fecha_publicacion: new Date().toISOString(),
            carnet_usuario: carnet,
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
        fetchPostsFromDB();
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error inesperado.');
      console.error('Error inesperado:', err);
    }
    setUploading(false);
  };

  // Componente funcional para cada publicación del feed
  const FeedItem = ({ item }) => {
    const [showControls, setShowControls] = useState(false);
    const hideControlsTimeout = useRef(null);

    // Función para mostrar controles y ocultarlos después de un tiempo
    const handleShowControls = () => {
      setShowControls(true);
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = setTimeout(() => setShowControls(false), 2500);
    };

    // Limpiar timeout al desmontar
    useEffect(() => {
      return () => {
        if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
      };
    }, []);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes || 0);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState(item.comments || []);
    const [status, setStatus] = useState(null); // video status
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [videoKey, setVideoKey] = useState(Date.now());
    const [hasError, setHasError] = useState(false);
    const videoRef = React.useRef(null);

    const handleLike = () => {
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
      // Actualiza en la base de datos si lo deseas
    };

    const handleAddComment = () => {
      if (commentText.trim()) {
        setComments([...comments, { user: 'Tú', text: commentText }]);
        setCommentText('');
        // Guarda el comentario en la base de datos si lo deseas
      }
    };

    // Controlar reproducción y reinicio del video
    const handlePlaybackStatusUpdate = (playbackStatus) => {
      setStatus(playbackStatus);
      setIsPlaying(playbackStatus.isPlaying);
      setIsBuffering(playbackStatus.isBuffering);
      if (playbackStatus.error) {
        setHasError(true);
      }
      if (playbackStatus.didJustFinish) {
        // Reiniciar video al terminar
        videoRef.current?.setPositionAsync(0);
        setIsPlaying(false);
      }
    };

    // Si hay error, forzar remount del video
    useEffect(() => {
      if (hasError) {
        setTimeout(() => {
          setVideoKey(Date.now());
          setHasError(false);
        }, 300);
      }
    }, [hasError]);

    const handleSeek = async (seconds) => {
      if (!videoRef.current || typeof status?.positionMillis !== 'number') return;
      try {
        await videoRef.current.pauseAsync();
        let newPosition = status.positionMillis + seconds * 1000;
        if (newPosition < 0) newPosition = 0;
        if (status.durationMillis && newPosition > status.durationMillis) newPosition = status.durationMillis;
        await videoRef.current.setPositionAsync(newPosition);
        await videoRef.current.playAsync();
      } catch (e) {
        setHasError(true);
      }
    };

    const handlePlayPause = async () => {
      if (!videoRef.current) return;
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    };

    return (
      <View style={styles.feedCard}>
        <View style={styles.feedHeader}>
          <Image source={{ uri: item.userAvatar || 'https://i.pravatar.cc/100' }} style={styles.feedAvatar} />
          <Text style={styles.feedUser}>{item.userName || 'Usuario'}</Text>
        </View>
        {item.mediaUrl && (
          item.mediaType === 'video' ? (
            <View style={styles.feedMediaContainer}>
              <TouchableOpacity
                activeOpacity={1}
                style={{ width: '100%', height: '100%' }}
                onPress={handleShowControls}
              >
                <Video
                  key={videoKey + item.mediaUrl}
                  ref={videoRef}
                  source={{ uri: item.mediaUrl }}
                  style={styles.feedMedia}
                  useNativeControls={false}
                  resizeMode="contain"
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  shouldPlay={false}
                  isLooping={false}
                />
                {/* Spinner de carga */}
                {isBuffering && (
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ backgroundColor: '#0008', borderRadius: 30, padding: 16 }}>
                      <Text style={{ color: '#fff', fontSize: 18 }}>Cargando...</Text>
                    </View>
                  </View>
                )}
                {/* Si hay error, mostrar botón para recargar */}
                {hasError && (
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => { setVideoKey(Date.now()); setHasError(false); }} style={{ backgroundColor: '#e74c3c', borderRadius: 20, padding: 12 }}>
                      <Text style={{ color: '#fff', fontSize: 16 }}>Reintentar video</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* Controles personalizados solo si showControls */}
                {showControls && (
                  <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                    <TouchableOpacity onPress={() => handleSeek(-10)} style={{ backgroundColor: '#0008', borderRadius: 20, padding: 8 }}>
                      <FontAwesome name="backward" size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePlayPause} style={{ backgroundColor: '#0008', borderRadius: 20, padding: 8 }}>
                      <FontAwesome name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSeek(10)} style={{ backgroundColor: '#0008', borderRadius: 20, padding: 8 }}>
                      <FontAwesome name="forward" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.feedMedia}
              resizeMode="contain"
            />
          )
        )}
        {item.text ? <Text style={styles.feedText}>{item.text}</Text> : null}
        <View style={styles.feedActions}>
          <TouchableOpacity style={styles.feedActionBtn} onPress={handleLike}>
            <FontAwesome name={liked ? "heart" : "heart-o"} size={28} color={liked ? "#e74c3c" : "#333"} />
          </TouchableOpacity>
          <Text style={styles.feedStats}>{likeCount} Me gusta</Text>
          <TouchableOpacity style={styles.feedActionBtn}>
            <FontAwesome name="comment-o" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.feedActionBtn}>
            <MaterialIcons name="share" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        {/* Comentarios */}
        <View style={styles.commentsSection}>
          {comments.map((c, idx) => (
            <View key={idx} style={styles.commentItem}>
              <Text style={styles.commentUser}>{c.user}:</Text>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Añade un comentario..."
            />
            <TouchableOpacity onPress={handleAddComment} style={styles.commentSendBtn}>
              <MaterialIcons name="send" size={22} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Filtra solo publicaciones válidas
  const publicacionesValidas = posts.filter(
    pub =>
      pub.archivo_url &&
      (pub.contenido === 'image' || pub.contenido === 'video')
  );

  // Agrupa en filas de dos
  const filas = [];
  for (let i = 0; i < publicacionesValidas.length; i += 2) {
    filas.push(publicacionesValidas.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        
      </View>

      {/* Lista de publicaciones */}
      <FlatList
        data={posts}
        renderItem={({ item }) => <FeedItem item={item} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.feed}
      />

      {/* Botón flotante para publicar */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowPublishModal(true)}>
        <FontAwesome name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de publicación */}
      <Modal visible={showPublishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear publicación</Text>
            <TextInput
              style={styles.input}
              placeholder="Escribe una historia o descripción..."
              value={newPost}
              onChangeText={setNewPost}
              maxLength={280}
              multiline
            />
            <Text style={styles.charCount}>{newPost.length}/280</Text>
            {previewMedia && (
              <View style={styles.previewContainer}>
                {mediaType === 'video' && typeof Video !== 'undefined' ? (
                  <Video
                    source={{ uri: previewMedia.uri }}
                    style={styles.previewMedia}
                    useNativeControls
                    resizeMode="contain"
                  />
                ) : mediaType === 'audio' && typeof Audio !== 'undefined' ? (
                  <Text>Reproductor de audio no disponible en esta plataforma.</Text>
                ) : (
                  <Image
                    source={{ uri: previewMedia.uri }}
                    style={styles.previewMedia}
                    resizeMode="cover"
                  />
                )}
                <TouchableOpacity
                  style={styles.clearPreviewButton}
                  onPress={() => {
                    setPreviewMedia(null);
                    setMediaType(null);
                  }}
                >
                  <Text style={{ color: '#fff' }}>Quitar</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.mediaRow}>
              <TouchableOpacity onPress={() => pickMedia('image')} style={styles.mediaButton} disabled={uploading}>
                <Text style={styles.buttonText}>🖼️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pickMedia('video')} style={styles.mediaButton} disabled={uploading}>
                <Text style={styles.buttonText}>🎬</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pickMedia('audio')} style={styles.mediaButton} disabled={uploading}>
                <Text style={styles.buttonText}>🎤</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={async () => {
                await handleAddPost();
                setShowPublishModal(false);
              }}
              style={[styles.button, { backgroundColor: (newPost.trim() || previewMedia) ? '#007bff' : '#aaa', marginTop: 12 }]}
              disabled={uploading || (!newPost.trim() && !previewMedia)}
            >
              <Text style={styles.buttonText}>{uploading ? 'Publicando...' : 'Publicar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPublishModal(false)} style={[styles.button, { backgroundColor: '#FF3B30', marginTop: 8 }]}> 
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sección de publicaciones válidas */}
      <ScrollView style={{ flex: 1, backgroundColor: "#fff", padding: 12 }}>
        <Text style={[styles.sectionTitle, { color: "#000" }]}>Publicaciones</Text>
        {publicacionesValidas.length === 0 ? (
          <Text style={[styles.infoText, { color: "#000" }]}>No hay publicaciones.</Text>
        ) : (
          filas.map((fila, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 10 }}>
              {fila.map((pub, j) => (
                <View key={j} style={{
                  flex: 1,
                  aspectRatio: 1,
                  marginHorizontal: 4,
                  backgroundColor: '#e7edf3',
                  borderRadius: 8,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {pub.contenido === 'image' && (
                    <Image
                      source={{ uri: pub.archivo_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  )}
                  {pub.contenido === 'video' && (
                    <Video
                      source={{ uri: pub.archivo_url }}
                      style={{ width: '100%', height: '100%' }}
                      useNativeControls={false}
                      resizeMode="cover"
                      isLooping
                    />
                  )}
                </View>
              ))}
              {fila.length === 1 && <View style={{
                flex: 1,
                aspectRatio: 1,
                marginHorizontal: 4,
                backgroundColor: '#e7edf3',
                borderRadius: 8,
              }} />}
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
    color: '#888',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    paddingBottom: 18,
    paddingHorizontal: 0,
    minHeight: 320,
    width: '100%',
    alignSelf: 'stretch',
    shadowColor: 'transparent',
    elevation: 0,
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
    backgroundColor: '#e7edf3',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    maxHeight: 340,
    width: '96%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  feedMedia: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 340,
    borderRadius: 10,
    backgroundColor: '#e7edf3',
    resizeMode: 'contain',
  },
  feedText: {
    fontSize: 15,
    color: '#333',
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  feedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginTop: 6,
  },
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
    shadowOpacity: 0.18,
    shadowRadius: 8,
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
});
