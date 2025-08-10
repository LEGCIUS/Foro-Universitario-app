//Antes de hacer el commit, asegurarme de avisar a los demas por si estan trabajando en el mismo archivo
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { supabase } from '../Supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={styles.center}>
        <Text>No se pudo cargar el perfil.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={editando ? pickImageAndUpload : undefined} disabled={!editando}>
        {nuevaFoto ? (
          <Image source={{ uri: nuevaFoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{usuario.nombre[0]}</Text>
          </View>
        )}
        {editando && <Text style={{ color: '#007AFF', textAlign: 'center' }}>Cambiar foto</Text>}
      </TouchableOpacity>
      <Text style={styles.nombre}>{usuario.nombre} {usuario.apellido}</Text>
      <Text style={styles.carnet}>Carnet: {usuario.carnet}</Text>
      <Text style={styles.correo}>Correo: {usuario.correo}</Text>
      <Text style={styles.fecha}>Fecha de nacimiento: {usuario.fecha_nacimiento}</Text>
      <Text style={styles.carrera}>Carrera: {usuario.carrera}</Text>
      {editando ? (
        <TextInput
          style={[styles.bio, { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8 }]}
          value={nuevaBio}
          onChangeText={setNuevaBio}
          multiline
        />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 40, color: '#888' },
  nombre: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  carnet: { fontSize: 16, color: '#555', marginBottom: 4 },
  correo: { fontSize: 16, color: '#555', marginBottom: 4 },
  fecha: { fontSize: 16, color: '#555', marginBottom: 8 },
  bio: { fontSize: 16, color: '#333', marginTop: 12, textAlign: 'center', minWidth: 200, minHeight: 40 },
  button: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, marginHorizontal: 4 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

