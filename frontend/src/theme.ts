import {
  MD3LightTheme as DefaultTheme,
  configureFonts,
  useTheme,
} from "react-native-paper";
import type { Theme } from "react-native-paper";

const fontConfig = {
  ...DefaultTheme.fonts,
};

// Couleurs inspirées de Solana et d'un thème "cyber/tech"
const solanaThemeColors = {
  primary: '#00FFA3', // Le vert iconique de Solana
  primaryContainer: '#003d2b',
  secondary: '#42dc9e',
  secondaryContainer: '#2a453a',
  tertiary: '#98f5d7',
  tertiaryContainer: '#004f46',
  background: '#121212', // Fond sombre, presque noir
  surface: '#1E1E1E', // Surface des cartes légèrement plus claire
  surfaceVariant: '#2C2C2C', // Variante pour les éléments comme les boutons "tonal"
  onPrimary: '#003923',
  onPrimaryContainer: '#98f5d7',
  onSecondary: '#003823',
  onSecondaryContainer: '#c1f3d4',
  onTertiary: '#00382f',
  onTertiaryContainer: '#b4fbe3',
  onBackground: '#E4E4E4', // Texte blanc cassé pour une meilleure lisibilité
  onSurface: '#E4E4E4',
  onSurfaceVariant: '#BDBDBD', // Couleur de texte plus douce sur les variantes de surface
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffb4ab',
  outline: '#8A8A8A', // Bordures
  shadow: '#00FFA3', // Couleur de l'ombre/lueur
  elevation: {
    level0: 'transparent',
    level1: '#1E1E1E',
    level2: '#2C2C2C',
    level3: '#3A3A3A',
    level4: '#484848',
    level5: '#565656',
  }
};

export const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...solanaThemeColors,
  },
  fonts: configureFonts({ config: fontConfig }),
};

export const useAppTheme = () => useTheme<typeof theme>(); 