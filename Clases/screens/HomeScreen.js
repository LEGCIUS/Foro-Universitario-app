import React from 'react';
import { View, Text, Button } from 'react-native';

export default function HomeScreen({ onLogout }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Bienvenido a la pantalla principal</Text>
      <Button title="Cerrar sesión" onPress={onLogout} />
    </View>
  );
}
