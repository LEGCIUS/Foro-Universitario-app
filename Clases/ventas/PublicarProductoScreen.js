import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import ProductoForm from './ProductoForm';

const PublicarProductoScreen = ({ navigation, route }) => {
  const { producto, modo, onProductoPublicado } = route?.params || {};
  const handleCancelar = () => {
    navigation.goBack();
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
});

export default PublicarProductoScreen;
