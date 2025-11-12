import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Modal, FlatList } from 'react-native';
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
  
  const [showDiaPicker, setShowDiaPicker] = useState(false);
  const [showMesPicker, setShowMesPicker] = useState(false);
  const [showAnioPicker, setShowAnioPicker] = useState(false);

  const meses = [
    { valor: '1', nombre: 'Enero' },
    { valor: '2', nombre: 'Febrero' },
    { valor: '3', nombre: 'Marzo' },
    { valor: '4', nombre: 'Abril' },
    { valor: '5', nombre: 'Mayo' },
    { valor: '6', nombre: 'Junio' },
    { valor: '7', nombre: 'Julio' },
    { valor: '8', nombre: 'Agosto' },
    { valor: '9', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' },
    { valor: '12', nombre: 'Diciembre' },
  ];

  // Función para obtener días máximos del mes
  const getDiasDelMes = () => {
    if (!mes) return 31; // Por defecto 31 si no hay mes seleccionado
    
    const mesNum = parseInt(mes);
    const anioNum = anio ? parseInt(anio) : new Date().getFullYear();
    
    // Meses con 30 días
    if ([4, 6, 9, 11].includes(mesNum)) {
      return 30;
    }
    
    // Febrero
    if (mesNum === 2) {
      // Año bisiesto: divisible por 4, pero no por 100, excepto si es divisible por 400
      const esBisiesto = (anioNum % 4 === 0 && anioNum % 100 !== 0) || (anioNum % 400 === 0);
      return esBisiesto ? 29 : 28;
    }
    
    // Resto de meses tienen 31 días
    return 31;
  };

  // Ajustar día cuando cambia mes o año
  useEffect(() => {
    if (dia && mes) {
      const maxDias = getDiasDelMes();
      if (parseInt(dia) > maxDias) {
        setDia(maxDias.toString());
      }
    }
  }, [mes, anio]);

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
      console.log('📅 Fecha recibida de BD:', data.fecha_nacimiento);
      
      // Parsear la fecha en formato YYYY-MM-DD directamente sin zona horaria
      // Si viene con timestamp, tomar solo la parte de la fecha
      const fechaSolo = data.fecha_nacimiento.split('T')[0];
      const partes = fechaSolo.split('-');
      
      console.log('📅 Partes de la fecha:', partes);
      
      if (partes.length === 3) {
        const anioVal = partes[0];
        const mesVal = parseInt(partes[1], 10).toString(); // Convertir "01" a "1"
        const diaVal = parseInt(partes[2], 10).toString(); // Convertir "01" a "1"
        
        console.log('📅 Valores parseados - Año:', anioVal, 'Mes:', mesVal, 'Día:', diaVal);
        
        setAnio(anioVal);
        setMes(mesVal);
        setDia(diaVal);
      }
    }
  };

  const handleGuardar = async () => {
    try {
      setLoading(true);

      console.log('🔍 Valores antes de guardar - Día:', dia, 'Mes:', mes, 'Año:', anio);

      let fechaNacimiento = null;
      if (dia && mes && anio && dia !== '' && mes !== '' && anio !== '') {
        // Crear fecha en formato YYYY-MM-DD
        const diaStr = dia.padStart(2, '0');
        const mesStr = mes.padStart(2, '0');
        fechaNacimiento = `${anio}-${mesStr}-${diaStr}`;
        console.log('📅 Fecha formateada:', fechaNacimiento);
      } else {
        console.log('⚠️ Fecha incompleta, se guardará como null');
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

          {/* Mostrar fecha seleccionada actual */}
          {(dia || mes || anio) && (
            <View style={{ 
              backgroundColor: darkMode ? '#1e293b' : '#dbeafe', 
              padding: 8, 
              borderRadius: 8, 
              marginBottom: 8 
            }}>
              <Text style={{ 
                color: darkMode ? '#93c5fd' : '#1e40af', 
                fontSize: 13, 
                textAlign: 'center' 
              }}>
                Seleccionado: {dia || '--'}/{mes || '--'}/{anio || '----'}
              </Text>
            </View>
          )}
          
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
              <TouchableOpacity
                style={[
                  styles.customPickerButton,
                  { 
                    backgroundColor: darkMode ? '#111' : '#f9fafb',
                    borderColor: darkMode ? '#374151' : '#e5e7eb',
                  }
                ]}
                onPress={() => setShowDiaPicker(true)}
              >
                <Text style={[
                  styles.customPickerText,
                  { color: dia ? (darkMode ? '#fff' : '#111') : (darkMode ? '#6b7280' : '#9ca3af') }
                ]}>
                  {dia || '--'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={darkMode ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>

            {/* Mes */}
            <View style={[styles.datePickerItem, { flex: 2 }]}>
              <Text style={[styles.datePickerLabel, { 
                color: darkMode ? '#9ca3af' : '#6b7280',
                fontSize: responsive.fontSize.xs,
                marginBottom: responsive.spacing.xs,
              }]}>
                Mes
              </Text>
              <TouchableOpacity
                style={[
                  styles.customPickerButton,
                  { 
                    backgroundColor: darkMode ? '#111' : '#f9fafb',
                    borderColor: darkMode ? '#374151' : '#e5e7eb',
                  }
                ]}
                onPress={() => setShowMesPicker(true)}
              >
                <Text style={[
                  styles.customPickerText,
                  { color: mes ? (darkMode ? '#fff' : '#111') : (darkMode ? '#6b7280' : '#9ca3af') }
                ]}>
                  {mes ? meses.find(m => m.valor === mes)?.nombre : '--'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={darkMode ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
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
              <TouchableOpacity
                style={[
                  styles.customPickerButton,
                  { 
                    backgroundColor: darkMode ? '#111' : '#f9fafb',
                    borderColor: darkMode ? '#374151' : '#e5e7eb',
                  }
                ]}
                onPress={() => setShowAnioPicker(true)}
              >
                <Text style={[
                  styles.customPickerText,
                  { color: anio ? (darkMode ? '#fff' : '#111') : (darkMode ? '#6b7280' : '#9ca3af') }
                ]}>
                  {anio || '----'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={darkMode ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
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

      {/* Modal selector de día */}
      <Modal
        visible={showDiaPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiaPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDiaPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1e1e1e' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#111' }]}>
                Seleccionar Día
              </Text>
              <TouchableOpacity onPress={() => setShowDiaPicker(false)}>
                <MaterialIcons name="close" size={24} color={darkMode ? '#fff' : '#111'} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={['', ...Array.from({ length: getDiasDelMes() }, (_, i) => (i + 1).toString())]}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    dia === item && styles.modalItemSelected,
                    dia === item && { backgroundColor: darkMode ? '#2563EB' : '#007AFF' }
                  ]}
                  onPress={() => {
                    setDia(item);
                    setShowDiaPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: darkMode ? '#fff' : '#111' },
                    dia === item && { color: '#fff', fontWeight: '700' }
                  ]}>
                    {item || 'Sin seleccionar'}
                  </Text>
                  {dia === item && (
                    <MaterialIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal selector de mes */}
      <Modal
        visible={showMesPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMesPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMesPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1e1e1e' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#111' }]}>
                Seleccionar Mes
              </Text>
              <TouchableOpacity onPress={() => setShowMesPicker(false)}>
                <MaterialIcons name="close" size={24} color={darkMode ? '#fff' : '#111'} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ valor: '', nombre: 'Sin seleccionar' }, ...meses]}
              keyExtractor={(item) => item.valor}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    mes === item.valor && styles.modalItemSelected,
                    mes === item.valor && { backgroundColor: darkMode ? '#2563EB' : '#007AFF' }
                  ]}
                  onPress={() => {
                    setMes(item.valor);
                    setShowMesPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: darkMode ? '#fff' : '#111' },
                    mes === item.valor && { color: '#fff', fontWeight: '700' }
                  ]}>
                    {item.nombre}
                  </Text>
                  {mes === item.valor && (
                    <MaterialIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal selector de año */}
      <Modal
        visible={showAnioPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAnioPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAnioPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1e1e1e' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#111' }]}>
                Seleccionar Año
              </Text>
              <TouchableOpacity onPress={() => setShowAnioPicker(false)}>
                <MaterialIcons name="close" size={24} color={darkMode ? '#fff' : '#111'} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={['', ...Array.from({ length: 75 }, (_, i) => (new Date().getFullYear() - i).toString())]}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    anio === item && styles.modalItemSelected,
                    anio === item && { backgroundColor: darkMode ? '#2563EB' : '#007AFF' }
                  ]}
                  onPress={() => {
                    setAnio(item);
                    setShowAnioPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    { color: darkMode ? '#fff' : '#111' },
                    anio === item && { color: '#fff', fontWeight: '700' }
                  ]}>
                    {item || 'Sin seleccionar'}
                  </Text>
                  {anio === item && (
                    <MaterialIcons name="check" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
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
  customPickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  customPickerText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 16,
    padding: 0,
    maxHeight: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemSelected: {
    borderBottomColor: 'transparent',
  },
  modalItemText: {
    fontSize: 16,
  },
});
