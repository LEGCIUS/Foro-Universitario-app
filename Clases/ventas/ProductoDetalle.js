import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProductoDetalle({ producto, onVolver }) {
  const insets = useSafeAreaInsets();
  const { darkMode } = useTheme();
  const responsive = useResponsive();
  const [imagenActualIndex, setImagenActualIndex] = useState(0);
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

  const siguienteImagen = () => {
    const fotos = Array.isArray(producto.foto_url) ? producto.foto_url : [producto.foto_url];
    if (imagenActualIndex < fotos.length - 1) {
      setImagenActualIndex(imagenActualIndex + 1);
    }
  };

  const anteriorImagen = () => {
    if (imagenActualIndex > 0) {
      setImagenActualIndex(imagenActualIndex - 1);
    }
  };

  const fotos = Array.isArray(producto.foto_url) ? producto.foto_url : (producto.foto_url ? [producto.foto_url] : []);
  const tieneMultiplesImagenes = fotos.length > 1;

  console.log('ProductoDetalle - foto_url:', producto.foto_url);
  console.log('ProductoDetalle - fotos array:', fotos);
  console.log('ProductoDetalle - fotos.length:', fotos.length);
  console.log('ProductoDetalle - tieneMultiplesImagenes:', tieneMultiplesImagenes);

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: darkMode ? '#121212' : '#f5f7fb' }} 
      contentContainerStyle={{ 
        paddingBottom: responsive.spacing.xl,
        paddingHorizontal: responsive.spacing.md,
        maxWidth: responsive.maxWidth.lg,
        alignSelf: 'center',
        width: '100%',
      }}
    >
      <View style={[styles.header, { 
        paddingTop: Math.max(12, insets.top + 8),
        marginBottom: responsive.spacing.md,
      }]}>
        <Text style={[styles.pageTitle, { 
          color: darkMode ? '#fff' : '#0b2545',
          fontSize: responsive.fontSize.xl,
        }]}>Detalle del producto</Text>
      </View>
      <View style={[styles.container, { 
        backgroundColor: darkMode ? '#1e1e1e' : '#fff', 
        borderColor: darkMode ? '#2b2b2b' : '#ececec',
        borderRadius: responsive.getValue(12, 16, 20),
      }]}>
        {fotos.length > 0 ? (
          <View>
            <View style={[styles.imageWrapper, {
              borderTopLeftRadius: responsive.getValue(12, 16, 20),
              borderTopRightRadius: responsive.getValue(12, 16, 20),
            }]}>
              <Image 
                source={{ uri: fotos[imagenActualIndex] }} 
                style={[styles.image, {
                  height: responsive.getValue(220, 280, 340),
                }]} 
              />
            </View>
            <View style={[styles.imageNavigationContainer, { 
              paddingHorizontal: responsive.spacing.md,
              paddingVertical: responsive.spacing.sm,
            }]}>
              <TouchableOpacity 
                style={[styles.arrowButton, imagenActualIndex === 0 && styles.arrowButtonDisabled]} 
                onPress={anteriorImagen}
                disabled={imagenActualIndex === 0}
                activeOpacity={0.7}
              >
                <MaterialIcons name="chevron-left" size={responsive.getValue(24, 26, 28)} color="#fff" />
              </TouchableOpacity>
              <View style={styles.counterContainer}>
                <Text style={[styles.imageCounter, { fontSize: responsive.fontSize.sm }]}>
                  {imagenActualIndex + 1} / {fotos.length}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.arrowButton, imagenActualIndex === fotos.length - 1 && styles.arrowButtonDisabled]} 
                onPress={siguienteImagen}
                disabled={imagenActualIndex === fotos.length - 1}
                activeOpacity={0.7}
              >
                <MaterialIcons name="chevron-right" size={responsive.getValue(24, 26, 28)} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        <View style={{ 
          paddingHorizontal: responsive.spacing.lg, 
          paddingTop: responsive.spacing.md,
          paddingBottom: responsive.spacing.lg,
        }}>
          <Text style={[styles.nombre, { 
            color: darkMode ? '#fff' : '#0f172a',
            fontSize: responsive.fontSize.xl,
            marginBottom: responsive.spacing.xs,
          }]}>{producto.nombre}</Text>
          <Text style={[styles.precio, { 
            color: '#0b6cf6',
            fontSize: responsive.fontSize.lg,
            marginBottom: responsive.spacing.sm,
          }]}>₡{producto.precio}</Text>
          <Text style={[styles.descripcion, { 
            color: darkMode ? '#cbd5e1' : '#334155',
            fontSize: responsive.fontSize.md,
            marginBottom: responsive.spacing.md,
            lineHeight: responsive.getValue(20, 22, 24),
          }]}>{producto.descripcion}</Text>
          <Text style={[styles.meta, { 
            color: darkMode ? '#cbd5e1' : '#475569',
            fontSize: responsive.fontSize.sm,
            marginBottom: responsive.spacing.xs,
          }]}>Vendedor: <Text style={{ fontWeight: '700', color: darkMode ? '#fff' : '#0f172a' }}>{producto.nombre_vendedor}</Text></Text>
          <Text style={[styles.meta, { 
            color: darkMode ? '#cbd5e1' : '#475569',
            fontSize: responsive.fontSize.sm,
            marginBottom: responsive.spacing.xs,
          }]}>WhatsApp: <Text style={{ fontWeight: '700', color: '#25D366' }}>{producto.telefono}</Text></Text>
          {producto.mensaje_whatsapp ? (
            <View style={{ marginTop: responsive.spacing.sm }}>
              <Text style={[styles.mensajePred, { 
                color: darkMode ? '#e5e7eb' : '#0f172a',
                fontSize: responsive.fontSize.sm,
                marginBottom: responsive.spacing.xs,
              }]}>Mensaje predeterminado:</Text>
              <Text style={[styles.mensajePredText, { 
                color: darkMode ? '#cbd5e1' : '#64748b',
                fontSize: responsive.fontSize.sm,
                marginBottom: responsive.spacing.md,
              }]}>{producto.mensaje_whatsapp}</Text>
            </View>
          ) : null}
          <Text style={[styles.carnet, { 
            color: darkMode ? '#94a3b8' : '#64748b',
            fontSize: responsive.fontSize.xs,
            marginTop: responsive.spacing.sm,
          }]}>Publicado por: {producto.usuario_carnet}</Text>

          <View style={{ 
            flexDirection: responsive.isMobile ? 'column' : 'row', 
            marginTop: responsive.spacing.lg,
            gap: responsive.spacing.sm,
          }}>
            <TouchableOpacity 
              style={[styles.actionBtn, { 
                backgroundColor: '#25D366',
                paddingVertical: responsive.spacing.md,
                paddingHorizontal: responsive.spacing.lg,
                flex: responsive.isMobile ? undefined : 1,
              }]} 
              onPress={handleWhatsApp}
            >
              <MaterialIcons name="chat" size={responsive.getValue(16, 18, 18)} color="#fff" />
              <Text style={[styles.actionBtnText, { fontSize: responsive.fontSize.md }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { 
                backgroundColor: '#007AFF',
                paddingVertical: responsive.spacing.md,
                paddingHorizontal: responsive.spacing.lg,
                flex: responsive.isMobile ? undefined : 1,
              }]} 
              onPress={onVolver}
            >
              <MaterialIcons name="arrow-back" size={responsive.getValue(16, 18, 18)} color="#fff" />
              <Text style={[styles.actionBtnText, { fontSize: responsive.fontSize.md }]}>Volver</Text>
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
  container: { margin: 16, borderRadius: 16, borderWidth: 1 },
  imageWrapper: { overflow: 'hidden', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
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
  imageNavigationContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)'
  },
  arrowButton: { 
    backgroundColor: '#007AFF', 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  arrowButtonDisabled: { 
    backgroundColor: '#64748b', 
    opacity: 0.6 
  },
  arrowText: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  counterContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20
  },
  imageCounter: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#fff'
  },
});