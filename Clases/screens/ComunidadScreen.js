
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';

const cursos = [
  {
    titulo: 'React Front To back',
    subtitulo: 'Master React (7 lessons)',
    duracion: '6h 30min',
    rating: 4.9,
    imagen: 'https://img-c.udemycdn.com/course/240x135/2196488_8fc7_6.jpg',
  },
  {
    titulo: 'React Front To back',
    subtitulo: 'Master React (7 lessons)',
    duracion: '8h 30min',
    rating: 4.9,
    imagen: 'https://img-c.udemycdn.com/course/240x135/2196488_8fc7_6.jpg',
  },
];


const secciones = [
  { nombre: 'Cursos', icono: 'school', color: '#00C6FB' },
  { nombre: 'Videos', icono: 'ondemand-video', color: '#FFB86C' },
  { nombre: 'Tutoriales', icono: 'play-circle-outline', color: '#50fa7b' },
  { nombre: 'Eventos', icono: 'class', color: '#FF5555' },
  { nombre: 'Biblioteca', icono: 'menu-book', color: '#8be9fd' },
];

import { useNavigation } from '@react-navigation/native';

export default function ComunidadScreen() {
  const { darkMode } = useTheme();
  const themeStyles = getThemeStyles(darkMode);
  const navigation = useNavigation();
  return (
    <ScrollView style={[styles.container, themeStyles.container]}>
      {/* Título */}
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: darkMode ? '#fff' : '#222' }}>Comunidad</Text>

      {/* Barra de búsqueda */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, themeStyles.searchInput]}
          placeholder="Buscar ahora..."
          placeholderTextColor={darkMode ? '#bbb' : '#888'}
        />
        <TouchableOpacity style={[styles.filterBtn, darkMode && { backgroundColor: '#333' }] }>
          <Icon name="tune" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Menú de secciones */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 }}>
        {secciones.map((sec, idx) => (
          <TouchableOpacity
            key={sec.nombre}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: darkMode ? '#222' : '#f7f7f7',
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
              width: '48%',
              borderWidth: 2,
              borderColor: sec.color,
              elevation: 2,
            }}
            onPress={() => navigation.navigate(sec.nombre)}
          >
            <Icon name={sec.icono} size={28} color={sec.color} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, fontWeight: '500', color: darkMode ? '#fff' : '#222' }}>{sec.nombre}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Banner de acción */}
      <View style={[styles.bannerBox, darkMode && { backgroundColor: '#333' }] }>
        <Text style={[styles.bannerText, darkMode && { color: '#fff' }]}>No solo damos clases, también experiencia real.</Text>
      </View>

      {/* Sección de cursos destacados */}
      <View style={[styles.sectionRow, { marginTop: 10 }] }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="school" size={24} color="#00C6FB" style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>Cursos destacados</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, themeStyles.seeAll]}>Ver todo</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionDesc, themeStyles.sectionDesc]}>Impulsa tus habilidades y carrera universitaria</Text>
      <View style={styles.coursesGrid}>
        {cursos.map((curso, idx) => (
          <View key={idx} style={[styles.courseCard, themeStyles.courseCard, { borderColor: '#00C6FB', borderWidth: 1 }] }>
            <Image source={{ uri: curso.imagen }} style={styles.courseImg} />
            <View style={styles.courseInfo}>
              <Text style={[styles.courseTitle, themeStyles.courseTitle]}>{curso.titulo}</Text>
              <Text style={[styles.courseSubtitle, themeStyles.courseSubtitle]}>{curso.subtitulo}</Text>
              <View style={styles.courseMetaRow}>
                <View style={styles.metaItem}>
                  <Icon name="schedule" size={16} color="#00C6FB" />
                  <Text style={[styles.metaText, themeStyles.metaText]}>{curso.duracion}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={[styles.metaText, themeStyles.metaText]}>{curso.rating}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Sección de videos destacados */}
      <View style={[styles.sectionRow, { marginTop: 10 }] }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="ondemand-video" size={24} color="#FFB86C" style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>Videos destacados</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, themeStyles.seeAll]}>Ver todo</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionDesc, themeStyles.sectionDesc]}>Videos útiles para tu aprendizaje</Text>
      <View style={styles.coursesGrid}>
        {cursos.map((curso, idx) => (
          <View key={idx} style={[styles.courseCard, themeStyles.courseCard, { borderColor: '#FFB86C', borderWidth: 1, backgroundColor: darkMode ? '#2d2d2d' : '#fffbe6' }] }>
            <Image source={{ uri: curso.imagen }} style={styles.courseImg} />
            <View style={styles.courseInfo}>
              <Text style={[styles.courseTitle, themeStyles.courseTitle]}>Video: {curso.titulo}</Text>
              <Text style={[styles.courseSubtitle, themeStyles.courseSubtitle]}>{curso.subtitulo}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sección de tutoriales destacados */}
      <View style={[styles.sectionRow, { marginTop: 10 }] }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="play-circle-outline" size={24} color="#50fa7b" style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>Tutoriales destacados</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, themeStyles.seeAll]}>Ver todo</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionDesc, themeStyles.sectionDesc]}>Tutoriales prácticos para estudiantes</Text>
      <View style={styles.coursesGrid}>
        {cursos.map((curso, idx) => (
          <View key={idx} style={[styles.courseCard, themeStyles.courseCard, { borderColor: '#50fa7b', borderWidth: 1, backgroundColor: darkMode ? '#233d2b' : '#eafff2' }] }>
            <Image source={{ uri: curso.imagen }} style={styles.courseImg} />
            <View style={styles.courseInfo}>
              <Text style={[styles.courseTitle, themeStyles.courseTitle]}>Tutorial: {curso.titulo}</Text>
              <Text style={[styles.courseSubtitle, themeStyles.courseSubtitle]}>{curso.subtitulo}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sección de clases destacadas */}
      <View style={[styles.sectionRow, { marginTop: 10 }] }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="class" size={24} color="#FF5555" style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>Clases destacadas</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, themeStyles.seeAll]}>Ver todo</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionDesc, themeStyles.sectionDesc]}>Clases recomendadas para ti</Text>
      <View style={styles.coursesGrid}>
        {cursos.map((curso, idx) => (
          <View key={idx} style={[styles.courseCard, themeStyles.courseCard, { borderColor: '#FF5555', borderWidth: 1, backgroundColor: darkMode ? '#2d2323' : '#ffeaea' }] }>
            <Image source={{ uri: curso.imagen }} style={styles.courseImg} />
            <View style={styles.courseInfo}>
              <Text style={[styles.courseTitle, themeStyles.courseTitle]}>Clase: {curso.titulo}</Text>
              <Text style={[styles.courseSubtitle, themeStyles.courseSubtitle]}>{curso.subtitulo}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Sección de biblioteca destacada */}
      <View style={[styles.sectionRow, { marginTop: 10 }] }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="menu-book" size={24} color="#8be9fd" style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, themeStyles.sectionTitle]}>Biblioteca destacada</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.seeAll, themeStyles.seeAll]}>Ver todo</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionDesc, themeStyles.sectionDesc]}>Documentos y recursos universitarios</Text>
      <View style={styles.coursesGrid}>
        {cursos.map((curso, idx) => (
          <View key={idx} style={[styles.courseCard, themeStyles.courseCard, { borderColor: '#8be9fd', borderWidth: 1, backgroundColor: darkMode ? '#23323d' : '#eafdff' }] }>
            <Image source={{ uri: curso.imagen }} style={styles.courseImg} />
            <View style={styles.courseInfo}>
              <Text style={[styles.courseTitle, themeStyles.courseTitle]}>Biblioteca: {curso.titulo}</Text>
              <Text style={[styles.courseSubtitle, themeStyles.courseSubtitle]}>{curso.subtitulo}</Text>
            </View>
          </View>
        ))}
      </View>
      {/* Espacio extra al final */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function getThemeStyles(darkMode) {
  return {
    container: {
      backgroundColor: darkMode ? '#181818' : '#fff',
    },
    searchInput: {
      backgroundColor: darkMode ? '#222' : '#f2f2f2',
      color: darkMode ? '#fff' : '#222',
    },
    sectionTitle: {
      color: darkMode ? '#fff' : '#222',
    },
    seeAll: {
      color: darkMode ? '#00C6FB' : '#00C6FB',
    },
    sectionDesc: {
      color: darkMode ? '#bbb' : '#888',
    },
    courseCard: {
      backgroundColor: darkMode ? '#222' : '#f7f7f7',
    },
    courseTitle: {
      color: darkMode ? '#fff' : '#222',
    },
    courseSubtitle: {
      color: darkMode ? '#bbb' : '#888',
    },
    metaText: {
      color: darkMode ? '#fff' : '#222',
    },
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  // ...existing code...
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    // ...existing code...
    paddingHorizontal: 16,
    height: 40,
    fontSize: 16,
    color: '#222',
  },
  filterBtn: {
    marginLeft: 10,
    backgroundColor: '#00C6FB',
    borderRadius: 10,
    padding: 8,
  },
  bannerText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  bannerBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bannerBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginHorizontal: 4,
  },
  bannerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  seeAll: {
    color: '#00C6FB',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionDesc: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  coursesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  courseCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 14,
    width: '48%',
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 2,
  },
  courseImg: {
    width: '100%',
    height: 90,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  courseInfo: {
    padding: 10,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  courseSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#222',
    marginLeft: 2,
  },
});
