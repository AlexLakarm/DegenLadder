// Polyfills
import "./src/polyfills";

import { StyleSheet, LogBox } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ConnectionProvider } from "./src/utils/ConnectionProvider";
import { AppNavigator } from "./src/navigators/AppNavigator";
import { ClusterProvider } from "./src/components/cluster/cluster-data-access";

import { theme as appTheme } from './src/theme';
import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

const queryClient = new QueryClient();

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  '"shadow*" style props are deprecated. Use "boxShadow".',
]);

export default function App() {
  const colorScheme = useColorScheme();

  const theme = colorScheme === 'dark' 
    ? { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, ...appTheme.colors } }
    : { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, ...appTheme.colors } };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ClusterProvider>
          <ConnectionProvider config={{ commitment: "processed" }}>
              <PaperProvider theme={theme}>
                <SafeAreaView style={[styles.shell, { backgroundColor: theme.colors.background }]}>
                  <AppNavigator />
                </SafeAreaView>
              </PaperProvider>
          </ConnectionProvider>
        </ClusterProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});