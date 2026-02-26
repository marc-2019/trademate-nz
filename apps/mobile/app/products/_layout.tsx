import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Products & Services' }} />
      <Stack.Screen name="create" options={{ title: 'New Product' }} />
      <Stack.Screen name="[id]" options={{ title: 'Product Details' }} />
    </Stack>
  );
}
