import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Modal, Portal, TextInput, Button, useTheme, IconButton, Text, HelperText } from 'react-native-paper';
import Constants from "expo-constants";

const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

type SearchUserFeatureProps = {
    onUserFound: (address: string) => void;
};

export const SearchUserFeature = ({ onUserFound }: SearchUserFeatureProps) => {
    const theme = useTheme();
    const [visible, setVisible] = useState(false);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const showModal = () => setVisible(true);
    const hideModal = () => {
        setVisible(false);
        setAddress('');
        setError(null);
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!address.trim() || !API_ENDPOINT) return;
        
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_ENDPOINT}/user/${address.trim()}/exists`);

            if (response.status === 404) {
                setError('Address not found. This user does not use DegenRank.');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || 'An error occurred.');
                return;
            }
            
            const result = await response.json();
            if (result.exists) {
                hideModal();
                onUserFound(address.trim());
            } else {
                setError('Address not found. This user does not use DegenRank.');
            }
        } catch (e) {
            setError('Failed to connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    const styles = StyleSheet.create({
        modalContainer: {
            backgroundColor: theme.colors.elevation.level3,
            padding: 20,
            margin: 20,
            borderRadius: theme.roundness * 2,
        },
        title: {
            fontSize: 20,
            marginBottom: 20,
            textAlign: 'center',
            color: theme.colors.onSurface,
        },
        input: {
            marginBottom: 5,
        },
        button: {
            marginTop: 10,
        },
        helperText: {
            textAlign: 'center',
            marginBottom: 10,
        }
    });

    return (
        <>
            <IconButton
                icon="magnify"
                onPress={showModal}
                size={24}
                iconColor={theme.colors.onSurface}
            />
            <Portal>
                <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modalContainer}>
                    <View>
                        <Text style={styles.title} variant="headlineSmall">Search User</Text>
                        <TextInput
                            label="Paste User Address"
                            value={address}
                            onChangeText={setAddress}
                            style={styles.input}
                            autoFocus
                            error={!!error}
                        />
                        {loading ? (
                            <ActivityIndicator style={{ marginVertical: 10 }} />
                        ) : (
                            <HelperText type="error" visible={!!error} style={styles.helperText}>
                                {error}
                            </HelperText>
                        )}
                        <Button
                            mode="contained"
                            onPress={handleSearch}
                            disabled={!address.trim() || loading}
                            style={styles.button}
                            loading={loading}
                        >
                            Search
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </>
    );
}; 