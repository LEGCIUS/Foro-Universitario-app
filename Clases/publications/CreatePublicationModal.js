import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Image, Platform, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { supabase } from '../../Supabase/supabaseClient';
import Etiquetas from '../components/Etiquetas';
import { useTheme } from '../contexts/ThemeContext';

global.Buffer = global.Buffer || Buffer;

export default function CreatePublicationModal({ visible, onClose, onPublished }) {
  const { darkMode } = useTheme();
  const [newPost, setNewPost] = useState('');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([]);
  const [uploading, setUploading] = useState(false);

  const pickMedia = async (type) => {
    let result;
    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image' ? ['image'] : type === 'video' ? ['video'] : ['image', 'video'],
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

  const handleAddPost = async () => {
    if (!newPost.trim() && !previewMedia) return;
    setUploading(true);
    try {
      const carnet = await AsyncStorage.getItem('carnet');
      if (!carnet) throw new ReferenceError('No se encontró el carnet del usuario');
      let publicUrl = null;
      if (previewMedia?.uri) {
        const uri = previewMedia.uri;
        const fileName = uri.split('/').pop();
        const fileType = fileName.split('.').pop();
        const filePath = `${carnet}/publicaciones/${Date.now()}_${fileName}`;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const fileBuffer = Buffer.from(base64, 'base64');
        const { error: uploadError } = await supabase.storage
          .from('multimedia')
          .upload(filePath, fileBuffer, {
            contentType: mediaType === 'video' ? `video/${fileType}` : `image/${fileType}`,
            cacheControl: '3600',
            upsert: true,
          });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('multimedia').getPublicUrl(filePath);
        publicUrl = publicData.publicUrl + `?t=${Date.now()}`;
      }
      const { error } = await supabase.from('publicaciones').insert([
        {
          titulo: newPost,
          archivo_url: publicUrl,
          contenido: previewMedia ? mediaType : 'text',
          fecha_publicacion: new Date().toISOString(),
          carnet_usuario: carnet,
          etiquetas: JSON.stringify(etiquetasSeleccionadas),
        },
      ]);
      if (error) throw error;
      setNewPost('');
      setPreviewMedia(null);
      setMediaType(null);
      setEtiquetasSeleccionadas([]);
      onPublished && onPublished();
    } catch (err) {
      // optionally show toast
    }
    setUploading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.createModalContainer, darkMode && styles.createModalContainerDark]}>
        <View style={styles.createHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={28} color={darkMode ? '#fff' : '#111'} />
          </TouchableOpacity>
          <Text style={[styles.createHeaderTitle, darkMode && styles.createHeaderTitleDark]}>Crear Publicación</Text>
          <TouchableOpacity disabled={uploading || (!newPost.trim() && !previewMedia)} onPress={handleAddPost}>
            <Text style={[styles.createPublishAction, darkMode && styles.createPublishActionDark, (uploading || (!newPost.trim() && !previewMedia)) && styles.createPublishActionDisabled]}>
              {uploading ? 'Publicando…' : 'Publicar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.previewLargeContainer, darkMode && styles.previewLargeContainerDark]}>
            {previewMedia ? (
              mediaType === 'video' && typeof Video !== 'undefined' ? (
                <Video source={{ uri: previewMedia.uri }} style={styles.previewLargeMedia} useNativeControls resizeMode="cover" />
              ) : (
                <Image source={{ uri: previewMedia.uri }} style={styles.previewLargeMedia} resizeMode="cover" />
              )
            ) : (
              <View style={[styles.previewLargeMedia, { alignItems: 'center', justifyContent: 'center', backgroundColor: darkMode ? '#111' : '#f2f2f2' }]}>
                <MaterialIcons name="image" size={56} color={darkMode ? '#777' : '#c4c4c4'} />
              </View>
            )}
            {previewMedia && (
              <TouchableOpacity onPress={() => { setPreviewMedia(null); setMediaType(null); }} style={styles.removeMediaBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={[styles.galleryPickerRow, darkMode && styles.galleryPickerRowDark]} onPress={() => pickMedia('all')} activeOpacity={0.8}>
            <View style={[styles.galleryIconWrap, darkMode && styles.galleryIconWrapDark]}>
              <MaterialIcons name="image" size={18} color={darkMode ? '#7cc0ff' : '#1976D2'} />
            </View>
            <Text style={[styles.galleryPickerText, darkMode && styles.galleryPickerTextDark]}>Seleccionar de la galería</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.descriptionInput, darkMode && styles.descriptionInputDark]}
            placeholder="Escribe una descripción..."
            placeholderTextColor={darkMode ? '#7a8394' : '#9aa0a6'}
            value={newPost}
            onChangeText={setNewPost}
            multiline
          />

          <Etiquetas
            etiquetasSeleccionadas={etiquetasSeleccionadas}
            onEtiquetasChange={setEtiquetasSeleccionadas}
            maxEtiquetas={5}
            estiloPersonalizado={{ container: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 }, etiqueta: { borderRadius: 20 }, texto: { fontSize: 13 } }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  createModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  createModalContainerDark: { backgroundColor: '#0b0f14' },
  createHeader: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createHeaderTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  createHeaderTitleDark: { color: '#fff' },
  createPublishAction: { color: '#007AFF', fontSize: 16, fontWeight: '700' },
  createPublishActionDark: { color: '#66b2ff' },
  createPublishActionDisabled: { color: '#b3d4ff' },
  previewLargeContainer: { marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#f2f2f2' },
  previewLargeContainerDark: { backgroundColor: '#111' },
  previewLargeMedia: { width: '100%', height: undefined, aspectRatio: 1 },
  removeMediaBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  galleryPickerRow: { marginHorizontal: 20, marginTop: 14, borderWidth: 1, borderColor: '#e4e6eb', backgroundColor: '#fff', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  galleryPickerRowDark: { borderColor: '#333', backgroundColor: '#0f1720' },
  galleryIconWrap: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  galleryIconWrapDark: { backgroundColor: '#0b2640' },
  galleryPickerText: { color: '#0f172a', fontSize: 16, fontWeight: '600' },
  galleryPickerTextDark: { color: '#dbeafe' },
  descriptionInput: { marginHorizontal: 20, marginTop: 16, padding: 16, borderWidth: 1, borderColor: '#e4e6eb', borderRadius: 12, backgroundColor: '#fff', fontSize: 16, color: '#0f172a', minHeight: 120, textAlignVertical: 'top' },
  descriptionInputDark: { color: '#fff', backgroundColor: '#121212', borderColor: '#333' },
});