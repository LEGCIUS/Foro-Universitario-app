import React, { useState } from "react";
import { View, Text, TextInput, Button, ActivityIndicator, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from "../../Supabase/supabaseClient";

export default function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ carnet: "", contrasena: "" });
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

      onLogin();
    } catch (err) {
      setError(err.message || "Ocurrió un error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#007AFF', '#00C6FB']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Inicia sesión con tu carnet</Text>
          <TextInput
            style={styles.input}
            placeholder="Carnet"
            placeholderTextColor="#aaa"
            value={form.carnet}
            onChangeText={(text) => handleChange("carnet", text)}
            editable={!loading}
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#aaa"
            value={form.contrasena}
            onChangeText={(text) => handleChange("contrasena", text)}
            secureTextEntry
            editable={!loading}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.footer}>
            ¿No tienes cuenta?{" "}
            <Text style={styles.link}>Contacta al administrador</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  card: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    padding: 14,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#f7f7f7",
    fontSize: 16,
    color: "#222",
  },
  error: {
    color: "#ff3b30",
    marginBottom: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  button: {
    width: "100%",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: "#a0cfff",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  footer: {
    marginTop: 12,
    color: "#333",
    fontSize: 15,
    textAlign: "center",
  },
  link: {
    color: "#007AFF",
    fontWeight: "bold",
  },
});