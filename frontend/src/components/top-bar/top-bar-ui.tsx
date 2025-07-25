import { Button, IconButton, Menu, useTheme } from "react-native-paper";
import { Account, useAuthorization } from "../../utils/useAuthorization";
import { useMobileWallet } from "../../utils/useMobileWallet";
import { useNavigation } from "@react-navigation/native";
import { ellipsify } from "../../utils/ellipsify";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Linking, Image, StyleSheet, View } from "react-native";
import { useCluster } from "../cluster/cluster-data-access";

export function TopBarLogo() {
  const openTwitter = () => {
    Linking.openURL('https://x.com/DegenLadder');
  };

  return (
    <View style={styles.logoContainer}>
      <Image
        source={require("../../../assets/ladder3.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <IconButton
        icon={() => (
          <Image
            source={require("../../../assets/X-logo-social-media-icon-transparent-png.png")}
            style={styles.xLogo}
            resizeMode="contain"
          />
        )}
        mode="text"
        size={20}
        onPress={openTwitter}
        style={styles.twitterButton}
      />
    </View>
  );
}

export function TopBarWalletButton({
  selectedAccount,
  openMenu,
}: {
  selectedAccount: Account | null;
  openMenu: () => void;
}) {
  const { connect } = useMobileWallet();
  return (
    <Button
      icon="wallet"
      mode="contained-tonal"
      style={{ alignSelf: "center" }}
      onPress={selectedAccount ? openMenu : connect}
    >
      {selectedAccount
        ? ellipsify(selectedAccount.publicKey.toBase58())
        : "Connect"}
    </Button>
  );
}

export function TopBarSettingsButton() {
  const navigation = useNavigation();
  return (
    <IconButton
      icon="cog"
      mode="contained-tonal"
      onPress={() => {
        navigation.navigate("Settings");
      }}
    />
  );
}

export function TopBarWalletMenu() {
  const { selectedAccount } = useAuthorization();
  const { getExplorerUrl } = useCluster();
  const [visible, setVisible] = useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  const { disconnect } = useMobileWallet();

  const copyAddressToClipboard = async () => {
    if (selectedAccount) {
      await Clipboard.setStringAsync(selectedAccount.publicKey.toBase58());
    }
    closeMenu();
  };

  const viewExplorer = () => {
    if (selectedAccount) {
      const explorerUrl = getExplorerUrl(
        `account/${selectedAccount.publicKey.toBase58()}`
      );
      Linking.openURL(explorerUrl);
    }
    closeMenu();
  };

  return (
    <Menu
      visible={visible}
      onDismiss={closeMenu}
      anchor={
        <TopBarWalletButton
          selectedAccount={selectedAccount}
          openMenu={openMenu}
        />
      }
    >
      <Menu.Item
        onPress={copyAddressToClipboard}
        title="Copy address"
        leadingIcon="content-copy"
      />
      <Menu.Item
        onPress={viewExplorer}
        title="View Explorer"
        leadingIcon="open-in-new"
      />
      <Menu.Item
        onPress={async () => {
          await disconnect();
          closeMenu();
        }}
        title="Disconnect"
        leadingIcon="link-off"
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  twitterButton: {
    marginLeft: 8,
  },
  xLogo: {
    width: 44,
    height: 44,
  },
});
