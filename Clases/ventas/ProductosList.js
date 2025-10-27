import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext'; // added

function ProductoCard({ item, onVerDetalle, navigation, userCarnet, handleProductoPublicado, setLoading, closeMenu }) {
  const { darkMode } = useTheme(); // safe theme usage

  // Guardar telefono seguro (evita .replace sobre undefined)
  const safePhone = (item?.telefono || '').toString().replace(/[^\d]/g, '');
  const whatsappUrl = safePhone ? `https://wa.me/${safePhone}?text=${encodeURIComponent(item?.mensaje_whatsapp || '¡Hola! Estoy interesado en tu producto.')}` : null;

  // Formatear hora para mostrarla y aplicar color según tema
  const horaMostrar = item?.hora_inicio_venta ? (() => {
    const [h, m] = String(item.hora_inicio_venta).split(':');
    const d = new Date();
    d.setHours(parseInt(h || '0', 10), parseInt(m || '0', 10), 0, 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })() : null;

  return (
    <TouchableOpacity
      style={[styles.card, darkMode && styles.cardDark]}
      activeOpacity={0.95}
      onPress={() => {
        if (closeMenu) closeMenu();
        onVerDetalle(item);
      }}
    >
      <View style={[styles.imageContainer, darkMode && styles.imageContainerDark]}>
        {Array.isArray(item?.foto_url) && item.foto_url.length > 0 ? (
          <Image source={{ uri: item.foto_url[0] }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, darkMode && styles.imagePlaceholderDark]}>
            <Text style={{ color: darkMode ? '#666' : '#bbb', fontSize: 32 }}>🖼️</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.nombre, darkMode && styles.nombreDark]}>{item?.nombre}</Text>
        <Text style={[styles.precio, darkMode && styles.precioDark]}>₡{item?.precio}</Text>
        <Text style={[styles.descripcion, darkMode && styles.descripcionDark]} numberOfLines={2}>{item?.descripcion}</Text>
        <Text style={[styles.vendedor, darkMode && styles.vendedorDark]}>
          <Text style={{ color: darkMode ? '#fff' : '#4e7397', fontWeight: '700' }}>Vendedor: </Text>
          <Text style={[{ fontWeight: '700' }, darkMode && { color: '#fff' }]}>{item?.nombre_vendedor}</Text>
        </Text>

        {item?.hora_inicio_venta && (
          <Text style={[styles.horaVenta]}>
            <Text style={{ color: '#4e7397', fontWeight: '700' }}>Inicio de venta: </Text>
            <Text style={{ color: darkMode ? '#fff' : '#0e141b', fontWeight: '700' }}>{horaMostrar}</Text>
          </Text>
        )}

        <TouchableOpacity
          onPress={() => {
            if (!whatsappUrl) return Alert.alert('Teléfono no disponible', 'El vendedor no proporcionó un número válido.');
            Linking.openURL(whatsappUrl).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.telefonoLink, darkMode && styles.telefonoLinkDark]}>WhatsApp: {item?.telefono || '—'}</Text>
        </TouchableOpacity>

        {userCarnet === item?.usuario_carnet && (
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

// Memoizar tarjeta de producto para evitar renders innecesarios
const MemoProductoCard = React.memo(ProductoCard);

export default function ProductosList(props) {
  const { onVerDetalle, navigation } = props;
  const { darkMode } = useTheme(); // <-- usar tema aquí también
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCarnet, setUserCarnet] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [imagenIndex, setImagenIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

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
      // Cerrar menú desplegable y modal si el usuario sale de esta pantalla
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
    <View style={[{ flex: 1, backgroundColor: darkMode ? '#232526' : '#e0eafc' }, styles.safeContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, darkMode && styles.titleDark]}>Productos</Text>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(!menuVisible)}
        >
          <MaterialIcons name="menu" size={28} color="#007AFF" />
        </TouchableOpacity>
        
        {menuVisible && (
          <>
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={() => setMenuVisible(false)}
            />
            <View style={[styles.dropdown, darkMode && styles.dropdownDark]}>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.dropdownItem,
                    categoriaSeleccionada === cat && styles.dropdownItemSelected
                  ]}
                  onPress={() => {
                    setCategoriaSeleccionada(cat);
                    setMenuVisible(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownText,
                    darkMode && styles.dropdownTextDark,
                    categoriaSeleccionada === cat && styles.dropdownTextSelected
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
          contentContainerStyle={styles.list}
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
          <View style={[styles.modalContent, darkMode && styles.modalContentDark]}>
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
  safeContainer: {
    paddingTop: 45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#0e141b',
  },
  titleDark: {
    color: '#fff',
  },
  menuButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 45,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  // overlay que captura toques fuera del dropdown y lo cierra
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 900,
  },
  dropdownDark: {
    backgroundColor: '#121214',
    borderColor: '#2b2b2b',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  dropdownItemSelected: {
    backgroundColor: '#007AFF20',
  },
  dropdownText: {
    color: '#333',
    fontSize: 16,
  },
  dropdownTextDark: {
    color: '#fff',
  },
  dropdownTextSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  list: { padding: 16 },

  // Fichas ahora usan tonos parecidos al fondo (claro: azul pálido, oscuro: tono del gradiente)
  card: {
    backgroundColor: '#eef6ff', // tono claro similar al gradient de perfil
    borderRadius: 16,
    marginBottom: 22,
    elevation: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    alignItems: 'center',
    minHeight: 120,
    padding: 8,
  },
  cardDark: {
    backgroundColor: '#2b2d31', // tono oscuro cercano al gradiente (#232526 - #414345)
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },

  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eef6ff', // combinar con la ficha clara
    marginLeft: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainerDark: {
    backgroundColor: '#2b2d31', // mismo matiz que la ficha oscura
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
  imagePlaceholderDark: {
    backgroundColor: '#33343f',
  },
  info: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    justifyContent: 'center',
    minHeight: 110,
  },
  nombre: { fontSize: 19, fontWeight: '700', color: '#0e141b', marginBottom: 2 },
  nombreDark: {
    color: '#ffffff',
  },
  precio: { fontSize: 17, color: '#0b6cf6', fontWeight: '700', marginBottom: 4 },
  precioDark: {
    color: '#4da3ff',
  },
  descripcion: { fontSize: 14, color: '#607b90', marginBottom: 6 },
  descripcionDark: {
    color: '#b0b0c3',
  },
  vendedor: { fontSize: 14, color: '#4e7397', marginTop: 2 },
  vendedorDark: {
    color: '#a0a0c3',
  },
  telefono: { fontSize: 14, color: '#00C6FB', marginTop: 2 },
  telefonoLink: { fontSize: 15, color: '#25D366', marginTop: 2, fontWeight: 'bold' },
  telefonoLinkDark: {
    color: '#75e6b2',
  },
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
  modalContentDark: {
    backgroundColor: '#232526', // más cercano al fondo del perfil
  },
  horaVenta: {
    fontSize: 14,
    color: '#0e141b',
    marginTop: 2,
  },
  horaVentaDark: {
    color: '#fff',
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
  categoriaBtnTextSelected: { color: '#fff', fontWeight: 'bold' },
  categoriaBtnSelected: { backgroundColor: '#007AFF' },
  categoriaBtnText: { color: '#333', fontWeight: 'bold' },
  categoriaBtn: { backgroundColor: '#eee', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginHorizontal: 4, marginBottom: 4 },
  categoriasRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' },
  emptyText: { fontSize: 16, color: '#888' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});