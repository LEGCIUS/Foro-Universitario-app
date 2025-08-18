import React, { useState } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import PerfilUsuario from '../PerfilUsuario';
import { supabase } from '../../Supabase/supabaseClient';
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;

export default function HomeScreen({ onLogout, navigation }) {
  const [posts, setPosts] = useState([
    { id: '1', text: '¡Bienvenido al foro universitario!' },
    { id: '2', text: 'Recuerda revisar las reglas antes de publicar.' },
  ]);
  const [newPost, setNewPost] = useState('');
  const [uploading, setUploading] = useState(false);

  // Elegir imagen/video y subirlo a Supabase
  const pickMediaAndUpload = async () => {
    let result;
    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['image', 'video'],
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled) {
        setUploading(true);
        const asset = result.assets[0];
        // asset.file es un File en web (expo-image-picker >= v14)
        const file = asset.file || asset;
        const fileName = file.name || 'upload';
        const fileType = file.type || 'image/jpeg';

        const { data, error } = await supabase.storage
          .from('multimedia')
          .upload(`uploads/${Date.now()}_${fileName}`, file, {
            contentType: fileType,
            upsert: true,
          });

        if (error) {
          console.error('Error subiendo archivo:', error);
        } else {
          const { data: publicData } = supabase
            .storage
            .from('multimedia')
            .getPublicUrl(data.path);

          setPosts([
            { id: Date.now().toString(), text: newPost || '', mediaUrl: publicData.publicUrl },
            ...posts,
          ]);
          setNewPost('');
        }
        setUploading(false);
      }
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled) {
        setUploading(true);
        const uri = result.assets[0].uri;
        const fileName = uri.split('/').pop();
        const fileType = fileName.split('.').pop();

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const fileBuffer = Buffer.from(base64, 'base64');

        const { data, error } = await supabase.storage
          .from('multimedia')
          .upload(`uploads/${Date.now()}_${fileName}`, fileBuffer, {
            contentType: `image/${fileType}`,
            upsert: true,
          });

        if (error) {
          console.error('Error subiendo archivo:', error);
        } else {
          const { data: publicData } = supabase
            .storage
            .from('multimedia')
            .getPublicUrl(data.path);

          setPosts([
            { id: Date.now().toString(), text: newPost || '', mediaUrl: publicData.publicUrl },
            ...posts,
          ]);
          setNewPost('');
        }
        setUploading(false);
      }
    }
  };

  // Publicar solo texto
  const handleAddPost = () => {
    if (newPost.trim() !== '') {
      setPosts([
        { id: Date.now().toString(), text: newPost },
        ...posts,
      ]);
      setNewPost('');
    }
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
        <TextInput
          style={styles.input}
          placeholder="Escribe una publicación..."
          value={newPost}
          onChangeText={setNewPost}
        />
        <TouchableOpacity onPress={handleAddPost} style={styles.button}>
          <Text style={styles.buttonText}>Publicar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickMediaAndUpload} style={styles.button}>
          <Text style={styles.buttonText}>{uploading ? 'Subiendo...' : '📷'}</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de publicaciones */}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.postItem}>
            {item.text ? <Text style={{ marginBottom: 8 }}>{item.text}</Text> : null}
            {item.mediaUrl ? (
              <Image
                source={{ uri: item.mediaUrl }}
                style={{ width: '100%', height: 200, borderRadius: 8 }}
                resizeMode="cover"
              />
            ) : null}
          </View>
        )}
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
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  feed: {
    paddingBottom: 16,
  },
});
