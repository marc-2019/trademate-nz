import { Stack } from 'expo-router';

export default function BankLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Bank Transactions' }} />
      <Stack.Screen name="upload" options={{ title: 'Upload Statement' }} />
    </Stack>
  );
}
