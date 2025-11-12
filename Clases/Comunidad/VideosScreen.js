


import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, Modal, TextInput } from 'react-native';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Video } from 'expo-av';

const videos = [
  {
    titulo: '¿Qué es el modelo OSI?',
    autor: 'Laura Méndez',
    duracion: '12:34',
    miniatura: 'https://img.youtube.com/vi/1cQh1ccqu8M/hqdefault.jpg',
    descripcion: 'Explicación visual del modelo OSI para redes.',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    titulo: 'POO en Java: Clases y Objetos',
    autor: 'Carlos Ruiz',
    duracion: '09:21',
    miniatura: 'https://img.youtube.com/vi/GoXwIVyNvX0/hqdefault.jpg',
    descripcion: 'Aprende los fundamentos de la programación orientada a objetos en Java.',
    url: 'https://www.w3schools.com/html/movie.mp4',
  },
  {
    titulo: 'SQL Básico: SELECT y JOIN',
    autor: 'Ana Torres',
    duracion: '15:02',
    miniatura: 'https://img.youtube.com/vi/7S_tz1z_5bA/hqdefault.jpg',
    descripcion: 'Consulta y une tablas en SQL con ejemplos prácticos.',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    titulo: 'Álgebra Lineal: Vectores y Matrices',
    autor: 'Mario López',
    duracion: '11:45',
    miniatura: 'https://img.youtube.com/vi/2ePf9rue1Ao/hqdefault.jpg',
    descripcion: 'Conceptos clave de álgebra lineal para ingeniería.',
    url: 'https://www.w3schools.com/html/movie.mp4',
  },
  {
    titulo: 'Estadística: Probabilidad y Variables',
    autor: 'Sofía Herrera',
    duracion: '13:10',
    miniatura: 'https://img.youtube.com/vi/5Dq-7Mqj4i8/hqdefault.jpg',
    descripcion: 'Introducción a la probabilidad y variables aleatorias.',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
];

export default function VideosScreen() {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [video, setVideo] = useState(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  const pickVideo = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
    if (result.type === 'success') {
      setVideo(result);
    }
  };

  const handleGuardar = () => {
    // Aquí iría la lógica para guardar el video en Supabase o backend
    setShowModal(false);
    setTitulo('');
    setDescripcion('');
    setVideo(null);
    alert('Video guardado (simulado)');
  };

  const openPlayer = (videoObj) => {
    setCurrentVideo(videoObj);
    setPlayerVisible(true);
  };

  const closePlayer = () => {
    setPlayerVisible(false);
    setCurrentVideo(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f7faff' }}>
      {/* Header fijo con botón y título */}
      <View style={styles.headerStaticRow}>
        <TouchableOpacity
          style={styles.backBtnStatic}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Comunidad');
            }
          }}
          activeOpacity={0.85}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleStatic}>Videos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
      {/* Lista de videos tipo YouTube */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}>
        {videos.map((video, idx) => (
          <View key={idx} style={styles.videoCard}>
            <View style={styles.thumbnailBox}>
              <Image source={{ uri: video.miniatura }} style={styles.thumbnailImg} />
              <View style={styles.durationBadge}><Text style={styles.durationText}>{video.duracion}</Text></View>
              <TouchableOpacity style={styles.playBtn} onPress={() => openPlayer(video)}>
                <Icon name="play-arrow" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.videoInfoBox}>
              <Text style={styles.videoTitle} numberOfLines={2}>{video.titulo}</Text>
              <Text style={styles.videoDesc} numberOfLines={2}>{video.descripcion}</Text>
              <Text style={styles.videoAutor}>{video.autor}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      {/* Modal para agregar video */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}><Icon name="videocam" size={22} color="#FF9800" />  Agregar Video</Text>
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
                <Icon name="videocam" size={32} color="#FF9800" />
              ) : (
                <Icon name="videocam" size={32} color="#888" />
              )}
              <Text style={styles.fileText}>{video ? video.name : 'Seleccionar video'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleGuardar}>
                <Text style={styles.saveBtnText}><Icon name="save" size={18} color="#fff" />  Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal de reproductor de video a pantalla completa */}
      <Modal visible={playerVisible} animationType="fade" transparent>
        <View style={styles.playerOverlay}>
          <TouchableOpacity style={styles.playerCloseBtn} onPress={closePlayer}>
            <Icon name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {currentVideo && (
            <Video
              source={{ uri: currentVideo.url }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="contain"
              shouldPlay
              useNativeControls
              style={styles.fullscreenVideo}
            />
          )}
        </View>
      </Modal>
    </View>
  );

}
const styles = StyleSheet.create({
  headerStaticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f7faff',
    zIndex: 100,
  },
  backBtnStatic: {
  backgroundColor: '#FF9800',
    borderRadius: 18,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 4,
  shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  headerTitleStatic: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 0.2,
    flex: 1,
  },
  addBtn: {
  backgroundColor: '#FF9800',
    borderRadius: 18,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 4,
  shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 12,
    marginBottom: 18,
    elevation: 3,
  shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  thumbnailBox: {
    width: 130,
    height: 90,
    position: 'relative',
    backgroundColor: '#eaf6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImg: {
    width: 130,
    height: 90,
    resizeMode: 'cover',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 2,
  },
  durationText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    backgroundColor: 'rgba(255,152,0,0.92)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  videoInfoBox: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  videoTitle: { fontSize: 17, fontWeight: 'bold', color: '#222', marginBottom: 2 },
  videoDesc: { fontSize: 14, color: '#555', marginBottom: 4 },
  videoAutor: { fontSize: 13, color: '#FF9800', fontWeight: 'bold' },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    width: '90%',
    elevation: 6,
  shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 18, color: '#FF9800', textAlign: 'center' },
  input: { backgroundColor: '#F6F6F6', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 14, color: '#222', borderWidth: 1, borderColor: '#e0e0e0' },
  filePicker: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 8, backgroundColor: '#f7f7f7' },
  fileText: { fontSize: 16, color: '#FF9800', fontWeight: 'bold', marginLeft: 10 },
  saveBtn: { backgroundColor: '#FF9800', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10, elevation: 3, minWidth: 90 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { backgroundColor: '#eee', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 10, minWidth: 90 },
  cancelBtnText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  playerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  playerCloseBtn: {
    position: 'absolute',
    top: 38,
    right: 18,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    padding: 6,
  },
  fullscreenVideo: {
    width: '100%',
    height: '60%',
    backgroundColor: '#000',
    borderRadius: 12,
  },
});