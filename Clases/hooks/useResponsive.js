import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export const useResponsive = () => {
  const [dimensions, setDimensions] = useState({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      setDimensions({ window, screen });
    });

    return () => subscription?.remove();
  }, []);

  const width = dimensions.window.width;
  const height = dimensions.window.height;

  // Breakpoints
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isSmallMobile = width < 375;
  const isLargeMobile = width >= 375 && width < 768;

  // Orientación
  const isPortrait = height > width;
  const isLandscape = width > height;

  // Responsive values
  const getValue = (mobile, tablet, desktop) => {
    if (isDesktop && desktop !== undefined) return desktop;
    if (isTablet && tablet !== undefined) return tablet;
    return mobile;
  };

  // Padding y márgenes responsivos
  const spacing = {
    xs: getValue(4, 6, 8),
    sm: getValue(8, 12, 16),
    md: getValue(12, 16, 24),
    lg: getValue(16, 24, 32),
    xl: getValue(24, 32, 48),
  };

  // Tamaños de fuente responsivos
  const fontSize = {
    xs: getValue(10, 11, 12),
    sm: getValue(12, 13, 14),
    md: getValue(14, 15, 16),
    lg: getValue(16, 18, 20),
    xl: getValue(20, 24, 28),
    xxl: getValue(24, 28, 32),
  };

  // Anchos máximos para contenedores
  const maxWidth = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    full: '100%',
  };

  // Número de columnas para grids
  const columns = getValue(1, 2, 3);
  const productColumns = getValue(1, 2, 4);

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isLargeMobile,
    isPortrait,
    isLandscape,
    getValue,
    spacing,
    fontSize,
    maxWidth,
    columns,
    productColumns,
    isWeb: Platform.OS === 'web',
  };
};
