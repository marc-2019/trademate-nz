import { Stack } from 'expo-router';

export default function CustomersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Customers' }} />
      <Stack.Screen name="create" options={{ title: 'New Customer' }} />
      <Stack.Screen name="[id]" options={{ title: 'Customer Details' }} />
    </Stack>
  );
}
