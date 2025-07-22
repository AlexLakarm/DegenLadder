import { createBottomTabNavigator, BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from "react-native-paper";
import { DetailsScreen, HomeScreen } from "../screens";
import { TopBar } from "../components/top-bar/top-bar-feature";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuthorization } from "../utils/useAuthorization";
import Top10BuysScreen from '../screens/Top10BuysScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';

export type HomeStackParamList = {
  HomeTabs: undefined;
  Top10Buys: undefined;
  PrivacyPolicy: undefined;
  Details: { userAddress: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeTabs() {
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
        initialParams={{ userAddress: undefined }}
      />
    </Tab.Navigator>
  );
}

export function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeTabs" component={HomeTabs} />
      <Stack.Screen name="Top10Buys" component={Top10BuysScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
