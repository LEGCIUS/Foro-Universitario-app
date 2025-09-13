//Antes de hacer el commit, asegurarme de avisar a los demas por si estan trabajando en el mismo archivo
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { supabase } from '../Supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function PerfilUsuario({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
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

  const handleEditar = () => setEditando(true);

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
      .update({ biografia: nuevaBio, foto_perfil: nuevaFoto }) // usa nuevaFoto aquí
      .eq('carnet', usuario.carnet);
    setEditando(false);
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
    <LinearGradient colors={["#e0eafc", "#cfdef3"]} style={styles.gradient}>
      <View style={styles.perfilContainer}>
        {/* Panel lateral izquierdo */}
        <View style={styles.leftPanel}>
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
          <Text style={styles.nombre}>{usuario.nombre} {usuario.apellido}</Text>
          <Text style={styles.rol}>Estudiante</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}><MaterialIcons name="email" size={20} color="#007AFF" /><Text style={styles.infoText}>{usuario.correo}</Text></View>
            <View style={styles.infoRow}><MaterialIcons name="phone" size={20} color="#007AFF" /><Text style={styles.infoText}>+506 8888 8888</Text></View>
            <View style={styles.infoRow}><MaterialIcons name="location-on" size={20} color="#007AFF" /><Text style={styles.infoText}>San José, Costa Rica</Text></View>
          </View>
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          <View style={styles.statsList}>
            <View style={styles.statsRow}><MaterialIcons name="school" size={20} color="#007AFF" /><Text style={styles.statsText}>Cursos: 12</Text></View>
            <View style={styles.statsRow}><MaterialIcons name="emoji-events" size={20} color="#007AFF" /><Text style={styles.statsText}>Logros: 5</Text></View>
          </View>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <View style={styles.quickList}>
            <View style={styles.quickRow}><MaterialIcons name="settings" size={20} color="#007AFF" /><Text style={styles.quickText}>Configuración</Text></View>
            <View style={styles.quickRow}><MaterialIcons name="notifications" size={20} color="#007AFF" /><Text style={styles.quickText}>Notificaciones</Text></View>
            <View style={styles.quickRow}><MaterialIcons name="credit-card" size={20} color="#007AFF" /><Text style={styles.quickText}>Métodos de pago</Text></View>
            <View style={styles.quickRow}><MaterialIcons name="history" size={20} color="#007AFF" /><Text style={styles.quickText}>Historial</Text></View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('Config')}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
        {/* Panel derecho: publicaciones */}
        <View style={styles.rightPanel}>
          <Text style={styles.sectionTitle}>Publicaciones</Text>
          {[
            { id: 1, titulo: 'Mi primer post', texto: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque euismod convallis velit.' },
            { id: 2, titulo: 'Otro post', texto: 'Pellentesque id eros finibus, suscipit ipsum ac, ultrices veli. Proin gravida orci.' },
            { id: 3, titulo: 'Último post', texto: 'Proin commodo augue ut tortor venenatis, eget fermentum dolor commodo.' },
          ].map(pub => (
            <View style={styles.postCard} key={pub.id}>
              <View style={styles.postInfo}>
                <Text style={styles.postPublicado}>Publicado</Text>
                <Text style={styles.postTitulo}>{pub.titulo}</Text>
                <Text style={styles.postTexto}>{pub.texto}</Text>
              </View>
              <View style={styles.postImgPlaceholder} />
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  perfilContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  leftPanel: {
    width: 320,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginRight: 24,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarShadow: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 60,
    marginBottom: 8,
    alignSelf: 'center',
  },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#007AFF', backgroundColor: '#fff' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 40, color: '#888' },
  nombre: { fontSize: 22, fontWeight: 'bold', marginBottom: 2, color: '#0e141b', alignSelf: 'center' },
  rol: { fontSize: 16, color: '#888', marginBottom: 12, alignSelf: 'center' },
  infoList: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 15, color: '#4e7397', marginLeft: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#222' },
  statsList: { marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statsText: { fontSize: 15, color: '#4e7397', marginLeft: 8 },
  quickList: { marginBottom: 12 },
  quickRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  quickText: { fontSize: 15, color: '#4e7397', marginLeft: 8 },
  logoutButton: { backgroundColor: '#f2f2f2', padding: 12, borderRadius: 10, marginTop: 18, alignSelf: 'stretch' },
  logoutText: { color: '#333', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  postCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  postInfo: { flex: 1 },
  postPublicado: { fontSize: 13, color: '#888', marginBottom: 2 },
  postTitulo: { fontSize: 17, fontWeight: 'bold', marginBottom: 2, color: '#222' },
  postTexto: { fontSize: 15, color: '#444' },
  postImgPlaceholder: { width: 48, height: 48, backgroundColor: '#e9ecef', borderRadius: 8, marginLeft: 12 },
});


