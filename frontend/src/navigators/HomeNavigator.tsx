import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
import { DetailsScreen, HomeScreen } from "../screens";
import { TopBar } from "../components/top-bar/top-bar-feature";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuthorization } from "../utils/useAuthorization";

export type HomeStackParamList = {
  Home: undefined;
  Details: { userAddress: string };
};

const Tab = createBottomTabNavigator<HomeStackParamList>();

export function HomeNavigator() {
  const theme = useTheme();
  const { selectedAccount } = useAuthorization();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: (props) => <TopBar {...props} />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: theme.colors.elevation.level2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof MaterialCommunityIcon>['name'] = 'home';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Details') {
            iconName = focused ? 'account-details' : 'account-details-outline';
          }
          return <MaterialCommunityIcon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
      />
      <Tab.Screen 
        name="Details" 
        component={DetailsScreen}
        initialParams={{ userAddress: selectedAccount?.publicKey.toBase58() }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!selectedAccount) {
              e.preventDefault();
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}
