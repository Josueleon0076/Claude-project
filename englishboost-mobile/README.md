# EnglishBoost Mobile 📱

Versión para celular (Android / iOS) de [EnglishBoost CLI](../englishboost-cli), hecha con **Expo (React Native)**. Funciona **100% offline**: las lecciones vienen dentro de la app y tu progreso se guarda en el teléfono.

## Qué incluye

- **Lección del día:** las 22 lecciones de la CLI (A1-A2, B1, B2-C1). Las respuestas se marcan tocando opciones, se ordenan palabras tocando fichas y se completan o traducen escribiendo. Cada error muestra la explicación en español.
- **Repaso de tarjetas** con repetición espaciada (SM-2): el vocabulario de las lecciones y las traducciones falladas.
- **Simulación de entrevista:** 8 preguntas STAR con consejo, feedback offline y respuesta modelo.
- **Revisar correo o mensaje:** saludo, cierre, cortesía y falsos amigos como *actually*.
- **Mi progreso:** XP, racha, precisión, avance por nivel, temas débiles y últimas sesiones.
- **Logros y medallas:** 24 logros (bronce, plata y oro) con ventana de celebración y XP extra.
- **Test de nivel** al empezar y **subida de nivel** al completar todas las lecciones de un nivel.

No incluye las funciones que requieren IA (conversación en vivo, entrevistador IA, explicación ampliada). Agregarlas requiere un servidor que guarde la clave de la API.

## Probarla en tu celular (rápido, sin compilar)

1. Instala **Expo Go** desde Google Play o la App Store.
2. En tu computadora:
   ```bash
   cd englishboost-mobile
   npm install
   npx expo start
   ```
3. Escanea el código QR con Expo Go (en iPhone, con la cámara). El celular y la computadora deben estar en la misma red Wi-Fi.

## Generar el APK para Android

El APK se compila en la nube con **EAS Build**, el servicio de Expo. No necesitas Android Studio.

1. Crea una cuenta gratuita en <https://expo.dev/signup>.
2. Compila:
   ```bash
   cd englishboost-mobile
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest build --platform android --profile preview
   ```
   La primera vez te pedirá crear el proyecto en tu cuenta y generar la llave de firma. Acepta las opciones por defecto.
3. Al terminar (unos 10-20 minutos) verás un enlace y un QR. Ábrelo en el celular, descarga el `.apk` e instálalo. Android te pedirá permitir "instalar apps de origen desconocido".

El perfil `preview` de `eas.json` genera un `.apk` instalable directamente. El perfil `production` genera un `.aab`, que es lo que pide Google Play si algún día la publicas.

## Desarrollo

```bash
npm test               # pruebas de la lógica (corrección, SM-2, racha, logros, feedback)
npm run sync-content   # copia las lecciones desde ../englishboost-cli tras editarlas
npm run export:android # compila el bundle de JavaScript para verificar que no hay errores
```

Las lecciones de la CLI son la fuente única. Si agregas lecciones allí, ejecuta `npm run sync-content`. Si además creaste un archivo JSON nuevo, impórtalo en `src/content.js`. Un test avisa si las copias quedaron desactualizadas.

```
englishboost-mobile/
├── app.json / eas.json          # configuración de la app y del APK
├── src/
│   ├── app/                     # pantallas (Expo Router: cada archivo es una ruta)
│   │   ├── _layout.js           # navegación + proveedor de progreso + modal de logros
│   │   ├── index.js             # bienvenida / inicio
│   │   ├── lesson/[id].js       # lección: vocabulario → ejercicios → resultado
│   │   ├── review.js, interview.js, writing.js
│   │   └── stats.js, achievements.js, lessons.js, settings.js, placement.js
│   ├── components/              # UI reutilizable, ejercicio interactivo, modal de logros
│   ├── logic/                   # lógica pura portada de la CLI (sin React)
│   ├── store/ProgressContext.js # carga y guarda el progreso (AsyncStorage)
│   ├── content.js               # índice del contenido
│   └── data/                    # copia de las lecciones de la CLI
├── scripts/sync-content.mjs
└── tests/logic.test.mjs
```
