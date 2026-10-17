import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AchievementModal from '../components/AchievementModal';
import { colors } from '../components/ui';
import { ProgressProvider } from '../store/ProgressContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProgressProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'EnglishBoost' }} />
          <Stack.Screen name="lesson/[id]" options={{ title: 'Lección' }} />
          <Stack.Screen name="review" options={{ title: 'Repaso de tarjetas' }} />
          <Stack.Screen name="interview" options={{ title: 'Entrevista de trabajo' }} />
          <Stack.Screen name="writing" options={{ title: 'Revisar correo / mensaje' }} />
          <Stack.Screen name="stats" options={{ title: 'Mi progreso' }} />
          <Stack.Screen name="achievements" options={{ title: 'Logros y medallas' }} />
          <Stack.Screen name="lessons" options={{ title: 'Todas las lecciones' }} />
          <Stack.Screen name="settings" options={{ title: 'Ajustes' }} />
          <Stack.Screen name="placement" options={{ title: 'Test de nivel' }} />
        </Stack>
        <AchievementModal />
      </ProgressProvider>
    </SafeAreaProvider>
  );
}
