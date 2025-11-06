import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Modal,
  Alert 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../../Supabase/supabaseClient';

export default function BuscadorUsuarios({ 
  visible, 
  onClose, 
  onUsuarioSeleccionado 
}) {
  const { darkMode } = useTheme();
  const [busqueda, setBusqueda] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const styles = createStyles(darkMode);

  // Función para buscar usuarios con debounce
  const buscarUsuarios = useCallback(async (termino) => {
    if (termino.length < 2) {
      setUsuarios([]);
      setBusquedaRealizada(false);
      return;
    }

    setCargando(true);
    setBusquedaRealizada(true);

    try {
      // Buscar por nombre o carnet
      const { data, error } = await supabase
        .from('usuarios')
        .select('carnet, nombre, foto_perfil, correo, carrera, biografia, fecha_nacimiento')
        .or(`nombre.ilike.%${termino}%,carnet.ilike.%${termino}%`)
        .limit(20);

      if (error) {
        console.error('Error al buscar usuarios:', error);
        Alert.alert('Error', 'No se pudo realizar la búsqueda');
        return;
      }

      setUsuarios(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setCargando(false);
    }
  }, []);

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarUsuarios(busqueda);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [busqueda, buscarUsuarios]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!visible) {
      setBusqueda('');
      setUsuarios([]);
      setBusquedaRealizada(false);
    }
  }, [visible]);

  const renderUsuario = ({ item }) => (
    <TouchableOpacity 
      style={styles.usuarioItem}
      onPress={() => {
        onUsuarioSeleccionado && onUsuarioSeleccionado(item);
        onClose();
      }}
      activeOpacity={0.7}
    >
      <Image 
        source={{ 
          uri: item.foto_perfil || 'https://i.pravatar.cc/100?u=' + item.carnet 
        }} 
        style={styles.avatar}
      />
      <View style={styles.infoUsuario}>
        <Text style={styles.nombreUsuario}>{item.nombre}</Text>
        <Text style={styles.carnetUsuario}>@{item.carnet}</Text>
      </View>
      <MaterialIcons 
        name="arrow-forward-ios" 
        size={16} 
        color={darkMode ? '#888' : '#666'} 
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.botonCerrar}>
            <MaterialIcons name="arrow-back" size={24} color={darkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={styles.titulo}>Buscar Usuarios</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.barraBusqueda}>
          <MaterialIcons name="search" size={20} color={darkMode ? '#888' : '#666'} />
          <TextInput
            style={styles.inputBusqueda}
            placeholder="Buscar por nombre o carnet..."
            placeholderTextColor={darkMode ? '#888' : '#666'}
            value={busqueda}
            onChangeText={setBusqueda}
            autoFocus={true}
            returnKeyType="search"
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <MaterialIcons name="clear" size={20} color={darkMode ? '#888' : '#666'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Resultados */}
        <View style={styles.contenidoResultados}>
          {cargando ? (
            <View style={styles.centrado}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.textoCargando}>Buscando usuarios...</Text>
            </View>
          ) : busquedaRealizada && usuarios.length === 0 ? (
            <View style={styles.centrado}>
              <MaterialIcons name="search-off" size={48} color={darkMode ? '#666' : '#ccc'} />
              <Text style={styles.textoSinResultados}>
                No se encontraron usuarios
              </Text>
              <Text style={styles.textoSinResultadosSecundario}>
                Intenta con otro término de búsqueda
              </Text>
            </View>
          ) : !busquedaRealizada ? (
            <View style={styles.centrado}>
              <MaterialIcons name="people" size={48} color={darkMode ? '#666' : '#ccc'} />
              <Text style={styles.textoPlaceholder}>
                Busca usuarios por nombre o carnet
              </Text>
              <Text style={styles.textoPlaceholderSecundario}>
                Escribe al menos 2 caracteres
              </Text>
            </View>
          ) : (
            <FlatList
              data={usuarios}
              renderItem={renderUsuario}
              keyExtractor={(item) => item.carnet}
              style={styles.listaUsuarios}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separador} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (darkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkMode ? '#121212' : '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333' : '#e0e0e0',
  },
  botonCerrar: {
    padding: 8,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
  },
  barraBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: darkMode ? '#222' : '#f5f5f5',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: darkMode ? '#333' : '#e0e0e0',
  },
  inputBusqueda: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: darkMode ? '#fff' : '#000',
  },
  contenidoResultados: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  textoCargando: {
    marginTop: 16,
    fontSize: 16,
    color: darkMode ? '#fff' : '#000',
  },
  textoSinResultados: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
    textAlign: 'center',
  },
  textoSinResultadosSecundario: {
    marginTop: 8,
    fontSize: 14,
    color: darkMode ? '#888' : '#666',
    textAlign: 'center',
  },
  textoPlaceholder: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: darkMode ? '#888' : '#666',
    textAlign: 'center',
  },
  textoPlaceholderSecundario: {
    marginTop: 8,
    fontSize: 14,
    color: darkMode ? '#666' : '#999',
    textAlign: 'center',
  },
  listaUsuarios: {
    flex: 1,
  },
  usuarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  infoUsuario: {
    flex: 1,
  },
  nombreUsuario: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
  },
  carnetUsuario: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  separador: {
    height: 1,
    backgroundColor: darkMode ? '#333' : '#e0e0e0',
    marginLeft: 62,
  },
});