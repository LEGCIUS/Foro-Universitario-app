import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function VideosScreen() {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [video, setVideo] = useState(null);

  const pickVideo = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
    if (result.type === 'success') {
      setVideo(result);
    }
  };

  const handleGuardar = () => {
    // Aquí iría la lógica para guardar el video en Supabase o backend
    alert('Video guardado (simulado)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}><Icon name="videocam" size={26} color="#00C6FB" />  Agregar Video</Text>
        <TextInput
          style={styles.input}
          placeholder="Título del video"
          value={titulo}
          onChangeText={setTitulo}
        />
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />
        <TouchableOpacity style={styles.filePicker} onPress={pickVideo}>
          {video ? (
            <Icon name="videocam" size={32} color="#00C6FB" />
          ) : (
            <Icon name="videocam" size={32} color="#888" />
          )}
          <Text style={styles.fileText}>{video ? video.name : 'Seleccionar video'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar}>
          <Text style={styles.saveBtnText}><Icon name="save" size={20} color="#fff" />  Guardar Video</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f7faff', padding: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    elevation: 3,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    width: '100%',
    maxWidth: 400,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 18, color: '#00C6FB', textAlign: 'center' },
  input: { backgroundColor: '#F6F6F6', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  filePicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 8, backgroundColor: '#f7f7f7' },
  fileText: { fontSize: 16, color: '#00C6FB', fontWeight: 'bold', marginLeft: 10 },
  saveBtn: { backgroundColor: '#00C6FB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10, elevation: 3 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});