import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingScreen = ({ onLogout }) => {
  const handleLogout = async () => {
    await onLogout();
    
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuraciones</Text>
      <Button title="Cerrar sesión" color="#00C6FB" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});

export default SettingScreen;
