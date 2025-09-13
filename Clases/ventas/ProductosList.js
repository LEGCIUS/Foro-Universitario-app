import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, Modal } from 'react-native';import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase/supabaseClient';

function ProductoCard({ item, onVerDetalle, navigation, userCarnet, handleProductoPublicado, setLoading }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.95}
      onPress={() => onVerDetalle(item)}
    >
      <View style={styles.imageContainer}>
        {Array.isArray(item.foto_url) && item.foto_url.length > 0 ? (
          <Image source={{ uri: item.foto_url[0] }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={{ color: '#bbb', fontSize: 32 }}>🖼️</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <Text style={styles.precio}>₡{item.precio}</Text>
        <Text style={styles.descripcion}>{item.descripcion}</Text>
        <Text style={styles.vendedor}>Vendedor: <Text style={{ color: '#0e141b', fontWeight: 'bold' }}>{item.nombre_vendedor}</Text></Text>
        {item.hora_inicio_venta && (
          <Text style={styles.horaVenta}>
            <Text style={{ color: '#4e7397', fontWeight: 'bold' }}>Inicio de venta:</Text> {
              (() => {
                const [h, m] = item.hora_inicio_venta.split(':');
                const d = new Date();
                d.setHours(parseInt(h), parseInt(m), 0, 0);
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              })()
            }
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            const phone = item.telefono.replace(/[^\d]/g, '');
            const message = encodeURIComponent(item.mensaje_whatsapp || '¡Hola! Estoy interesado en tu producto.');
            const url = `https://wa.me/${phone}?text=${message}`;
            Linking.openURL(url);
          }}
          style={styles.whatsappBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.telefonoLink}> WhatsApp: {item.telefono}</Text>
        </TouchableOpacity>
        {userCarnet === item.usuario_carnet && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                if (setLoading) setLoading(true);
                navigation.navigate('PublicarProducto', {
                  producto: item,
                  modo: 'editar',
                  onProductoEditado: () => {
                    if (setLoading) setLoading(false);
                    if (handleProductoPublicado) handleProductoPublicado();
                  }
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>✏️ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert('Eliminar', '¿Seguro que deseas eliminar este producto?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: async () => {
                    if (setLoading) setLoading(true);
                    await supabase.from('productos').delete().eq('id', item.id);
                    if (handleProductoPublicado) handleProductoPublicado();
                    if (setLoading) setLoading(false);
                  }}
                ]);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProductosList(props) {
  const { onVerDetalle, navigation } = props;
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCarnet, setUserCarnet] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [imagenIndex, setImagenIndex] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('carnet').then(carnet => {
      setUserCarnet(carnet || '');
    });
    const fetchProductos = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('productos')
        .select('*')
        .order('fecha_publicacion', { ascending: false });
      setProductos(data || []);
      setLoading(false);
    };
    fetchProductos();
    const unsubscribe = navigation.addListener('focus', fetchProductos);
    return unsubscribe;
  }, [navigation]);

  const handleProductoPublicado = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('fecha_publicacion', { ascending: false });
    setProductos(data || []);
    setLoading(false);
  };

  const handleVerDetalle = (item) => {
    setProductoSeleccionado(item);
    setImagenIndex(0);
    setModalVisible(true);
  };

  const handleCerrarModal = () => {
    setModalVisible(false);
    setProductoSeleccionado(null);
    setImagenIndex(0);
  };

  const handleImagenAnterior = () => {
    if (productoSeleccionado && Array.isArray(productoSeleccionado.foto_url)) {
      setImagenIndex((prev) => (prev > 0 ? prev - 1 : productoSeleccionado.foto_url.length - 1));
    }
  };

  const handleImagenSiguiente = () => {
    if (productoSeleccionado && Array.isArray(productoSeleccionado.foto_url)) {
      setImagenIndex((prev) => (prev < productoSeleccionado.foto_url.length - 1 ? prev + 1 : 0));
    }
  };

  const categorias = ['todos', 'comida', 'servicios', 'articulos', 'decoracion'];

  return (
    <View style={{ flex: 1, backgroundColor: '#f4f6fb' }}>
      <Text style={styles.title}>Productos</Text>
      <View style={styles.categoriasRow}>
        {categorias.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoriaBtn, categoriaSeleccionada === cat && styles.categoriaBtnSelected, { elevation: categoriaSeleccionada === cat ? 4 : 1 }]}
            activeOpacity={0.8}
            onPress={() => setCategoriaSeleccionada(cat)}
          >
            <Text style={categoriaSeleccionada === cat ? styles.categoriaBtnTextSelected : styles.categoriaBtnText}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={categoriaSeleccionada === 'todos' ? productos : productos.filter(p => p.categoria === categoriaSeleccionada)}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductoCard
              item={item}
              onVerDetalle={handleVerDetalle}
              navigation={navigation}
              userCarnet={userCarnet}
              handleProductoPublicado={handleProductoPublicado}
              setLoading={setLoading}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay productos publicados aún.</Text>
            </View>
          )}
        />
      )}
      {/* Modal de detalle */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCerrarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {productoSeleccionado && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  {Array.isArray(productoSeleccionado.foto_url) && productoSeleccionado.foto_url.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={handleImagenAnterior} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 28 }}>◀️</Text>
                      </TouchableOpacity>
                      <Image
                        source={{ uri: productoSeleccionado.foto_url[imagenIndex] }}
                        style={{ width: 220, height: 180, borderRadius: 16, marginHorizontal: 8 }}
                      />
                      <TouchableOpacity onPress={handleImagenSiguiente} style={{ padding: 8 }}>
                        <Text style={{ fontSize: 28 }}>▶️</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={{ color: '#bbb', fontSize: 32 }}>🖼️</Text>
                    </View>
                  )}
                  <Text style={{ marginTop: 6, color: '#888' }}>{imagenIndex + 1} / {productoSeleccionado.foto_url?.length || 1}</Text>
                </View>
                <Text style={styles.nombre}>{productoSeleccionado.nombre}</Text>
                <Text style={styles.precio}>₡{productoSeleccionado.precio}</Text>
                <Text style={styles.descripcion}>{productoSeleccionado.descripcion}</Text>
                <Text style={styles.vendedor}>Vendedor: <Text style={{ color: '#0e141b', fontWeight: 'bold' }}>{productoSeleccionado.nombre_vendedor}</Text></Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleCerrarModal}>
                  <Text style={styles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PublicarProducto', { onProductoPublicado: handleProductoPublicado })} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  editButton: { backgroundColor: '#007AFF', padding: 8, borderRadius: 8, marginRight: 8 },
  editButtonText: { color: '#fff', fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#FF3B30', padding: 8, borderRadius: 8 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 24, // margen mayor para scroll más cómodo
    elevation: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    alignItems: 'center',
    minHeight: 120,
    transition: 'box-shadow 0.2s',
  },
  imageContainer: {
    width: 110,
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f2f7',
    marginLeft: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#e7edf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    justifyContent: 'center',
    minHeight: 110,
  },
  nombre: { fontSize: 19, fontWeight: '700', color: '#0e141b', marginBottom: 2 },
  precio: { fontSize: 17, color: '#007AFF', fontWeight: 'bold', marginBottom: 2 },
  descripcion: { fontSize: 15, color: '#4e7397', marginBottom: 2 },
  vendedor: { fontSize: 14, color: '#4e7397', marginTop: 2 },
  telefono: { fontSize: 14, color: '#00C6FB', marginTop: 2 },
  telefonoLink: { fontSize: 15, color: '#25D366', marginTop: 2, fontWeight: 'bold' },
  whatsappBtn: { marginTop: 2, alignSelf: 'flex-start' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#007AFF',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    zIndex: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: -2,
    letterSpacing: 1,
  },
  ownerActions: { flexDirection: 'row', marginTop: 10 },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 16, color: '#888' },
  categoriasRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' },
  categoriaBtn: { backgroundColor: '#eee', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginHorizontal: 4, marginBottom: 4 },
  categoriaBtnSelected: { backgroundColor: '#007AFF' },
  categoriaBtnText: { color: '#333', fontWeight: 'bold' },
  categoriaBtnTextSelected: { color: '#fff', fontWeight: 'bold' },
});
