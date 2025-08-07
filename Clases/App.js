import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica si hay sesión guardada
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('userToken');
      setIsAuthenticated(!!token);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    // Guarda la sesión al iniciar
    await AsyncStorage.setItem('userToken', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    // Elimina la sesión al cerrar
    await AsyncStorage.removeItem('userToken');
    setIsAuthenticated(false);
  };

  if (loading) {
    return null; // Aquí podrías mostrar un SplashScreen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Home">
            {props => <HomeScreen {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}