# Token Roll Manager para Owlbear Rodeo

## Objetivo del proyecto

Crear una extensión para **Owlbear Rodeo** que permita asociar tokens a jugadores y ejecutar tiradas configurables desde esos tokens.

La extensión debe funcionar como un **gestor editable de tiradas por token**, no como un conjunto fijo de reglas hardcodeadas.

La idea principal es:

- Agregar un token al mapa.
- Asignar ese token a un jugador.
- Guardar datos del personaje en el token.
- Configurar tiradas editables desde el menú principal.
- Permitir que el jugador o el GM ejecute tiradas desde el token.
- Usar Dice+ para mostrar la animación de dados.
- Actualizar el estado del token según el resultado de la tirada.

Ejemplos de tiradas:

- Tirada de muerte.
- Salvación contra frío extremo.
- Duración de ventisca.
- Hambre.
- Forrajeo.
- Escarcha acumulativa.
- Tiradas personalizadas de campaña.

---

# Nombre sugerido

## Token Roll Manager

Otros nombres posibles:

- Frost Rolls
- Adventurer Actions
- Token Actions
- Icewind Token Tools

---

# Concepto general

La extensión debe tener dos niveles de uso:

## 1. Menú principal

Usado principalmente por el GM.

Permite:

- Crear tiradas.
- Editar tiradas.
- Borrar tiradas.
- Importar/exportar presets.
- Configurar integración con Dice+.
- Configurar permisos.
- Ver tokens asignados.
- Configurar datos básicos de personajes.

## 2. Menú rápido del token

Usado por jugadores y GM.

Se abre al interactuar con un token asignado.

Debe mostrar solamente las tiradas disponibles para ese token/personaje.

Ejemplo:

```txt
Thorek

❄️ Frío extremo
💀 Tirada de muerte
🌨️ Duración de ventisca
🍖 Forrajeo
🎲 Tirada personalizada
```

---

# Stack técnico recomendado

Usar:

- Vite
- TypeScript
- React
- Owlbear Rodeo SDK
- Dice+ vía `OBR.broadcast`

Dependencias principales:

```bash
npm create vite@latest token-roll-manager
cd token-roll-manager
npm install
npm install @owlbear-rodeo/sdk
```

Opcional:

```bash
npm install nanoid
```

---

# Estructura sugerida del proyecto

```txt
token-roll-manager/
├─ package.json
├─ index.html
├─ public/
│  ├─ manifest.json
│  ├─ icon.svg
│  └─ icons/
│     ├─ token-roll.svg
│     ├─ assign.svg
│     └─ dice.svg
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ constants.ts
│  ├─ types.ts
│  ├─ obr/
│  │  ├─ registerContextMenu.ts
│  │  ├─ registerTool.ts
│  │  ├─ metadata.ts
│  │  └─ dicePlus.ts
│  ├─ components/
│  │  ├─ MainMenu.tsx
│  │  ├─ RollList.tsx
│  │  ├─ RollEditor.tsx
│  │  ├─ TokenQuickMenu.tsx
│  │  ├─ TokenAssignment.tsx
│  │  └─ CharacterEditor.tsx
│  ├─ presets/
│  │  └─ icewindDalePreset.ts
│  └─ utils/
│     ├─ formulaResolver.ts
│     ├─ rollEffects.ts
│     └─ permissions.ts
```

---

# Manifest de Owlbear

Crear `public/manifest.json`:

```json
{
  "name": "Token Roll Manager",
  "version": "1.0.0",
  "manifest_version": 1,
  "description": "Editable token-based roll manager for Owlbear Rodeo with Dice+ integration.",
  "author": "Seba",
  "action": {
    "title": "Token Rolls",
    "icon": "/icon.svg",
    "popover": "/",
    "height": 600,
    "width": 420
  }
}
```

---

# IDs y metadata

Usar un ID único para evitar conflictos con otras extensiones.

```ts
export const EXTENSION_ID = "cl.seba.token-roll-manager";

export const ROLLS_METADATA_KEY = `${EXTENSION_ID}/rolls`;
export const CHARACTER_METADATA_KEY = `${EXTENSION_ID}/character`;
export const SETTINGS_METADATA_KEY = `${EXTENSION_ID}/settings`;
```

## Dónde guardar cada cosa

### Metadata de sala o escena

Guardar aquí las tiradas configuradas y ajustes globales.

```txt
cl.seba.token-roll-manager/rolls
cl.seba.token-roll-manager/settings
```

### Metadata del token

Guardar aquí los datos del personaje asociado al token.

```txt
cl.seba.token-roll-manager/character
```

---

# Tipos principales

Crear `src/types.ts`.

```ts
export type RollType =
  | "normal"
  | "save"
  | "death_save"
  | "table"
  | "custom";

export type RollVisibility =
  | "everyone"
  | "gm_only"
  | "owner_and_gm";

export type RollTarget =
  | "selected_token"
  | "self"
  | "none";

export type ResultMode =
  | "public"
  | "private"
  | "gm_only";

export type EffectCondition =
  | "success"
  | "failure"
  | "natural_1"
  | "natural_20"
  | "always";

export type EffectOperation =
  | "increment"
  | "decrement"
  | "set";

export type RollEffect = {
  id: string;
  condition: EffectCondition;
  message: string;
  updateToken?: {
    field: string;
    operation: EffectOperation;
    value: number | string | boolean;
  };
};

export type RollConfig = {
  id: string;
  name: string;
  icon: string;
  formula: string;
  description?: string;
  type: RollType;
  dc?: number;
  visibility: RollVisibility;
  target: RollTarget;
  resultMode: ResultMode;
  effects: RollEffect[];
};

export type DeathSaves = {
  success: number;
  failure: number;
};

export type ColdState = {
  exhaustion: number;
  frost: number;
  hasColdWeatherClothing: boolean;
  wetClothing: boolean;
};

export type CharacterMetadata = {
  ownerPlayerId: string;
  ownerPlayerName: string;
  characterName: string;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
    proficiencyBonus: number;
  };
  skills?: Record<string, number>;
  deathSaves: DeathSaves;
  cold: ColdState;
};

export type ExtensionSettings = {
  useDicePlus: boolean;
  allowPlayersToUseOwnedTokens: boolean;
  allowGmToUseAllTokens: boolean;
  defaultResultMode: ResultMode;
};
```

---

# Menú principal

El menú principal debe abrirse desde el botón de la extensión en Owlbear.

Debe tener secciones:

```txt
Token Roll Manager

[Personajes]
- Token seleccionado
- Asignar token a jugador
- Editar personaje
- Limpiar asignación

[Tiradas]
- Lista de tiradas
- Nueva tirada
- Editar tirada
- Borrar tirada
- Cargar preset Icewind Dale
- Importar preset
- Exportar preset

[Configuración]
- Usar Dice+
- Mostrar resultados públicos/privados
- Permisos de jugadores
```

---

# Editor de tiradas

Cada tirada debe ser editable desde el menú principal.

Campos requeridos:

```txt
Nombre
Icono
Fórmula
Descripción
Tipo
CD
Objetivo
Visibilidad
Modo de resultado
Efectos
```

Ejemplo visual:

```txt
EDITAR TIRADA

Nombre:
[ Frío extremo ]

Icono:
[ ❄️ ]

Fórmula:
[ 1d20 + CON ]

Tipo:
[ Salvación ]

CD:
[ 10 ]

Objetivo:
[ Token seleccionado ]

Permisos:
[ Dueño del token y GM ]

Resultado:
[ Público ]

EFECTOS
Si éxito:
[ Resiste el frío extremo. ]

Si falla:
[ Gana 1 nivel de agotamiento. ]
[ updateToken: cold.exhaustion + 1 ]

[Guardar] [Cancelar]
```

---

# Fórmulas editables

Las fórmulas deben aceptar texto como:

```txt
1d20
1d20 + CON
1d20 + DEX
1d20 + WIS + PROF
2d4
1d6
1d20 + SURVIVAL
1d20 + CON + COLD_BONUS
```

## Resolución de variables

Antes de enviar la tirada a Dice+, la extensión debe reemplazar variables por valores numéricos del token.

Ejemplo:

```txt
1d20 + CON
```

Si el personaje tiene CON `+2`, enviar:

```txt
1d20+2
```

Variables mínimas:

```txt
STR
DEX
CON
INT
WIS
CHA
PROF
```

Variables opcionales:

```txt
SURVIVAL
PERCEPTION
ATHLETICS
COLD_BONUS
FROST
EXHAUSTION
```

---

# Asignación de token a jugador

Debe existir una acción para asignar el token seleccionado a un jugador.

Flujo:

```txt
1. GM selecciona un token.
2. Abre menú principal o menú contextual.
3. Presiona “Asignar token”.
4. Elige jugador.
5. Escribe nombre del personaje.
6. Configura stats básicos.
7. Guarda.
```

Datos guardados en metadata del token:

```ts
const character: CharacterMetadata = {
  ownerPlayerId: "player_123",
  ownerPlayerName: "Seba",
  characterName: "Thorek",
  stats: {
    str: 1,
    dex: 0,
    con: 2,
    int: 0,
    wis: 1,
    cha: -1,
    proficiencyBonus: 2
  },
  skills: {
    survival: 3,
    perception: 1
  },
  deathSaves: {
    success: 0,
    failure: 0
  },
  cold: {
    exhaustion: 0,
    frost: 0,
    hasColdWeatherClothing: true,
    wetClothing: false
  }
};
```

---

# Menú contextual

Crear un menú contextual para tokens seleccionados.

Acciones sugeridas:

```txt
Asignar personaje
Editar personaje
Abrir tiradas
Limpiar estado
```

Solo el GM debería poder asignar y editar personajes completos.

Los jugadores solo deberían poder abrir tiradas de su propio token.

---

# Doble click sobre token

Objetivo:

- Crear una herramienta propia llamada `Token Rolls`.
- Cuando la herramienta esté activa, permitir doble click sobre un token.
- Si el token tiene personaje asignado, abrir menú rápido de tiradas.
- Si no tiene personaje asignado, mostrar advertencia.

Flujo:

```txt
Jugador activa herramienta Token Rolls.
Jugador hace doble click sobre su token.
La extensión valida permisos.
Se abre menú rápido.
Jugador elige tirada.
La extensión envía tirada a Dice+.
Dice+ muestra animación.
La extensión recibe resultado.
La extensión aplica efectos.
```

---

# Permisos

Reglas recomendadas:

```txt
GM:
- Puede ver todos los tokens asignados.
- Puede editar tiradas.
- Puede editar personajes.
- Puede tirar por cualquier token.

Jugador:
- Puede usar solo tokens asignados a su playerId.
- Puede ver solo tiradas permitidas.
- No puede editar tiradas globales.
- No puede modificar metadata sensible, salvo acciones permitidas por tiradas.
```

Función sugerida:

```ts
export async function canUseToken(character: CharacterMetadata): Promise<boolean> {
  const role = await OBR.player.getRole();
  const playerId = OBR.player.id;

  if (role === "GM") return true;

  return character.ownerPlayerId === playerId;
}
```

---

# Integración con Dice+

La extensión no debe crear la animación de dados por sí misma.

Debe enviar solicitudes a Dice+ mediante `OBR.broadcast.sendMessage`.

Canal de solicitud:

```txt
dice-plus/roll-request
```

Ejemplo:

```ts
import OBR from "@owlbear-rodeo/sdk";
import { EXTENSION_ID } from "../constants";

export async function rollWithDicePlus(params: {
  diceNotation: string;
  label: string;
  tokenId?: string;
}) {
  const playerId = OBR.player.id;
  const playerName = await OBR.player.getName();

  const rollId = `roll_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  await OBR.broadcast.sendMessage(
    "dice-plus/roll-request",
    {
      rollId,
      playerId,
      playerName,
      rollTarget: "everyone",
      diceNotation: `${params.diceNotation} # ${params.label}`,
      showResults: true,
      timestamp: Date.now(),
      source: EXTENSION_ID,
      tokenId: params.tokenId
    },
    { destination: "ALL" }
  );

  return rollId;
}
```

## Recibir resultados

Escuchar canal:

```txt
cl.seba.token-roll-manager/roll-result
```

Ejemplo:

```ts
OBR.broadcast.onMessage(`${EXTENSION_ID}/roll-result`, async (event) => {
  const data = event.data;

  // data debe incluir rollId, resultado, total, detalle de dados, etc.
  // Asociar resultado con la tirada pendiente.
  // Aplicar efectos al token si corresponde.
});
```

Importante:

- Guardar internamente qué rollId corresponde a qué token y qué RollConfig.
- Cuando llega el resultado, buscar la tirada pendiente.
- Evaluar efectos.
- Actualizar metadata del token.

---

# Aplicación de efectos

Después de recibir el resultado, evaluar:

```txt
natural_1
natural_20
success
failure
always
```

Para tiradas con CD:

```txt
success = total >= dc
failure = total < dc
```

Para tirada de muerte:

```txt
1 natural = 2 fallos
2-9 = 1 fallo
10-19 = 1 éxito
20 natural = recupera 1 PG
3 éxitos = estabilizado
3 fallos = muerte
```

La lógica debe estar en `rollEffects.ts`.

Ejemplo:

```ts
export function evaluateEffectCondition(params: {
  condition: EffectCondition;
  total: number;
  natural?: number;
  dc?: number;
}): boolean {
  const { condition, total, natural, dc } = params;

  if (condition === "always") return true;
  if (condition === "natural_1") return natural === 1;
  if (condition === "natural_20") return natural === 20;

  if (condition === "success" && typeof dc === "number") {
    return total >= dc;
  }

  if (condition === "failure" && typeof dc === "number") {
    return total < dc;
  }

  return false;
}
```

---

# Actualización de metadata del token

Permitir actualizar campos anidados como:

```txt
deathSaves.success
deathSaves.failure
cold.exhaustion
cold.frost
cold.wetClothing
```

Ejemplo de efecto:

```ts
{
  condition: "failure",
  message: "Gana 1 nivel de agotamiento.",
  updateToken: {
    field: "cold.exhaustion",
    operation: "increment",
    value: 1
  }
}
```

Función sugerida:

```ts
function applyNestedUpdate(
  object: any,
  field: string,
  operation: "increment" | "decrement" | "set",
  value: number | string | boolean
) {
  const parts = field.split(".");
  let current = object;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }

  const last = parts[parts.length - 1];

  if (operation === "set") {
    current[last] = value;
  }

  if (operation === "increment") {
    current[last] = Number(current[last] ?? 0) + Number(value);
  }

  if (operation === "decrement") {
    current[last] = Number(current[last] ?? 0) - Number(value);
  }
}
```

---

# Preset inicial: Icewind Dale

La extensión debe incluir un botón:

```txt
Cargar preset Icewind Dale
```

Este botón crea tiradas editables preconfiguradas.

## Tirada: Frío extremo

```ts
{
  id: "extreme-cold",
  name: "Frío extremo",
  icon: "❄️",
  formula: "1d20 + CON",
  description: "Salvación contra frío extremo.",
  type: "save",
  dc: 10,
  visibility: "owner_and_gm",
  target: "selected_token",
  resultMode: "public",
  effects: [
    {
      id: "cold-success",
      condition: "success",
      message: "Resiste el frío extremo."
    },
    {
      id: "cold-failure",
      condition: "failure",
      message: "Falla la salvación y gana 1 nivel de agotamiento.",
      updateToken: {
        field: "cold.exhaustion",
        operation: "increment",
        value: 1
      }
    }
  ]
}
```

## Tirada: Tirada de muerte

```ts
{
  id: "death-save",
  name: "Tirada de muerte",
  icon: "💀",
  formula: "1d20",
  description: "Tirada de salvación contra muerte.",
  type: "death_save",
  visibility: "owner_and_gm",
  target: "selected_token",
  resultMode: "public",
  effects: [
    {
      id: "death-natural-1",
      condition: "natural_1",
      message: "1 natural: suma 2 fallos de muerte.",
      updateToken: {
        field: "deathSaves.failure",
        operation: "increment",
        value: 2
      }
    },
    {
      id: "death-natural-20",
      condition: "natural_20",
      message: "20 natural: recupera 1 punto de golpe."
    },
    {
      id: "death-success",
      condition: "success",
      message: "Suma 1 éxito de muerte.",
      updateToken: {
        field: "deathSaves.success",
        operation: "increment",
        value: 1
      }
    },
    {
      id: "death-failure",
      condition: "failure",
      message: "Suma 1 fallo de muerte.",
      updateToken: {
        field: "deathSaves.failure",
        operation: "increment",
        value: 1
      }
    }
  ]
}
```

Nota: para tiradas de muerte, la evaluación debe tratar `10-19` como éxito y `2-9` como fallo. El 1 y 20 naturales tienen lógica especial.

## Tirada: Duración de ventisca

```ts
{
  id: "blizzard-duration",
  name: "Duración de ventisca",
  icon: "🌨️",
  formula: "2d4",
  description: "Duración de una ventisca en horas.",
  type: "normal",
  visibility: "gm_only",
  target: "none",
  resultMode: "gm_only",
  effects: [
    {
      id: "blizzard-result",
      condition: "always",
      message: "La ventisca dura el resultado en horas."
    }
  ]
}
```

## Tirada: Forrajeo

```ts
{
  id: "foraging",
  name: "Forrajeo",
  icon: "🍖",
  formula: "1d20 + SURVIVAL",
  description: "Buscar comida o recursos en el viaje.",
  type: "save",
  dc: 15,
  visibility: "owner_and_gm",
  target: "selected_token",
  resultMode: "public",
  effects: [
    {
      id: "foraging-success",
      condition: "success",
      message: "Encuentra recursos útiles."
    },
    {
      id: "foraging-failure",
      condition: "failure",
      message: "No encuentra recursos útiles."
    }
  ]
}
```

## Tirada: Escarcha acumulativa

```ts
{
  id: "frost-accumulation",
  name: "Escarcha acumulativa",
  icon: "🧊",
  formula: "1d20 + CON",
  description: "Regla casera para acumular escarcha por exposición extrema.",
  type: "save",
  dc: 10,
  visibility: "owner_and_gm",
  target: "selected_token",
  resultMode: "public",
  effects: [
    {
      id: "frost-success",
      condition: "success",
      message: "Resiste la escarcha."
    },
    {
      id: "frost-failure",
      condition: "failure",
      message: "Acumula 1 punto de escarcha.",
      updateToken: {
        field: "cold.frost",
        operation: "increment",
        value: 1
      }
    }
  ]
}
```

---

# UI recomendada

## Pantalla principal

```txt
┌───────────────────────────────┐
│ Token Roll Manager             │
├───────────────────────────────┤
│ Token seleccionado             │
│ Thorek                         │
│ Dueño: Seba                    │
│ CON: +2 | Agotamiento: 1       │
├───────────────────────────────┤
│ Acciones                       │
│ [Asignar token] [Editar PJ]    │
├───────────────────────────────┤
│ Tiradas configuradas           │
│ [+ Nueva tirada]               │
│ ❄️ Frío extremo        [Editar] │
│ 💀 Tirada de muerte    [Editar] │
│ 🌨️ Ventisca           [Editar] │
├───────────────────────────────┤
│ Configuración                  │
│ [x] Usar Dice+                 │
│ Resultado: Público             │
└───────────────────────────────┘
```

## Menú rápido del token

```txt
┌───────────────────────────────┐
│ Thorek                         │
│ Dueño: Seba                    │
├───────────────────────────────┤
│ ❄️ Frío extremo                │
│ 💀 Tirada de muerte            │
│ 🧊 Escarcha acumulativa        │
│ 🍖 Forrajeo                    │
└───────────────────────────────┘
```

---

# Flujo de ejecución de tirada

```txt
1. Usuario abre menú rápido de token.
2. Elige una tirada.
3. La extensión valida permisos.
4. La extensión lee metadata del token.
5. La extensión resuelve la fórmula.
6. La extensión envía la tirada a Dice+.
7. La extensión guarda rollId pendiente.
8. Dice+ anima los dados.
9. Dice+ devuelve resultado por broadcast.
10. La extensión identifica rollId.
11. Evalúa éxito/fallo/natural 1/natural 20.
12. Aplica efectos.
13. Actualiza metadata del token.
14. Muestra notificación/resumen.
```

---

# Manejo de tiradas pendientes

Crear una estructura en memoria:

```ts
type PendingRoll = {
  rollId: string;
  tokenId?: string;
  rollConfigId: string;
  createdAt: number;
};

const pendingRolls = new Map<string, PendingRoll>();
```

Cuando se envía una tirada:

```ts
pendingRolls.set(rollId, {
  rollId,
  tokenId,
  rollConfigId: roll.id,
  createdAt: Date.now()
});
```

Cuando llega resultado:

```ts
const pending = pendingRolls.get(result.rollId);
if (!pending) return;

pendingRolls.delete(result.rollId);
```

---

# Exportar/importar presets

El GM debe poder exportar todas las tiradas configuradas como JSON.

Ejemplo:

```json
{
  "name": "Icewind Dale Preset",
  "version": "1.0.0",
  "rolls": []
}
```

Importar debe reemplazar o combinar con las tiradas actuales.

Opciones:

```txt
Importar y reemplazar
Importar y combinar
Cancelar
```

---

# Validaciones importantes

## Fórmulas

Validar que la fórmula no esté vacía.

Validar variables desconocidas.

Si la fórmula tiene una variable que el token no posee, mostrar error:

```txt
La fórmula usa SURVIVAL, pero este personaje no tiene esa habilidad configurada.
```

## Permisos

Antes de tirar:

```txt
- Verificar que el token tenga metadata de personaje.
- Verificar que el usuario sea GM o dueño del token.
- Verificar que la tirada esté disponible para ese usuario.
```

## Dice+

Si Dice+ no está instalado o no responde:

```txt
No se pudo enviar la tirada a Dice+. Verifica que la extensión Dice+ esté instalada y activa.
```

Como fallback opcional, la extensión puede hacer una tirada simple interna sin animación.

---

# MVP recomendado

Primera versión funcional:

```txt
1. Crear proyecto Vite + React + TypeScript.
2. Crear manifest.
3. Crear menú principal.
4. Guardar tiradas editables en metadata.
5. Cargar preset Icewind Dale.
6. Asignar token seleccionado a jugador.
7. Guardar stats básicos en token.
8. Crear menú contextual “Abrir tiradas”.
9. Mostrar menú rápido con tiradas disponibles.
10. Resolver fórmula simple: STR, DEX, CON, INT, WIS, CHA, PROF.
11. Enviar tirada a Dice+.
12. Recibir resultado.
13. Aplicar efectos simples.
```

No incluir todavía:

```txt
- Doble click.
- Importar/exportar presets.
- Tablas complejas.
- UI avanzada.
```

---

# Versión 2

Agregar:

```txt
- Herramienta propia para doble click sobre token.
- Importar/exportar presets.
- Variables de habilidades: SURVIVAL, PERCEPTION, ATHLETICS, etc.
- Condiciones visuales sobre token.
- Mejor editor de efectos.
```

---

# Versión 3

Agregar:

```txt
- Condiciones personalizadas.
- Estados visibles sobre el token.
- Tiradas secretas al GM.
- Historial de tiradas por token.
- Plantillas de campaña.
- Presets para otras campañas.
```

---

# Tareas iniciales para Codex

## Tarea 1

Crear proyecto Vite + React + TypeScript para extensión de Owlbear Rodeo.

Configurar:

```txt
@owlbear-rodeo/sdk
manifest.json
icon.svg
estructura de carpetas
```

## Tarea 2

Crear `types.ts`, `constants.ts` y utilidades de metadata.

## Tarea 3

Crear UI principal con:

```txt
- Lista de tiradas
- Botón Nueva tirada
- Botón Cargar preset Icewind Dale
- Sección de token seleccionado
- Sección de configuración
```

## Tarea 4

Implementar guardado y lectura de tiradas desde metadata.

## Tarea 5

Implementar asignación de token a jugador.

## Tarea 6

Implementar menú contextual para abrir tiradas del token seleccionado.

## Tarea 7

Implementar integración con Dice+.

## Tarea 8

Implementar aplicación de efectos a metadata del token.

## Tarea 9

Agregar preset Icewind Dale.

## Tarea 10

Agregar herramienta de doble click como mejora posterior.

---

# Resultado esperado

Al finalizar el MVP, el usuario debería poder:

```txt
1. Instalar la extensión en Owlbear Rodeo.
2. Abrir el menú principal.
3. Cargar el preset Icewind Dale.
4. Seleccionar un token.
5. Asignarlo a un jugador.
6. Configurar CON y otros stats básicos.
7. Abrir el menú de tiradas del token.
8. Elegir “Frío extremo”.
9. Ver la animación de dados mediante Dice+.
10. Recibir el resultado.
11. Ver cómo se actualiza el agotamiento si falla.
```

---

# Notas de diseño

- No hardcodear tiradas en la lógica principal.
- Todas las tiradas deben ser editables.
- Los presets solo deben crear configuraciones iniciales.
- El token guarda datos del personaje.
- Las tiradas globales se guardan en metadata de sala o escena.
- Dice+ se usa solo para animación y resultado de dados.
- La extensión aplica la lógica de reglas después de recibir el resultado.
- Mantener el MVP simple antes de agregar doble click.

