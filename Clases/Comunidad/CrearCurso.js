import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';

export default function CrearCurso({ navigation }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagen, setImagen] = useState(null);
  const [capitulos, setCapitulos] = useState([]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.cancelled) {
      setImagen(result.uri);
    }
  };

  const addCapitulo = () => {
    setCapitulos([...capitulos, { titulo: '', descripcion: '', contenido: '', video: null }]);
  };

  const updateCapitulo = (idx, field, value) => {
    const nuevos = [...capitulos];
    nuevos[idx][field] = value;
    setCapitulos(nuevos);
  };

  const pickVideo = async (idx) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.cancelled) {
      const nuevos = [...capitulos];
      nuevos[idx].video = result.uri;
      setCapitulos(nuevos);
    }
  };

  const handleGuardar = () => {
    // Aquí iría la lógica para guardar el curso y capítulos en Supabase
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}><Icon name="school" size={26} color="#00C6FB" />  Crear Curso</Text>
        <TextInput
          style={styles.input}
          placeholder="Título del curso"
          value={titulo}
          onChangeText={setTitulo}
        />
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Precio"
          value={precio}
          onChangeText={setPrecio}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imagen ? (
            <Image source={{ uri: imagen }} style={styles.image} />
          ) : (
            <Icon name="image" size={32} color="#00C6FB" />
          )}
          <Text style={styles.imageText}>Seleccionar imagen</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}><Icon name="list" size={22} color="#00C6FB" />  Capítulos / Episodios</Text>
      {capitulos.map((cap, idx) => (
        <View key={idx} style={styles.capituloCard}>
          <View style={styles.capituloHeader}>
            <Icon name="menu-book" size={22} color="#50fa7b" />
            <Text style={styles.capituloLabel}>Capítulo {idx + 1}</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Título del capítulo"
            value={cap.titulo}
            onChangeText={v => updateCapitulo(idx, 'titulo', v)}
          />
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Descripción"
            value={cap.descripcion}
            onChangeText={v => updateCapitulo(idx, 'descripcion', v)}
            multiline
          />
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Contenido (texto, links, etc)"
            value={cap.contenido}
            onChangeText={v => updateCapitulo(idx, 'contenido', v)}
            multiline
          />
          <TouchableOpacity style={styles.videoPicker} onPress={() => pickVideo(idx)}>
            {cap.video ? (
              <Icon name="videocam" size={28} color="#00C6FB" />
            ) : (
              <Icon name="videocam" size={28} color="#888" />
            )}
            <Text style={styles.videoText}>{cap.video ? 'Video seleccionado' : 'Agregar video'}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addCapBtn} onPress={addCapitulo}>
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.addCapText}>Agregar capítulo / episodio</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar}>
        <Text style={styles.saveBtnText}><Icon name="save" size={20} color="#fff" />  Guardar Curso</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7faff', padding: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 18, color: '#00C6FB', textAlign: 'center' },
  input: { backgroundColor: '#F6F6F6', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  imagePicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 8, backgroundColor: '#f7f7f7' },
  image: { width: 56, height: 56, borderRadius: 12, marginRight: 12 },
  imageText: { fontSize: 16, color: '#00C6FB', fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#222', marginTop: 10 },
  capituloCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#50fa7b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  capituloHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  capituloLabel: { fontSize: 17, fontWeight: 'bold', marginLeft: 8, color: '#50fa7b' },
  videoPicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f7f7f7', borderRadius: 8, padding: 8 },
  videoText: { fontSize: 15, color: '#888', marginLeft: 8 },
  addCapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00C6FB', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, marginBottom: 18, alignSelf: 'center', elevation: 2 },
  addCapText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  saveBtn: { backgroundColor: '#00C6FB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10, elevation: 3 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
