import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, Modal, TouchableWithoutFeedback, TextInput, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomAlert from '../components/CustomAlert';
import { listProducts, deleteProduct, reportProduct } from '../../src/services/products';
import { getMe, getUserByCarnet } from '../../src/services/users';

function ProductoCard({ item, onVerDetalle, navigation, userCarnet, handleProductoPublicado, setLoading, closeMenu, setDeleteVisible, setDeleteTarget, usuariosPerfil }) {
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
      {/* Imagen superior full-width y datos de vendedor */}
      <View style={{ position: 'relative' }}>
        {Array.isArray(item?.foto_url) && item.foto_url.length > 0 ? (
          <Image source={{ uri: item.foto_url[0] }} style={{ width: '100%', height: 200, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} resizeMode="cover" />
        ) : (
          <View style={{ width: '100%', height: 200, backgroundColor: darkMode ? '#2a2a2a' : '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <MaterialIcons name="image" size={48} color={darkMode ? '#555' : '#ccc'} />
          </View>
        )}
        {Array.isArray(item?.foto_url) && item.foto_url.length > 1 && (
          <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="photo-library" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>{item.foto_url.length}</Text>
          </View>
        )}
        {/* Foto de perfil y nombre real del vendedor */}
        {usuariosPerfil && item.usuario_carnet && usuariosPerfil[item.usuario_carnet] && (
          <View style={{ position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4, elevation: 2 }}>
            <TouchableOpacity
                onPress={async () => {
                  let miCarnet = (userCarnet || '').toString().trim();
                  const carnetVendedor = (item.usuario_carnet || '').toString().trim();
                  if (miCarnet && carnetVendedor && miCarnet === carnetVendedor) {
                    // Navegar al perfil propio como en CommentsModal/PublicationsViewer
                    navigation.navigate('MainTabs', { screen: 'Perfil' });
                    // Si tu app no usa tabs, usa: navigation.navigate('PerfilUsuario');
                  } else {
                    navigation.navigate('ViewUserProfile', { userId: carnetVendedor });
                  }
                }}
              activeOpacity={0.7}
            >
              <Image
                source={usuariosPerfil[item.usuario_carnet].foto_perfil ? { uri: usuariosPerfil[item.usuario_carnet].foto_perfil } : require('../../assets/avatar1.png')}
                style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f1f5f9' }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <Text style={{ fontWeight: '700', color: '#222', fontSize: 14, maxWidth: 120 }} numberOfLines={1}>
              {usuariosPerfil[item.usuario_carnet].nombre} {usuariosPerfil[item.usuario_carnet].apellido}
            </Text>
          </View>
        )}
      </View>

      {/* Contenido */}
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: darkMode ? '#fff' : '#111', marginBottom: 8 }} numberOfLines={2}>
          {item?.nombre}
        </Text>

        <View style={{ backgroundColor: darkMode ? '#243244' : '#e6f0ff', borderColor: darkMode ? '#314463' : '#dbeafe', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: darkMode ? '#7fb0ff' : '#2563EB' }}>Precio: ₡{item?.precio}</Text>
        </View>

        <Text style={{ fontSize: 14, color: darkMode ? '#aaa' : '#666', marginBottom: 12, lineHeight: 20 }} numberOfLines={3}>
          {item?.descripcion}
        </Text>

        <View style={{ borderTopWidth: 1, borderTopColor: darkMode ? '#333' : '#eee', paddingTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <MaterialIcons name="person" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
            <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
              <Text style={{ fontWeight: '600' }}>Vendedor:</Text> {item?.nombre_vendedor}
            </Text>
          </View>

          {item?.telefono && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialIcons name="phone" size={16} color="#25D366" />
              <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>{item?.telefono}</Text>
            </View>
          )}

          {item?.categoria && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialIcons name="category" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
              <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                <Text style={{ fontWeight: '600' }}>Categoría:</Text> {item?.categoria}
              </Text>
            </View>
          )}

          {horaMostrar && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialIcons name="schedule" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
              <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                <Text style={{ fontWeight: '600' }}>Inicio de venta: </Text>{horaMostrar}
              </Text>
            </View>
          )}

          {item?.fecha_publicacion && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <MaterialIcons name="event" size={16} color={darkMode ? '#7fb0ff' : '#2563EB'} />
              <Text style={{ fontSize: 13, color: darkMode ? '#cbd5e1' : '#475569', marginLeft: 6 }}>
                Publicado: {new Date(item.fecha_publicacion).toLocaleDateString('es-ES')}
              </Text>
            </View>
          )}
        </View>

        {userCarnet === item?.usuario_carnet && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: darkMode ? '#334155' : '#e6f0ff', paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
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
              <MaterialIcons name="edit" size={18} color={darkMode ? '#7fb0ff' : '#2563EB'} />
              <Text style={{ color: darkMode ? '#7fb0ff' : '#2563EB', fontWeight: '600', marginLeft: 6 }}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: darkMode ? '#7f1d1d' : '#fee2e2', paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                if (closeMenu) closeMenu();
                setDeleteTarget && setDeleteTarget(item);
                setDeleteVisible && setDeleteVisible(true);
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="delete" size={18} color={darkMode ? '#fca5a5' : '#dc2626'} />
              <Text style={{ color: darkMode ? '#fca5a5' : '#dc2626', fontWeight: '600', marginLeft: 6 }}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const MemoProductoCard = React.memo(ProductoCard);


export default function ProductosList(props) {
    // Estado para CustomAlert
    const [alert, setAlert] = useState({
      visible: false,
      type: 'success',
      title: '',
      message: '',
      onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
    });
  const { onVerDetalle, navigation } = props;
  const { darkMode } = useTheme();
  const responsive = useResponsive();
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
  const flatListRef = React.useRef(null);
  // Estado para reportes (similar a FeedItem)
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Contenido inapropiado');
  const [reportText, setReportText] = useState('');
  // Estado para confirmación de eliminación
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Estado para perfiles de usuario
  const [usuariosPerfil, setUsuariosPerfil] = useState({});

  // Cargar datos de perfil de todos los vendedores únicos
  useEffect(() => {
    async function fetchUsuariosPerfil() {
      const carnets = Array.from(new Set(productos.map(p => p.usuario_carnet).filter(Boolean)));
      if (carnets.length === 0) return;
      try {
        const users = await Promise.all(
          carnets.map(async (c) => {
            try {
              return await getUserByCarnet(c);
            } catch {
              return null;
            }
          })
        );
        const map = {};
        users.filter(Boolean).forEach((u) => {
          map[u.carnet] = u;
        });
        setUsuariosPerfil(map);
      } catch {
        // noop
      }
    }
    fetchUsuariosPerfil();
  }, [productos]);

  useEffect(() => {
    getMe().then(me => setUserCarnet(me?.carnet || '')).catch(() => setUserCarnet(''));
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const data = await listProducts();
        setProductos(data || []);
      } catch (e) {
        console.error('Error al cargar productos:', e);
        setProductos([]);
      }
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
    try {
      const data = await listProducts();
      setProductos(data || []);
    } catch (e) {
      console.error('Error al recargar productos:', e);
    }
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
          contentContainerStyle={[styles.list, { 
            paddingBottom: 90,
            paddingHorizontal: responsive.spacing.md,
          }]}
          numColumns={responsive.productColumns}
          key={`grid-${responsive.productColumns}`}
          columnWrapperStyle={responsive.productColumns > 1 ? { 
            gap: responsive.spacing.md,
            justifyContent: 'flex-start',
          } : undefined}
          renderItem={({ item }) => (
            <View style={{ 
              flex: responsive.productColumns > 1 ? 1 / responsive.productColumns : 1,
              maxWidth: responsive.productColumns > 1 ? `${100 / responsive.productColumns - 2}%` : '100%',
              marginBottom: responsive.spacing.md,
            }}>
              <MemoProductoCard
                item={item}
                onVerDetalle={handleVerDetalle}
                navigation={navigation}
                userCarnet={userCarnet}
                handleProductoPublicado={handleProductoPublicado}
                setLoading={setLoading}
                closeMenu={() => setMenuVisible(false)}
                setDeleteVisible={setDeleteModalVisible}
                setDeleteTarget={setProductoAEliminar}
                usuariosPerfil={usuariosPerfil}
              />
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { fontSize: responsive.fontSize.md }]}>No hay productos publicados aún.</Text>
            </View>
          )}
          removeClippedSubviews={true}
          initialNumToRender={responsive.getValue(4, 6, 8)}
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
        {/* Tocar fuera cierra el modal */}
        <TouchableWithoutFeedback onPress={handleCerrarModal}>
          <View style={styles.modalOverlay}>
            {/* Evitar que toques dentro propaguen y cierren */}
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1f2937' : '#fff' }]}>
                {/* Botón de reportar en la esquina superior derecha (solo si no es mi producto) */}
                {productoSeleccionado && userCarnet !== productoSeleccionado.usuario_carnet && (
                  <TouchableOpacity
                    style={styles.modalReportButton}
                    onPress={() => setReportModalVisible(true)}
                  >
                    <MaterialIcons name="flag" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                )}

                {productoSeleccionado && (
                  <>
                    <View style={{ alignItems: 'center', marginBottom: 12, position: 'relative', width: '100%' }}>
                      {Array.isArray(productoSeleccionado.foto_url) && productoSeleccionado.foto_url.length > 0 ? (
                        <>
                          <View style={{ width: Dimensions.get('window').width * 0.94, maxWidth: 560, alignSelf: 'center' }}>
                            <FlatList
                              ref={flatListRef}
                              data={productoSeleccionado.foto_url}
                              horizontal
                              pagingEnabled
                              keyExtractor={(uri, idx) => uri + idx}
                              showsHorizontalScrollIndicator={false}
                              snapToInterval={Dimensions.get('window').width * 0.94}
                              decelerationRate="fast"
                              onScroll={(e) => {
                                const x = e.nativeEvent.contentOffset.x;
                                const w = e.nativeEvent.layoutMeasurement.width;
                                const idx = Math.round(x / w);
                                if (idx !== imagenIndex) {
                                  setImagenIndex(idx);
                                }
                              }}
                              scrollEventThrottle={16}
                              renderItem={({ item, index }) => (
                                <View style={{ width: Dimensions.get('window').width * 0.94, maxWidth: 560 }}>
                                  <Image
                                    source={{ uri: item }}
                                    style={{ width: '100%', height: 230, borderRadius: 16 }}
                                    resizeMode="cover"
                                  />
                                </View>
                              )}
                            />
                            {/* Navigation Arrows */}
                            {productoSeleccionado.foto_url.length > 1 && (
                              <>
                                <TouchableOpacity
                                  style={[
                                    styles.carouselArrow,
                                    styles.carouselArrowLeft,
                                    { opacity: imagenIndex === 0 ? 0.3 : 1 }
                                  ]}
                                  onPress={() => {
                                    if (imagenIndex > 0) {
                                      setImagenIndex(imagenIndex - 1);
                                      flatListRef.current?.scrollToIndex({ index: imagenIndex - 1, animated: true });
                                    }
                                  }}
                                  activeOpacity={0.7}
                                  disabled={imagenIndex === 0}
                                >
                                  <MaterialIcons name="chevron-left" size={36} color="#fff" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, elevation: 4 }} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.carouselArrow,
                                    styles.carouselArrowRight,
                                    { opacity: imagenIndex === productoSeleccionado.foto_url.length - 1 ? 0.3 : 1 }
                                  ]}
                                  onPress={() => {
                                    if (imagenIndex < productoSeleccionado.foto_url.length - 1) {
                                      setImagenIndex(imagenIndex + 1);
                                      flatListRef.current?.scrollToIndex({ index: imagenIndex + 1, animated: true });
                                    }
                                  }}
                                  activeOpacity={0.7}
                                  disabled={imagenIndex === productoSeleccionado.foto_url.length - 1}
                                >
                                  <MaterialIcons name="chevron-right" size={36} color="#fff" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6, elevation: 4 }} />
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Modal de reporte (ahora como Modal nativo para quedar por encima) */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        {/* Tocar el overlay cierra el modal de reporte */}
        <TouchableWithoutFeedback onPress={() => setReportModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            {/* Evitar que toques dentro del cuadro propaguen y cierren */}
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ width: '96%', maxWidth: 420, backgroundColor: darkMode ? '#171717' : '#fff', borderRadius: 16, padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: darkMode ? '#fff' : '#111', marginBottom: 12 }}>Reportar producto</Text>
                <Text style={{ fontSize: 14, color: darkMode ? '#ccc' : '#444', marginBottom: 10 }}>Indica el motivo del reporte.</Text>
                {['Contenido inapropiado', 'Producto fraudulento', 'Precio excesivo', 'Spam', 'Otro'].map((motivo) => (
                  <TouchableOpacity
                    key={motivo}
                    onPress={() => setReportReason(motivo)}
                    style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: reportReason === motivo ? '#FF3B30' : (darkMode ? '#333' : '#e5e7eb'), backgroundColor: reportReason === motivo ? (darkMode ? '#2a1b1b' : '#ffeceb') : 'transparent' }}
                  >
                    <Text style={{ color: darkMode ? '#eee' : '#222', fontWeight: reportReason === motivo ? '700' : '500' }}>{motivo}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={{ fontSize: 14, color: darkMode ? '#ccc' : '#444', marginTop: 6, marginBottom: 6 }}>Comentario (opcional)</Text>
                <TextInput
                  value={reportText}
                  onChangeText={setReportText}
                  placeholder="Describe el problema (opcional)"
                  placeholderTextColor={darkMode ? '#888' : '#999'}
                  multiline
                  style={{ minHeight: 80, borderWidth: 1, borderColor: darkMode ? '#333' : '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: darkMode ? '#111' : '#fafafa', color: darkMode ? '#fff' : '#111', textAlignVertical: 'top' }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
                  <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginRight: 8, backgroundColor: darkMode ? '#333' : '#eee' }}>
                    <Text style={{ color: darkMode ? '#fff' : '#111', fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        if (!productoSeleccionado?.id) throw new Error('Producto inválido');
                        await reportProduct(productoSeleccionado.id, {
                          motivo: reportReason,
                          detalle: reportText || undefined,
                        });

                        setAlert({
                          visible: true,
                          type: 'success',
                          title: 'Reporte enviado',
                          message: 'Gracias. Revisaremos el reporte.',
                          onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
                        });
                        setReportModalVisible(false);
                        setReportText('');
                        setReportReason('Contenido inapropiado');
                      } catch (err) {
                        console.error('Error al enviar reporte:', err);
                        setAlert({
                          visible: true,
                          type: 'error',
                          title: 'Error',
                          message: 'No se pudo enviar el reporte. Intenta de nuevo.',
                          onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
                        });
                      }
                    }}
                    style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#FF3B30' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar reporte</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de confirmación para eliminar producto */}
      <Modal
        transparent
        visible={deleteModalVisible}
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) {
            setDeleteModalVisible(false);
            setProductoAEliminar(null);
          }
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          if (!deleting) {
            setDeleteModalVisible(false);
            setProductoAEliminar(null);
          }
        }}>
          <View style={styles.confirmModalContainer}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.confirmModalContent, { backgroundColor: darkMode ? '#1a1a1a' : '#fff' }]}>
                {/* Círculo de fondo para el icono */}
                <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#3d1f1f' : '#fee2e2' }]}>
                  <MaterialIcons name="delete-outline" size={56} color={darkMode ? '#fca5a5' : '#dc2626'} />
                </View>
                
                <Text style={[styles.confirmTitle, { color: darkMode ? '#fff' : '#1f2937' }]}>
                  ¿Eliminar este producto?
                </Text>
                
                <Text style={[styles.confirmText, { color: darkMode ? '#9ca3af' : '#6b7280' }]}>
                  Esta acción es permanente y no se puede revertir. El producto será eliminado de forma definitiva.
                </Text>

                {productoAEliminar && (
                  <View style={[styles.productPreview, { backgroundColor: darkMode ? '#262626' : '#f9fafb', borderColor: darkMode ? '#404040' : '#e5e7eb' }]}>
                    <Text style={[styles.productPreviewName, { color: darkMode ? '#e5e7eb' : '#374151' }]} numberOfLines={1}>
                      {productoAEliminar.nombre}
                    </Text>
                    <Text style={[styles.productPreviewPrice, { color: darkMode ? '#7fb0ff' : '#2563EB' }]}>
                      ₡{productoAEliminar.precio}
                    </Text>
                  </View>
                )}
                
                <View style={styles.confirmButtonsRow}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmCancelButton, { backgroundColor: darkMode ? '#374151' : '#f3f4f6', borderColor: darkMode ? '#4b5563' : '#d1d5db' }]}
                    onPress={() => {
                      if (!deleting) {
                        setDeleteModalVisible(false);
                        setProductoAEliminar(null);
                      }
                    }}
                    disabled={deleting}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} style={{ marginRight: 6 }} />
                    <Text style={[styles.confirmButtonText, { color: darkMode ? '#e5e7eb' : '#374151', fontWeight: '600' }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmDeleteButton, { 
                      backgroundColor: deleting ? (darkMode ? '#991b1b' : '#fca5a5') : '#ef4444',
                      opacity: deleting ? 0.7 : 1 
                    }]}
                    onPress={async () => {
                      if (!productoAEliminar || deleting) return;
                      try {
                        setDeleting(true);
                        await deleteProduct(productoAEliminar.id);
                        await handleProductoPublicado();
                        setDeleteModalVisible(false);
                        setProductoAEliminar(null);
                      } catch (err) {
                        console.error('Error al eliminar producto:', err);
                        setAlert({
                          visible: true,
                          type: 'error',
                          title: 'Error',
                          message: 'No se pudo eliminar el producto',
                          onConfirm: () => setAlert((a) => ({ ...a, visible: false })),
                        });
                      } finally {
                        setDeleting(false);
                      }
                    }}
                    disabled={deleting}
                    activeOpacity={0.8}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                    ) : (
                      <MaterialIcons name="delete-forever" size={20} color="#fff" style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.confirmButtonText, { color: '#fff', fontWeight: '700' }]}>
                      {deleting ? 'Eliminando...' : 'Eliminar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('PublicarProducto', { onProductoPublicado: handleProductoPublicado })} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onConfirm={alert.onConfirm}
        onClose={alert.onConfirm}
      />
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
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    alignItems: 'stretch',
    minHeight: undefined,
    padding: 0,
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  modalOverlay: {
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
    position: 'absolute',
  },
  modalContent: {
    borderRadius: 16,
    padding: 12,
    width: '94%',
    maxWidth: 560,
    elevation: 8,
  },
  modalReportButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 30,
  },
  closeButton: {
    marginTop: 8,
    alignItems: 'center',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#007AFF',
  },
  closeButtonText: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  horaVenta: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  ownerActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  modalDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 3,
  },
  modalDotActive: {
    backgroundColor: '#007AFF',
  },
  fabText: {
    fontSize: 28,
    lineHeight: 28,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Estilos para modal de confirmación
  confirmModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 20,
  },
  confirmModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  confirmText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  productPreview: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  productPreviewName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  productPreviewPrice: {
    fontSize: 17,
    fontWeight: '700',
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  confirmCancelButton: {
    borderWidth: 1.5,
  },
  confirmDeleteButton: {
    elevation: 2,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Carousel arrow styles
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    zIndex: 10,
    backgroundColor: 'rgba(30,41,59,0.75)',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  carouselArrowLeft: {
    left: 8,
  },
  carouselArrowRight: {
    right: 8,
  },
});