import { MD3LightTheme as DefaultTheme, useTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00A99D', // Un vert d'eau vif
    onPrimary: '#ffffff',
    primaryContainer: '#004f4a',
    onPrimaryContainer: '#92f9e7',
    secondary: '#b0c9c5',
    onSecondary: '#1e3532',
    secondaryContainer: '#344c48',
    onSecondaryContainer: '#cce8e1',
    tertiary: '#b3c6e8',
    onTertiary: '#1d314d',
    tertiaryContainer: '#344764',
    onTertiaryContainer: '#d2e2ff',
    error: '#ffb4ab',
    onError: '#690005',
    errorContainer: '#93000a',
    onErrorContainer: '#ffb4ab',
    background: '#191c1c', // Fond sombre, effet "chrome noir"
    onBackground: '#e0e3e1',
    surface: '#191c1c',
    onSurface: '#e0e3e1',
    surfaceVariant: '#3f4947', // Gris métallique pour les cartes
    onSurfaceVariant: '#bec9c6',
    outline: '#899391',
    inverseOnSurface: '#191c1c',
    inverseSurface: '#e0e3e1',
    inversePrimary: '#006a64',
    elevation: {
      level0: 'transparent',
      level1: '#222b2a',
      level2: '#283331',
      level3: '#2d3b39',
      level4: '#2f3d3b',
      level5: '#32423f',
    },
  },
};

export type AppTheme = typeof theme;
export const useAppTheme = () => useTheme<AppTheme>(); 