# Teleprompter para Reels

Teleprompter sencillo para leer guiones mientras se graba con otro teléfono.
**Solo muestra el texto; no graba video.**

Configuración pensada:

| Dispositivo | Papel | Cómo se usa |
|---|---|---|
| Xiaomi 15 | Graba el Reel | Con su cámara normal |
| Oppo (Android) | Muestra el texto | Instalar la **APK** |
| iPad 3ª generación (iOS 9) | Muestra el texto | Abrir **index.html** en Safari (las iPad no instalan APK) |

La APK y la versión web son **la misma app**: `web/index.html` es un solo archivo
(HTML + CSS + JavaScript ES5, compatible con el Safari de iOS 9) y la APK
(`android/`) solo lo muestra en pantalla completa.

## Funciones

- Guiones guardados en el dispositivo: crear, editar y borrar.
- Desplazamiento automático en **palabras por minuto** (60–300 ppm) y tiempo
  estimado de lectura para calcular la duración del Reel.
- Tamaño de letra, interlineado, ancho del texto y alineación ajustables.
- Línea guía con flechas a la altura que elijas (colócala cerca de la cámara).
- Cuenta regresiva de 0, 3 o 5 segundos.
- Indicaciones entre corchetes, como `[PAUSA]` o `[SONRÍE]`, resaltadas en
  amarillo y excluidas del conteo de palabras.
- Modo espejo horizontal o vertical (para teleprompter con vidrio).
- Colores blanco sobre negro, amarillo sobre negro o negro sobre blanco.
- Barra de progreso y tiempo restante.

### Controles durante la lectura

| Acción | Pantalla | Teclado / control Bluetooth | APK (Android) |
|---|---|---|---|
| Leer / pausar | Tocar | Espacio, Enter, AvPág, → | Volumen + |
| Retroceder 2 líneas | Arrastrar | RePág, ← | Volumen − |
| Más / menos velocidad | Botones + / − | ↑ / ↓ | — |
| Letra más grande / chica | A+ / A− | + / − | — |
| Salir | ✕ Salir | Esc | Atrás |

Los controles Bluetooth baratos tipo "disparador de selfie" envían Volumen +,
así que en la APK funcionan como botón de leer/pausar.

## Instalar en el Oppo (APK)

1. En GitHub, ve a **Releases → "Teleprompter (última versión)"** y descarga
   `Teleprompter.apk` desde el Oppo. (También queda como *artifact* en la
   pestaña **Actions → Teleprompter**.)
2. Ábrelo y permite *"Instalar apps desconocidas"* para el navegador o el
   gestor de archivos cuando lo pida.
3. Requiere Android 5.0 o superior.

La APK se compila automáticamente con GitHub Actions
(`.github/workflows/teleprompter.yml`) cada vez que cambia algo en
`teleprompter/`. Para compilarla localmente con Android Studio, abre la carpeta
`android/` (o ejecuta `gradle assembleDebug` en ella).

## Usar en la iPad 3 (iOS 9)

La iPad solo necesita abrir `index.html` en Safari. Algunas opciones:

- **Página web publicada:** sube `web/index.html` a cualquier hosting estático
  (GitHub Pages, Netlify Drop, etc.), ábrelo en Safari y usa
  **Compartir → Añadir a pantalla de inicio** para que se abra como app en
  pantalla completa.
- **Desde el Release:** el mismo Release incluye `index.html`.

Recomendaciones para la iPad:
- **Ajustes → General → Bloqueo automático → Nunca**, porque iOS 9 no permite
  que una página web mantenga la pantalla encendida.
- Los guiones se guardan en el Safari de la iPad. No se comparten con el Oppo:
  cada dispositivo tiene su propia lista.

## Consejos para grabar

- Pon el dispositivo del texto **justo detrás o debajo del Xiaomi**, lo más
  cerca posible del lente, para que la mirada parezca ir a la cámara.
- Usa letra grande (60–80 px) y un ancho del 70–80 %: menos movimiento de ojos.
- Empieza con 130–150 ppm y ajusta con + / − según el ritmo natural de quien lee.
