import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import ProductoForm from './ProductoForm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';

const PublicarProductoScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { darkMode } = useTheme();
  const { producto, modo, onProductoPublicado } = route?.params || {};
  const handleCancelar = () => {
    navigation.goBack();
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#121212' : '#f5f7fb' }} contentContainerStyle={[styles.container, { paddingTop: Math.max(12, insets.top + 8) }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: darkMode ? '#fff' : '#0b2545' }]}>{modo === 'editar' ? 'Editar producto' : 'Publicar producto'}</Text>
      </View>
      <ProductoForm
        onCancelar={handleCancelar}
        producto={producto}
        modo={modo}
        onProductoPublicado={onProductoPublicado}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerRow: { paddingHorizontal: 8, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
});

export default PublicarProductoScreen;
