# Agenda de Cajas

App móvil (Expo / React Native) de agenda para una **jefatura de cajas**: cada
actividad tiene hora, prioridad y categoría, y cuando se vence la app
**insiste con una notificación cada 5 minutos hasta que se marque como
completada**.

| Día | Semana | Mes | Nueva actividad |
| --- | --- | --- | --- |
| ![Día](docs/dia.png) | ![Semana](docs/semana.png) | ![Mes](docs/mes.png) | ![Nueva](docs/nueva.png) |

## Funciones

- **Vista por día, semana y mes**, con flechas para moverse y botón *Hoy*.
  - **Día:** barra de avance (x de y completadas), secciones *Vencidas*,
    *Por hacer* y *Completadas*, y barra de **alta rápida** (escribe y Enter).
  - **Semana:** los 7 días con su avance, número de vencidas y la lista
    compacta de actividades (se pueden completar desde ahí).
  - **Mes:** calendario con contador de pendientes por día (rojo = con
    vencidas, verde = todo listo) y puntos de color por prioridad.
- **Recordatorios insistentes:** a la hora de la actividad llega "⏰ Es hora";
  si no se completa, cada 5 min llega "🔴 Pendiente…". Si hay varias vencidas
  se agrupan en un solo aviso para no saturar.
  - Botones en la notificación: **✅ Completada** y **⏸ Posponer 15 min**.
  - Intervalo configurable (5, 10 o 15 min) y aviso previo opcional.
- **Prioridad** (alta/media/baja), **categorías** propias del puesto (arqueo,
  corte, fondos/morralla, valores, cajeros, reporte, junta) y **plantillas**
  de actividades comunes.
- **Repetición:** diario, lunes a viernes, semanal o mensual. Al eliminar una
  actividad que se repite se puede borrar solo ese día o toda la serie.
- Mantener presionada una actividad la **pospone 15 min**.
- Todo se guarda en el teléfono (no requiere internet ni servidor).

## Cómo probarla

```bash
cd agenda
npm install
npx expo start
```

Escanea el QR con **Expo Go** (Android/iOS) y acepta el permiso de
notificaciones. En la pantalla vacía puedes tocar **"Cargar un día de
ejemplo"** para ver la app con actividades típicas. En ⚙️ hay un botón para
enviar una notificación de prueba.

Para instalarla como app independiente (sin Expo Go) usa EAS Build:
`npx eas-cli@latest build:configure` y después
`npx eas-cli@latest build --platform android`.

## Limitaciones a tener en cuenta

- iOS permite que una app tenga como máximo 64 notificaciones programadas
  (Android, varios cientos). La app programa una ventana de avisos
  (~5 h en iPhone, ~12 h en Android a 5 min) y la **renueva cada vez que se
  abre**; abrirla de vez en cuando durante la jornada basta.
- En Android conviene permitir *Alarmas y recordatorios* y quitar la
  optimización de batería para la app para que los avisos sean puntuales.
- Las actividades que se repiten dejan de insistir al terminar su día (quedan
  como "No completadas"); las actividades únicas insisten hasta completarse.
- En el navegador (`expo start --web`) la app funciona, pero sin
  notificaciones.

## Estructura

```
App.js                       Encabezado, selector Día/Semana/Mes, navegación
src/store/TasksContext.js    Estado, guardado local y acciones desde notificaciones
src/logic/occurrences.js     Repeticiones y estado por día
src/logic/reminderPlan.js    Cálculo de qué avisos programar (función pura)
src/logic/notifications.js   Permisos, canal Android, botones y programación
src/views/                   DayView, WeekView, MonthView
src/components/              Tarjeta de actividad, formulario, ajustes…
```
