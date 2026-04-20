import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="blog" />
      <Tabs.Screen name="nearby" />
      <Tabs.Screen name="scan-qr" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}