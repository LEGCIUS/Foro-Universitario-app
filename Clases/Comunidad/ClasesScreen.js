import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ClasesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clases</Text>
      <Text style={styles.placeholder}>Aquí irán las clases de la comunidad.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  placeholder: { fontSize: 16, color: '#888' },
});