import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProductoDetalle({ producto, onVolver }) {
  const insets = useSafeAreaInsets();
  const { darkMode } = useTheme();
  if (!producto) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: Math.max(12, insets.top + 8), backgroundColor: darkMode ? '#121212' : '#f5f7fb' }]}>
        <Text style={[styles.emptyText, { color: darkMode ? '#cbd5e1' : '#64748b' }]}>No se encontró el producto.</Text>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007AFF' }]} onPress={onVolver}>
          <Text style={styles.actionBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Función para abrir WhatsApp con el mensaje predeterminado
  const handleWhatsApp = () => {
    const numero = (producto?.telefono || '').toString().replace(/[^0-9]/g, '');
    if (!numero) return Alert.alert('Teléfono no disponible');
    const mensaje = encodeURIComponent(producto.mensaje_whatsapp || `Hola, estoy interesado en el producto: ${producto.nombre}`);
    const url = `https://wa.me/${numero}?text=${mensaje}`;
    import('react-native').then(({ Linking }) => Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.')));
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#121212' : '#f5f7fb' }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={[styles.header, { paddingTop: Math.max(12, insets.top + 8) }]}>
        <Text style={[styles.pageTitle, { color: darkMode ? '#fff' : '#0b2545' }]}>Detalle del producto</Text>
      </View>
      <View style={[styles.container, { backgroundColor: darkMode ? '#1e1e1e' : '#fff', borderColor: darkMode ? '#2b2b2b' : '#ececec' }]}>
        {producto.foto_url ? (
          <Image source={{ uri: Array.isArray(producto.foto_url) ? producto.foto_url[0] : producto.foto_url }} style={styles.image} />
        ) : null}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={[styles.nombre, { color: darkMode ? '#fff' : '#0f172a' }]}>{producto.nombre}</Text>
          <Text style={[styles.precio, { color: '#0b6cf6' }]}>₡{producto.precio}</Text>
          <Text style={[styles.descripcion, { color: darkMode ? '#cbd5e1' : '#334155' }]}>{producto.descripcion}</Text>
          <Text style={[styles.meta, { color: darkMode ? '#cbd5e1' : '#475569' }]}>Vendedor: <Text style={{ fontWeight: '700', color: darkMode ? '#fff' : '#0f172a' }}>{producto.nombre_vendedor}</Text></Text>
          <Text style={[styles.meta, { color: darkMode ? '#cbd5e1' : '#475569' }]}>WhatsApp: <Text style={{ fontWeight: '700', color: '#25D366' }}>{producto.telefono}</Text></Text>
          {producto.mensaje_whatsapp ? (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.mensajePred, { color: darkMode ? '#e5e7eb' : '#0f172a' }]}>Mensaje predeterminado:</Text>
              <Text style={[styles.mensajePredText, { color: darkMode ? '#cbd5e1' : '#64748b' }]}>{producto.mensaje_whatsapp}</Text>
            </View>
          ) : null}
          <Text style={[styles.carnet, { color: darkMode ? '#94a3b8' : '#64748b' }]}>Publicado por: {producto.usuario_carnet}</Text>

          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366', marginRight: 8 }]} onPress={handleWhatsApp}>
              <MaterialIcons name="chat" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007AFF' }]} onPress={onVolver}>
              <MaterialIcons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 6 },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  container: { margin: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  image: { width: '100%', height: 260 },
  nombre: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  precio: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  descripcion: { fontSize: 16, marginBottom: 12 },
  meta: { fontSize: 15, marginBottom: 4 },
  mensajePred: { fontSize: 15, marginBottom: 6, fontWeight: '700' },
  mensajePredText: { fontSize: 14, marginBottom: 12 },
  carnet: { fontSize: 13, marginTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, marginBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
});