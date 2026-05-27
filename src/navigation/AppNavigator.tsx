import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LobbyScreen from "../screens/LobbyScreen";
import LoadingScreen from "../screens/LoadingScreen";
import TreatmentScreen from "../screens/TreatmentScreen";
import UpgradesScreen from "../screens/UpgradesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import NotFoundScreen from "../screens/NotFoundScreen";

export type RootStackParamList = {
  Loading: undefined;
  Lobby: undefined;
  Treatment: { patientType: string; tutorial?: boolean };
  Upgrades: undefined;
  Profile: undefined;
  NotFound: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Loading"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="Treatment" component={TreatmentScreen} />
        <Stack.Screen name="Upgrades" component={UpgradesScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
