import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, FlatList, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ETIQUETAS_PREDEFINIDAS = [
  '#naturaleza', '#ciencia', '#tecnologia', '#arte', '#musica', 
  '#deporte', '#comida', '#viajes', '#libros', '#cine',
  '#universidad', '#estudios', '#investigacion', '#proyecto',
  '#cultura', '#historia', '#matematicas', '#fisica', '#quimica',
  '#informatica', '#medicina', '#psicologia', '#filosofia',
  '#economia', '#politica', '#social', '#eventos', '#noticias'
];

export default function Etiquetas({ 
  etiquetasSeleccionadas = [], 
  onEtiquetasChange, 
  mostrarSoloSeleccionadas = false,
  estiloPersonalizado = null,
  maxEtiquetas = 5 
}) {
  const { darkMode } = useTheme();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [etiquetasPersonalizadas, setEtiquetasPersonalizadas] = useState([]);

  // Combinar etiquetas predefinidas con personalizadas
  const todasLasEtiquetas = [...ETIQUETAS_PREDEFINIDAS, ...etiquetasPersonalizadas];

  const styles = createStyles(darkMode);

  // Función para agregar/remover etiquetas
  const toggleEtiqueta = (etiqueta) => {
    let nuevasEtiquetas;
    
    if (etiquetasSeleccionadas.includes(etiqueta)) {
      // Remover etiqueta
      nuevasEtiquetas = etiquetasSeleccionadas.filter(e => e !== etiqueta);
    } else {
      // Agregar etiqueta (con límite)
      if (etiquetasSeleccionadas.length >= maxEtiquetas) {
        Alert.alert('Límite alcanzado', `Solo puedes seleccionar hasta ${maxEtiquetas} etiquetas`);
        return;
      }
      nuevasEtiquetas = [...etiquetasSeleccionadas, etiqueta];
    }
    
    onEtiquetasChange && onEtiquetasChange(nuevasEtiquetas);
  };

  // Función para crear nueva etiqueta personalizada
  const crearNuevaEtiqueta = () => {
    if (!nuevaEtiqueta.trim()) return;
    
    let etiquetaFormateada = nuevaEtiqueta.trim();
    
    // Asegurar que comience con #
    if (!etiquetaFormateada.startsWith('#')) {
      etiquetaFormateada = '#' + etiquetaFormateada;
    }
    
    // Verificar que no exista ya
    if (todasLasEtiquetas.includes(etiquetaFormateada.toLowerCase())) {
      Alert.alert('Error', 'Esta etiqueta ya existe');
      return;
    }
    
    // Agregar a etiquetas personalizadas
    const nuevasPersonalizadas = [...etiquetasPersonalizadas, etiquetaFormateada.toLowerCase()];
    setEtiquetasPersonalizadas(nuevasPersonalizadas);
    
    // Seleccionar automáticamente la nueva etiqueta
    toggleEtiqueta(etiquetaFormateada.toLowerCase());
    
    setNuevaEtiqueta('');
    setMostrarModal(false);
  };

  // Renderizar una etiqueta individual
  const renderEtiqueta = ({ item }) => {
    const estaSeleccionada = etiquetasSeleccionadas.includes(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.etiqueta,
          estaSeleccionada && styles.etiquetaSeleccionada,
          estiloPersonalizado && estiloPersonalizado.etiqueta
        ]}
        onPress={() => toggleEtiqueta(item)}
      >
        <Text style={[
          styles.textoEtiqueta,
          estaSeleccionada && styles.textoEtiquetaSeleccionada,
          estiloPersonalizado && estiloPersonalizado.texto
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  // Si mostrarSoloSeleccionadas es true, solo mostrar las etiquetas seleccionadas
  const etiquetasAMostrar = mostrarSoloSeleccionadas 
    ? etiquetasSeleccionadas 
    : todasLasEtiquetas;

  if (mostrarSoloSeleccionadas && etiquetasSeleccionadas.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, estiloPersonalizado && estiloPersonalizado.container]}>
      {!mostrarSoloSeleccionadas && (
        <View style={styles.header}>
          <Text style={styles.titulo}>Etiquetas ({etiquetasSeleccionadas.length}/{maxEtiquetas})</Text>
          <TouchableOpacity 
            style={styles.botonAgregar}
            onPress={() => setMostrarModal(true)}
          >
            <MaterialIcons name="add" size={20} color={darkMode ? '#fff' : '#007AFF'} />
            <Text style={styles.textoAgregar}>Nueva</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {mostrarSoloSeleccionadas ? (
        // Para mostrar etiquetas en horizontal (en publicaciones)
        <FlatList
          data={etiquetasAMostrar.map(etiqueta => etiqueta)}
          renderItem={renderEtiqueta}
          keyExtractor={(item) => item}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.lista}
          contentContainerStyle={styles.listaContainer}
        />
      ) : (
        // Para mostrar etiquetas en grid vertical (en selector)
        <View style={[styles.lista, styles.etiquetasGrid]}>
          {etiquetasAMostrar.map((etiqueta) => (
            <View key={etiqueta}>
              {renderEtiqueta({ item: etiqueta })}
            </View>
          ))}
        </View>
      )}

      {/* Modal para crear nueva etiqueta */}
      <Modal
        visible={mostrarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMostrarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Nueva Etiqueta</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Escribe tu etiqueta..."
              placeholderTextColor={darkMode ? '#888' : '#666'}
              value={nuevaEtiqueta}
              onChangeText={setNuevaEtiqueta}
              autoFocus={true}
              maxLength={30}
            />
            
            <View style={styles.modalBotones}>
              <TouchableOpacity 
                style={[styles.botonModal, styles.botonCancelar]}
                onPress={() => {
                  setMostrarModal(false);
                  setNuevaEtiqueta('');
                }}
              >
                <Text style={styles.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.botonModal, styles.botonCrear]}
                onPress={crearNuevaEtiqueta}
                disabled={!nuevaEtiqueta.trim()}
              >
                <Text style={styles.textoBotonCrear}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Función para crear estilos dinámicos
const createStyles = (darkMode) => StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
  },
  botonAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkMode ? '#333' : '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
  },
  textoAgregar: {
    color: darkMode ? '#fff' : '#007AFF',
    marginLeft: 4,
    fontSize: 12,
  },
  lista: {
    flexGrow: 0,
  },
  listaContainer: {
    paddingBottom: 10,
  },
  etiquetasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  etiqueta: {
    backgroundColor: 'transparent', // Sin fondo
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0, // Sin borde
  },
  etiquetaSeleccionada: {
    backgroundColor: darkMode ? '#007AFF' : '#007AFF',
    // Sin borderColor para evitar borde azul
  },
  textoEtiqueta: {
    fontSize: 12,
    color: darkMode ? '#007AFF' : '#0f172a',
  },
  textoEtiquetaSeleccionada: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: darkMode ? '#222' : '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkMode ? '#fff' : '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: darkMode ? '#555' : '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: darkMode ? '#fff' : '#000',
    backgroundColor: darkMode ? '#333' : '#f9f9f9',
    marginBottom: 20,
  },
  modalBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  botonCancelar: {
    backgroundColor: darkMode ? '#555' : '#f0f0f0',
  },
  botonCrear: {
    backgroundColor: '#007AFF',
  },
  textoBotonCancelar: {
    color: darkMode ? '#fff' : '#666',
    fontWeight: 'bold',
  },
  textoBotonCrear: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

// Exportar también las etiquetas predefinidas para uso en otros componentes
export { ETIQUETAS_PREDEFINIDAS };