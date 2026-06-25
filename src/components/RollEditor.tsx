import { useMemo, useState } from "react";
import type { EffectCondition, ResultMode, RollConfig, RollTarget, RollType, RollVisibility } from "../types";

const newRoll = (): RollConfig => ({
  id: `roll_${Date.now()}`,
  name: "Nueva tirada",
  icon: "🎲",
  formula: "1d20",
  description: "",
  type: "normal",
  visibility: "owner_and_gm",
  target: "selected_token",
  resultMode: "public",
  effects: [{ id: `effect_${Date.now()}`, condition: "always", message: "Resultado aplicado." }],
});

type Props = {
  roll?: RollConfig;
  onSave: (roll: RollConfig) => void;
  onCancel: () => void;
};

export function RollEditor({ roll, onSave, onCancel }: Props) {
  const initial = useMemo(() => roll ?? newRoll(), [roll]);
  const [draft, setDraft] = useState<RollConfig>(initial);

  function update<K extends keyof RollConfig>(key: K, value: RollConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="panel editor">
      <div className="section-title">
        <h2>{roll ? "Editar tirada" : "Nueva tirada"}</h2>
      </div>
      <label>
        Nombre
        <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
      </label>
      <div className="grid-two">
        <label>
          Icono
          <input value={draft.icon} onChange={(event) => update("icon", event.target.value)} />
        </label>
        <label>
          CD
          <input
            type="number"
            value={draft.dc ?? ""}
            onChange={(event) => update("dc", event.target.value ? Number(event.target.value) : undefined)}
          />
        </label>
      </div>
      <label>
        Fórmula
        <input value={draft.formula} onChange={(event) => update("formula", event.target.value)} />
      </label>
      <label>
        Descripción
        <textarea value={draft.description ?? ""} onChange={(event) => update("description", event.target.value)} />
      </label>
      <div className="grid-two">
        <label>
          Tipo
          <select value={draft.type} onChange={(event) => update("type", event.target.value as RollType)}>
            <option value="normal">Normal</option>
            <option value="save">Salvación</option>
            <option value="death_save">Muerte</option>
            <option value="table">Tabla</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          Visibilidad
          <select value={draft.visibility} onChange={(event) => update("visibility", event.target.value as RollVisibility)}>
            <option value="everyone">Todos</option>
            <option value="gm_only">Solo GM</option>
            <option value="owner_and_gm">Dueño y GM</option>
          </select>
        </label>
        <label>
          Objetivo
          <select value={draft.target} onChange={(event) => update("target", event.target.value as RollTarget)}>
            <option value="selected_token">Token seleccionado</option>
            <option value="self">Propio</option>
            <option value="none">Ninguno</option>
          </select>
        </label>
        <label>
          Resultado
          <select value={draft.resultMode} onChange={(event) => update("resultMode", event.target.value as ResultMode)}>
            <option value="public">Público</option>
            <option value="private">Privado</option>
            <option value="gm_only">Solo GM</option>
          </select>
        </label>
      </div>
      <h3>Efectos</h3>
      {draft.effects.map((effect, index) => (
        <div className="effect-row" key={effect.id}>
          <select
            value={effect.condition}
            onChange={(event) => {
              const effects = [...draft.effects];
              effects[index] = { ...effect, condition: event.target.value as EffectCondition };
              update("effects", effects);
            }}
          >
            <option value="always">Siempre</option>
            <option value="success">Éxito</option>
            <option value="failure">Fallo</option>
            <option value="natural_1">1 natural</option>
            <option value="natural_20">20 natural</option>
          </select>
          <input
            value={effect.message}
            onChange={(event) => {
              const effects = [...draft.effects];
              effects[index] = { ...effect, message: event.target.value };
              update("effects", effects);
            }}
          />
        </div>
      ))}
      <button
        onClick={() =>
          update("effects", [
            ...draft.effects,
            { id: `effect_${Date.now()}`, condition: "always", message: "Nuevo efecto." },
          ])
        }
      >
        Agregar efecto
      </button>
      <div className="button-row end">
        <button onClick={onCancel}>Cancelar</button>
        <button className="primary" onClick={() => onSave(draft)}>
          Guardar
        </button>
      </div>
    </section>
  );
}
