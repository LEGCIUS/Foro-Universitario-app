# Estructura del Proyecto - Clases

Este documento describe la organización modular del código para mejorar la escalabilidad y mantenibilidad.

## 📁 Estructura de Carpetas

```
Clases/
├── components/          # Componentes UI reutilizables
│   ├── BuscadorUsuarios.js
│   ├── Etiquetas.js
│   └── SplashScreenCustom.js
│
├── contexts/           # Contextos de React (estado global)
│   └── ThemeContext.js
│
├── profile/            # Módulo de perfiles de usuario
│   ├── PerfilUsuario.js
│   └── PerfilUsuarioScreen.js
│
├── publications/       # Módulo de publicaciones
│   ├── FeedItem.js
│   ├── FeedList.js
│   ├── CreatePublicationModal.js
│   └── PublicationsViewer.js
│
├── screens/           # Pantallas principales
│   ├── AdminScreen.js
│   ├── HomeScreen.js
│   ├── LoginScreen.jsx
│   └── SettingScreen.js
│
├── ventas/            # Módulo de ventas/marketplace
│   ├── ProductoDetalle.js
│   ├── ProductoForm.js
│   ├── ProductosList.js
│   └── PublicarProductoScreen.js
│
├── App.js             # Navegación principal
└── index.js           # Punto de entrada
```

## 📦 Módulos

### Components

Componentes UI reutilizables en toda la aplicación:

- **BuscadorUsuarios**: Modal para buscar y seleccionar usuarios
- **Etiquetas**: Sistema de tags/etiquetas con selección múltiple
- **SplashScreenCustom**: Pantalla de carga inicial personalizada

### Contexts

Estado global de la aplicación:

- **ThemeContext**: Gestión del tema claro/oscuro

### Profile

Todo lo relacionado con perfiles de usuario:

- **PerfilUsuario**: Componente del perfil propio del usuario
- **PerfilUsuarioScreen**: Pantalla para ver perfiles de otros usuarios

### Publications

Gestión completa de publicaciones:

- **FeedItem**: Item individual del feed con media, likes, comentarios, reportes
- **FeedList**: Lista optimizada con FlatList y viewability tracking
- **CreatePublicationModal**: Modal para crear nuevas publicaciones
- **PublicationsViewer**: Visor fullscreen de publicaciones con paginación

### Screens

Pantallas principales de navegación:

- **AdminScreen**: Panel de administración para gestionar reportes
- **HomeScreen**: Feed principal (usa FeedList)
- **LoginScreen**: Pantalla de autenticación
- **SettingScreen**: Configuración de la app

### Ventas

Módulo completo de marketplace:

- **ProductosList**: Listado de productos a la venta
- **ProductoDetalle**: Vista detallada de un producto
- **ProductoForm**: Formulario para crear/editar productos
- **PublicarProductoScreen**: Pantalla contenedora para publicar

## 🔄 Imports

Ejemplo de imports según la ubicación:

```javascript
// Desde screens/
import { useTheme } from "../contexts/ThemeContext";
import Etiquetas from "../components/Etiquetas";
import FeedList from "../publications/FeedList";

// Desde publications/
import { useTheme } from "../contexts/ThemeContext";
import Etiquetas from "../components/Etiquetas";

// Desde ventas/
import { useTheme } from "../contexts/ThemeContext";

// Desde components/
import { useTheme } from "../contexts/ThemeContext";

// Desde App.js
import { useTheme } from "./contexts/ThemeContext";
import BuscadorUsuarios from "./components/BuscadorUsuarios";
import PerfilUsuario from "./profile/PerfilUsuario";
```

## 🎨 Temas

El proyecto usa ThemeContext para dark mode:

```javascript
import { useTheme } from "../contexts/ThemeContext";

function MyComponent() {
  const { darkMode, toggleTheme } = useTheme();
  // darkMode es boolean
  // toggleTheme() cambia el tema
}
```

## 🚀 Mejoras Implementadas

1. **Modularización**: Código organizado por dominio/funcionalidad
2. **Separación de responsabilidades**: Componentes enfocados en una sola tarea
3. **Reutilización**: Componentes compartidos en carpeta `components/`
4. **Escalabilidad**: Fácil agregar nuevos módulos sin afectar el resto
5. **Mantenibilidad**: Código más fácil de encontrar y modificar

## 📝 Convenciones

- **Carpetas**: lowercase con guiones si es necesario (ej: `profile/`, `publications/`)
- **Archivos**: PascalCase para componentes React (ej: `FeedItem.js`)
- **Imports relativos**: Usar rutas relativas correctas (`../`, `./`)
- **Dark mode**: Todos los componentes deben soportar darkMode vía ThemeContext
