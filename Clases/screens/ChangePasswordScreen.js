import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import CustomAlert from '../components/CustomAlert';
import { changePassword } from '../../src/services/auth';

const ChangePasswordScreen = ({ navigation }) => {
  const { darkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Estados para alertas personalizadas
  const [alert, setAlert] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
  });

  const handleChangePassword = async () => {
    try {
      // Validaciones
      if (!currentPassword || !newPassword || !confirmPassword) {
        setAlert({
          visible: true,
          type: 'warning',
          title: 'Campos incompletos',
          message: 'Por favor completa todos los campos.',
          onConfirm: () => setAlert({ ...alert, visible: false }),
        });
        return;
      }

      if (newPassword.length < 6) {
        setAlert({
          visible: true,
          type: 'warning',
          title: 'Contraseña muy corta',
          message: 'La nueva contraseña debe tener al menos 6 caracteres.',
          onConfirm: () => setAlert({ ...alert, visible: false }),
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        setAlert({
          visible: true,
          type: 'error',
          title: 'Las contraseñas no coinciden',
          message: 'La nueva contraseña y la confirmación deben ser iguales.',
          onConfirm: () => setAlert({ ...alert, visible: false }),
        });
        return;
      }

      if (currentPassword === newPassword) {
        setAlert({
          visible: true,
          type: 'warning',
          title: 'Contraseña repetida',
          message: 'La nueva contraseña debe ser diferente a la actual.',
          onConfirm: () => setAlert({ ...alert, visible: false }),
        });
        return;
      }

      setLoading(true);

      await changePassword({
        currentPassword,
        newPassword,
      });

      setLoading(false);
      setAlert({
        visible: true,
        type: 'success',
        title: '¡Contraseña actualizada!',
        message: 'Tu contraseña ha sido cambiada exitosamente.',
        onConfirm: () => {
          setAlert({ ...alert, visible: false });
          navigation.goBack();
        },
      });
    } catch (error) {
      setLoading(false);
      setAlert({
        visible: true,
        type: 'error',
        title: 'Error al cambiar contraseña',
        message: error.message || 'No se pudo cambiar la contraseña. Intenta nuevamente.',
        onConfirm: () => setAlert({ ...alert, visible: false }),
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#121212' : '#f5f7fb' }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={darkMode ? '#121212' : '#f5f7fb'} />
      
      {/* Header */}
      <View style={{ paddingTop: Math.max(10, insets.top + 4), backgroundColor: darkMode ? '#121212' : '#f5f7fb' }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={darkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>Cambiar contraseña</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formCard, darkMode && styles.formCardDark]}>
            <Text style={[styles.infoText, darkMode && styles.infoTextDark]}>
              Ingresa tu contraseña actual y luego la nueva contraseña que deseas usar.
            </Text>

            {/* Contraseña actual */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, darkMode && styles.labelDark]}>Contraseña actual</Text>
              <View style={[styles.inputContainer, darkMode && styles.inputContainerDark]}>
                <MaterialIcons name="lock-outline" size={20} color={darkMode ? '#9AA0A6' : '#667085'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  placeholder="Ingresa tu contraseña actual"
                  placeholderTextColor={darkMode ? '#666' : '#9AA0A6'}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeButton}>
                  <MaterialIcons name={showCurrent ? 'visibility' : 'visibility-off'} size={20} color={darkMode ? '#9AA0A6' : '#667085'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nueva contraseña */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, darkMode && styles.labelDark]}>Nueva contraseña</Text>
              <View style={[styles.inputContainer, darkMode && styles.inputContainerDark]}>
                <MaterialIcons name="lock" size={20} color={darkMode ? '#9AA0A6' : '#667085'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={darkMode ? '#666' : '#9AA0A6'}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeButton}>
                  <MaterialIcons name={showNew ? 'visibility' : 'visibility-off'} size={20} color={darkMode ? '#9AA0A6' : '#667085'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmar nueva contraseña */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, darkMode && styles.labelDark]}>Confirmar nueva contraseña</Text>
              <View style={[styles.inputContainer, darkMode && styles.inputContainerDark]}>
                <MaterialIcons name="lock" size={20} color={darkMode ? '#9AA0A6' : '#667085'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, darkMode && styles.inputDark]}
                  placeholder="Repite la nueva contraseña"
                  placeholderTextColor={darkMode ? '#666' : '#9AA0A6'}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeButton}>
                  <MaterialIcons name={showConfirm ? 'visibility' : 'visibility-off'} size={20} color={darkMode ? '#9AA0A6' : '#667085'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón de guardar */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleChangePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Cambiar contraseña</Text>
              )}
            </TouchableOpacity>

            {/* Info de seguridad */}
            <View style={[styles.securityBox, darkMode && styles.securityBoxDark]}>
              <MaterialIcons name="info-outline" size={18} color={darkMode ? '#9ab' : '#2563EB'} />
              <Text style={[styles.securityText, darkMode && styles.securityTextDark]}>
                Tu contraseña será encriptada y almacenada de forma segura.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Alert */}
      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
        onConfirm={alert.onConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b2545',
    flex: 1,
    textAlign: 'center',
  },
  headerTitleDark: {
    color: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formCardDark: {
    backgroundColor: '#252525',
    shadowOpacity: 0.4,
  },
  infoText: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 24,
    lineHeight: 20,
  },
  infoTextDark: {
    color: '#9AA0A6',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 8,
  },
  labelDark: {
    color: '#e5e7eb',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputContainerDark: {
    backgroundColor: '#1e1e1e',
    borderColor: '#2b2b2b',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#0f172a',
  },
  inputDark: {
    color: '#fff',
  },
  eyeButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  securityBoxDark: {
    backgroundColor: '#1e293b',
  },
  securityText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  securityTextDark: {
    color: '#cbd5e1',
  },
});

export default ChangePasswordScreen;
