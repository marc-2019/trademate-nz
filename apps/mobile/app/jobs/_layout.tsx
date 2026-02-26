import { Stack } from 'expo-router';

export default function JobsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Job Logs' }} />
      <Stack.Screen name="create" options={{ title: 'New Job' }} />
      <Stack.Screen name="[id]" options={{ title: 'Job Details' }} />
    </Stack>
  );
}
