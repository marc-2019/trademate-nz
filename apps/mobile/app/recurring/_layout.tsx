import { Stack } from 'expo-router';

export default function RecurringLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Recurring Invoices' }} />
      <Stack.Screen name="create" options={{ title: 'New Recurring Invoice' }} />
      <Stack.Screen name="generate" options={{ title: 'Generate Invoices' }} />
      <Stack.Screen name="[id]" options={{ title: 'Recurring Invoice' }} />
    </Stack>
  );
}
