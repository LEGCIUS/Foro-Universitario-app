import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const CustomAlert = ({ visible, type = 'info', title, message, onClose, onConfirm, confirmText = 'Aceptar', cancelText = 'Cancelar', showCancel = false }) => {
  const { darkMode } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'check-circle', color: '#10B981', bg: '#D1FAE5' };
      case 'error':
        return { name: 'error', color: '#EF4444', bg: '#FEE2E2' };
      case 'warning':
        return { name: 'warning', color: '#F59E0B', bg: '#FEF3C7' };
      case 'info':
      default:
        return { name: 'info', color: '#3B82F6', bg: '#DBEAFE' };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            style={[
              styles.alertContainer,
              { backgroundColor: darkMode ? '#1e1e1e' : '#fff' },
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: darkMode ? iconConfig.color + '20' : iconConfig.bg }]}>
              <MaterialIcons name={iconConfig.name} size={48} color={iconConfig.color} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: darkMode ? '#fff' : '#0f172a' }]}>
              {title}
            </Text>

            {/* Message */}
            {message && (
              <Text style={[styles.message, { color: darkMode ? '#9AA0A6' : '#64748b' }]}>
                {message}
              </Text>
            )}

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {showCancel && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { backgroundColor: darkMode ? '#2a2a2a' : '#f1f5f9' }]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, { color: darkMode ? '#e5e7eb' : '#475569' }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: iconConfig.color },
                  !showCancel && { flex: 1 }
                ]}
                onPress={onConfirm || onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 0,
  },
  confirmButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default CustomAlert;
