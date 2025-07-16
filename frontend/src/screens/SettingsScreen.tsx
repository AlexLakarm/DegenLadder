import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import React from "react";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from '../utils/useMobileWallet';
import { Appbar, Button, useTheme } from "react-native-paper";
import { useNavigation } from '@react-navigation/native';

export function SettingsScreen() {
  const theme = useTheme(); // Utiliser le hook pour le thème dynamique
  const { disconnect } = useMobileWallet();
  const { selectedAccount } = useAuthorization();
  const styles = getStyles(theme);
  const navigation = useNavigation();

  const handleDisconnect = async () => {
    await disconnect();
  };

  return (
    <>
      <Appbar.Header
        style={{
          backgroundColor: theme.colors.background,
        }}
      >
        <Appbar.Content
          title="Settings"
          titleStyle={{
            color: theme.colors.onSurface,
            fontWeight: "bold",
          }}
        />
      </Appbar.Header>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.itemText}>Politique de Confidentialité</Text>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Button
          mode="contained"
          onPress={handleDisconnect}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          disabled={!selectedAccount}
        >
          Déconnexion
        </Button>
      </View>
    </>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    item: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    itemArrow: {
      fontSize: 20,
      color: theme.colors.onSurfaceVariant,
    },
    button: {
      marginTop: 20,
      backgroundColor: "#FF6347", // Tomato color for disconnect
      borderRadius: 8,
    },
    buttonLabel: {
      color: "white",
      fontWeight: "bold",
    },
  });
