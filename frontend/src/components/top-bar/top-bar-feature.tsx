import { StyleSheet, View } from "react-native";
import { Appbar, useTheme } from "react-native-paper";
import { TopBarWalletMenu, TopBarLogo } from "./top-bar-ui";
import { useNavigation } from "@react-navigation/core";

export function TopBar() {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <View style={styles.topBar}>
      <TopBarLogo />
      <View style={styles.rightSection}>
        <TopBarWalletMenu />
        <Appbar.Action
          icon="cog"
          mode="contained-tonal"
          onPress={() => {
            navigation.navigate("Settings");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    alignItems: "center",
    paddingHorizontal: 8,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
