//Antes de hacer el commit, asegurarme de avisar a los demas por si estan trabajando en el mismo archivo
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { supabase } from '../Supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from './ThemeContext'; 
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Video } from 'expo-av';
import Publications from '../Clases/Publications';

const Tab = createMaterialTopTabNavigator();

export default function PerfilUsuario({ navigation }) {
  const { darkMode } = useTheme();
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuevaBio, setNuevaBio] = useState('');
  const [nuevaFoto, setNuevaFoto] = useState('');

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

  // Selecciona imagen y súbela a Supabase Storage
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
        const filePath = `${usuario.carnet}/perfil.${fileType}`; // Siempre el mismo nombre

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

        // Obtiene la URL pública y le agrega un parámetro único para evitar caché
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
        // Actualiza la foto en la base de datos y en el estado global
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ foto_perfil: urlConTimestamp })
          .eq('carnet', usuario.carnet);
        if (updateError) {
          Alert.alert('Error', 'No se pudo actualizar la foto en la base de datos: ' + updateError.message);
        } else {
          setUsuario({ ...usuario, foto_perfil: urlConTimestamp });
          Alert.alert('Éxito', 'La foto de perfil se actualizó correctamente.');
        }
      }
    }
  };

  const handleGuardar = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('usuarios')
      .update({ biografia: nuevaBio, foto_perfil: nuevaFoto })
      .eq('carnet', usuario.carnet);
    setLoading(false);
    if (error) {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } else {
      setUsuario({ ...usuario, biografia: nuevaBio, foto_perfil: nuevaFoto });
    }
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
            {() => <PublicacionesTab usuario={usuario} darkMode={darkMode} navigation={navigation} />}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </LinearGradient>
  );
}

function InfoTab({ usuario, darkMode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? "#181818" : "#fff", padding: 24 }}>
      <Text style={[styles.infoText, darkMode && { color: "#fff" }]}>Estudiante</Text>
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
        <View style={styles.quickRow}><MaterialIcons name="credit-card" size={20} color="#007AFF" /><Text style={styles.quickText}>Métodos de pago</Text></View>
        <View style={styles.quickRow}><MaterialIcons name="history" size={20} color="#007AFF" /><Text style={styles.quickText}>Historial</Text></View>
      </View>
    </ScrollView>
  );
}

function PublicacionesTab({ usuario, darkMode, navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal y publicación
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploading, setUploading] = useState(false);

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
        const soloValidas = data.filter(
          pub =>
            !!pub.archivo_url &&
            (pub.contenido === 'image' || pub.contenido === 'video')
        );
        setPosts(soloValidas);
      }
      setLoading(false);
    };
    fetchPosts();
  }, [usuario.carnet]);

  // Elegir imagen/video
  const pickMedia = async (type) => {
    let result;
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

  // Subir publicación
  const handleAddPost = async () => {
    if (!newPost.trim() && !previewMedia) return;
    setUploading(true);
    try {
      const carnet = usuario.carnet;
      let publicUrl = null;
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
      // Guardar publicación en la base de datos
      const { error } = await supabase
        .from('publicaciones')
        .insert([{
          titulo: newPost,
          archivo_url: publicUrl,
          contenido: mediaType,
          fecha_publicacion: new Date().toISOString(),
          carnet_usuario: carnet,
        }]);
      if (error) {
        Alert.alert('Error', 'No se pudo publicar.');
      } else {
        setNewPost('');
        setPreviewMedia(null);
        setMediaType(null);
        setShowPublishModal(false);
        // Recargar publicaciones
        const { data, error } = await supabase
          .from('publicaciones')
          .select('*')
          .eq('carnet_usuario', usuario.carnet)
          .order('fecha_publicacion', { ascending: false });
        if (!error && data) {
          const soloValidas = data.filter(
            pub =>
              !!pub.archivo_url &&
              (pub.contenido === 'image' || pub.contenido === 'video')
          );
          setPosts(soloValidas);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error inesperado.');
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Agrupa solo publicaciones válidas en filas de dos
  const filas = [];
  for (let i = 0; i < posts.length; i += 2) {
    filas.push(posts.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, backgroundColor: darkMode ? "#181818" : "#fff", padding: 12 }}>
        <TouchableOpacity
          style={{
            backgroundColor: darkMode ? "#007AFF" : "#222",
            padding: 10,
            borderRadius: 8,
            marginBottom: 16,
            alignSelf: 'flex-start'
          }}
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
                  onPress={() => navigation.navigate('Publicaciones', {
                    posts,
                    initialIndex: idx * 2 + j,
                    darkMode,
                  })}
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
                      isLooping
                    />
                  )}
                </TouchableOpacity>
              ))}
              {fila.length === 1 && <View style={{
                flex: 1,
                aspectRatio: 1,
                marginHorizontal: 4,
                backgroundColor: '#e7edf3 ',
                borderRadius: 8,
              }} />}
            </View>
          )))
        }
      </ScrollView>
      {/* Modal para subir publicación */}
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
            </View>
            <TouchableOpacity
              onPress={handleAddPost}
              style={[
                styles.button,
                { backgroundColor: (newPost.trim() || previewMedia) ? '#007bff' : '#aaa', marginTop: 12 }
              ]}
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
    borderRadius: 0,
    margin: 0,
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
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#007AFF', backgroundColor: '#fff' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 40, color: '#888' },
  nombre: { fontSize: 22, fontWeight: 'bold', marginBottom: 2, color: '#0e141b', alignSelf: 'flex-start' },
  infoList: { marginBottom: 12, alignSelf: 'flex-start' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 15, color: '#4e7397', marginLeft: 8, alignSelf: 'flex-start' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#222', alignSelf: 'flex-start' },
  statsList: { marginBottom: 12, alignSelf: 'flex-start' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statsText: { fontSize: 15, color: '#4e7397', marginLeft: 8, alignSelf: 'flex-start' },
  quickList: { marginBottom: 12, alignSelf: 'flex-start' },
  quickRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  quickText: { fontSize: 15, color: '#4e7397', marginLeft: 8, alignSelf: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  postCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee', width: '100%' },
  postInfo: { flex: 1 },
  postPublicado: { fontSize: 13, color: '#888', marginBottom: 2 },
  postTitulo: { fontSize: 17, fontWeight: 'bold', marginBottom: 2, color: '#222' },
  postTexto: { fontSize: 15, color: '#444' },
  postPublicado: { fontSize: 13, color: '#888', marginBottom: 2 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
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
    height: '100%',
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
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});


