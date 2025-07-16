import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Linking,
} from "react-native";
import React from "react";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from '../utils/useMobileWallet'; // Correction du chemin
import { Appbar, Button } from "react-native-paper";
import { theme } from "../theme";
import { useNavigation } from '@react-navigation/native';

export function SettingsScreen() {
  const { disconnect } = useMobileWallet(); // Utilisation de la bonne fonction
  const { selectedAccount } = useAuthorization();
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);
  const navigation = useNavigation();

  const handleDisconnect = async () => {
    await disconnect();
  };

  return (
    <>
      <Appbar.Header
        style={{
          backgroundColor:
            colorScheme === "dark"
              ? theme.colors.backgroundDark
              : theme.colors.backgroundLight,
        }}
      >
        <Appbar.Content
          title="Settings"
          titleStyle={{
            color:
              colorScheme === "dark"
                ? theme.colors.textDark
                : theme.colors.textLight,
            fontWeight: "bold",
          }}
        />
      </Appbar.Header>
      <View style={styles.container}>
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

const getStyles = (colorScheme: "light" | "dark" | null | undefined) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor:
        colorScheme === "dark"
          ? theme.colors.backgroundDark
          : theme.colors.backgroundLight,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? theme.colors.textDark : theme.colors.textLight,
      marginBottom: 12,
    },
    item: {
      backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#ffffff',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemText: {
      fontSize: 16,
      color: colorScheme === 'dark' ? theme.colors.textDark : theme.colors.textLight,
    },
    itemArrow: {
      fontSize: 20,
      color: theme.colors.textMuted,
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
