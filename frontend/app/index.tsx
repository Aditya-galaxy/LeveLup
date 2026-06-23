// LevelUp entry — redirects to onboarding or main tabs.
import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Redirect } from "expo-router";
import { useStore } from "@/src/store/levelup";
import { colors } from "@/src/theme";

export default function Index() {
  const { state } = useStore();

  // Tiny delay for store hydration
  useEffect(() => {}, []);

  if (!state) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return state.onboarded ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/onboarding" />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
