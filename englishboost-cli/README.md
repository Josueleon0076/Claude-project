# EnglishBoost CLI 🇬🇧🚀

Aplicación de consola para aprender inglés desde **A1** hasta **B2/C1 profesional**, orientada a conseguir trabajo remoto e internacional. Sesiones de 5-10 minutos, explicaciones en español cada vez que te equivocas y repaso inteligente de lo que más te cuesta.

## Instalación

```bash
cd englishboost-cli
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m englishboost
```

Opciones:

| Opción | Descripción |
|---|---|
| `--offline` | No usa la API de Claude aunque haya credenciales |
| `--db RUTA` | Usa otro archivo SQLite (por defecto `~/.englishboost/englishboost.db`, o la variable `ENGLISHBOOST_DB`) |

### Activar la IA (opcional)

Sin conexión, la app funciona con todo su contenido offline. Para tener feedback personalizado y conversaciones en tiempo real con Claude:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."         # o: ant auth login
export ENGLISHBOOST_MODEL="claude-opus-5-5"   # opcional, es el modelo por defecto
```

Las respuestas llegan en streaming. Si el modelo rechaza una petición, el parámetro `fallbacks: "default"` la reenvía automáticamente a otro modelo, sin cambiar nada en tu código.

## Menú principal

```
1. 📘 Lección / Práctica del Día     → la siguiente lección de tu nivel (o la que peor llevas)
2. 🃏 Repaso de Tarjetas (SRS)       → vocabulario y traducciones falladas, con algoritmo SM-2
3. 🎤 Entrevista / Conversación      → banco STAR, entrevistador IA, role-plays, corrección de correos
4. 📈 Mi Progreso y Estadísticas     → XP, racha, precisión, temas débiles, palabras difíciles
5. 🏅 Mis Logros y Medallas          → 26 logros (bronce / plata / oro) con barra de progreso
6. 📚 Explorar todas las lecciones
7. ⚙️  Ajustes                        → nombre, nivel, modo offline, test de nivel
```

## Estructura pedagógica

| Fase | Contenido | Tipos de ejercicio |
|---|---|---|
| **A1-A2 Fundamentos** (8 lecciones) | to be, presente simple y continuo, pasado simple, futuro (will / going to), can / have to / should, comparativos, there is/are, preposiciones in/on/at | opción múltiple, traducción, ordenar palabras, completar |
| **B1 Fluidez operacional** (7 lecciones) | presente perfecto, condicionales 0/1/2, phrasal verbs y modismos, pasado continuo, gerundio vs infinitivo, voz pasiva, relativos y estilo indirecto | lo anterior + comprensión lectora |
| **B2-C1 Profesional / remoto** (7 lecciones) | reuniones y gestión de proyectos, correos profesionales, logros con STAR, feedback y desacuerdo diplomático, presentaciones técnicas, negociación salarial, 3er condicional / wish / should have | lo anterior + entrevista y corrección de textos |

- Una lección se completa al obtener **≥ 70 %**. Si completas todas las de tu nivel, la app te propone subir de nivel (+100 XP).
- Cada error muestra la regla en español. Con la IA activa puedes pedir además una **explicación ampliada**.
- Las traducciones que fallas se convierten en tarjetas de repaso.
- **XP**: 10 por acierto, +20 si la sesión es perfecta, 5 por tarjeta repasada y por turno de conversación.

## Logros y medallas 🏅

Al volver al menú, la app revisa tu progreso y celebra los logros nuevos. Cada logro da XP extra: 🥉 bronce +25, 🥈 plata +50, 🥇 oro +100.

| Categoría | Ejemplos |
|---|---|
| Medallas de nivel | Completar todas las lecciones de A1-A2 (bronce), B1 (plata) y B2-C1 (oro) |
| Lecciones | Primeros pasos, 5 y 12 lecciones, Graduado EnglishBoost (todas) |
| Precisión | 1, 5 y 15 lecciones al 100% |
| Constancia | Rachas de 3, 7 y 30 días; 60 y 600 minutos de estudio |
| Experiencia | 500, 2,000 y 5,000 XP |
| Vocabulario | 25 palabras en el mazo, 100 tarjetas acertadas, 50 palabras dominadas |
| Profesional | Entrevistas, correos corregidos y conversaciones con la IA |

Los logros se calculan a partir de tu historial, así que si ya tenías progreso se desbloquean automáticamente. Para añadir uno nuevo, agrega una entrada en `englishboost/achievements.py`.

## Usarla en el celular (Android)

La app es de terminal, así que no se empaqueta como APK tal cual, pero funciona en Android con **Termux**:

1. Instala Termux desde F-Droid (la versión de Google Play está desactualizada).
2. En Termux:
   ```bash
   pkg update && pkg install python git
   git clone <url-de-este-repo> && cd Claude-project/englishboost-cli
   pip install rich
   python -m englishboost --offline
   ```
3. Opcional, para la IA: `pip install anthropic` (si la instalación falla en tu dispositivo, la app sigue funcionando offline).

Tu progreso se guarda en el celular (`~/.englishboost/englishboost.db` dentro de Termux).

## Estructura del proyecto

```
englishboost-cli/
├── requirements.txt
├── englishboost/
│   ├── __main__.py          # python -m englishboost
│   ├── app.py               # menú y flujos (lecciones, repaso, entrevistas, estadísticas)
│   ├── ui.py                # helpers de interfaz con rich
│   ├── db.py                # SQLite: perfil, progreso, vocabulario, intentos, sesiones
│   ├── srs.py               # repetición espaciada (SM-2)
│   ├── achievements.py      # logros y medallas
│   ├── exercises.py         # corrección de respuestas (contracciones, typos, mayúsculas)
│   ├── offline_feedback.py  # feedback heurístico de entrevistas y correos sin IA
│   ├── ai.py                # integración con Claude (feedback, entrevistador, role-play)
│   ├── content.py           # carga del contenido
│   └── data/
│       ├── lessons/         # a1_a2*.json, b1*.json, b2_c1*.json (22 lecciones, 132 ejercicios)
│       └── interview.json   # banco de preguntas con consejos y respuestas modelo
└── tests/test_core.py
```

### Añadir lecciones

Crea o amplía un archivo en `englishboost/data/lessons/`. Cada ejercicio necesita `id`, `type` (`mcq`, `reading`, `translate`, `reorder`, `fill`), `topic` y `explanation` (en español). Los tests validan automáticamente que cada ejercicio esté bien formado:

```bash
pip install pytest && python -m pytest -q
```
