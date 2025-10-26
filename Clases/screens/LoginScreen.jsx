import React, { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../../Supabase/supabaseClient";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ carnet: "", contrasena: "" });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error: queryError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('carnet', form.carnet)
        .single();

      if (queryError || !data) {
        throw new Error('Usuario no encontrado');
      }

      if (data.contrasena !== form.contrasena) {
        throw new Error('Contraseña incorrecta');
      }

     await AsyncStorage.setItem('carnet', form.carnet);
     onLogin();
    } catch (err) {
      setError(err.message || "Ocurrió un error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.loginContainer}>
          <View style={styles.loginCardBetter}>
            <Text style={styles.loginTitleBetter}>Bienvenido</Text>
            <Text style={styles.loginPolicyTextBetter}>
              Hola, al iniciar sesión aceptas nuestros <Text style={styles.loginLinkBetter}>Términos y condiciones</Text>
            </Text>
            <View style={styles.loginTabsBetter}>
              <Text style={[styles.loginTabBetter, styles.loginTabActiveBetter]}>Login</Text>
              <Text style={styles.loginTabBetter}>Register</Text>
            </View>
            <View style={styles.inputGroupBetter}>
              <Text style={styles.inputLabelBetter}>Carnet </Text>
              <View style={styles.inputIconRowBetter}>
                <Image source={require("../../assets/email.png")} style={[styles.inputIconBetter, { backgroundColor: 'transparent', borderColor: 'transparent', tintColor: undefined }]} />
                <TextInput
                  style={styles.inputBetter}
                  placeholder="Carnet"
                  placeholderTextColor="#aaa"
                  value={form.carnet}
                  onChangeText={(text) => handleChange("carnet", text)}
                  editable={!loading}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>
            <View style={styles.inputGroupBetter}>
              <Text style={styles.inputLabelBetter}>Password</Text>
              <View style={styles.inputIconRowBetter}>
                <Image source={require("../../assets/lock.png")} style={[styles.inputIconBetter, { backgroundColor: 'transparent' }]} />
                <TextInput
                  style={styles.inputBetter}
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
                    size={26}
                    color="#bbb"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.loginOptionsRowBetter}>
              <TouchableOpacity style={styles.checkboxRowBetter} onPress={() => setRemember((v) => !v)}>
                <View style={[styles.checkboxBetter, remember && styles.checkboxCheckedBetter]}>
                  {remember && <View style={styles.checkboxInnerBetter} />}
                </View>
                <Text style={styles.checkboxLabelBetter}>Recordar</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotLinkBetter}> Olvidé mi contraseña</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity
              style={[styles.buttonBetter, loading && styles.buttonDisabledBetter]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonTextBetter}>Inicia sesión</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.orTextBetter}>FORO U</Text>
            <Text style={{ textAlign: 'center', color: 'rgba(136, 136, 136, 1)', fontSize: 15, marginBottom: 18 }}>
              Acceso solo con credenciales institucionales.
            </Text>
            <View style={styles.illustrationContainerBetter}>
              <Image source={require("../../assets/login-illustration.png")} style={styles.illustrationBetter} resizeMode="contain" />
            </View>
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
    borderRadius: 18,
    backgroundColor: '#e3f0fc',
    opacity: 0.7,
  },
});