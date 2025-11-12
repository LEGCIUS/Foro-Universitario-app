import React, { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import SplashScreenCustom from './components/SplashScreenCustom';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import PerfilUsuario from './profile/PerfilUsuario';
import SettingScreen from './screens/SettingScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import ProductosList from './ventas/ProductosList';
import ProductoForm from './ventas/ProductoForm';
import PublicationsViewer from './publications/PublicationsViewer';
import { useTheme } from './contexts/ThemeContext'; 
import AdminScreen from './screens/AdminScreen';
import ComunidadScreen from './screens/ComunidadScreen';
import CursosScreen from './Comunidad/CursosScreen';
import VideosScreen from './Comunidad/VideosScreen';
import TutorialesScreen from './Comunidad/TutorialesScreen';
import ClasesScreen from './Comunidad/ClasesScreen';
import EventosScreen from './screens/EventosScreen';
import BibliotecaScreen from './Comunidad/BibliotecaScreen';
import CrearCurso from './Comunidad/CrearCurso';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


export default function App() {
  const { darkMode } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    // Verifica si hay sesión guardada
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('userToken');
      setIsAuthenticated(!!token);
      // Espera 5 segundos exactos antes de continuar
      setTimeout(async () => {
        setLoading(false);
        await SplashScreen.hideAsync();
      }, 10000);
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
    return <SplashScreenCustom />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <Stack.Navigator>
          <Stack.Screen 
            name="Login"
            options={{ headerShown: false }}
          >
            {props => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
            {() => (
              <Tab.Navigator
                screenOptions={({ route }) => ({
                  tabBarIcon: ({ color, size }) => {
                    let iconName;
                    if (route.name === 'Home') iconName = 'home';
                    else if (route.name === 'Comunidad') iconName = 'groups';
                    else if (route.name === 'Ventas') iconName = 'shopping-cart';
                    else if (route.name === 'Perfil') iconName = 'person';
                    else if (route.name === 'Config') iconName = 'settings';
                    return <Icon name={iconName} size={size} color={color} />;
                  },
                  tabBarActiveTintColor: '#00C6FB',
                  tabBarInactiveTintColor: '#888',
                  tabBarStyle: {
                    backgroundColor: darkMode ? '#181818' : '#fff',
                    borderTopColor: darkMode ? '#333' : '#eee',
                  },
                  headerStyle: {
                    backgroundColor: darkMode ? '#181818' : '#fff',
                  },
                  headerTitleStyle: {
                    color: darkMode ? '#fff' : '#222',
                  },
                  headerTintColor: darkMode ? '#fff' : '#222',
                  headerShown: false,
                })}
              >
                <Tab.Screen name="Home">
                  {props => <HomeScreen {...props} onLogout={handleLogout} />}
                </Tab.Screen>
                <Tab.Screen name="Ventas">
                  {props => <ProductosList {...props} navigation={props.navigation} />}
                </Tab.Screen>
                  <Tab.Screen name="Comunidad" component={ComunidadScreen} />
                <Tab.Screen name="Perfil" component={PerfilUsuario} />
                <Tab.Screen name="Config">
                  {props => <SettingScreen {...props} onLogout={handleLogout} />}
                </Tab.Screen>
              </Tab.Navigator>
            )}
          </Stack.Screen>
            <Stack.Screen name="Cursos" component={CursosScreen} />
            <Stack.Screen name="Videos" component={VideosScreen} />
            <Stack.Screen name="Tutoriales" component={TutorialesScreen} />
            <Stack.Screen name="Eventos" component={EventosScreen} />
            <Stack.Screen name="Clases" component={ClasesScreen} />
            <Stack.Screen name="Biblioteca" component={BibliotecaScreen} />
            <Stack.Screen name="CrearCurso" component={CrearCurso} options={{ title: 'Crear Curso' }} />
          <Stack.Screen name="PublicarProducto" component={require('./ventas/PublicarProductoScreen').default} />
          <Stack.Screen
            name="EditarPerfil"
            component={require('./profile/EditarPerfil').default}
            options={{ 
              headerShown: true,
              title: 'Editar Perfil',
              headerStyle: {
                backgroundColor: darkMode ? '#181818' : '#fff',
              },
              headerTintColor: darkMode ? '#fff' : '#222',
            }}
          />
          <Stack.Screen
            name="PerfilUsuario"
            component={require('./profile/PerfilUsuarioScreen').default}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ViewUserProfile"
            component={require('./profile/ViewUserProfile').default}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Publicaciones"
            component={PublicationsViewer}
            options={{ presentation: 'transparentModal', headerShown: false }}
          />
          <Stack.Screen
            name="AdminPanel"
            component={AdminScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );

}