import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import React from "react";
import { useAuthorization } from "../utils/useAuthorization";
import { useMobileWallet } from '../utils/useMobileWallet';
import { Appbar, Button, useTheme } from "react-native-paper";
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

export function SettingsScreen() {
  const theme = useTheme(); // Utiliser le hook pour le thème dynamique
  const { disconnect } = useMobileWallet();
  const { selectedAccount } = useAuthorization();
  const styles = getStyles(theme);
  const navigation = useNavigation();

  const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

  const handleDisconnect = async () => {
    await disconnect();
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account and all related data? This action is irreversible.\n\nIf you reconnect your wallet, your public data will be fetched and analyzed again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const userAddress = selectedAccount.publicKey.toBase58();
              const response = await fetch(`${API_ENDPOINT}/user/${userAddress}`, {
                method: 'DELETE',
              });
              const result = await response.json();
              if (result.success) {
                Alert.alert("Account Deleted", "Your account and all related data have been deleted. If you reconnect your wallet, your public data will be fetched and analyzed again.");
                await disconnect();
                navigation.goBack();
              } else {
                Alert.alert("Error", result.error || "Failed to delete account.");
              }
            } catch (error) {
              Alert.alert("Error", "An error occurred while deleting your account.");
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Appbar.Header
        style={{
          backgroundColor: theme.colors.background,
        }}
      >
        <Appbar.BackAction onPress={() => navigation.goBack()} />
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
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.itemText}>Privacy Policy</Text>
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
          Disconnect
        </Button>

        <Button
          mode="outlined"
          onPress={handleDeleteAccount}
          style={styles.deleteButton}
          labelStyle={styles.deleteButtonLabel}
          disabled={!selectedAccount}
        >
          Delete my account
        </Button>
        <Text style={styles.deleteWarning}>
          If you reconnect your wallet, your public data will be fetched and analyzed again.
        </Text>
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
    deleteButton: {
      marginTop: 20,
      borderColor: theme.colors.error,
      borderWidth: 1,
      borderRadius: 8,
    },
    deleteButtonLabel: {
      color: theme.colors.error,
      fontWeight: "bold",
    },
    deleteWarning: {
      marginTop: 12,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });
