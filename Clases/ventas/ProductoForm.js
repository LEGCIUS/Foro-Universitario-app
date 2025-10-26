import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, FlatList } from 'react-native';
import { Platform as RNPlatform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { supabase } from '../../Supabase/supabaseClient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useNavigation } from '@react-navigation/native';

export default function ProductoForm({ onProductoPublicado, onCancelar, producto, modo }) {
  const [loadingProducto, setLoadingProducto] = useState(false);
  const navigation = useNavigation();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [foto_url, setFotoUrl] = useState([]);
  const [previewUris, setPreviewUris] = useState([]);
  const [nombreVendedor, setNombreVendedor] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mensajePredeterminado, setMensajePredeterminado] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [categoria, setCategoria] = useState('comida');
  const [horaInicioVenta, setHoraInicioVenta] = useState(null);
  const [showHoraPicker, setShowHoraPicker] = useState(false);

  React.useEffect(() => {
    async function fetchProducto() {
      if (modo === 'editar' && producto?.id) {
        setLoadingProducto(true);
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('id', producto.id)
          .single();
        if (data) {
          setNombre(data.nombre || '');
          setDescripcion(data.descripcion || '');
          setPrecio(data.precio ? String(data.precio) : '');
          setFotoUrl(data.foto_url || []);
          setPreviewUris(data.foto_url || []);
          setNombreVendedor(data.nombre_vendedor || '');
          setTelefono(data.telefono || '');
          setMensajePredeterminado(data.mensaje_whatsapp || '');
          setCategoria(data.categoria || 'comida');
          setHoraInicioVenta(data.hora_inicio_venta ? new Date(`1970-01-01T${data.hora_inicio_venta}:00`) : null);
        }
        setLoadingProducto(false);
      } else if (producto) {
        setNombre(producto.nombre || '');
        setDescripcion(producto.descripcion || '');
        setPrecio(producto.precio ? String(producto.precio) : '');
        setFotoUrl(producto.foto_url || []);
        setPreviewUris(producto.foto_url || []);
        setNombreVendedor(producto.nombre_vendedor || '');
        setTelefono(producto.telefono || '');
        setMensajePredeterminado(producto.mensaje_whatsapp || '');
        setCategoria(producto.categoria || 'comida');
        setHoraInicioVenta(producto.hora_inicio_venta ? new Date(`1970-01-01T${producto.hora_inicio_venta}:00`) : null);
      }
    }
    fetchProducto();
  }, [producto, modo]);

  const pickImagesAndUpload = async () => {
    let mediaTypes = ImagePicker.MediaType ? ImagePicker.MediaType.IMAGE : ImagePicker.MediaTypeOptions.Images;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPreviewUris(uris);
      setShowPreview(true);
    }
  };

  const handleHoraChange = (event, selectedDate) => {
    setShowHoraPicker(false);
    if (selectedDate) {
      setHoraInicioVenta(selectedDate);
    }
  };

  const handlePublicar = async () => {
    if (!nombreVendedor || !telefono || !mensajePredeterminado || !categoria || !precio || !descripcion || (previewUris.length === 0)) {
      Alert.alert('Completa todos los campos y sube al menos una foto');
      return;
    }
    let telefonoFormateado = telefono.replace(/\D/g, '');
    telefonoFormateado = '+506' + telefonoFormateado.slice(-8);
    setSubiendo(true);
    try {
      let horaGuardar = null;
      if (horaInicioVenta) {
        let hora = typeof horaInicioVenta === 'string' ? new Date(horaInicioVenta) : horaInicioVenta;
        let horas = hora.getHours();
        let minutos = hora.getMinutes();
        let horaStr = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        horaGuardar = horaStr;
      }
      // Subir imágenes y obtener URLs públicas
      let fotoUrlArr = [];
      const carnet = await AsyncStorage.getItem('carnet');
      let nuevasFotos = previewUris.filter(uri => uri.startsWith('file://'));
      let fotosRemotas = previewUris.filter(uri => uri.startsWith('http://') || uri.startsWith('https://'));
      // Si no hay nuevas fotos, conservar las existentes
      if (nuevasFotos.length === 0 && fotosRemotas.length > 0) {
        fotoUrlArr = fotosRemotas;
      } else {
        // Subir nuevas fotos y agregar las remotas
        for (let i = 0; i < nuevasFotos.length; i++) {
          const uri = nuevasFotos[i];
          const fileName = uri.split('/').pop();
          const fileType = fileName.split('.').pop();
          const filePath = `${carnet}/productos/${Date.now()}_${i}_${fileName}`;
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
          const fileBuffer = Buffer.from(base64, 'base64');
          const { data, error: uploadError } = await supabase.storage
            .from('fotos-productos')
            .upload(filePath, fileBuffer, {
              contentType: `image/${fileType}`,
              upsert: true,
            });
          if (uploadError) {
            Alert.alert('Error al subir imagen', uploadError.message || 'No se pudo subir la imagen');
            console.error('Error al subir imagen:', uploadError);
            setSubiendo(false);
            return;
          }
          const { data: publicData } = supabase
            .storage
            .from('fotos-productos')
            .getPublicUrl(filePath);
          fotoUrlArr.push(publicData.publicUrl + `?t=${Date.now()}`);
        }
        // Si también hay fotos remotas, las agregamos
        fotoUrlArr = [...fotoUrlArr, ...fotosRemotas];
      }
      let error;
      if (modo === 'editar' && producto?.id) {
        // Actualizar producto existente
        const { error: updateError } = await supabase
          .from('productos')
          .update({
            nombre: nombre,
            usuario_carnet: producto.usuario_carnet,
            nombre_vendedor: nombreVendedor,
            telefono: telefonoFormateado,
            mensaje_whatsapp: mensajePredeterminado,
            categoria,
            precio: parseFloat(precio),
            descripcion,
            foto_url: fotoUrlArr,
            ...(horaGuardar ? { hora_inicio_venta: horaGuardar } : {}),
          })
          .eq('id', producto.id);
        error = updateError;
      } else {
        // Publicar nuevo producto
        const carnet = await AsyncStorage.getItem('carnet');
        const { error: insertError } = await supabase
          .from('productos')
          .insert([{
            usuario_carnet: carnet,
            nombre_vendedor: nombreVendedor,
            telefono: telefonoFormateado,
            mensaje_whatsapp: mensajePredeterminado,
            categoria,
            precio: parseFloat(precio),
            descripcion,
            foto_url: fotoUrlArr,
            ...(horaGuardar ? { hora_inicio_venta: horaGuardar } : {}),
          }]);
        error = insertError;
      }
      if (error) {
        Alert.alert('Error al guardar producto', error.message || 'No se pudo guardar el producto');
        console.error('Error al guardar producto:', error);
      } else {
        Alert.alert(modo === 'editar' ? '¡Actualizado!' : '¡Publicado!', modo === 'editar' ? 'Producto actualizado correctamente' : 'Tu producto ha sido publicado');
        setNombreVendedor('');
        setTelefono('');
        setMensajePredeterminado('');
        setCategoria('comida');
        setPrecio('');
        setDescripcion('');
        setPreviewUris([]);
        setHoraInicioVenta(null);
        if (onProductoPublicado) onProductoPublicado();
        if (onCancelar) onCancelar();
      }
    } catch (err) {
      Alert.alert('Error inesperado', err.message || 'Hubo un problema al guardar el producto.');
      console.error('Error inesperado al guardar producto:', err);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24 }}
      enableOnAndroid={true}
      extraScrollHeight={40}
    >
      {loadingProducto ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 12, color: '#888' }}>Cargando información del producto...</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>Publicar producto</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            value={nombre}
            onChangeText={setNombre}
          />
          <View style={styles.categoriaContainer}>
            <Text style={styles.categoriaLabel}>Categoría:</Text>
            <View style={styles.categoriaOptions}>
              {['comida', 'servicios', 'articulos', 'decoracion'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoriaOption, categoria === cat && styles.categoriaSelected]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text style={categoria === cat ? styles.categoriaSelectedText : styles.categoriaOptionText}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TextInput
            style={styles.input}
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
          <TextInput
            style={styles.input}
            placeholder="Nombre del vendedor"
            value={nombreVendedor}
            onChangeText={setNombreVendedor}
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono (WhatsApp)"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { minHeight: 48, textAlignVertical: 'top' }]}
            placeholder="Mensaje predeterminado para WhatsApp"
            value={mensajePredeterminado}
            onChangeText={setMensajePredeterminado}
            multiline
          />
          <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>Inicio de venta:</Text>
          {RNPlatform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center', alignItems: 'flex-start' }]}
              onPress={() => setShowHoraPicker(true)}
            >
              <Text style={{ color: horaInicioVenta ? '#333' : '#aaa', fontSize: 16 }}>
                {horaInicioVenta ? horaInicioVenta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Selecciona la hora (opcional)'}
              </Text>
            </TouchableOpacity>
          )}
          {showHoraPicker && RNPlatform.OS !== 'web' && (
            <DateTimePicker
              value={horaInicioVenta || new Date()}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={handleHoraChange}
            />
          )}
          <TouchableOpacity style={styles.imageButton} onPress={pickImagesAndUpload} disabled={subiendo}>
            <Text style={styles.imageButtonText}>{previewUris.length > 0 ? 'Cambiar fotos' : 'Subir fotos'}</Text>
          </TouchableOpacity>
          {previewUris.length > 0 && (
            <FlatList
              data={previewUris}
              horizontal
              keyExtractor={(uri, idx) => uri + idx}
              style={{ marginBottom: 12 }}
              renderItem={({ item }) => (
                <View style={{ width: 120, height: 120, marginRight: 8 }}>
                  <Image source={{ uri: item }} style={styles.imagePreview} resizeMode="cover" />
                </View>
              )}
              initialNumToRender={3}
              maxToRenderPerBatch={4}
              windowSize={3}
              removeClippedSubviews={true}
            />
          )}
          <TouchableOpacity style={styles.publishButton} onPress={handlePublicar} disabled={subiendo}>
            {subiendo ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishButtonText}>Publicar</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => {
            if (onCancelar) {
              onCancelar();
            } else {
              navigation.goBack();
            }
          }}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', borderRadius: 16, margin: 16, elevation: 4 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#007AFF', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  imageButton: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  imageButtonText: { color: '#fff', fontWeight: 'bold' },
  imagePreview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  publishButton: { backgroundColor: '#00C6FB', padding: 14, borderRadius: 8, alignItems: 'center' },
  publishButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cancelButton: { backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  categoriaContainer: { marginBottom: 16 },
  categoriaLabel: { fontWeight: 'bold', marginBottom: 8, fontSize: 16 },
  categoriaOptions: { flexDirection: 'row', flexWrap: 'wrap' },
  categoriaOption: { backgroundColor: '#eee', padding: 8, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  categoriaSelected: { backgroundColor: '#007AFF' },
  categoriaOptionText: { color: '#333', fontWeight: 'bold' },
  categoriaSelectedText: { color: '#fff', fontWeight: 'bold' },
});
