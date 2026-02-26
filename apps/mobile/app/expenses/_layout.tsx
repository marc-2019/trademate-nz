import { Stack } from 'expo-router';

export default function ExpensesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Expenses' }} />
      <Stack.Screen name="create" options={{ title: 'New Expense' }} />
      <Stack.Screen name="[id]" options={{ title: 'Expense Details' }} />
    </Stack>
  );
}
