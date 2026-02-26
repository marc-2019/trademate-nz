import { Stack } from 'expo-router';

export default function QuotesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Quotes' }} />
      <Stack.Screen name="create" options={{ title: 'New Quote' }} />
      <Stack.Screen name="[id]" options={{ title: 'Quote Details' }} />
    </Stack>
  );
}
