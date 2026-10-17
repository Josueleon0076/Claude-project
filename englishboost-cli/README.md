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
5. 📚 Explorar todas las lecciones
6. ⚙️  Ajustes                        → nombre, nivel, modo offline, test de nivel
```

## Estructura pedagógica

| Fase | Contenido | Tipos de ejercicio |
|---|---|---|
| **A1-A2 Fundamentos** | to be, presente simple, pasado simple, futuro (will / going to), vocabulario de oficina y tecnología | opción múltiple, traducción, ordenar palabras, completar |
| **B1 Fluidez operacional** | presente perfecto, condicionales 0/1/2, phrasal verbs, modismos de trabajo | lo anterior + comprensión lectora |
| **B2-C1 Profesional / remoto** | reuniones y gestión de proyectos, correos con tono profesional, logros con el método STAR | lo anterior + entrevista y corrección de textos |

- Una lección se completa al obtener **≥ 70 %**. Si completas todas las de tu nivel, la app te propone subir de nivel (+100 XP).
- Cada error muestra la regla en español. Con la IA activa puedes pedir además una **explicación ampliada**.
- Las traducciones que fallas se convierten en tarjetas de repaso.
- **XP**: 10 por acierto, +20 si la sesión es perfecta, 5 por tarjeta repasada y por turno de conversación.

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
│   ├── exercises.py         # corrección de respuestas (contracciones, typos, mayúsculas)
│   ├── offline_feedback.py  # feedback heurístico de entrevistas y correos sin IA
│   ├── ai.py                # integración con Claude (feedback, entrevistador, role-play)
│   ├── content.py           # carga del contenido
│   └── data/
│       ├── lessons/         # a1_a2.json, b1.json, b2_c1.json
│       └── interview.json   # banco de preguntas con consejos y respuestas modelo
└── tests/test_core.py
```

### Añadir lecciones

Crea o amplía un archivo en `englishboost/data/lessons/`. Cada ejercicio necesita `id`, `type` (`mcq`, `reading`, `translate`, `reorder`, `fill`), `topic` y `explanation` (en español). Los tests validan automáticamente que cada ejercicio esté bien formado:

```bash
pip install pytest && python -m pytest -q
```
