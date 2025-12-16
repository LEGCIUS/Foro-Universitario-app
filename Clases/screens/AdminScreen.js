import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Platform, Modal, TextInput, Linking, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import PublicationModal from '../publications/PublicationModal';
import CommentsModal from '../components/CommentsModal';

import { ApiError } from '../../src/services/api';
import { listAdminReports, deleteAdminReport, adminDeleteContent } from '../../src/services/admin';
import { getMe, getUserByCarnet } from '../../src/services/users';
import { getPost } from '../../src/services/posts';
import { getProduct } from '../../src/services/products';
import { getPostLikeState, likePost, unlikePost } from '../../src/services/likes';
import { listComments, createComment } from '../../src/services/comments';

export default function AdminScreen({ navigation }) {
  const { darkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const screenH = Dimensions.get('window').height;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Incumplimiento de normas');
  const [deleteDetails, setDeleteDetails] = useState('');
  const [deleteRegBasis, setDeleteRegBasis] = useState('');
  const [deleteLink, setDeleteLink] = useState('');
  const [target, setTarget] = useState(null); // { report, publication, author }
  const [deleting, setDeleting] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [adminCarnet, setAdminCarnet] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  // Plantillas rápidas por motivo para agilizar el llenado
  const deletionTemplates = {
    'Incumplimiento de normas': {
      detalle:
        'Tras la revisión de nuestro equipo de moderación, se determinó que el contenido publicado contraviene el reglamento interno del foro (lenguaje inapropiado, desinformación o conducta no permitida).',
      base_reglamentaria:
        'Reglamento del Foro Universitario – Conducta y Buenas Prácticas (Art. 4, 7 y 9).',
      enlace:
        'https://tu-dominio.com/reglamento#conducta',
    },
    'Contenido sensible': {
      detalle:
        'El contenido fue marcado como sensible por incluir material potencialmente perturbador o no apto para todo público, de acuerdo con nuestras políticas de seguridad y bienestar.',
      base_reglamentaria:
        'Política de Contenido Sensible – Seguridad y Bienestar (Sección 3).',
      enlace:
        'https://tu-dominio.com/politicas#contenido-sensible',
    },
    'Spam o fraude': {
      detalle:
        'La publicación fue removida por presentar características de spam, publicidad no autorizada o intento de fraude, lo cual afecta la integridad de la comunidad.',
      base_reglamentaria:
        'Política Antispam y Antifraude (Art. 2 y 5).',
      enlace:
        'https://tu-dominio.com/politicas#antispam',
    },
    'Derechos de autor': {
      detalle:
        'Se identificó posible infracción de derechos de autor o uso de material protegido sin autorización, por lo cual se procedió con la eliminación preventiva.',
      base_reglamentaria:
        'Política de Propiedad Intelectual y Derechos de Autor.',
      enlace:
        'https://tu-dominio.com/politicas#copyright',
    },
  };

  const styles = createStyles(darkMode, insets.top);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const unified = await listAdminReports({ limit: 200 });
      setReports((unified || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo cargar los reportes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  // Util: asegurar carnet del admin (desde JWT)
  const ensureCarnet = async () => {
    try {
      if (adminCarnet) return adminCarnet;
      const me = await getMe().catch(() => null);
      if (me?.carnet) setAdminCarnet(me.carnet);
      return me?.carnet || null;
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    ensureCarnet();
  }, []);

  const refreshCountsAndLikeState = async (postId, fallbackCommentsCount) => {
    try {
      const [likeState, post] = await Promise.all([
        getPostLikeState(postId).catch(() => null),
        getPost(postId).catch(() => null),
      ]);

      if (likeState) {
        setLikedByMe(!!likeState.liked);
        setLikesCount(typeof likeState.count === 'number' ? likeState.count : 0);
      }

      const cc = post?.comentarios_count ?? post?.comments_count;
      if (typeof cc === 'number') {
        setCommentCount(cc);
      } else if (typeof fallbackCommentsCount === 'number') {
        setCommentCount(fallbackCommentsCount);
      }
    } catch (_) {}
  };

  const handleToggleLike = async () => {
    try {
      if (!selectedPost?.id) return;
      if (likedByMe) {
        setLikedByMe(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        const state = await unlikePost(selectedPost.id);
        setLikedByMe(!!state.liked);
        setLikesCount(state.count);
      } else {
        setLikedByMe(true);
        setLikesCount((prev) => prev + 1);
        const state = await likePost(selectedPost.id);
        setLikedByMe(!!state.liked);
        setLikesCount(state.count);
      }
      await refreshCountsAndLikeState(selectedPost.id);
    } catch (_) {}
  };

  const fetchComments = async (pubId) => {
    try {
      const rows = await listComments(pubId);
      const list = rows || [];

      const uniqueCarnets = Array.from(new Set(list.map(r => r.usuario_carnet).filter(Boolean)));
      const profiles = new Map();
      if (uniqueCarnets.length > 0) {
        const results = await Promise.allSettled(uniqueCarnets.map((c) => getUserByCarnet(String(c))));
        results.forEach((r, idx) => {
          if (r.status !== 'fulfilled') return;
          const c = uniqueCarnets[idx];
          profiles.set(String(c), { nombre: r.value?.nombre, apellido: r.value?.apellido, foto_perfil: r.value?.foto_perfil });
        });
      }

      const enriched = list.map(r => {
        const prof = r.user
          ? { nombre: r.user.nombre, apellido: r.user.apellido, foto_perfil: r.user.foto_perfil }
          : profiles.get(String(r.usuario_carnet));
        const displayName = prof ? `${prof.nombre || ''} ${prof.apellido || ''}`.trim() : r.usuario_carnet;
        const avatarUrl = prof?.foto_perfil || null;
        return { usuario: r.usuario_carnet, displayName, avatarUrl, texto: r.texto, created_at: r.created_at, id: r.id };
      });

      setComments(enriched);
      await refreshCountsAndLikeState(pubId, enriched.length);
    } catch (_) {}
  };

  const openComments = async () => {
    if (!selectedPost?.id) return;
    await fetchComments(selectedPost.id);
    setShowCommentModal(true);
  };

  const handleAddComment = async () => {
    try {
      const text = newComment.trim();
      if (!text || !selectedPost?.id) return;
      await createComment(selectedPost.id, text);
      setNewComment('');
      await fetchComments(selectedPost.id);
    } catch (_) {}
  };

  // Ver publicación reportada en modal reutilizable
  const viewReportedPublication = async (rep) => {
    try {
      if (!rep?.publicacion_id) {
        Alert.alert('Sin publicación', 'El reporte no tiene una publicación asociada.');
        return;
      }
      const pub = await getPost(rep.publicacion_id);
      if (!pub) {
        Alert.alert('No encontrada', 'La publicación ya no existe.');
        return;
      }
      // Normalizar campos para el modal (contenido y etiquetas)
      // Normalizar etiquetas robustamente contra distintos formatos
      let normalizedEtiquetas = [];
      try {
        if (Array.isArray(pub.etiquetas)) {
          normalizedEtiquetas = pub.etiquetas.filter(Boolean).map(String);
        } else if (typeof pub.etiquetas === 'string') {
          // Intentar parsear JSON primero
          let parsed = null;
          try { parsed = JSON.parse(pub.etiquetas); } catch (_) {}
          if (Array.isArray(parsed)) {
            normalizedEtiquetas = parsed.filter(Boolean).map(String);
          } else if (pub.etiquetas.includes(',')) {
            normalizedEtiquetas = pub.etiquetas.split(',').map(e => e.trim()).filter(Boolean);
          } else if (pub.etiquetas.trim().length > 0) {
            normalizedEtiquetas = [pub.etiquetas.trim()];
          }
        }
      } catch (_) { normalizedEtiquetas = []; }

      // Inferir tipo de contenido si falta
      const guessContenido = (() => {
        const raw = pub.contenido;
        if (raw === 'image' || raw === 'video') return raw;
        const url = pub.archivo_url || '';
        const lower = url.toLowerCase();
        if (/(\.mp4|\.mov|\.avi|\.mkv|\.webm)(\?|$)/.test(lower)) return 'video';
        if (/(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/.test(lower)) return 'image';
        return 'image';
      })();

      // Asegurar campos mínimos usados por el modal
      const safeTitulo = (pub.titulo && String(pub.titulo).trim()) || 'Publicación';
      const safeDescripcion = (pub.descripcion && String(pub.descripcion).trim()) || safeTitulo;
      const safeArchivo = pub.archivo_url || '';
      const safeCarnet = pub.carnet_usuario || null;

      setSelectedPost({
        id: pub.id,
        archivo_url: safeArchivo,
        carnet_usuario: safeCarnet,
        titulo: safeTitulo,
        descripcion: safeDescripcion,
        contenido: guessContenido,
        etiquetas: normalizedEtiquetas,
      });
      await refreshCountsAndLikeState(pub.id);
    } catch (err) {
      console.log('viewReportedPublication error detail:', err);
      Alert.alert('Error', err.message || 'No se pudo abrir la publicación.');
    }
  };

  // Ver producto reportado
  const viewReportedProduct = async (rep) => {
    try {
      const productId = rep.producto_id || rep.publicacion_id;
      if (!productId) {
        Alert.alert('Sin producto', 'El reporte no tiene un producto asociado.');
        return;
      }
      const prod = await getProduct(productId);
      if (!prod) {
        Alert.alert('No encontrado', 'El producto ya no existe.');
        return;
      }

      // Navigate to Ventas tab and show product details
      // Since we can't directly control ProductosList modal, show an alert with product info
      Alert.alert(
        `Producto: ${prod.nombre || 'Sin título'}`,
        `Precio: ₡${prod.precio || 0}\nDescripción: ${prod.descripcion || 'N/A'}\nUsuario: ${prod.usuario_carnet || 'N/A'}`,
        [
          { text: 'OK' },
          { 
            text: 'Ver en Ventas', 
            onPress: () => navigation.navigate('MainTabs', { screen: 'Ventas' })
          }
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo abrir el producto.');
    }
  };

  const openDeleteFlow = async (report) => {
    try {
      const isProducto = report.tipo_reporte === 'producto';
      // Pre-cargar publicación/producto y autor para verificación
      let publication = null;
      let author = null;

      if (isProducto) {
        // Fetch product
        const productId = report.producto_id || report.publicacion_id || report.id_contenido;
        if (productId) {
          const prod = await getProduct(productId).catch(() => null);
          publication = prod ? { ...prod, tipo: 'producto', titulo: prod.nombre || prod.titulo } : null;
        }
      } else {
        // Fetch publication
        if (report.publicacion_id) {
          const pub = await getPost(report.publicacion_id).catch(() => null);
          publication = pub ? { ...pub, tipo: 'publicacion' } : null;
        }
      }

      const carnetAutor = report.carnet_publica || report.usuario_publica || publication?.carnet_usuario || publication?.usuario_carnet || null;
      if (carnetAutor) {
        author = await getUserByCarnet(String(carnetAutor)).catch(() => null);
      }
      setTarget({ report, publication, author });
      setDeleteReason('Incumplimiento de normas');
      setDeleteDetails('');
      setDeleteRegBasis('');
      setDeleteLink('');
      setShowDeleteModal(true);
    } catch (err) {
      Alert.alert('Error', 'No se pudo preparar la eliminación.');
    }
  };

  // Aplicar plantilla rápida cuando cambia el motivo (solo si los campos están vacíos)
  const onChangeReason = (m) => {
    setDeleteReason(m);
    const tpl = deletionTemplates[m];
    if (tpl) {
      if (!deleteDetails || deleteDetails.trim().length === 0) setDeleteDetails(tpl.detalle);
      if (!deleteRegBasis || deleteRegBasis.trim().length === 0) setDeleteRegBasis(tpl.base_reglamentaria);
      if (!deleteLink || deleteLink.trim().length === 0) setDeleteLink(tpl.enlace);
    }
  };

  const applyTemplate = () => {
    const tpl = deletionTemplates[deleteReason];
    if (tpl) {
      setDeleteDetails(tpl.detalle || '');
      setDeleteRegBasis(tpl.base_reglamentaria || '');
      setDeleteLink(tpl.enlace || '');
    }
  };

  const clearTemplateFields = () => {
    setDeleteDetails('');
    setDeleteRegBasis('');
    setDeleteLink('');
  };

  const confirmDeletePublication = async () => {
    if (!target?.report) return setShowDeleteModal(false);
    if (!deleteReason || !deleteDetails || deleteDetails.trim().length < 10) {
      Alert.alert('Completa los campos', 'El detalle debe tener al menos 10 caracteres.');
      return;
    }
    try {
      setDeleting(true);
      const esProducto = target.publication?.tipo === 'producto' || target.report?.tipo_reporte === 'producto';
      const contentType = esProducto ? 'producto' : 'publicacion';
      const contentId = target.publication?.id || (esProducto ? (target.report?.producto_id || target.report?.publicacion_id || target.report?.id_contenido) : target.report?.publicacion_id);
      if (!contentId) throw new Error('No se pudo determinar el contenido a eliminar.');

      await adminDeleteContent({
        contentType,
        contentId,
        reportId: target.report?.id,
        motivo: deleteReason,
        detalle: deleteDetails,
        base_reglamentaria: deleteRegBasis || null,
        enlace: deleteLink || null,
      });

      // Actualizar UI: quitar reportes relacionados y cerrar modal
      setReports((prev) => prev.filter(r => {
        const rContentId = r.publicacion_id || r.producto_id || r.id_contenido;
        return rContentId !== contentId;
      }));
      setShowDeleteModal(false);
      setTarget(null);
      setDeleteDetails('');
      setDeleteReason('Incumplimiento de normas');
      setDeleteRegBasis('');
      setDeleteLink('');
      setShowDeleteModal(false);
      setDeleting(false);
      Alert.alert('Eliminada', `${esProducto ? 'Producto' : 'Publicación'} eliminado y reporte actualizado.`);
    } catch (err) {
      console.log('confirmDeletePublication error:', err);
      setDeleting(false);
      try { Alert.alert('Error', err.message || 'No se pudo eliminar la publicación.'); } catch {}
    }
  };

  const renderItem = ({ item }) => {
    const isProducto = item.tipo_reporte === 'producto';
    const contentId = isProducto ? (item.producto_id || item.publicacion_id) : item.publicacion_id;
    const reportante = item.carnet_reporta || item.usuario_reportante || 'desconocido';
    const autor = item.carnet_publica || item.usuario_publica || null;
    const motivoMostrar = item.motivo_original || item.motivo;

    return (
      <View style={[styles.card, item.estado === 'resuelto' && { opacity: 0.6 }]}> 
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>
            {isProducto ? `Producto #${contentId}` : `Publicación #${contentId}`}
          </Text>
          {/* Estado removido para evitar el círculo gris solicitado */}
        </View>
        <Text style={styles.text}>Reportado por: <Text style={styles.bold}>{reportante}</Text></Text>
        {autor ? (
          <Text style={styles.text}>Autor: <Text style={styles.bold}>{autor}</Text></Text>
        ) : null}
        <Text style={styles.text}>Motivo: <Text style={styles.bold}>{motivoMostrar}</Text></Text>
        {item.detalle ? (
          <Text style={styles.text}>Detalle: <Text style={styles.mono}>{item.detalle}</Text></Text>
        ) : null}
        <Text style={[styles.text, { marginTop: 4 }]}>Fecha: {new Date(item.created_at).toLocaleString()}</Text>

        {/* Acciones con mejor jerarquía visual: primaria full-width y dos secundarias lado a lado */}
        <View style={styles.actionsColumn}>
          <TouchableOpacity
            onPress={() => {
              if (isProducto) {
                viewReportedProduct(item);
              } else {
                viewReportedPublication(item);
              }
            }}
            style={[styles.btn, styles.btnFull, { backgroundColor: '#2563EB' }]}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText} numberOfLines={1}>
              {isProducto ? 'Ver producto' : 'Ver publicación'}
            </Text>
          </TouchableOpacity>

          <View style={styles.rowBetween}>
            <TouchableOpacity
              onPress={() => openDeleteFlow(item)}
              style={[styles.btn, styles.btnHalf, { backgroundColor: '#DC2626' }]}
              activeOpacity={0.9}
            >
              <Text style={styles.btnText} numberOfLines={1}>
                {isProducto ? 'Eliminar producto' : 'Eliminar publicación'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                try {
                  await deleteAdminReport(item.id);
                  setReports((prev) => prev.filter(r => r.id !== item.id));
                } catch (err) {
                  Alert.alert('Error', err.message || 'No se pudo eliminar');
                }
              }}
              style={[styles.btn, styles.btnHalf, { backgroundColor: '#EF4444' }]}
              activeOpacity={0.9}
            >
              <Text style={styles.btnText} numberOfLines={1}>Eliminar reporte</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtnText}>{'<'} Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel de reportes</Text>
        <View style={{ width: 72 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: darkMode ? '#ccc' : '#555' }}>Sin reportes por ahora</Text>
            </View>
          )}
        />
      )}
      {/* Modal para ver publicación seleccionada (reutilizable) */}
      <PublicationModal
        visible={!!selectedPost}
        darkMode={darkMode}
        post={selectedPost}
        onClose={() => { setSelectedPost(null); setShowCommentModal(false); }}
        liked={likedByMe}
        likesCount={likesCount}
        onPressLike={handleToggleLike}
        commentCount={commentCount}
        onPressComments={openComments}
        canDelete={false}
        canReport={false}
        sharePayload={{
          title: selectedPost?.titulo || 'Publicación',
          message: selectedPost?.descripcion || selectedPost?.titulo || 'Publicación',
          url: selectedPost?.archivo_url || undefined,
        }}
      />

      {/* Modal de comentarios para Admin (solo lectura/escritura básica) */}
      <CommentsModal
        visible={showCommentModal}
        darkMode={darkMode}
        comments={comments}
        commentCount={commentCount}
        newComment={newComment}
        onChangeNewComment={setNewComment}
        onSubmitNewComment={handleAddComment}
        onRequestClose={() => setShowCommentModal(false)}
        meCarnet={adminCarnet}
        onPressAvatar={async (carnetUser) => {
          setShowCommentModal(false);
          if (!carnetUser) return;
          const me = await ensureCarnet();
          if (me && me === carnetUser) {
            navigation.navigate('MainTabs', { screen: 'Perfil' });
          } else {
            navigation.navigate('ViewUserProfile', { userId: carnetUser });
          }
        }}
        onLongPressComment={() => {}}
      />
      {/* Modal de eliminación con formulario obligatorio */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: darkMode ? '#1e1e1e' : '#fff', maxHeight: Math.max(420, Math.floor(screenH * 0.88)) }]}>
            <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#111' }]}>
              {target?.publication?.tipo === 'producto' ? 'Eliminar producto' : 'Eliminar publicación'}
            </Text>
            <Text style={{ color: darkMode ? '#ddd' : '#444', marginBottom: 8 }}>
              Completa este formulario. Se notificará al autor por correo y en su perfil.
            </Text>
            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.label, { color: darkMode ? '#eee' : '#222' }]}>Motivo (obligatorio)</Text>
              {['Incumplimiento de normas','Contenido sensible','Spam o fraude','Derechos de autor','Otro'].map((m) => (
                <TouchableOpacity key={m} onPress={() => onChangeReason(m)} style={[styles.reasonItem, { borderColor: deleteReason === m ? '#DC2626' : (darkMode ? '#333' : '#e5e7eb'), backgroundColor: deleteReason === m ? (darkMode ? '#2a1b1b' : '#fee2e2') : 'transparent' }]}>
                  <Text style={{ color: darkMode ? '#eee' : '#222', fontWeight: deleteReason === m ? '700' : '500' }}>{m}</Text>
                </TouchableOpacity>
              ))}

              {/* Sugerencias rápidas en base al motivo */}
              {!!deletionTemplates[deleteReason] && (
                <View style={[styles.suggestionBox, { borderColor: darkMode ? '#333' : '#e5e7eb', backgroundColor: darkMode ? '#141414' : '#f9fafb' }]}> 
                  <Text style={[styles.label, { marginTop: 0, color: darkMode ? '#eee' : '#222' }]}>Sugerencias para este motivo</Text>
                  <Text style={{ color: darkMode ? '#ddd' : '#444', fontSize: 12, marginBottom: 8 }}>
                    Puedes aplicar una plantilla para completar más rápido. Luego puedes editar los campos.
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 8 }}>
                    <TouchableOpacity onPress={applyTemplate} style={[styles.chipBtn, { backgroundColor: darkMode ? '#2a2a2a' : '#e5e7eb' }]}>
                      <Text style={{ color: darkMode ? '#fff' : '#111', fontWeight: '700' }}>Aplicar plantilla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearTemplateFields} style={[styles.chipBtn, { backgroundColor: darkMode ? '#333' : '#e5e7eb' }]}>
                      <Text style={{ color: darkMode ? '#fff' : '#111', fontWeight: '700' }}>Limpiar campos</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={[styles.label, { color: darkMode ? '#eee' : '#222' }]}>Detalle (obligatorio)</Text>
              <TextInput
                value={deleteDetails}
                onChangeText={setDeleteDetails}
                placeholder="Describe claramente por qué se elimina y qué norma incumple"
                placeholderTextColor={darkMode ? '#888' : '#999'}
                multiline
                style={[styles.textArea, { color: darkMode ? '#fff' : '#111', borderColor: darkMode ? '#333' : '#e5e7eb', backgroundColor: darkMode ? '#111' : '#fafafa' }]}
              />
              <Text style={[styles.label, { color: darkMode ? '#eee' : '#222' }]}>Base reglamentaria (opcional)</Text>
              <TextInput
                value={deleteRegBasis}
                onChangeText={setDeleteRegBasis}
                placeholder="Artículo, reglamento o política aplicable"
                placeholderTextColor={darkMode ? '#888' : '#999'}
                style={[styles.input, { color: darkMode ? '#fff' : '#111', borderColor: darkMode ? '#333' : '#e5e7eb', backgroundColor: darkMode ? '#111' : '#fafafa' }]}
              />
              <Text style={[styles.label, { color: darkMode ? '#eee' : '#222' }]}>Enlace de referencia (opcional)</Text>
              <TextInput
                value={deleteLink}
                onChangeText={setDeleteLink}
                placeholder="URL a políticas o evidencia"
                placeholderTextColor={darkMode ? '#888' : '#999'}
                style={[styles.input, { color: darkMode ? '#fff' : '#111', borderColor: darkMode ? '#333' : '#e5e7eb', backgroundColor: darkMode ? '#111' : '#fafafa' }]}
              />
              {!!deleteLink && (
                <TouchableOpacity onPress={() => Linking.openURL(deleteLink)}>
                  <Text style={{ color: '#2563EB', marginTop: 6 }}>Abrir enlace</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <View style={styles.modalActionsRowResponsive}>
              <TouchableOpacity
                disabled={deleting}
                onPress={() => setShowDeleteModal(false)}
                style={[styles.btn, styles.btnHalf, { backgroundColor: darkMode ? '#333' : '#e5e7eb', opacity: deleting ? 0.6 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnText, { color: darkMode ? '#fff' : '#111' }]} numberOfLines={1}>
                  {deleting ? 'Procesando…' : 'Cancelar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={deleting}
                onPress={confirmDeletePublication}
                style={[styles.btn, styles.btnHalf, { backgroundColor: '#DC2626', opacity: deleting ? 0.6 : 1 }]}
                activeOpacity={0.85}
              > 
                <Text style={styles.btnText} numberOfLines={1}>
                  {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (darkMode, safeTop = 0) => StyleSheet.create({
  container: { flex: 1, backgroundColor: darkMode ? '#121212' : '#f5f5f5' },
  header: {
    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Math.max(12, (safeTop || 0) + 8),
    paddingBottom: 10,
    minHeight: 60,
  },
  headerTitle: { color: darkMode ? '#fff' : '#111', fontSize: 18, fontWeight: '700' },
  backBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  backBtnText: { color: '#007AFF', fontWeight: '700' },
  card: {
    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { color: darkMode ? '#fff' : '#111', fontWeight: '700', fontSize: 16 },
  badge: { color: '#fff', backgroundColor: '#6B7280', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', fontSize: 12 },
  text: { color: darkMode ? '#ddd' : '#333', marginTop: 4 },
  bold: { fontWeight: '700', color: darkMode ? '#fff' : '#111' },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: darkMode ? '#ccc' : '#444' },
  btn: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnFull: { width: '100%', minHeight: 44, marginTop: 10, marginBottom: 8 },
  btnHalf: { width: '48%', minHeight: 44 },
  actionsColumn: { marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' },
  modalActionsRowResponsive: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', marginTop: 14 },
  btnText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '96%', maxWidth: 520, borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  reasonItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  suggestionBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 6, marginBottom: 8 },
  chipBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, marginBottom: 8 },
  textArea: { minHeight: 90, borderWidth: 1, borderRadius: 10, padding: 10 },
});

// Helpers removidos: eliminación/notificación se delega al backend.
