import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Modal, ScrollView, Animated } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { supabase } from "../../Supabase/supabaseClient";
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../hooks/useResponsive';

export default function LoginScreen({ onLogin }) {
  const navigation = useNavigation();
  const responsive = useResponsive();
  const [form, setForm] = useState({ carnet: "", contrasena: "" });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  // Registro
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [regForm, setRegForm] = useState({
    carnet: '',
    nombre: '',
    apellido: '',
    correo: '',
    carrera: '',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const [showCarreraModal, setShowCarreraModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  const carreras = [
    "Administración Aduanera y Comercio Exterior",
    "Bibliotecología Énfasis Bibliotecas Educativas",
    "Ciencias de la Educación Primaria con Concentración en Inglés",
    "Ciencias de la Educación Primaria con Énfasis en Educación Primaria",
    "Diseño Gráfico",
    "Economía Agrícola y Agronegocios",
    "Educación Matemática",
    "Enseñanza de las Ciencias Naturales",
    "Informática Empresarial",
    "Inglés",
    "Turismo Ecológico",
  ];

  useEffect(() => {
    if (showCarreraModal) {
      // Reset position before animating in
      slideAnim.setValue(600);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showCarreraModal]);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegChange = (name, value) => {
    setRegForm((prev) => ({ ...prev, [name]: value }));
  };

  // Actualiza la contraseña solo si el usuario ya existe.
  // Evita violar NOT NULL en columnas como nombre, apellido, correo.
  const ensureUsuarioRow = async (carnet, contrasenaPlano) => {
    try {
      if (!carnet) return;
      const trimmed = carnet.trim();
      const { data: existing, error: selectError } = await supabase
        .from('usuarios')
        .select('carnet')
        .eq('carnet', trimmed)
        .single();

      if (selectError || !existing) {
        // No intentamos crear porque faltarían campos NOT NULL.
        return;
      }

      if (contrasenaPlano) {
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ contrasena: String(contrasenaPlano).trim() })
          .eq('carnet', trimmed);
        if (updateError) {
          console.error('Error actualizando contraseña usuario:', updateError);
        }
      }
    } catch (e) {
      console.error('Excepción al actualizar usuario existente:', e);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!form.carnet || !form.contrasena) {
        throw new Error('Carnet y contraseña son obligatorios');
      }

      // Llamar a Edge Function para login con bcrypt
      const { data, error: loginError } = await supabase.functions.invoke('login-user', {
        body: {
          carnet: form.carnet,
          contrasena: form.contrasena,
        }
      });

      if (loginError) {
        // Fallback: Intentar login directo desde base de datos sin mostrar errores técnicos al usuario
        const { data: usuario, error: dbError } = await supabase
          .from('usuarios')
          .select('carnet, contrasena')
          .eq('carnet', form.carnet)
          .single();

        if (dbError || !usuario) {
          throw new Error('Carnet o contraseña incorrectos');
        }

        // Verificar contraseña (directo si es texto plano, o hash si es SHA-256)
        const esHash = usuario.contrasena?.length === 64 && /^[a-f0-9]+$/i.test(usuario.contrasena);
        
        if (esHash) {
          // Hash SHA-256 usando expo-crypto para evitar dependencia de crypto.subtle
          const hashHex = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            form.contrasena
          );
          if (hashHex !== usuario.contrasena) {
            throw new Error('Carnet o contraseña incorrectos');
          }
        } else {
          // Texto plano (usuarios antiguos)
          if (form.contrasena !== usuario.contrasena) {
            throw new Error('Carnet o contraseña incorrectos');
          }
        }

        await AsyncStorage.setItem('carnet', form.carnet);
        await ensureUsuarioRow(form.carnet, form.contrasena);
        onLogin();
        return;
      }

      if (!data?.success) {
        throw new Error('Carnet o contraseña incorrectos');
      }

  await AsyncStorage.setItem('carnet', form.carnet);
  // Intentar crear la fila en usuarios si no existe (no sobrescribe si existe)
  await ensureUsuarioRow(form.carnet, form.contrasena);
      onLogin();
    } catch (err) {
      // Mapear errores a un mensaje amigable, preservando validaciones requeridas
      const rawMsg = err?.message || '';
      const isRequired = /obligatori/i.test(rawMsg);
      const isAuthRelated = /contraseñ|usuario|carnet|credencial/i.test(rawMsg);
      setError(isRequired
        ? rawMsg
        : (isAuthRelated ? 'Carnet o contraseña incorrectos' : 'Ocurrió un error al iniciar sesión.')
      );
    } finally {
      setLoading(false);
    }
  };

    const validarEmail = (email) => {
      const re = /\S+@\S+\.\S+/;
      return re.test(String(email).toLowerCase());
    };

    const handleRegister = async () => {
      try {
        setRegError(null);
        setRegSuccess(false);
        setRegLoading(true);

        const { carnet, nombre, apellido, correo, carrera } = regForm;

        // Validaciones: carnet, nombre, apellido, correo y carrera obligatorios
        if (!carnet || !correo || !nombre || !apellido || !carrera) {
          throw new Error('Carnet, nombre, apellido, correo y carrera son obligatorios');
        }
        if (!validarEmail(correo)) {
          throw new Error('Correo no válido');
        }

        // Llamar a Edge Function para registro
        const { data, error: registerError } = await supabase.functions.invoke('user-signup', {
          body: {
            carnet: carnet.trim(),
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            correo: correo.trim().toLowerCase(),
            carrera: carrera?.trim() || null,
          }
        });

        if (registerError || !data?.success) {
          // Construir mensaje amigable: carnet duplicado / correo en uso
          let serverMsg = null;
          let serverCode = null;
          try {
            if (registerError?.context?.body) {
              const raw = registerError.context.body;
              try {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                serverMsg = parsed?.message || parsed?.error || null;
                serverCode = parsed?.code || parsed?.error_code || null;
              } catch (_) {
                serverMsg = String(raw);
              }
            } else if (data && !data.success) {
              serverMsg = data?.message || data?.error || null;
              serverCode = data?.code || data?.error_code || null;
            }
          } catch (_) {}

          // Mapear códigos/mensajes comunes
          let userMsg = null;
          const lower = (serverMsg || '').toLowerCase();
          let serverCarnetDup = false;
          let serverEmailDup = false;
          if (serverCode === 'DUPLICATE_CARNET' || (lower.includes('carnet') && (lower.includes('existe') || lower.includes('duplic') || lower.includes('registrad')))) {
            serverCarnetDup = true;
          }
          if (serverCode === 'EMAIL_IN_USE' || (lower.includes('correo') && (lower.includes('existe') || lower.includes('uso') || lower.includes('registrad')))) {
            serverEmailDup = true;
          }
          if (serverCarnetDup && serverEmailDup) {
            userMsg = 'El carnet y el correo ya están en uso.';
          } else if (serverCarnetDup) {
            userMsg = 'El carnet ya está registrado.';
          } else if (serverEmailDup) {
            userMsg = 'El correo ya está en uso.';
          }

          // Si no quedó claro, verificar en la BD para dar feedback específico
          if (!userMsg) {
            try {
              const [carnetDupRes, correoDupRes] = await Promise.all([
                supabase.from('usuarios').select('carnet').eq('carnet', carnet.trim()).maybeSingle(),
                supabase.from('usuarios').select('correo').eq('correo', correo.trim().toLowerCase()).maybeSingle(),
              ]);
              const carnetDup = !!carnetDupRes?.data;
              const correoDup = !!correoDupRes?.data;
              if (carnetDup && correoDup) {
                userMsg = 'El carnet y el correo ya están en uso.';
              } else if (carnetDup) {
                userMsg = 'El carnet ya está registrado.';
              } else if (correoDup) {
                userMsg = 'El correo ya está en uso.';
              }
            } catch (_) {}
          }

          throw new Error(userMsg || serverMsg || 'No se pudo completar el registro');
        }
        
        // Mostrar mensaje de éxito
        setRegSuccess(true);
        setRegError(null);
        
        // Limpiar formulario
        setRegForm({
          carnet: '',
          nombre: '',
          apellido: '',
          correo: '',
          carrera: '',
        });

      } catch (err) {
        // Mostrar el error solo en la UI, sin log de consola para evitar overlay de Expo
        setRegError(err.message || 'No se pudo completar el registro');
        setRegSuccess(false);
      } finally {
        setRegLoading(false);
      }
    };

  return (
    <View style={[styles.gradient, { paddingHorizontal: responsive.spacing.md }]}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "center", alignItems: "center", width: '100%' }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.loginContainer, { maxWidth: responsive.maxWidth.md }]}>
          <View style={[styles.loginCardBetter, {
            paddingVertical: responsive.spacing.xl,
            paddingHorizontal: responsive.spacing.lg,
            borderRadius: responsive.getValue(20, 24, 28),
          }]}>
            <Text style={[styles.loginTitleBetter, { fontSize: responsive.fontSize.xxl }]}>Bienvenido</Text>
            <Text style={[styles.loginPolicyTextBetter, { 
              fontSize: responsive.fontSize.sm,
              marginBottom: responsive.spacing.md,
            }]}>
              Hola, al iniciar sesión aceptas nuestros <Text style={styles.loginLinkBetter}>Términos y condiciones</Text>
            </Text>
            <View style={[styles.loginTabsBetter, { marginBottom: responsive.spacing.md }]}>
              <TouchableOpacity onPress={() => setActiveTab('login')}>
                <Text style={[styles.loginTabBetter, activeTab === 'login' && styles.loginTabActiveBetter, {
                  fontSize: responsive.fontSize.md,
                }]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('register')}>
                <Text style={[styles.loginTabBetter, activeTab === 'register' && styles.loginTabActiveBetter, {
                  fontSize: responsive.fontSize.md,
                }]}>Register</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'login' ? (
              <>
                <View style={[styles.inputGroupBetter, { marginBottom: responsive.spacing.md }]}>
                  <Text style={[styles.inputLabelBetter, { fontSize: responsive.fontSize.sm }]}>Carnet </Text>
                  <View style={styles.inputIconRowBetter}>
                    <Image source={require("../../assets/email.png")} style={[styles.inputIconBetter, { backgroundColor: 'transparent', borderColor: 'transparent', tintColor: undefined }]} />
                    <TextInput
                      style={[styles.inputBetter, { fontSize: responsive.fontSize.md }]}
                      placeholder="Carnet"
                      placeholderTextColor="#aaa"
                      value={form.carnet}
                      onChangeText={(text) => handleChange("carnet", text)}
                      editable={!loading}
                      autoCapitalize="none"
                      keyboardType="default"
                    />
                  </View>
                </View>
                <View style={[styles.inputGroupBetter, { marginBottom: responsive.spacing.md }]}>
                  <Text style={[styles.inputLabelBetter, { fontSize: responsive.fontSize.sm }]}>Password</Text>
                  <View style={styles.inputIconRowBetter}>
                    <Image source={require("../../assets/lock.png")} style={[styles.inputIconBetter, { backgroundColor: 'transparent' }]} />
                    <TextInput
                      style={[styles.inputBetter, { fontSize: responsive.fontSize.md }]}
                      placeholder="Password"
                      placeholderTextColor="#aaa"
                      value={form.contrasena}
                      onChangeText={(text) => handleChange("contrasena", text)}
                      secureTextEntry={!showPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                      <Icon
                        name={showPassword ? 'visibility' : 'visibility-off'}
                        size={responsive.getValue(20, 24, 26)}
                        color="#bbb"
                        style={{ marginLeft: responsive.spacing.xs }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.loginOptionsRowBetter, { marginBottom: responsive.spacing.md }]}>
                  <TouchableOpacity style={styles.checkboxRowBetter} onPress={() => setRemember((v) => !v)}>
                    <View style={[styles.checkboxBetter, remember && styles.checkboxCheckedBetter]}>
                      {remember && <View style={styles.checkboxInnerBetter} />}
                    </View>
                    <Text style={[styles.checkboxLabelBetter, { fontSize: responsive.fontSize.sm }]}>Recordar</Text>
                  </TouchableOpacity>
                  <View>
                    <Text style={[styles.forgotLinkBetter, { fontSize: responsive.fontSize.sm }]}> Olvidé mi contraseña</Text>
                  </View>
                </View>
                {error && <Text style={[styles.error, { fontSize: responsive.fontSize.sm }]}>{error}</Text>}
                <TouchableOpacity
                  style={[styles.buttonBetter, loading && styles.buttonDisabledBetter, {
                    paddingVertical: responsive.spacing.md,
                    marginTop: responsive.spacing.sm,
                  }]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.buttonTextBetter, { fontSize: responsive.fontSize.md }]}>Inicia sesión</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {regSuccess ? (
                  <View style={{ alignItems: 'center', paddingVertical: responsive.spacing.lg }}>
                    <View style={{ 
                      backgroundColor: '#d4edda', 
                      borderRadius: 12, 
                      padding: responsive.spacing.lg, 
                      marginBottom: responsive.spacing.lg, 
                      borderWidth: 1, 
                      borderColor: '#c3e6cb' 
                    }}>
                      <Text style={{ 
                        color: '#155724', 
                        fontSize: responsive.fontSize.lg, 
                        fontWeight: 'bold', 
                        textAlign: 'center', 
                        marginBottom: responsive.spacing.sm 
                      }}>
                        ✅ ¡Registro exitoso!
                      </Text>
                      <Text style={{ 
                        color: '#155724', 
                        fontSize: responsive.fontSize.sm, 
                        textAlign: 'center', 
                        lineHeight: 22 
                      }}>
                        Se ha enviado un correo con tu contraseña de acceso. Revisa tu bandeja de entrada.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.buttonBetter, { 
                        backgroundColor: '#28a745',
                        paddingVertical: responsive.spacing.md,
                      }]}
                      onPress={() => {
                        setRegSuccess(false);
                        setActiveTab('login');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.buttonTextBetter, { fontSize: responsive.fontSize.md }]}>Ir a iniciar sesión</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={[styles.inputGroupBetter, { marginBottom: responsive.spacing.md }]}>
                      <Text style={[styles.inputLabelBetter, { fontSize: responsive.fontSize.sm }]}>Carnet *</Text>
                      <View style={styles.inputIconRowBetter}>
                        <Image source={require("../../assets/email.png")} style={[styles.inputIconBetter, { backgroundColor: 'transparent', borderColor: 'transparent', tintColor: undefined }]} />
                        <TextInput
                          style={[styles.inputBetter, { fontSize: responsive.fontSize.md }]}
                          placeholder="Carnet"
                          placeholderTextColor="#aaa"
                          value={regForm.carnet}
                          onChangeText={(text) => handleRegChange('carnet', text)}
                          editable={!regLoading}
                          autoComplete="off"
                          textContentType="none"
                          importantForAutofill="no"
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    <View style={{ 
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      width: '100%',
                      marginBottom: responsive.spacing.md,
                    }}>
                      <View style={[
                        styles.inputGroupBetter,
                        { 
                          width: responsive.isMobile ? '100%' : '48%',
                          marginBottom: 0,
                        }
                      ]}> 
                        <Text style={[styles.inputLabelBetter, { fontSize: responsive.fontSize.sm }]}>Nombre *</Text>
                        <View style={styles.inputIconRowBetter}>
                          <TextInput
                            style={[styles.inputBetter, { fontSize: responsive.fontSize.md }]}
                            placeholder="Nombre"
                            placeholderTextColor="#aaa"
                            value={regForm.nombre}
                            onChangeText={(text) => handleRegChange('nombre', text)}
                            editable={!regLoading}
                          />
                        </View>
                      </View>
                      <View style={[
                        styles.inputGroupBetter,
                        { 
                          width: responsive.isMobile ? '100%' : '48%',
                          marginBottom: 0,
                          ...(responsive.isMobile ? { marginTop: responsive.spacing.sm } : null),
                        }
                      ]}> 
                        <Text style={[styles.inputLabelBetter, { fontSize: responsive.fontSize.sm }]}>Apellido *</Text>
                        <View style={styles.inputIconRowBetter}>
                          <TextInput
                            style={[styles.inputBetter, { fontSize: responsive.fontSize.md }]}
                            placeholder="Apellido"
                            placeholderTextColor="#aaa"
                            value={regForm.apellido}
                            onChangeText={(text) => handleRegChange('apellido', text)}
                            editable={!regLoading}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={[styles.inputGroupBetter, { marginBottom: responsive.spacing.md }]}>
                      <Text style={[styles.inputLabelBetter, { fontSize: responsive.fontSize.sm }]}>Correo institucional *</Text>
                      <View style={styles.inputIconRowBetter}>
                        <Image source={require("../../assets/email.png")} style={[styles.inputIconBetter, { backgroundColor: 'transparent', borderColor: 'transparent', tintColor: undefined }]} />
                        <TextInput
                          style={[styles.inputBetter, { fontSize: responsive.fontSize.md }]}
                          placeholder="correo@ejemplo.com"
                          placeholderTextColor="#aaa"
                          value={regForm.correo}
                          onChangeText={(text) => handleRegChange('correo', text)}
                          editable={!regLoading}
                          autoCapitalize="none"
                          keyboardType="email-address"
                          autoComplete="email"
                          textContentType="emailAddress"
                        />
                      </View>
                    </View>

                    <View style={[styles.inputGroupBetter, { marginBottom: responsive.spacing.md }]}>
                      <Text style={[styles.inputLabelBetter, { fontSize: responsive.fontSize.sm }]}>Carrera *</Text>
                      <TouchableOpacity 
                        style={[styles.pickerContainer, { 
                          backgroundColor: '#fff', 
                          borderColor: '#c7d2e1',
                          height: 55,
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexDirection: 'row',
                          paddingHorizontal: 12,
                        }]}
                        onPress={() => setShowCarreraModal(true)}
                        disabled={regLoading}
                      >
                        <Text style={{ 
                          color: regForm.carrera ? '#1a1a2e' : '#888', 
                          fontSize: responsive.fontSize.md,
                          fontWeight: regForm.carrera ? '500' : '400',
                          flex: 1,
                        }} numberOfLines={1}>
                          {regForm.carrera || "Selecciona tu carrera"}
                        </Text>
                        <Icon name="arrow-drop-down" size={24} color="#007AFF" />
                      </TouchableOpacity>
                    </View>

                    {/* Modal para seleccionar carrera */}
                    <Modal
                      visible={showCarreraModal}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setShowCarreraModal(false)}
                    >
                      <TouchableOpacity 
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowCarreraModal(false)}
                      >
                        <Animated.View
                          style={[
                            styles.modalContent,
                            {
                              transform: [{ translateY: slideAnim }]
                            }
                          ]}
                        >
                          <TouchableOpacity 
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                          >
                          <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Selecciona tu carrera</Text>
                            <TouchableOpacity onPress={() => setShowCarreraModal(false)}>
                              <Icon name="close" size={28} color="#333" />
                            </TouchableOpacity>
                          </View>
                          <ScrollView style={styles.modalScrollView}>
                            <TouchableOpacity
                              style={styles.modalItem}
                              onPress={() => {
                                handleRegChange('carrera', '');
                                setShowCarreraModal(false);
                              }}
                            >
                              <Text style={[styles.modalItemText, { color: '#888', fontStyle: 'italic' }]}>
                                Sin seleccionar
                              </Text>
                            </TouchableOpacity>
                            {carreras.map((carrera, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.modalItem,
                                  regForm.carrera === carrera && styles.modalItemSelected
                                ]}
                                onPress={() => {
                                  handleRegChange('carrera', carrera);
                                  setShowCarreraModal(false);
                                }}
                              >
                                <Text style={[
                                  styles.modalItemText,
                                  regForm.carrera === carrera && styles.modalItemTextSelected
                                ]}>
                                  {carrera}
                                </Text>
                                {regForm.carrera === carrera && (
                                  <Icon name="check" size={22} color="#007AFF" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          </TouchableOpacity>
                        </Animated.View>
                      </TouchableOpacity>
                    </Modal>

                    <View style={{ 
                      backgroundColor: '#e7f3ff', 
                      borderRadius: 8, 
                      padding: responsive.spacing.md, 
                      marginBottom: responsive.spacing.md, 
                      borderLeftWidth: 4, 
                      borderLeftColor: '#007AFF' 
                    }}>
                      <Text style={{ 
                        color: '#004085', 
                        fontSize: responsive.fontSize.xs, 
                        lineHeight: 20 
                      }}>
                        ℹ️ <Text style={{ fontWeight: 'bold' }}>Contraseña automática:</Text> Se generará una contraseña y se enviará a tu correo.
                      </Text>
                    </View>

                    {regError && <Text style={[styles.error, { fontSize: responsive.fontSize.sm }]}>{regError}</Text>}
                    <TouchableOpacity
                      style={[styles.buttonBetter, regLoading && styles.buttonDisabledBetter, {
                        paddingVertical: responsive.spacing.md,
                        marginTop: responsive.spacing.sm,
                      }]}
                      onPress={handleRegister}
                      disabled={regLoading}
                      activeOpacity={0.8}
                    >
                      {regLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={[styles.buttonTextBetter, { fontSize: responsive.fontSize.md }]}>Crear cuenta</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
            <Text style={[styles.orTextBetter, { 
              fontSize: responsive.fontSize.lg,
              marginTop: responsive.spacing.lg,
            }]}>FORO U</Text>
            <Text style={{ 
              textAlign: 'center', 
              color: 'rgba(136, 136, 136, 1)', 
              fontSize: responsive.fontSize.sm, 
              marginBottom: responsive.spacing.md 
            }}>
              Acceso solo con credenciales institucionales.
            </Text>
            {!responsive.isMobile && (
              <View style={styles.illustrationContainerBetter}>
                <Image source={require("../../assets/login-illustration.png")} style={styles.illustrationBetter} resizeMode="contain" />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
  </View>
  );
}

const styles = StyleSheet.create({
  loginCardBetter: {
    width: '92%',
    maxWidth: 370,
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 10,
    marginTop: 30,
    marginBottom: 30,
  },
  loginTitleBetter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loginPolicyTextBetter: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 2,
    lineHeight: 22,
  },
  loginLinkBetter: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  loginTabsBetter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    gap: 18,
  },
  loginTabBetter: {
    fontSize: 18,
    color: '#888',
    paddingBottom: 2,
    marginHorizontal: 12,
  },
  loginTabActiveBetter: {
    color: '#007AFF',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    fontWeight: 'bold',
  },
  inputGroupBetter: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabelBetter: {
    fontSize: 15,
    color: '#555',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputIconRowBetter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e8ee',
    marginBottom: 0,
    paddingHorizontal: 10,
    height: 48,
  },
  inputIconBetter: {
    width: 24,
    height: 24,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  inputBetter: {
    flex: 1,
    fontSize: 17,
    color: '#222',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  eyeIconImgBetter: {
    width: 26,
    height: 26,
    marginLeft: 8,
    tintColor: '#bbb',
  },
  loginOptionsRowBetter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
    marginTop: 2,
  },
  checkboxRowBetter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBetter: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#bbb',
    borderRadius: 5,
    marginRight: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheckedBetter: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f0ff',
  },
  checkboxInnerBetter: {
    width: 12,
    height: 12,
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  checkboxLabelBetter: {
    fontSize: 14,
    color: '#555',
  },
  forgotLinkBetter: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonBetter: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabledBetter: {
    backgroundColor: '#a0cfff',
  },
  buttonTextBetter: {
    color: '#fff',
    fontSize: 19,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  orTextBetter: {
    color: '#888',
    fontSize: 15,
    marginVertical: 12,
    textAlign: 'center',
  },
  socialRowBetter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
  },
  socialIconBetter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f2f6fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e3e8ee',
  },
  socialIconImgBetter: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  illustrationContainerBetter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },
  illustrationBetter: {
    width: 200,
    height: 80,
    borderRadius: 18,
    marginTop: 8,
  },
  gradient: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loginCard: {
    width: '92%',
    maxWidth: 370,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 10,
  },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3e8ee',
    marginBottom: 0,
    paddingHorizontal: 8,
  },
  inputIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: '#007AFF',
  },
  eyeIconImg: {
    width: 22,
    height: 22,
    marginLeft: 6,
    tintColor: '#bbb',
  },
  checkboxChecked: {
    borderColor: '#007AFF',
    backgroundColor: '#e6f0ff',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 2,
  },
  socialIconImg: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  illustration: {
    width: 180,
    height: 80,
    borderRadius: 18,
    marginTop: 8,
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  loginPolicyText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 2,
  },
  loginLink: {
    orText: {
      color: '#888',
      fontSize: 14,
      marginVertical: 10,
      textAlign: 'center',
    },
    socialRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 18,
      marginBottom: 10,
    },
    socialIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#f2f6fa',
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 6,
      borderWidth: 1,
      borderColor: '#e3e8ee',
    },
    socialIconText: {
      fontSize: 20,
      color: '#007AFF',
      fontWeight: 'bold',
    },
    socialIconImg: {
      width: 22,
      height: 22,
      resizeMode: 'contain',
    },
    illustrationContainer: {
      width: '100%',
      alignItems: 'center',
      marginTop: 18,
    },
    illustration: {
      width: 180,
      height: 80,
      borderRadius: 18,
      marginTop: 8,
    },
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    fontSize: 20,
    color: '#bbb',
    marginLeft: 8,
    marginRight: 2,
  },
  loginOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#bbb',
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: '#fff',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#555',
  },
  forgotLink: {
    color: '#007AFF',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  orText: {
    color: '#888',
    fontSize: 14,
    marginVertical: 10,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginBottom: 10,
  },
  socialIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f2f6fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#e3e8ee',
  },
  socialIconText: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },
  illustration: {
    width: 180,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e3f0fc',
    opacity: 0.7,
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    height: 55,
    width: '100%',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#e6f0ff',
  },
  modalItemText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 22,
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});