import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../Supabase/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { Picker } from '@react-native-picker/picker';

export default function EditarPerfil({ navigation, route }) {
  const { darkMode } = useTheme();
  const responsive = useResponsive();
  const { usuario: usuarioInicial } = route.params || {};
  
  const [usuario, setUsuario] = useState(usuarioInicial || null);
  const [loading, setLoading] = useState(!usuarioInicial);
  
  // Campos editables
  const [biografia, setBiografia] = useState('');
  const [gustos, setGustos] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');

  useEffect(() => {
    if (!usuarioInicial) {
      fetchUsuario();
    } else {
      cargarDatos(usuarioInicial);
    }
  }, []);

  const fetchUsuario = async () => {
    setLoading(true);
    const carnet = await AsyncStorage.getItem('carnet');
    if (!carnet) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('carnet', carnet)
      .single();
    if (!error && data) {
      setUsuario(data);
      cargarDatos(data);
    }
    setLoading(false);
  };

  const cargarDatos = (data) => {
    setBiografia(data.biografia || '');
    setGustos(data.gustos || '');
    if (data.fecha_nacimiento) {
      const fecha = new Date(data.fecha_nacimiento);
      setDia(fecha.getDate().toString());
      setMes((fecha.getMonth() + 1).toString());
      setAnio(fecha.getFullYear().toString());
    }
  };

  const handleGuardar = async () => {
    try {
      setLoading(true);

      let fechaNacimiento = null;
      if (dia && mes && anio) {
        // Crear fecha en formato YYYY-MM-DD
        const diaStr = dia.padStart(2, '0');
        const mesStr = mes.padStart(2, '0');
        fechaNacimiento = `${anio}-${mesStr}-${diaStr}`;
      }

      const updates = {
        biografia: biografia.trim(),
        gustos: gustos.trim(),
        fecha_nacimiento: fechaNacimiento,
      };

      console.log('📝 Guardando perfil:', updates);

      const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('carnet', usuario.carnet)
        .select();

      console.log('💾 Respuesta de guardado:', { data, error });

      if (error) throw error;

      Alert.alert('✅ Guardado', 'Tu perfil se actualizó correctamente');
      navigation.goBack();
    } catch (err) {
      console.error('❌ Error al guardar perfil:', err);
      Alert.alert('Error', err.message || 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: darkMode ? '#121212' : '#f5f7fb' }]}
      contentContainerStyle={{ padding: responsive.spacing.lg, maxWidth: responsive.maxWidth.md, alignSelf: 'center', width: '100%' }}
    >
      <View style={[styles.card, { 
        backgroundColor: darkMode ? '#1e1e1e' : '#fff',
        padding: responsive.spacing.lg,
        borderRadius: responsive.getValue(12, 16, 20),
      }]}>
        <Text style={[styles.title, { 
          color: darkMode ? '#fff' : '#0f172a',
          fontSize: responsive.fontSize.xl,
          marginBottom: responsive.spacing.lg,
        }]}>
          Editar Perfil
        </Text>

        {/* Biografía */}
        <View style={[styles.field, { marginBottom: responsive.spacing.lg }]}>
          <View style={[styles.labelRow, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="person" size={responsive.getValue(18, 20, 22)} color="#007AFF" />
            <Text style={[styles.label, { 
              color: darkMode ? '#e5e7eb' : '#334155',
              fontSize: responsive.fontSize.md,
            }]}>
              Biografía
            </Text>
          </View>
          <TextInput
            style={[
              styles.textArea,
              { 
                backgroundColor: darkMode ? '#111' : '#f9fafb',
                color: darkMode ? '#fff' : '#111',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                fontSize: responsive.fontSize.md,
                padding: responsive.spacing.md,
                minHeight: responsive.getValue(80, 100, 120),
              }
            ]}
            placeholder="Cuéntanos sobre ti..."
            placeholderTextColor={darkMode ? '#6b7280' : '#9ca3af'}
            value={biografia}
            onChangeText={setBiografia}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.charCount, { 
            color: darkMode ? '#6b7280' : '#9ca3af',
            fontSize: responsive.fontSize.xs,
          }]}>
            {biografia.length}/500
          </Text>
        </View>

        {/* Gustos/Intereses */}
        <View style={[styles.field, { marginBottom: responsive.spacing.lg }]}>
          <View style={[styles.labelRow, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="favorite" size={responsive.getValue(18, 20, 22)} color="#007AFF" />
            <Text style={[styles.label, { 
              color: darkMode ? '#e5e7eb' : '#334155',
              fontSize: responsive.fontSize.md,
            }]}>
              Gustos e Intereses
            </Text>
          </View>
          <TextInput
            style={[
              styles.textArea,
              { 
                backgroundColor: darkMode ? '#111' : '#f9fafb',
                color: darkMode ? '#fff' : '#111',
                borderColor: darkMode ? '#374151' : '#e5e7eb',
                fontSize: responsive.fontSize.md,
                padding: responsive.spacing.md,
                minHeight: responsive.getValue(70, 85, 100),
              }
            ]}
            placeholder="Ej: Música, deportes, lectura, videojuegos..."
            placeholderTextColor={darkMode ? '#6b7280' : '#9ca3af'}
            value={gustos}
            onChangeText={setGustos}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
          <Text style={[styles.charCount, { 
            color: darkMode ? '#6b7280' : '#9ca3af',
            fontSize: responsive.fontSize.xs,
          }]}>
            {gustos.length}/300
          </Text>
        </View>

        {/* Fecha de Cumpleaños */}
        <View style={[styles.field, { marginBottom: responsive.spacing.lg }]}>
          <View style={[styles.labelRow, { marginBottom: responsive.spacing.sm }]}>
            <MaterialIcons name="cake" size={responsive.getValue(18, 20, 22)} color="#007AFF" />
            <Text style={[styles.label, { 
              color: darkMode ? '#e5e7eb' : '#334155',
              fontSize: responsive.fontSize.md,
            }]}>
              Fecha de Cumpleaños
            </Text>
          </View>
          
          <View style={[styles.datePickerRow, { gap: responsive.spacing.sm }]}>
            {/* Día */}
            <View style={[styles.datePickerItem, { flex: 1 }]}>
              <Text style={[styles.datePickerLabel, { 
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontSize: responsive.fontSize.xs,
                marginBottom: responsive.spacing.xs,
              }]}>
                Día
              </Text>
              <View style={[
                styles.pickerContainer,
                { 
                  backgroundColor: darkMode ? '#111' : '#f9fafb',
                  borderColor: darkMode ? '#374151' : '#e5e7eb'
                }
              ]}>
                <Picker
                  selectedValue={dia}
                  onValueChange={setDia}
                  style={[styles.picker, { color: darkMode ? '#fff' : '#111' }]}
                  dropdownIconColor={darkMode ? '#fff' : '#111'}
                >
                  <Picker.Item label="--" value="" />
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <Picker.Item key={d} label={d.toString()} value={d.toString()} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Mes */}
            <View style={[styles.datePickerItem, { flex: 2 }]}>
              <Text style={[styles.datePickerLabel, { color: darkMode ? '#9ca3af' : '#6b7280' }]}>
                Mes
              </Text>
              <View style={[
                styles.pickerContainer,
                { 
                  backgroundColor: darkMode ? '#111' : '#f9fafb',
                  borderColor: darkMode ? '#374151' : '#e5e7eb'
                }
              ]}>
                <Picker
                  selectedValue={mes}
                  onValueChange={setMes}
                  style={[styles.picker, { color: darkMode ? '#fff' : '#111' }]}
                  dropdownIconColor={darkMode ? '#fff' : '#111'}
                >
                  <Picker.Item label="--" value="" />
                  <Picker.Item label="Enero" value="1" />
                  <Picker.Item label="Febrero" value="2" />
                  <Picker.Item label="Marzo" value="3" />
                  <Picker.Item label="Abril" value="4" />
                  <Picker.Item label="Mayo" value="5" />
                  <Picker.Item label="Junio" value="6" />
                  <Picker.Item label="Julio" value="7" />
                  <Picker.Item label="Agosto" value="8" />
                  <Picker.Item label="Septiembre" value="9" />
                  <Picker.Item label="Octubre" value="10" />
                  <Picker.Item label="Noviembre" value="11" />
                  <Picker.Item label="Diciembre" value="12" />
                </Picker>
              </View>
            </View>

            {/* Año */}
            <View style={[styles.datePickerItem, { flex: 1.5 }]}>
              <Text style={[styles.datePickerLabel, { 
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontSize: responsive.fontSize.xs,
                marginBottom: responsive.spacing.xs,
              }]}>
                Año
              </Text>
              <View style={[
                styles.pickerContainer,
                { 
                  backgroundColor: darkMode ? '#111' : '#f9fafb',
                  borderColor: darkMode ? '#374151' : '#e5e7eb'
                }
              ]}>
                <Picker
                  selectedValue={anio}
                  onValueChange={setAnio}
                  style={[styles.picker, { color: darkMode ? '#fff' : '#111' }]}
                  dropdownIconColor={darkMode ? '#fff' : '#111'}
                >
                  <Picker.Item label="----" value="" />
                  {Array.from({ length: 75 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <Picker.Item key={y} label={y.toString()} value={y.toString()} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Botones */}
        <View style={[styles.buttonRow, { gap: responsive.spacing.md }]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { 
              borderColor: darkMode ? '#374151' : '#e5e7eb',
              paddingVertical: responsive.spacing.md,
            }]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { 
              color: darkMode ? '#e5e7eb' : '#111',
              fontSize: responsive.fontSize.md,
            }]}>
              Cancelar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, {
              paddingVertical: responsive.spacing.md,
            }]}
            onPress={handleGuardar}
            disabled={loading}
          >
            <Text style={[styles.saveButtonText, { fontSize: responsive.fontSize.md }]}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.helperText, { 
        color: darkMode ? '#6b7280' : '#9ca3af',
        fontSize: responsive.fontSize.sm,
        marginTop: responsive.spacing.md,
      }]}>
        💡 Tu información es privada y solo tú puedes editarla
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  dateText: {
    fontSize: 15,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerItem: {
    minWidth: 0,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
