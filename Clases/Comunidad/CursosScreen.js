import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const cursos = [
  {
    titulo: 'Curso de Redes: NAT y Subnetting',
    descripcion: 'Aprende los fundamentos de NAT, subnetting y direccionamiento IP para redes universitarias y profesionales.',
    autor: 'Laura Méndez',
    horas: '10 horas',
    imagen: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80',
    nivel: 'Intermedio',
  },
  {
    titulo: 'Programación Orientada a Objetos (POO)',
    descripcion: 'Domina los conceptos de clases, objetos, herencia y polimorfismo en lenguajes modernos.',
    autor: 'Carlos Ruiz',
    horas: '12 horas',
    imagen: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=400&q=80',
    nivel: 'Básico',
  },
  {
    titulo: 'Modelo Entidad-Relación y SQL',
    descripcion: 'Diseña bases de datos relacionales y aprende a consultar información con SQL desde cero.',
    autor: 'Ana Torres',
    horas: '8 horas',
    imagen: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=400&q=80',
    nivel: 'Avanzado',
  },
  {
    titulo: 'Álgebra Lineal para Ingeniería',
    descripcion: 'Vectores, matrices y aplicaciones prácticas del álgebra lineal en ingeniería y ciencia.',
    autor: 'Mario López',
    horas: '14 horas',
    imagen: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80',
    nivel: 'Intermedio',
  },
  {
    titulo: 'Introducción a la Estadística',
    descripcion: 'Estadística descriptiva, probabilidad y análisis de datos para estudiantes universitarios.',
    autor: 'Sofía Herrera',
    horas: '9 horas',
    imagen: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
    nivel: 'Básico',
  },
];

const tabs = ['All', 'Popular', 'New'];

export default function CursosScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  return (
    <View style={{ flex: 1, backgroundColor: '#f7faff' }}>
      {/* Header fijo con botón y título */}
      <View style={styles.headerStaticRow}>
        <TouchableOpacity
          style={styles.backBtnStatic}
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
        <Text style={styles.headerTitleStatic}>Cursos</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar curso..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Icon name="tune" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Tabs tipo Udemy/Platzi */}
        <View style={styles.tabsRow}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Lista de cursos tipo card premium */}
        <View style={{ gap: 24 }}>
          {cursos.map((curso, idx) => (
            <View key={idx} style={styles.courseCardModern}>
              <View style={styles.courseImgModernBox}>
                <Image source={{ uri: curso.imagen }} style={styles.courseImgModern} />
                <View style={styles.nivelBadgeModern}><Text style={styles.nivelBadgeText}>{curso.nivel}</Text></View>
              </View>
              <View style={styles.courseInfoModernBox}>
                <Text style={styles.courseTitleModern} numberOfLines={2}>{curso.titulo}</Text>
                <Text style={styles.courseDescModern} numberOfLines={2}>{curso.descripcion}</Text>
                <Text style={styles.autorText}>{curso.autor}</Text>
                <View style={styles.metaRowModern}>
                  <Text style={styles.metaText}><Icon name="schedule" size={16} color="#00C6FB" /> {curso.horas}</Text>
                </View>
                <TouchableOpacity style={styles.verCursoBtn}>
                  <Text style={styles.verCursoBtnText}>Ver curso</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      {/* Botón flotante para crear curso */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CrearCurso')}
      >
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  headerStaticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f7faff',
    zIndex: 100,
  },
  backBtnStatic: {
    backgroundColor: '#00C6FB',
    borderRadius: 18,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 4,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  headerTitleStatic: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: 0.2,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  searchInput: { flex: 1, backgroundColor: '#F6F6F6', borderRadius: 12, paddingHorizontal: 16, height: 40, fontSize: 16, color: '#222' },
  filterBtn: { marginLeft: 10, backgroundColor: '#00C6FB', borderRadius: 10, padding: 8 },
  categoryRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  categoryCard: { flex: 1, borderRadius: 12, padding: 18, alignItems: 'flex-start', justifyContent: 'center' },
  categoryText: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  tabsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#F6F6F6' },
  tabBtnActive: { backgroundColor: '#00C6FB' },
  tabText: { fontSize: 15, color: '#888' },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  choiceTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#222' },
  courseCardModern: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 16,
    marginBottom: 8,
    minHeight: 320,
    marginHorizontal: 2,
  },
  courseImgModernBox: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#eaf6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseImgModern: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  nivelBadgeModern: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFB86C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 2,
  },
  nivelBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  courseInfoModernBox: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  courseTitleModern: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  ratingRowModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  ratingText: { fontSize: 15, color: '#FFD700', fontWeight: 'bold', marginRight: 4 },
  estudiantesText: { fontSize: 13, color: '#888' },
  autorText: { fontSize: 15, color: '#00C6FB', fontWeight: 'bold', marginBottom: 6 },
  metaRowModern: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 10 },
  metaText: { fontSize: 14, color: '#888', fontWeight: '500', flexDirection: 'row', alignItems: 'center' },
  verCursoBtn: { backgroundColor: '#00C6FB', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  verCursoBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#00C6FB',
    borderRadius: 32,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backBtn: {
    position: 'absolute',
    top: 44,
    left: 16,
    zIndex: 100,
    backgroundColor: '#00C6FB',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#00C6FB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
});