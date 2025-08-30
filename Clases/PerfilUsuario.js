//Antes de hacer el commit, asegurarme de avisar a los demas por si estan trabajando en el mismo archivo
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
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
          encoding: FileSystem.EncodingType.Base64,
        });
        const fileBuffer = Buffer.from(base64, 'base64');

        const { data, error } = await supabase.storage
          .from('fotos-perfil')
          .upload(filePath, fileBuffer, {
            contentType: `image/${fileType}`,
            upsert: true,
          });

        if (error) {
          Alert.alert('Error', error.message || 'No se pudo subir la imagen');
          return;
        }

        // Obtiene la URL pública y le agrega un parámetro único para evitar caché
        const { data: publicData } = supabase
          .storage
          .from('fotos-perfil')
          .getPublicUrl(filePath);

        const urlConTimestamp = publicData.publicUrl + `?t=${Date.now()}`;
        setNuevaFoto(urlConTimestamp);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.cardPerfil}>
            <TouchableOpacity onPress={editando ? pickImageAndUpload : undefined} disabled={!editando}>
              <View style={styles.avatarShadow}>
                {nuevaFoto ? (
                  <Image source={{ uri: nuevaFoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{usuario.nombre[0]}</Text>
                  </View>
                )}
              </View>
              {editando && <Text style={{ color: '#007AFF', textAlign: 'center' }}>Cambiar foto</Text>}
            </TouchableOpacity>
            <Text style={styles.nombre}>{usuario.nombre} {usuario.apellido}</Text>
            <View style={styles.infoRow}><MaterialIcons name="badge" size={20} color="#007AFF" /><Text style={styles.infoText}>Carnet: {usuario.carnet}</Text></View>
            <View style={styles.infoRow}><MaterialIcons name="email" size={20} color="#007AFF" /><Text style={styles.infoText}>Correo: {usuario.correo}</Text></View>
            <View style={styles.infoRow}><FontAwesome5 name="birthday-cake" size={18} color="#007AFF" /><Text style={styles.infoText}>Fecha de nacimiento: {usuario.fecha_nacimiento}</Text></View>
            <View style={styles.infoRow}><MaterialIcons name="school" size={20} color="#007AFF" /><Text style={styles.infoText}>Carrera: {usuario.carrera}</Text></View>
            {editando ? (
              <View style={{ width: '100%' }}>
                <Text style={{ color: '#007AFF', marginBottom: 4, textAlign: 'center', fontWeight: 'bold' }}>Editando biografía...</Text>
                <TextInput
                  style={[styles.bio, { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, backgroundColor: '#f7faff' }]}
                  value={nuevaBio}
                  onChangeText={setNuevaBio}
                  multiline
                  placeholder="Escribe tu biografía aquí..."
                  textAlignVertical="top"
                />
              </View>
            ) : (
              usuario.biografia && <Text style={styles.bio}>{usuario.biografia}</Text>
            )}
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              {editando ? (
                <TouchableOpacity style={styles.button} onPress={handleGuardar}>
                  <Text style={styles.buttonText}>Guardar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.button} onPress={handleEditar}>
                  <Text style={styles.buttonText}>Editar</Text>
                </TouchableOpacity>
              )}
              {editando && (
                <TouchableOpacity style={[styles.button, { backgroundColor: '#ccc', marginLeft: 8 }]} onPress={() => setEditando(false)}>
                  <Text style={[styles.buttonText, { color: '#333' }]}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  cardPerfil: {
  backgroundColor: '#fff',
  borderRadius: 24,
  padding: 24,
  margin: 24,
  alignItems: 'center',
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
  },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#007AFF', backgroundColor: '#fff' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 48, color: '#888' },
  nombre: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#0e141b' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 17, color: '#4e7397', marginLeft: 8 },
  bio: { fontSize: 16, color: '#333', marginTop: 12, textAlign: 'center', minWidth: 220, minHeight: 40 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 10, marginHorizontal: 4, minWidth: 100 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

