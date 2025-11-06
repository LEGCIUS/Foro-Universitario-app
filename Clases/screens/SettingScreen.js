import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../Supabase/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const SettingScreen = ({ onLogout, navigation }) => {
  const { darkMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadRole = async () => {
      try {
        const carnetRaw = await AsyncStorage.getItem('carnet');
        const carnet = carnetRaw && String(carnetRaw).trim();
        if (!carnet) return;
        const { data, error } = await supabase
          .from('usuarios')
          .select('rol, is_admin')
          .eq('carnet', carnet)
          .single();
        if (!mounted) return;
        const isTrue = (v) => v === true || v === 'true' || v === 1 || v === '1';
        const isAdminRole = (v) => {
          if (typeof v !== 'string') return false;
          const val = v.toLowerCase().trim();
          return val === 'admin' || val === 'administrador';
        };
  const admin = isAdminRole(data?.rol) || isTrue(data?.is_admin);
        setIsAdmin(Boolean(admin));
      } catch (_) {
        // silencioso
      }
    };
    loadRole();
    return () => { mounted = false; };
  }, []);

  // Re-evaluar el rol cuando la pantalla obtiene foco (por si el rol cambió sin remount)
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const reload = async () => {
        try {
          const carnetRaw = await AsyncStorage.getItem('carnet');
          const carnet = carnetRaw && String(carnetRaw).trim();
          if (!carnet) return;
          const { data, error } = await supabase
            .from('usuarios')
            .select('rol, is_admin')
            .eq('carnet', carnet)
            .single();
          if (!mounted) return;
          const isTrue = (v) => v === true || v === 'true' || v === 1 || v === '1';
          const isAdminRole = (v) => {
            if (typeof v !== 'string') return false;
            const val = v.toLowerCase().trim();
            return val === 'admin' || val === 'administrador';
          };
          const admin = isAdminRole(data?.rol) || isTrue(data?.is_admin);
          setIsAdmin(Boolean(admin));
        } catch (_) {}
      };
      reload();
      return () => { mounted = false; };
    }, [])
  );

  const handleLogout = async () => {
    await onLogout();
  };

  const handlePlaceholder = (title) => {
    Alert.alert(title, 'Funcionalidad no implementada aún.');
  };
  // Item de lista con icono, título, y chevron
  const ListItem = ({ title, subtitle, icon, iconBg, iconColor, onPress, destructive }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.itemCard, { backgroundColor: darkMode ? '#1e1e1e' : '#fff', borderColor: darkMode ? '#2b2b2b' : '#ececec' }]}>
      <View style={[styles.itemIconWrap, { backgroundColor: iconBg || (darkMode ? '#2a2a2a' : '#eef2ff') }]}> 
        <MaterialIcons name={icon} size={22} color={iconColor || (darkMode ? '#9ab' : '#2563EB')} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, { color: destructive ? '#EF4444' : (darkMode ? '#fff' : '#0f172a') }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.itemSubtitle, { color: darkMode ? '#aaa' : '#667085' }]} numberOfLines={2}>{subtitle}</Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={darkMode ? '#aaa' : '#9AA0A6'} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#121212' : '#f5f7fb', paddingTop: Math.max(12, insets.top + 8) }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: darkMode ? '#fff' : '#0b2545' }]}>Configuraciones</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {isAdmin ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: darkMode ? '#e5e7eb' : '#475569' }]}>Administración</Text>
            <ListItem
              title="Modo administrador"
              subtitle="Gestiona reportes y moderación"
              icon="admin-panel-settings"
              iconBg={darkMode ? '#243244' : '#e6f0ff'}
              iconColor={darkMode ? '#7fb0ff' : '#2563EB'}
              onPress={() => navigation.navigate('AdminPanel')}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: darkMode ? '#e5e7eb' : '#475569' }]}>Preferencias</Text>
          <ListItem
            title={darkMode ? 'Tema: Oscuro' : 'Tema: Claro'}
            subtitle="Toca para cambiar el tema de la aplicación"
            icon={darkMode ? 'dark-mode' : 'light-mode'}
            iconBg={darkMode ? '#2b2b2b' : '#fff7e6'}
            iconColor={darkMode ? '#fbbf24' : '#f59e0b'}
            onPress={toggleTheme}
          />
          <ListItem
            title="Notificaciones"
            subtitle="Preferencias de alertas y avisos"
            icon="notifications-none"
            onPress={() => handlePlaceholder('Notificaciones')}
          />
          <ListItem
            title="Idioma"
            subtitle="Selecciona tu idioma preferido"
            icon="language"
            onPress={() => handlePlaceholder('Idioma')}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: darkMode ? '#e5e7eb' : '#475569' }]}>Ayuda y Legal</Text>
          <ListItem
            title="Ayuda"
            subtitle="Preguntas frecuentes y soporte"
            icon="help-outline"
            onPress={() => handlePlaceholder('Ayuda')}
          />
          <ListItem
            title="Términos y condiciones"
            icon="description"
            onPress={() => handlePlaceholder('Términos y condiciones')}
          />
          <ListItem
            title="Política de privacidad"
            icon="privacy-tip"
            onPress={() => handlePlaceholder('Política de privacidad')}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: darkMode ? '#e5e7eb' : '#475569' }]}>Cuenta</Text>
          <ListItem
            title="Cerrar sesión"
            icon="logout"
            iconBg={darkMode ? '#3b1f1f' : '#ffecec'}
            iconColor="#EF4444"
            onPress={handleLogout}
            destructive
          />
          <ListItem
            title="Eliminar cuenta"
            icon="delete-forever"
            iconBg={darkMode ? '#3b1f1f' : '#ffecec'}
            iconColor="#EF4444"
            onPress={() => handlePlaceholder('Eliminar cuenta')}
            destructive
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  headerRow: { paddingBottom: 6 },
  title: { fontSize: 22, fontWeight: '800' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  itemCard: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  itemSubtitle: { fontSize: 12 },
});

export default SettingScreen;

