import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';

const SettingScreen = ({ onLogout }) => {
  const { darkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await onLogout();
  };

  const handlePlaceholder = (title) => {
    Alert.alert(title, 'Funcionalidad no implementada aún.');
  };

  const CustomButton = ({ title, color, onPress }) => (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: color },
        darkMode && styles.buttonDark
      ]} 
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <Text style={[styles.title, darkMode && styles.darkTitle]}>Configuraciones</Text>

      <View style={styles.buttonSpacing}>
        <CustomButton title="Cerrar sesión" color="#00C6FB" onPress={handleLogout} />
      </View>

      <View style={styles.buttonSpacing}>
        <CustomButton
          title={darkMode ? "Modo claro" : "Modo oscuro"}
          color={darkMode ? "#444" : "#222"}
          onPress={toggleTheme}
        />
      </View>

      <View style={styles.buttonSpacing}>
        <CustomButton title="Ayuda" color="#007AFF" onPress={() => handlePlaceholder('Ayuda')} />
      </View>

      <View style={styles.buttonSpacing}>
        <CustomButton title="Términos y condiciones" color="#007AFF" onPress={() => handlePlaceholder('Términos y condiciones')} />
      </View>

      <View style={styles.buttonSpacing}>
        <CustomButton title="Política de privacidad" color="#007AFF" onPress={() => handlePlaceholder('Política de privacidad')} />
      </View>

      <View style={styles.buttonSpacing}>
        <CustomButton title="Notificaciones" color="#007AFF" onPress={() => handlePlaceholder('Notificaciones')} />
      </View>

      <View style={styles.buttonSpacing}>
        <CustomButton title="Idioma" color="#007AFF" onPress={() => handlePlaceholder('Idioma')} />
      </View>

      <View style={styles.buttonSpacing}>
        <CustomButton title="Eliminar cuenta" color="#FF3B30" onPress={() => handlePlaceholder('Eliminar cuenta')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
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
  buttonSpacing: {
    width: '100%',
    marginTop: 12,
  },
  button: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDark: {
    shadowColor: '#fff',
    shadowOpacity: 0.15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingScreen;

