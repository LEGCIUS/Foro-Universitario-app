import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const cursos = [
  {
    titulo: 'Product Design v1.0',
    autor: 'Robertson Connie',
    precio: '$190',
    horas: '16 hours',
    imagen: null,
  },
  {
    titulo: 'Java Development',
    autor: 'Nguyen Shane',
    precio: '$190',
    horas: '16 hours',
    imagen: null,
  },
  {
    titulo: 'Visual Design',
    autor: 'Bert Pullman',
    precio: '$250',
    horas: '14 hours',
    imagen: null,
  },
];

const tabs = ['All', 'Popular', 'New'];

export default function CursosScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Course</Text>
          <Image source={{ uri: 'https://i.imgur.com/0y0y0y0.png' }} style={styles.avatar} />
        </View>
        {/* Search bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Find Course"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Icon name="tune" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Category cards */}
        <View style={styles.categoryRow}>
          <View style={[styles.categoryCard, { backgroundColor: '#D6F0FF' }] }>
            <Text style={styles.categoryText}>English</Text>
          </View>
          <View style={[styles.categoryCard, { backgroundColor: '#F3D6FF' }] }>
            <Text style={styles.categoryText}>Design</Text>
          </View>
        </View>
        {/* Tabs */}
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
        {/* Course list */}
        <Text style={styles.choiceTitle}>Choice your course</Text>
        {cursos.map((curso, idx) => (
          <View key={idx} style={styles.courseCard}>
            <View style={styles.courseImgBox}>
              {/* Placeholder image */}
              <View style={styles.imgPlaceholder} />
            </View>
            <View style={styles.courseInfoBox}>
              <Text style={styles.courseTitle}>{curso.titulo}</Text>
              <Text style={styles.courseAuthor}>👤 {curso.autor}</Text>
              <View style={styles.courseMetaRow}>
                <Text style={styles.coursePrice}>{curso.precio}</Text>
                <Text style={styles.courseHours}>{curso.horas}</Text>
              </View>
            </View>
          </View>
        ))}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
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
  courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F6F6', borderRadius: 16, marginBottom: 16, padding: 12 },
  courseImgBox: { marginRight: 12 },
  imgPlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#ddd' },
  courseInfoBox: { flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 2 },
  courseAuthor: { fontSize: 13, color: '#888', marginBottom: 6 },
  courseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coursePrice: { fontSize: 16, fontWeight: 'bold', color: '#00C6FB' },
  courseHours: { fontSize: 13, color: '#FF5555', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 },
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
});