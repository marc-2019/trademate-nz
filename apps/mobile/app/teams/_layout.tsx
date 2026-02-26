import { Stack } from 'expo-router';

export default function TeamsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Team' }} />
      <Stack.Screen name="[id]" options={{ title: 'Team Member' }} />
    </Stack>
  );
}
