import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-audio';
import { Video } from 'expo-av'; // Importa Video de expo-av si expo-video no funciona
import { supabase } from '../../Supabase/supabaseClient';
import { Buffer } from 'buffer';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

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

  // Cargar archivos del bucket al montar el componente
  useEffect(() => {
    const fetchPostsFromStorage = async () => {
      const { data, error } = await supabase.storage
        .from('multimedia')
        .list('uploads', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        console.error('Error al listar archivos:', error);
        return;
      }

      // Construir publicaciones a partir de los archivos
      const fetchedPosts = data.map(file => {
        const publicUrl = supabase.storage
          .from('multimedia')
          .getPublicUrl(`uploads/${file.name}`).data.publicUrl;

        // Detectar tipo por extensión
        let mediaType = 'image';
        if (file.name.match(/\.(mp4|mov|avi|webm)$/i)) mediaType = 'video';
        if (file.name.match(/\.(mp3|wav|ogg)$/i)) mediaType = 'audio';

        return {
          id: file.id || file.name,
          text: '', // Si quieres guardar texto, deberías usar una tabla aparte
          mediaUrl: publicUrl,
          mediaType,
        };
      });

      setPosts(fetchedPosts);
    };

    fetchPostsFromStorage();
  }, []);

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

    let mediaUrl = null;
    let type = mediaType;

    if (previewMedia) {
      let file, fileName, fileType;
      if (type === 'audio') {
        file = previewMedia.file;
        fileName = previewMedia.name || 'audio_upload.mp3';
        fileType = file.type || 'audio/mpeg';
        const { data, error } = await supabase.storage
          .from('multimedia')
          .upload(`uploads/${Date.now()}_${fileName}`, file, {
            contentType: fileType,
            upsert: true,
          });
        if (!error) {
          const { data: publicData } = supabase
            .storage
            .from('multimedia')
            .getPublicUrl(data.path);
          mediaUrl = publicData.publicUrl;
        }
      } else if (Platform.OS === 'web') {
        file = previewMedia.file || previewMedia;
        fileName = file.name || 'upload';
        fileType = file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg');
        const { data, error } = await supabase.storage
          .from('multimedia')
          .upload(`uploads/${Date.now()}_${fileName}`, file, {
            contentType: fileType,
            upsert: true,
          });
        if (!error) {
          const { data: publicData } = supabase
            .storage
            .from('multimedia')
            .getPublicUrl(data.path);
          mediaUrl = publicData.publicUrl;
        }
      } else {
        const uri = previewMedia.uri;
        fileName = uri.split('/').pop();
        fileType = fileName.split('.').pop();
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const fileBuffer = Buffer.from(base64, 'base64');
        const { data, error } = await supabase.storage
          .from('multimedia')
          .upload(`uploads/${Date.now()}_${fileName}`, fileBuffer, {
            contentType: type === 'video' ? `video/${fileType}` : `image/${fileType}`,
            upsert: true,
          });
        if (!error) {
          const { data: publicData } = supabase
            .storage
            .from('multimedia')
            .getPublicUrl(data.path);
          mediaUrl = publicData.publicUrl;
        }
      }
    }

    setPosts([
      {
        id: Date.now().toString(),
        text: newPost,
        mediaUrl,
        mediaType: type,
      },
      ...posts,
    ]);
    setNewPost('');
    setPreviewMedia(null);
    setMediaType(null);
    setUploading(false);
  };

  // Componente funcional para cada publicación del feed
  const FeedItem = ({ item }) => {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(item.likes || 0);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState(item.comments || []);

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

    return (
      <View style={styles.feedCard}>
        <View style={styles.feedHeader}>
          <Image source={{ uri: item.userAvatar || 'https://i.pravatar.cc/100' }} style={styles.feedAvatar} />
          <Text style={styles.feedUser}>{item.userName || 'Usuario'}</Text>
        </View>
        {item.mediaUrl ? (
          item.mediaType === 'video' ? (
            <View style={styles.feedMediaContainer}>
              {/* Cambia Video por expo-video si ya migraste */}
              <Video
                source={{ uri: item.mediaUrl }}
                style={styles.feedMedia}
                useNativeControls
                resizeMode="cover"
              />
            </View>
          ) : (
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.feedMedia}
              resizeMode="cover"
            />
          )
        ) : null}
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

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Bienvenido a la pantalla principal</Text>
        <Button title="Perfil" onPress={() => navigation.navigate('PerfilUsuario')} />
        <Button title="Cerrar sesión" onPress={onLogout} />
        <Button title="Ir a Ventas" onPress={() => navigation.navigate('VentasScreen')} />
      </View>

      {/* Formulario de publicación */}
      <View style={styles.addPostContainer}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={styles.input}
            placeholder="¿Qué quieres compartir hoy?"
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
                // Aquí deberías usar la API de expo-audio para reproducir audio
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
        </View>
        <TouchableOpacity
          onPress={handleAddPost}
          style={[
            styles.button,
            { backgroundColor: (newPost.trim() || previewMedia) ? '#007bff' : '#aaa' }
          ]}
          disabled={uploading || (!newPost.trim() && !previewMedia)}
        >
          <Text style={styles.buttonText}>{uploading ? 'Publicando...' : 'Publicar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => pickMedia('image')}
          style={styles.mediaButton}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>🖼️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => pickMedia('video')}
          style={styles.mediaButton}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>🎬</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => pickMedia('audio')}
          style={styles.mediaButton}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>🎤</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de publicaciones */}
      <FlatList
        data={posts}
        renderItem={({ item }) => <FeedItem item={item} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.feed}
      />
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
    borderRadius: 18,
    marginBottom: 24,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
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
  },
  feedMedia: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    backgroundColor: '#e7edf3',
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
});
