import { Stack } from 'expo-router';

export default function CertificationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Certifications' }} />
      <Stack.Screen name="add" options={{ title: 'Add Certification' }} />
      <Stack.Screen name="[id]" options={{ title: 'Certification Details' }} />
    </Stack>
  );
}
