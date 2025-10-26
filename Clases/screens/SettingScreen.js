import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';

const SettingScreen = ({ onLogout }) => {
  const { darkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await onLogout();
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <Text style={[styles.title, darkMode && styles.darkTitle]}>Configuraciones</Text>
      <Button title="Cerrar sesión" color="#00C6FB" onPress={handleLogout} />
      <Button
        title={darkMode ? "Modo claro" : "Modo oscuro"}
        color={darkMode ? "#444" : "#222"}
        onPress={toggleTheme}
      />
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
  darkContainer: {
    backgroundColor: '#222',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#222',
  },
  darkTitle: {
    color: '#fff',
  },
});

export default SettingScreen;
