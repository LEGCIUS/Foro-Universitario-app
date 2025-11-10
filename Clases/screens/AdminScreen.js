import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Platform, Modal, TextInput, Linking, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../Supabase/supabaseClient';
import PublicationModal from '../publications/PublicationModal';
import CommentsModal from '../components/CommentsModal';

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
      // 1) Reportes de publicaciones
      const { data: pubReports, error: pubErr } = await supabase
        .from('reportes_publicaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (pubErr) throw pubErr;

      const normalizedPub = (pubReports || []).map(r => ({
        ...r,
        tipo_reporte: 'publicacion',
        motivo_original: r.motivo,
        tabla_origen: 'reportes_publicaciones',
      }));

      // 2) Reportes de ventas/productos
      const { data: prodReports, error: prodErr } = await supabase
        .from('reportes_ventas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (prodErr && prodErr.code !== 'PGRST116') throw prodErr; // tabla podría no existir aún

      const normalizedProd = (prodReports || []).map(r => ({
        ...r,
        tipo_reporte: 'producto',
        motivo_original: r.motivo,
        tabla_origen: 'reportes_ventas',
      }));

      // Unificar y ordenar por fecha
      const unified = [...normalizedPub, ...normalizedProd].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReports(unified);
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

  // Util: asegurar carnet del admin
  const ensureCarnet = async () => {
    try {
      if (adminCarnet) return adminCarnet;
      const c = await AsyncStorage.getItem('carnet');
      if (c) setAdminCarnet(c);
      return c;
    } catch (_) { return null; }
  };

  const fetchCountsAndLikeState = async (pubId) => {
    try {
      const [likesRes, commentsRes] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('publicacion_id', pubId),
        supabase.from('comentarios').select('id', { count: 'exact', head: true }).eq('publicacion_id', pubId),
      ]);
      if (likesRes && typeof likesRes.count === 'number') setLikesCount(likesRes.count);
      if (commentsRes && typeof commentsRes.count === 'number') setCommentCount(commentsRes.count);
      const c = await ensureCarnet();
      if (c) {
        const { data: mine } = await supabase
          .from('likes')
          .select('id')
          .eq('publicacion_id', pubId)
          .eq('usuario_carnet', c)
          .maybeSingle();
        setLikedByMe(!!mine);
      } else {
        setLikedByMe(false);
      }
    } catch (_) {}
  };

  const handleToggleLike = async () => {
    try {
      if (!selectedPost?.id) return;
      let c = await ensureCarnet();
      if (!c) {
        Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para dar like.');
        return;
      }
      if (likedByMe) {
        setLikedByMe(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('publicacion_id', selectedPost.id)
          .eq('usuario_carnet', c);
        if (error) {
          setLikedByMe(true);
          setLikesCount((prev) => prev + 1);
        }
      } else {
        setLikedByMe(true);
        setLikesCount((prev) => prev + 1);
        const { error } = await supabase
          .from('likes')
          .upsert({ publicacion_id: selectedPost.id, usuario_carnet: c }, { onConflict: 'publicacion_id,usuario_carnet', ignoreDuplicates: true });
        if (error) {
          setLikedByMe(false);
          setLikesCount((prev) => Math.max(0, prev - 1));
        }
      }
      await fetchCountsAndLikeState(selectedPost.id);
    } catch (_) {}
  };

  const fetchComments = async (pubId) => {
    try {
      const { data: rows, error } = await supabase
        .from('comentarios')
        .select('contenido, usuario_carnet, created_at')
        .eq('publicacion_id', pubId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) return;
      const list = rows || [];
      const uniqueCarnets = Array.from(new Set(list.map(r => r.usuario_carnet).filter(Boolean)));
      let profiles = new Map();
      if (uniqueCarnets.length > 0) {
        try {
          const { data: usuariosData } = await supabase
            .from('usuarios')
            .select('carnet, nombre, apellido, foto_perfil')
            .in('carnet', uniqueCarnets);
          (usuariosData || []).forEach(u => profiles.set(u.carnet, { nombre: u.nombre, apellido: u.apellido, foto_perfil: u.foto_perfil }));
        } catch (_) {}
      }
      const enriched = list.map(r => {
        const prof = profiles.get(r.usuario_carnet);
        const displayName = prof ? `${prof.nombre || ''} ${prof.apellido || ''}`.trim() : r.usuario_carnet;
        const avatarUrl = prof?.foto_perfil || null;
        return { usuario: r.usuario_carnet, displayName, avatarUrl, texto: r.contenido, created_at: r.created_at };
      });
      setComments(enriched);
      setCommentCount(enriched.length);
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
      let c = await ensureCarnet();
      if (!c) {
        Alert.alert('Inicia sesión', 'Necesitas iniciar sesión para comentar.');
        return;
      }
      const { error } = await supabase
        .from('comentarios')
        .insert({ publicacion_id: selectedPost.id, usuario_carnet: c, contenido: text });
      if (!error) {
        setNewComment('');
        await fetchComments(selectedPost.id);
        await fetchCountsAndLikeState(selectedPost.id);
      }
    } catch (_) {}
  };

  // Ver publicación reportada en modal reutilizable
  const viewReportedPublication = async (rep) => {
    try {
      if (!rep?.publicacion_id) {
        Alert.alert('Sin publicación', 'El reporte no tiene una publicación asociada.');
        return;
      }
      // Buscar la publicación por id
      const { data: pub, error: pubErr } = await supabase
        .from('publicaciones')
        .select('*')
        .eq('id', rep.publicacion_id)
        .maybeSingle();
      if (pubErr) throw pubErr;
      if (!pub) {
        Alert.alert('No encontrada', 'La publicación ya no existe.');
        return;
      }
      // Intentar traer contadores si existen, sino fallback a contar manualmente
      try {
        const { count: likesRaw } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', rep.publicacion_id);
        setLikesCount(typeof likesRaw === 'number' ? likesRaw : 0);
      } catch (_) { setLikesCount(0); }
      try {
        const { count: commentsRaw } = await supabase
          .from('comentarios')
          .select('id', { count: 'exact', head: true })
          .eq('publicacion_id', rep.publicacion_id);
        setCommentCount(typeof commentsRaw === 'number' ? commentsRaw : 0);
      } catch (_) { setCommentCount(0); }
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
      await fetchCountsAndLikeState(pub.id);
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
      // Buscar el producto por id
      const { data: prod, error: prodErr } = await supabase
        .from('productos')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
      if (prodErr) throw prodErr;
      if (!prod) {
        Alert.alert('No encontrado', 'El producto ya no existe.');
        return;
      }

      // Navigate to Ventas tab and show product details
      // Since we can't directly control ProductosList modal, show an alert with product info
      Alert.alert(
        `Producto: ${prod.titulo || 'Sin título'}`,
        `Precio: $${prod.precio || 0}\nDescripción: ${prod.descripcion || 'N/A'}\nUsuario: ${prod.usuario_carnet || 'N/A'}`,
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
          const { data: prod, error: prodErr } = await supabase
            .from('productos')
            .select('id, foto_url, usuario_carnet, titulo')
            .eq('id', productId)
            .maybeSingle();
          if (prodErr) console.log('openDeleteFlow: error buscando producto', prodErr);
          publication = prod ? { ...prod, tipo: 'producto' } : null;
        }
      } else {
        // Fetch publication
        if (report.publicacion_id) {
          const { data: pub, error: pubErr } = await supabase
            .from('publicaciones')
            .select('id, archivo_url, carnet_usuario, titulo')
            .eq('id', report.publicacion_id)
            .maybeSingle();
          if (pubErr) console.log('openDeleteFlow: error buscando publicación', pubErr);
          publication = pub ? { ...pub, tipo: 'publicacion' } : null;
        }
      }

      const carnetAutor = report.carnet_publica || report.usuario_publica || publication?.carnet_usuario || publication?.usuario_carnet || null;
      if (carnetAutor) {
        const { data: usr, error: usrErr } = await supabase
          .from('usuarios')
          .select('carnet, correo, nombre, apellido')
          .eq('carnet', carnetAutor)
          .maybeSingle();
        if (usrErr) console.log('openDeleteFlow: error buscando usuario', usrErr);
        author = usr || null;
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
      const adminCarnet = await AsyncStorage.getItem('carnet');
      const esProducto = target.publication?.tipo === 'producto' || target.report?.tipo_reporte === 'producto';
      
      // Asegurar que tenemos la publicación/producto y el autor
      let publication = target.publication;
      if (!publication) {
        const tableName = esProducto ? 'productos' : 'publicaciones';
        const lookupId = esProducto ? (target.report?.producto_id || target.report?.publicacion_id) : target.report?.publicacion_id;
        if (lookupId) {
          const { data: item, error: itemErr } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', lookupId)
            .maybeSingle();
          if (itemErr) console.log(`confirmDeletePublication: error buscando ${tableName}`, itemErr);
          publication = item ? { ...item, tipo: esProducto ? 'producto' : 'publicacion' } : null;
        }
      }
      if (!publication) throw new Error(`No se encontró ${esProducto ? 'el producto' : 'la publicación'}.`);
      
      // 1) Eliminar archivo(s) del storage (si aplica)
      const fileUrl = publication.archivo_url || publication.foto_url;
      if (fileUrl) {
        const bucket = esProducto ? 'fotos-productos' : 'multimedia';
        // foto_url puede ser un array de URLs (productos) o una string
        const urls = Array.isArray(fileUrl) ? fileUrl : [fileUrl];
        for (const url of urls) {
          const storagePath = extractMultimediaPath(url);
          if (storagePath) {
            try { 
              await supabase.storage.from(bucket).remove([storagePath]); 
            } catch (e) { 
              console.log('Error al eliminar del storage', e); 
            }
          }
        }
      }
      
      // 2) Eliminar la fila en productos/publicaciones
      const tableName = esProducto ? 'productos' : 'publicaciones';
      const { error: delErr } = await supabase.from(tableName).delete().eq('id', publication.id);
      if (delErr) throw delErr;

      // 3) Insertar auditoría (solo si la tabla existe - verificamos con head)
      const carnetUsuario = esProducto 
        ? (publication.usuario_carnet || target.report?.carnet_publica) 
        : (publication.carnet_usuario || target.report?.carnet_publica);
      const auditPayload = { 
        publicacion_id: publication.id,
        carnet_admin: adminCarnet || null,
        carnet_usuario: carnetUsuario || null,
        motivo: deleteReason,
        detalle: deleteDetails,
        base_reglamentaria: deleteRegBasis || null,
        enlace: deleteLink || null,
        // tipo_contenido removido - columna no existe en la tabla
        created_at: new Date().toISOString(),
      };
      // Intentar insertar auditoría - si falla, continuar de todas formas
      try {
        const { error: auditErr } = await supabase
          .from('auditoria_eliminaciones')
          .insert([auditPayload]);
        if (auditErr) {
          console.log('⚠️ No se pudo guardar auditoría:', auditErr.message);
        }
      } catch (e) {
        console.log('⚠️ Error en auditoría (continuando):', e.message);
      }

      // 4) Notificar al usuario en la app (si existe la tabla notificaciones)
      const contentType = esProducto ? 'producto' : 'publicación';
      const message = `Tu ${contentType} fue ${esProducto ? 'eliminado' : 'eliminada'} por un administrador. Motivo: ${deleteReason}.`;
      const notifPayload = { 
        carnet: carnetUsuario,
        tipo: esProducto ? 'producto_eliminado' : 'publicacion_eliminada',
        titulo: `Tu ${contentType} fue ${esProducto ? 'eliminado' : 'eliminada'}`,
        mensaje: message,
        data: {
          content_id: publication.id,
          tipo_contenido: esProducto ? 'producto' : 'publicacion',
          motivo: deleteReason,
          detalle: deleteDetails,
          base_reglamentaria: deleteRegBasis || null,
          enlace: deleteLink || null,
          admin: adminCarnet || null,
        },
        leido: false,
        created_at: new Date().toISOString(),
      };
      const { error: notifCheckErr } = await supabase
        .from('notificaciones')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      if (!notifCheckErr || notifCheckErr.code !== 'PGRST116') {
        try { 
          await supabase.from('notificaciones').insert([notifPayload]); 
          console.log('Notificación insertada para carnet:', carnetUsuario);
        } catch (e) { 
          console.log('Error al insertar notificación:', e); 
        }
      }

      // 5) Enviar correo de notificación al usuario vía Edge Function
      if (carnetUsuario) {
        try {
          const { data: userRow } = await supabase
            .from('usuarios')
            .select('correo, nombre, apellido')
            .eq('carnet', carnetUsuario)
            .maybeSingle();

          if (userRow?.correo) {
            console.log('📧 Enviando correo a:', userRow.correo);
            
            const { data: emailRes, error: emailErr } = await supabase.functions.invoke('send-deletion-email', {
              body: {
                to_email: userRow.correo,
                user_name: userRow.nombre || 'Usuario',
                content_type: contentType,
                content_title: publication.titulo || publication.nombre || '(sin título)',
                motivo: deleteReason,
                detalle: deleteDetails,
                base_reglamentaria: deleteRegBasis || null,
                enlace: deleteLink || null,
              }
            });
            
            if (emailErr) {
              console.warn('⚠️ Error al enviar correo:', emailErr);
            } else {
              console.log('✅ Correo enviado:', emailRes);
            }
          }
        } catch (e) {
          console.warn('⚠️ Error al enviar correo:', e.message);
        }
      }

      // 6) Actualizar UI: quitar reportes relacionados y cerrar modal
      const contentId = publication.id;
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
      Alert.alert('Eliminada', `${esProducto ? 'Producto' : 'Publicación'} eliminado y usuario notificado.`);
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
                  const table = item.tabla_origen || (isProducto ? 'reportes_ventas' : 'reportes_publicaciones');
                  const { error } = await supabase.from(table).delete().eq('id', item.id);
                  if (error) throw error;
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

// Helpers y flujo de eliminación
const extractMultimediaPath = (publicUrl) => {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  try {
    const u = new URL(publicUrl);
    const marker = '/object/public/multimedia/';
    const idx = u.pathname.indexOf(marker);
    if (idx !== -1) return decodeURIComponent(u.pathname.substring(idx + marker.length));
    const parts = publicUrl.split('?')[0].split('/multimedia/');
    if (parts[1]) return decodeURIComponent(parts[1]);
  } catch (_) {
    const parts = publicUrl.split('?')[0].split('/multimedia/');
    if (parts[1]) return decodeURIComponent(parts[1]);
  }
  return null;
};

async function fetchPublicationAndAuthor(supabase, report) {
  // Obtiene publicación y autor (por carnet o por la fila de publicaciones)
  let publication = null;
  let author = null;
  const pubId = report.publicacion_id;
  if (pubId) {
    const { data: pub } = await supabase.from('publicaciones').select('id, archivo_url, carnet_usuario, titulo').eq('id', pubId).maybeSingle?.() ?? await supabase.from('publicaciones').select('id, archivo_url, carnet_usuario, titulo').eq('id', pubId).single();
    publication = pub || null;
  }
  const carnetAutor = report.carnet_publica || publication?.carnet_usuario || null;
  if (carnetAutor) {
    const { data: usr } = await supabase.from('usuarios').select('carnet, correo, nombre, apellido').eq('carnet', carnetAutor).maybeSingle?.() ?? await supabase.from('usuarios').select('carnet, correo, nombre, apellido').eq('carnet', carnetAutor).single();
    author = usr || null;
  }
  return { publication, author };
}

// Métodos de instancia: necesitan acceso a hooks; definimos como funciones dentro del componente, pero agregamos aquí el código para claridad en el patch
