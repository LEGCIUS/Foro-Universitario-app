import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ProductoCard({ item, onVerDetalle, navigation, userCarnet, handleProductoPublicado, setLoading, closeMenu }) {
  const { darkMode } = useTheme();

  const safePhone = (item?.telefono || '').toString().replace(/[^\d]/g, '');
  const whatsappUrl = safePhone ? `https://wa.me/${safePhone}?text=${encodeURIComponent(item?.mensaje_whatsapp || '¡Hola! Estoy interesado en tu producto.')}` : null;

  const horaMostrar = item?.hora_inicio_venta ? (() => {
    const [h, m] = String(item.hora_inicio_venta).split(':');
    const d = new Date();
    d.setHours(parseInt(h || '0', 10), parseInt(m || '0', 10), 0, 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })() : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: darkMode ? '#1e1e1e' : '#fff', borderColor: darkMode ? '#2b2b2b' : '#eef2ff' }]}
      activeOpacity={0.95}
      onPress={() => {
        if (closeMenu) closeMenu();
        onVerDetalle(item);
      }}
    >
      <View style={[styles.imageContainer, { backgroundColor: darkMode ? '#262626' : '#f3f7ff' }]}>
        {Array.isArray(item?.foto_url) && item.foto_url.length > 0 ? (
          <Image source={{ uri: item.foto_url[0] }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: darkMode ? '#2f2f2f' : '#eaf2ff' }]}>
            <MaterialIcons name="image" size={28} color={darkMode ? '#666' : '#9aa5b1'} />
          </View>
        )}
          {Array.isArray(item?.foto_url) && item.foto_url.length > 1 && (
            <View style={styles.dotsWrap}>
              {Array.from({ length: Math.min(item.foto_url.length, 5) }).map((_, idx) => (
                <View key={idx} style={styles.dot} />
              ))}
              {item.foto_url.length > 5 && (
                <Text style={styles.dotPlus}>+{item.foto_url.length - 5}</Text>
              )}
            </View>
          )}
        {/* Precio movido al chip de la derecha en la sección de info */}
        {/* Categoría retirada del overlay en la imagen a pedido del usuario */}
      </View>

      <View style={styles.info}>
        <View style={styles.rowBetween}>
          <Text style={[styles.nombre, { color: darkMode ? '#fff' : '#0f172a' }]} numberOfLines={1}>{item?.nombre}</Text>
          <View style={[styles.priceChip, { backgroundColor: darkMode ? '#243244' : '#e6f0ff', borderColor: darkMode ? '#314463' : '#dbeafe' }]}>
            <Text style={[styles.priceChipText, { color: darkMode ? '#7fb0ff' : '#2563EB' }]}>₡{item?.precio}</Text>
          </View>
        </View>
        <Text style={[styles.vendedor, { color: darkMode ? '#a0a0c3' : '#4e7397' }]}>
          <Text style={{ color: darkMode ? '#cbd5e1' : '#0f172a', fontWeight: '700' }}>Vendedor: </Text>
          <Text style={[{ fontWeight: '700' }, darkMode && { color: '#fff' }]}>{item?.nombre_vendedor}</Text>
        </Text>

        {item?.hora_inicio_venta && (
          <Text style={[styles.horaVenta, { color: darkMode ? '#cbd5e1' : '#0f172a' }]}>
            <Text style={{ color: '#4e7397', fontWeight: '700' }}>Inicio de venta: </Text>
            <Text style={{ fontWeight: '700' }}>{horaMostrar}</Text>
          </Text>
        )}

        <TouchableOpacity
          style={styles.whatsappRow}
          onPress={() => {
            if (!whatsappUrl) return Alert.alert('Teléfono no disponible', 'El vendedor no proporcionó un número válido.');
            Linking.openURL(whatsappUrl).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="chat" size={18} color="#25D366" />
          <Text style={[styles.telefonoLink, darkMode && styles.telefonoLinkDark]}>WhatsApp: {item?.telefono || '—'}</Text>
        </TouchableOpacity>

        {userCarnet === item?.usuario_carnet && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={[styles.ownerBtn, { backgroundColor: darkMode ? '#334155' : '#e6f0ff' }]}
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
              <MaterialIcons name="edit" size={16} color={darkMode ? '#cbd5e1' : '#2563EB'} />
              <Text style={[styles.ownerBtnText, { color: darkMode ? '#cbd5e1' : '#2563EB' }]}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ownerBtn, { backgroundColor: darkMode ? '#3b1f1f' : '#ffecec' }]}
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
              <MaterialIcons name="delete-forever" size={16} color="#EF4444" />
              <Text style={[styles.ownerBtnText, { color: '#EF4444' }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const MemoProductoCard = React.memo(ProductoCard);

export default function ProductosList(props) {
  const { onVerDetalle, navigation } = props;
  const { darkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCarnet, setUserCarnet] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [imagenIndex, setImagenIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewerWidth, setViewerWidth] = useState(0);

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

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      setMenuVisible(false);
      setModalVisible(false);
    });
    return unsubscribeBlur;
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
    <View style={{ flex: 1, backgroundColor: darkMode ? '#121212' : '#f5f7fb', paddingTop: Math.max(10, insets.top + 4) }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: darkMode ? '#fff' : '#0b2545' }]}>Productos</Text>
        <TouchableOpacity 
          style={[styles.menuButton]}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <MaterialIcons name="filter-list" size={18} color="#fff" />
          <Text style={styles.menuButtonText}>Categorías</Text>
        </TouchableOpacity>
        
        {menuVisible && (
          <>
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={() => setMenuVisible(false)}
            />
            <View style={[styles.dropdown, { backgroundColor: darkMode ? '#1e1e1e' : '#fff', borderColor: darkMode ? '#2b2b2b' : '#e5e7eb' }]}>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.dropdownItem,
                    categoriaSeleccionada === cat && { backgroundColor: '#007AFF20' }
                  ]}
                  onPress={() => {
                    setCategoriaSeleccionada(cat);
                    setMenuVisible(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    { color: darkMode ? '#e5e7eb' : '#111827' },
                    categoriaSeleccionada === cat && { color: '#007AFF', fontWeight: '700' }
                  ]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={categoriaSeleccionada === 'todos' ? productos : productos.filter(p => p.categoria === categoriaSeleccionada)}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={[styles.list, { paddingBottom: 90 }]}
          renderItem={({ item }) => (
            <MemoProductoCard
              item={item}
              onVerDetalle={handleVerDetalle}
              navigation={navigation}
              userCarnet={userCarnet}
              handleProductoPublicado={handleProductoPublicado}
              setLoading={setLoading}
              closeMenu={() => setMenuVisible(false)}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay productos publicados aún.</Text>
            </View>
          )}
          removeClippedSubviews={true}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={6}
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
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1f2937' : '#fff' }]}>
            {productoSeleccionado && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 12 }} onLayout={(e) => setViewerWidth(e.nativeEvent.layout.width)}>
                  {Array.isArray(productoSeleccionado.foto_url) && productoSeleccionado.foto_url.length > 0 ? (
                    <>
                      <FlatList
                        data={productoSeleccionado.foto_url}
                        horizontal
                        pagingEnabled
                        keyExtractor={(uri, idx) => uri + idx}
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                          const w = e.nativeEvent.layoutMeasurement.width || viewerWidth || 1;
                          const x = e.nativeEvent.contentOffset.x || 0;
                          const idx = Math.round(x / w);
                          setImagenIndex(idx);
                        }}
                        renderItem={({ item }) => (
                          <Image
                            source={{ uri: item }}
                            style={{ width: viewerWidth, height: 230, borderRadius: 16 }}
                            resizeMode="cover"
                          />
                        )}
                      />
                      <View style={styles.modalDotsRow}>
                        {productoSeleccionado.foto_url.map((_, idx) => (
                          <View key={idx} style={[styles.modalDot, idx === imagenIndex && styles.modalDotActive]} />
                        ))}
                      </View>
                      <Text style={{ marginTop: 6, color: darkMode ? '#94a3b8' : '#64748b' }}>{imagenIndex + 1} / {productoSeleccionado.foto_url?.length || 1}</Text>
                    </>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={{ color: '#bbb', fontSize: 32 }}>🖼️</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.nombre, { color: darkMode ? '#fff' : '#0f172a' }]}>{productoSeleccionado.nombre}</Text>
                <Text style={[styles.precio, { color: '#0b6cf6' }]}>₡{productoSeleccionado.precio}</Text>
                <Text style={[styles.descripcion, { color: darkMode ? '#cbd5e1' : '#334155' }]}>{productoSeleccionado.descripcion}</Text>
                <Text style={[styles.vendedor, { color: darkMode ? '#cbd5e1' : '#475569' }]}>Vendedor: <Text style={{ color: darkMode ? '#fff' : '#0e141b', fontWeight: 'bold' }}>{productoSeleccionado.nombre_vendedor}</Text></Text>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: '#25D366', marginTop: 10 }]}
                  onPress={() => {
                    const num = (productoSeleccionado?.telefono || '').toString().replace(/\D/g, '');
                    if (!num) return Alert.alert('Teléfono no disponible');
                    const url = `https://wa.me/${num}?text=${encodeURIComponent(productoSeleccionado?.mensaje_whatsapp || 'Hola, estoy interesado.')}`;
                    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
                  }}
                >
                  <Text style={styles.closeButtonText}>Contactar por WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#007AFF' }]} onPress={handleCerrarModal}>
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
  ownerBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginRight: 8 },
  ownerBtnText: { fontWeight: '700', marginLeft: 6 },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeContainer: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  menuButton: {
    position: 'absolute',
    left: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 45,
    left: 16,
    borderRadius: 8,
    padding: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    borderWidth: 1,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 900,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  dropdownText: {
    fontSize: 16,
  },
  list: { padding: 16 },
  card: {
    borderRadius: 16,
    marginBottom: 22,
    elevation: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    alignItems: 'center',
    minHeight: 120,
    padding: 8,
    borderWidth: 1,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eef6ff',
    marginLeft: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsWrap: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginHorizontal: 2,
    opacity: 0.95,
  },
  dotPlus: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 2,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    justifyContent: 'center',
    minHeight: 110,
  },
  nombre: { fontSize: 19, fontWeight: '800', marginBottom: 2 },
  descripcion: { fontSize: 14, marginBottom: 6 },
  vendedor: { fontSize: 14, marginTop: 2 },
  precio: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  telefonoLink: { fontSize: 15, color: '#25D366', marginLeft: 6, fontWeight: '700' },
  telefonoLinkDark: { color: '#75e6b2' },
  whatsappRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, marginLeft: 8 },
  priceChipText: { fontWeight: '800', fontSize: 12 },
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
    borderRadius: 16,
    padding: 12,
    width: '94%',
    maxWidth: 560,
    elevation: 8,
  },
  horaVenta: {
    fontSize: 14,
    marginTop: 2,
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
  modalDotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  modalDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#cbd5e1', marginHorizontal: 3 },
  modalDotActive: { backgroundColor: '#007AFF' },
  emptyText: { fontSize: 16, color: '#888' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { 
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 40,
  },
  // priceBadge removido del diseño (se conserva referencia por si se desea reusar)
  // priceBadge: { position: 'absolute', top: 6, left: 6, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  // priceBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  categoryChip: { position: 'absolute', bottom: 6, left: 6, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
});