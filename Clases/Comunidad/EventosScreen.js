import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function EventosScreen({ navigation }) {
  // Dummy data (puedes reemplazarlo por datos reales luego)
  const eventos = [];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Eventos</Text>
      </View>
      <View style={styles.contentBox}>
        {eventos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No hay eventos aún</Text>
          </View>
        ) : (
          <FlatList
            data={eventos}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={({ item }) => (
              <View style={styles.eventCard}>
                <Text style={styles.eventTitle}>{item.titulo}</Text>
                <Text style={styles.eventDate}>{item.fecha}</Text>
              </View>
            )}
          />
        )}
      </View>
      <TouchableOpacity style={styles.fab} onPress={() => {/* Navegar a crear evento */}}>
        <Icon name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7faff', padding: 18 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 18,
    paddingHorizontal: 8,
    backgroundColor: '#f7faff',
  },
  backBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 18,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    elevation: 3,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FF9800', textAlign: 'left', flex: 1 },
  contentBox: {
    flex: 1,
    paddingTop: 10,
  },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#bbb', marginTop: 10 },
  eventCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#00C6FB', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 4 },
  eventTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  eventDate: { fontSize: 14, color: '#888', marginTop: 4 },
  fab: { position: 'absolute', right: 24, bottom: 32, backgroundColor: '#00C6FB', borderRadius: 32, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
});
