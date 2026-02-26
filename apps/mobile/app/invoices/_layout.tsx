import { Stack } from 'expo-router';

export default function InvoicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="create" options={{ title: 'New Invoice' }} />
      <Stack.Screen name="[id]" options={{ title: 'Invoice Details' }} />
    </Stack>
  );
}
