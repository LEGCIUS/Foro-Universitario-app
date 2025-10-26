import React from 'react';
import { View, Text, Image, StyleSheet, Button } from 'react-native';

export default function ProductoDetalle({ producto, onVolver }) {
  if (!producto) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No se encontró el producto.</Text>
        <Button title="Volver" onPress={onVolver} />
      </View>
    );
  }

  // Función para abrir WhatsApp con el mensaje predeterminado
  const handleWhatsApp = () => {
    const numero = producto.telefono.replace(/[^0-9]/g, '');
    const mensaje = encodeURIComponent(producto.mensaje_whatsapp || `Hola, estoy interesado en el producto: ${producto.nombre}`);
    const url = `https://wa.me/${numero}?text=${mensaje}`;
    // Para React Native, usa Linking
    import('react-native').then(({ Linking }) => {
      Linking.openURL(url);
    });
  };

  return (
    <View style={styles.container}>
      {producto.foto_url ? (
        <Image source={{ uri: producto.foto_url }} style={styles.image} />
      ) : null}
      <Text style={styles.nombre}>{producto.nombre}</Text>
      <Text style={styles.precio}>${producto.precio}</Text>
      <Text style={styles.descripcion}>{producto.descripcion}</Text>
      <Text style={styles.vendedor}>Vendedor: {producto.nombre_vendedor}</Text>
      <Text style={styles.telefono}>WhatsApp: {producto.telefono}</Text>
      <Button title="Contactar por WhatsApp" onPress={handleWhatsApp} color="#25D366" />
      <Text style={styles.mensajePred}>Mensaje predeterminado:</Text>
      <Text style={styles.mensajePredText}>{producto.mensaje_whatsapp}</Text>
      <Text style={styles.carnet}>Publicado por: {producto.usuario_carnet}</Text>
      <Button title="Volver" onPress={onVolver} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', backgroundColor: '#fff' },
  image: { width: '100%', height: 240, borderRadius: 16, marginBottom: 16 },
  nombre: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  precio: { fontSize: 20, color: '#00C6FB', marginBottom: 8 },
  descripcion: { fontSize: 16, color: '#333', marginBottom: 12, textAlign: 'center' },
  vendedor: { fontSize: 16, color: '#007AFF', marginBottom: 4 },
  telefono: { fontSize: 16, color: '#00C6FB', marginBottom: 8 },
  mensajePred: { fontSize: 15, color: '#333', marginTop: 12, fontWeight: 'bold' },
  mensajePredText: { fontSize: 14, color: '#555', marginBottom: 12 },
  carnet: { fontSize: 14, color: '#888', marginBottom: 24 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 16 },
});