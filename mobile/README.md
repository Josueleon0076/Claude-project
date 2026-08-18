# App móvil — Reloj Checador

App en Expo (React Native) para registrar entrada/salida usando el lector de
huella digital (o Face ID) del celular.

## Requisitos

- Node.js 18+
- App **Expo Go** en tu celular (o un build de desarrollo), para poder
  probar el sensor de huella real. `npx expo start --web` funciona para ver
  la interfaz, pero el navegador no puede simular la huella digital.

## Instalación

```bash
npm install
```

Configura la URL del backend en `src/config.js` (o exporta
`EXPO_PUBLIC_API_URL`). Si pruebas en un celular físico **no uses
`localhost`**: usa la IP de tu computadora en la red Wi-Fi, por ejemplo:

```bash
export EXPO_PUBLIC_API_URL="http://192.168.1.20:3000/api"
npx expo start
```

Escanea el QR con la app **Expo Go**.

## Estructura

```
App.js
src/
  api/client.js        cliente axios + manejo del token (expo-secure-store)
  config.js             URL del backend
  context/AuthContext.js sesión del empleado
  db/localDb.js          base de datos local (expo-sqlite) — offline first
  sync/syncRecords.js     envía al backend los registros pendientes
  navigation/             pestañas Checar / Historial
  screens/
    LoginScreen.js
    HomeScreen.js         pantalla principal: reloj + botón de huella
    HistoryScreen.js       historial de checadas del empleado
```

## Flujo de checado

1. `expo-local-authentication` verifica que el celular tenga sensor y
   huellas/Face ID registradas, y muestra el prompt nativo del sistema.
2. Al validarse, se guarda el registro en SQLite local (`src/db/localDb.js`)
   de inmediato, así que **nunca se pierde un checado por falta de
   internet**.
3. En paralelo se intenta enviar al backend (`src/sync/syncRecords.js`).
   Si falla, el registro queda marcado como "pendiente" y se reintenta la
   próxima vez que se abra la pantalla de Checar o Historial.

## Generar la app instalable (build)

Cuando quieras un `.apk`/`.aab` o `.ipa` para instalar sin Expo Go:

```bash
npm install -g eas-cli
eas build --platform android   # o ios
```

(Requiere una cuenta gratuita de Expo/EAS).
