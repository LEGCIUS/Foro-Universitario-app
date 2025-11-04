import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Platform, Modal, TextInput, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import { supabase } from '../../Supabase/supabaseClient';

export default function AdminScreen({ navigation }) {
  const { darkMode } = useTheme();
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

  const styles = createStyles(darkMode);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reportes_publicaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setReports(data || []);
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

  const markResolved = async (rep) => {
    try {
      const { error } = await supabase
        .from('reportes_publicaciones')
        .update({ estado: 'resuelto' })
        .eq('id', rep.id);
      if (error) throw error;
      setReports((prev) => prev.map(r => r.id === rep.id ? { ...r, estado: 'resuelto' } : r));
    } catch (err) {
      // Si la columna no existe, informar al admin
      Alert.alert('Atención', 'No se pudo marcar como resuelto. Verifique que la tabla tenga la columna "estado".');
    }
  };

  const openDeleteFlow = async (report) => {
    try {
      // Pre-cargar publicación y autor para verificación
      let publication = null;
      let author = null;
      if (report.publicacion_id) {
        const { data: pub, error: pubErr } = await supabase
          .from('publicaciones')
          .select('id, archivo_url, carnet_usuario, titulo')
          .eq('id', report.publicacion_id)
          .maybeSingle();
        if (pubErr) console.log('openDeleteFlow: error buscando publicación', pubErr);
        publication = pub || null;
      }
      const carnetAutor = report.carnet_publica || publication?.carnet_usuario || null;
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

  const confirmDeletePublication = async () => {
    if (!target?.report) return setShowDeleteModal(false);
    if (!deleteReason || !deleteDetails || deleteDetails.trim().length < 10) {
      Alert.alert('Completa los campos', 'El detalle debe tener al menos 10 caracteres.');
      return;
    }
    try {
      setDeleting(true);
      const adminCarnet = await AsyncStorage.getItem('carnet');
      // Asegurar que tenemos la publicación y el autor
      let publication = target.publication;
      if (!publication && target.report?.publicacion_id) {
        const { data: pub, error: pubErr } = await supabase
          .from('publicaciones')
          .select('id, archivo_url, carnet_usuario, titulo')
          .eq('id', target.report.publicacion_id)
          .maybeSingle();
        if (pubErr) console.log('confirmDeletePublication: error buscando publicación', pubErr);
        publication = pub || null;
      }
      if (!publication) throw new Error('No se encontró la publicación.');
      // 1) Eliminar archivo del storage
      const storagePath = extractMultimediaPath(publication.archivo_url);
      if (storagePath) {
        try { await supabase.storage.from('multimedia').remove([storagePath]); } catch (e) { console.log('Error al eliminar del storage', e); }
      }
      // 2) Eliminar la fila en publicaciones (intentar RPC con privilegios; fallback a delete directo)
      let deletedOk = false;
      try {
        const delRes = await supabase.rpc('admin_delete_publication', {
          pub_id: publication.id,
          admin_carnet: adminCarnet || null,
        });
        if (!delRes.error) {
          deletedOk = true;
        } else {
          console.log('RPC admin_delete_publication error:', delRes.error);
        }
      } catch (e) {
        console.log('RPC admin_delete_publication exception:', e);
      }
      if (!deletedOk) {
        const { error: delErr } = await supabase.from('publicaciones').delete().eq('id', publication.id);
        if (delErr) throw delErr;
      }

      // 3) Insertar auditoría (solo si la tabla existe - verificamos con head)
      const auditPayload = { 
        publicacion_id: publication.id,
        carnet_admin: adminCarnet || null,
        carnet_usuario: publication.carnet_usuario || target.report?.carnet_publica || null,
        motivo: deleteReason,
        detalle: deleteDetails,
        base_reglamentaria: deleteRegBasis || null,
        enlace: deleteLink || null,
        created_at: new Date().toISOString(),
      };
      const { error: auditCheckErr } = await supabase
        .from('auditoria_eliminaciones')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      if (!auditCheckErr || auditCheckErr.code !== 'PGRST116') {
        // Tabla existe o error no es "tabla no encontrada"
        try { await supabase.from('auditoria_eliminaciones').insert([auditPayload]); } catch (_) {}
      }

      // 4) Notificar al usuario en la app (si existe la tabla notificaciones)
      const message = `Una de tus publicaciones fue eliminada por un administrador. Motivo: ${deleteReason}.`;
      const notifPayload = { 
        carnet: publication.carnet_usuario || target.report?.carnet_publica || null,
        tipo: 'publicacion_eliminada',
        titulo: 'Tu publicación fue eliminada',
        mensaje: message,
        data: {
          publicacion_id: publication.id,
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
        try { await supabase.from('notificaciones').insert([notifPayload]); } catch (_) {}
      }

      // 5) Intentar enviar correo via RPC (solo si la función existe)
      try {
        const { data: userRow } = await supabase
          .from('usuarios')
          .select('correo, nombre, apellido')
          .eq('carnet', publication.carnet_usuario)
          .maybeSingle();
        if (userRow?.correo) {
          // Llamar RPC; registrar errores para diagnóstico
          const rpcRes = await supabase.rpc('send_publication_deletion_email', {
            to_email: userRow.correo,
            subject: 'Tu publicación fue eliminada',
            motivo: deleteReason,
            detalle: deleteDetails,
            base_reglamentaria: deleteRegBasis || null,
            enlace: deleteLink || null,
            titulo_publicacion: publication.titulo || '',
          });
          if (rpcRes.error) {
            console.log('RPC send_publication_deletion_email error:', rpcRes.error);
            // Notificar al admin pero no bloquear el flujo de eliminación
            try { Alert.alert('Aviso', 'No se pudo enviar el correo. Revisa logs de Edge Function y secretos.'); } catch {}
          }
        }
      } catch (_) { /* RPC opcional */ }

      // 6) Actualizar UI: quitar reportes relacionados y cerrar modal
      const pubId = publication.id;
      setReports((prev) => prev.filter(r => r.publicacion_id !== pubId));
      setShowDeleteModal(false);
      setTarget(null);
      setDeleteDetails('');
      setDeleteReason('Incumplimiento de normas');
      setDeleteRegBasis('');
      setDeleteLink('');
      setShowDeleteModal(false);
      setDeleting(false);
      Alert.alert('Eliminada', 'Publicación eliminada y usuario notificado.');
    } catch (err) {
      console.log('confirmDeletePublication error:', err);
      setDeleting(false);
      try { Alert.alert('Error', err.message || 'No se pudo eliminar la publicación.'); } catch {}
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.estado === 'resuelto' && { opacity: 0.6 }]}> 
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.title}>Publicación #{item.publicacion_id}</Text>
        <Text style={styles.badge}>{item.estado || 'pendiente'}</Text>
      </View>
      <Text style={styles.text}>Reportado por: <Text style={styles.bold}>{item.carnet_reporta || 'desconocido'}</Text></Text>
      {item.carnet_publica ? (
        <Text style={styles.text}>Autor: <Text style={styles.bold}>{item.carnet_publica}</Text></Text>
      ) : null}
      <Text style={styles.text}>Motivo: <Text style={styles.bold}>{item.motivo}</Text></Text>
      {item.detalle ? (
        <Text style={styles.text}>Detalle: <Text style={styles.mono}>{item.detalle}</Text></Text>
      ) : null}
      <Text style={[styles.text, { marginTop: 4 }]}>Fecha: {new Date(item.created_at).toLocaleString()}</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
        {item.estado !== 'resuelto' && (
          <TouchableOpacity onPress={() => markResolved(item)} style={[styles.btn, { backgroundColor: '#10B981' }]}>
            <Text style={styles.btnText}>Marcar resuelto</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => openDeleteFlow(item)}
          style={[styles.btn, { backgroundColor: '#DC2626', marginLeft: 8 }]}
        >
          <Text style={styles.btnText}>Eliminar publicación</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            try {
              const { error } = await supabase.from('reportes_publicaciones').delete().eq('id', item.id);
              if (error) throw error;
              setReports((prev) => prev.filter(r => r.id !== item.id));
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar');
            }
          }}
          style={[styles.btn, { backgroundColor: '#EF4444', marginLeft: 8 }]}
        >
          <Text style={styles.btnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
      {/* Modal de eliminación con formulario obligatorio */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: darkMode ? '#1e1e1e' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#111' }]}>Eliminar publicación</Text>
            <Text style={{ color: darkMode ? '#ddd' : '#444', marginBottom: 8 }}>
              Completa este formulario. Se notificará al autor por correo y en su perfil.
            </Text>
            <Text style={[styles.label, { color: darkMode ? '#eee' : '#222' }]}>Motivo (obligatorio)</Text>
            {['Incumplimiento de normas','Contenido sensible','Spam o fraude','Derechos de autor','Otro'].map((m) => (
              <TouchableOpacity key={m} onPress={() => setDeleteReason(m)} style={[styles.reasonItem, { borderColor: deleteReason === m ? '#DC2626' : (darkMode ? '#333' : '#e5e7eb'), backgroundColor: deleteReason === m ? (darkMode ? '#2a1b1b' : '#fee2e2') : 'transparent' }]}>
                <Text style={{ color: darkMode ? '#eee' : '#222', fontWeight: deleteReason === m ? '700' : '500' }}>{m}</Text>
              </TouchableOpacity>
            ))}
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
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
              <TouchableOpacity disabled={deleting} onPress={() => setShowDeleteModal(false)} style={[styles.btn, { backgroundColor: darkMode ? '#333' : '#e5e7eb', opacity: deleting ? 0.6 : 1 }]}>
                <Text style={[styles.btnText, { color: darkMode ? '#fff' : '#111' }]}>{deleting ? 'Procesando…' : 'Cancelar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={deleting} onPress={confirmDeletePublication} style={[styles.btn, { backgroundColor: '#DC2626', marginLeft: 8, opacity: deleting ? 0.6 : 1 }]}> 
                <Text style={styles.btnText}>{deleting ? 'Eliminando…' : 'Eliminar definitivamente'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (darkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: darkMode ? '#121212' : '#f5f5f5' },
  header: {
    height: 60,
    backgroundColor: darkMode ? '#1e1e1e' : '#fff',
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerTitle: { color: darkMode ? '#fff' : '#111', fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 8, borderRadius: 8 },
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
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '96%', maxWidth: 520, borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  reasonItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, marginBottom: 8 },
  textArea: { minHeight: 90, borderWidth: 1, borderRadius: 10, padding: 10 },
});

// Helpers y flujo de eliminación
const extractMultimediaPath = (publicUrl) => {
  if (!publicUrl) return null;
  try {
    const u = new URL(publicUrl);
    const marker = '/object/public/multimedia/';
    const idx = u.pathname.indexOf(marker);
    if (idx !== -1) return decodeURIComponent(u.pathname.substring(idx + marker.length));
    const parts = publicUrl.split('?')[0].split('/multimedia/');
    if (parts[1]) return decodeURIComponent(parts[1]);
  } catch (_) {
    const parts = (publicUrl || '').split('?')[0].split('/multimedia/');
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
