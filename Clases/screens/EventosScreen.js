
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

const filtros = [
  { label: 'Todos', key: 'Todos' },
  { label: 'Académico', key: 'Académico' },
  { label: 'Cultural', key: 'Cultural' },
  { label: 'Deportivo', key: 'Deportivo' },
  { label: 'Becas', key: 'Becas' },
  { label: 'Conferencia', key: 'Conferencia' },
];

const eventos = [
  {
    titulo: 'Feria de Orientación Vocacional',
    subtitulo: 'Edificio Central, Auditorio 1',
    duracion: '12 Nov, 10:00-16:00',
    etiquetas: ['Académico', 'Gratis', 'Presencial'],
    autor: 'Depto. de Psicopedagogía',
    rol: 'Organizador',
    imagen: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    titulo: 'Torneo Interuniversitario de Fútbol',
    subtitulo: 'Cancha principal',
    duracion: '15 Nov, 14:00-18:00',
    etiquetas: ['Deportivo', 'Cupo limitado'],
    autor: 'Federación de Estudiantes',
    rol: 'Organizador',
    imagen: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=400&q=80',
    avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
  },
  {
    titulo: 'Conferencia: Inteligencia Artificial y Futuro Laboral',
    subtitulo: 'Aula Magna',
    duracion: '18 Nov, 17:00-19:00',
    etiquetas: ['Conferencia', 'Tecnología', 'Cupo limitado'],
    autor: 'Dra. Ana Torres',
    rol: 'Ponente invitada',
    imagen: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    titulo: 'Convocatoria Becas Internacionales 2026',
    subtitulo: 'Sala de Informes',
    duracion: '20 Nov, 11:00-13:00',
    etiquetas: ['Becas', 'Académico'],
    autor: 'Oficina de Relaciones Internacionales',
    rol: 'Informativo',
    imagen: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    avatar: 'https://randomuser.me/api/portraits/men/12.jpg',
  },
  {
    titulo: 'Festival Cultural Universitario',
    subtitulo: 'Plaza Central',
    duracion: '22 Nov, 16:00-22:00',
    etiquetas: ['Cultural', 'Música', 'Arte'],
    autor: 'Dirección de Cultura',
    rol: 'Organizador',
    imagen: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
  },
];

export default function EventosScreen({ navigation }) {
  const { darkMode } = useTheme();
  const [filtroActivo, setFiltroActivo] = useState('Todos');

  // Filtrar eventos según el filtro activo
  const eventosFiltrados = filtroActivo === 'Todos'
    ? eventos
    : eventos.filter(ev => ev.etiquetas.some(et => et.toLowerCase().includes(filtroActivo.toLowerCase())));

  return (
    <View style={styles.container}>
      {/* Botón de volver a Comunidad */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Comunidad');
          }
        }}
        activeOpacity={0.85}
      >
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12, marginLeft: 36 }}>
        <Icon name="event" size={26} color="#00C6FB" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: darkMode ? '#fff' : '#222' }}>Eventos</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filtrosRow}>
        {filtros.map((f, idx) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filtroBtn, filtroActivo === f.key && styles.filtroBtnActive]}
            onPress={() => setFiltroActivo(f.key)}
          >
            <Text style={[styles.filtroText, filtroActivo === f.key && styles.filtroTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de eventos tipo tarjeta visual */}
      <FlatList
        data={eventosFiltrados}
        keyExtractor={(_, idx) => idx.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 18 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.eventCard}
          >
            {/* Imagen o icono de fondo con degradado */}
            <View style={styles.eventImgBox}>
              {item.imagen ? (
                <Image source={{ uri: item.imagen }} style={styles.eventImg} />
              ) : (
                <View style={styles.eventImgPlaceholder}>
                  <Icon name="event" size={54} color="#00C6FB" />
                </View>
              )}
              {/* Degradado overlay */}
              <View style={styles.gradientOverlay} />
              {/* Etiquetas flotantes */}
              <View style={styles.etiquetasRow}>
                {item.etiquetas.map((et, i) => (
                  <View key={i} style={[styles.etiqueta, i === 0 && styles.etiquetaDestacada]}>
                    <Text style={[styles.etiquetaText, i === 0 && styles.etiquetaTextDestacada]}>{et}</Text>
                  </View>
                ))}
              </View>
            </View>
            {/* Info superpuesta con glassmorphism */}
            <View style={styles.eventInfoBoxGlass}>
              <Text style={styles.eventTitle} numberOfLines={2} ellipsizeMode="tail">{item.titulo}</Text>
              <View style={styles.eventMetaRow}>
                <Text style={styles.eventMeta} numberOfLines={1} ellipsizeMode="tail">{item.subtitulo}</Text>
                <Text style={styles.eventMeta} numberOfLines={1} ellipsizeMode="tail">• {item.duracion}</Text>
              </View>
              <View style={styles.autorRow}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatarImgGlass} />
                ) : (
                  <View style={styles.avatarBoxGlass}>
                    <Icon name="person" size={22} color="#00C6FB" />
                  </View>
                )}
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.autorName} numberOfLines={1} ellipsizeMode="tail">{item.autor}</Text>
                  <Text style={styles.autorRol} numberOfLines={1} ellipsizeMode="tail">{item.rol}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => {/* Navegar a crear evento */}}>
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7faff', padding: 18 },
  filtrosRow: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  filtroBtn: { backgroundColor: '#f2f2f2', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 6, marginRight: 8 },
  filtroBtnActive: { backgroundColor: '#FF5555' },
  filtroText: { color: '#888', fontWeight: 'bold', fontSize: 15 },
  filtroTextActive: { color: '#fff' },
  eventCard: {
    width: 290,
    marginRight: 24,
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 14,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    borderWidth: 1.5,
    borderColor: '#eaf6ff',
    marginBottom: 24,
    marginTop: 24,
  },
  eventImgBox: {
    height: 170,
    backgroundColor: '#eaf6ff',
    justifyContent: 'flex-end',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  eventImg: { width: '100%', height: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  eventImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 170, backgroundColor: '#f7faff' },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'linear-gradient(180deg, rgba(0,198,251,0.18) 0%, rgba(255,85,85,0.13) 100%)',
    zIndex: 1,
    // fallback for RN: use a semi-transparent overlay
    backgroundColor: 'rgba(0,0,0,0.13)',
  },
  etiquetasRow: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', gap: 10, zIndex: 2 },
  etiqueta: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginRight: 10, elevation: 3, shadowColor: '#FFB86C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4 },
  etiquetaDestacada: { backgroundColor: '#FFB86C', elevation: 4 },
  etiquetaText: { fontSize: 14, color: '#888', fontWeight: 'bold', letterSpacing: 0.1 },
  etiquetaTextDestacada: { color: '#fff' },
  eventInfoBoxGlass: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    // backdropFilter: 'blur(8px)', // not supported in RN, but left for reference
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
    letterSpacing: 0.3,
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  eventMeta: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
    flexShrink: 1,
    maxWidth: 120,
  },
  autorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  avatarBoxGlass: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: '#00C6FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 4,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  avatarImgGlass: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2.5,
    borderColor: '#00C6FB',
    marginRight: 14,
    resizeMode: 'cover',
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  autorName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  autorRol: { fontSize: 14, color: '#888' },
  fab: { position: 'absolute', right: 24, bottom: 32, backgroundColor: '#00C6FB', borderRadius: 32, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  backBtn: {
    position: 'absolute',
    top: 28,
    left: 12,
    zIndex: 20,
    backgroundColor: '#FF5555',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#FF5555',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
});
