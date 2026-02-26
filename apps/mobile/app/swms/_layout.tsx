import { Stack } from 'expo-router';

export default function SwmsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="generate" options={{ title: 'Generate SWMS' }} />
      <Stack.Screen name="[id]" options={{ title: 'SWMS Details' }} />
    </Stack>
  );
}
