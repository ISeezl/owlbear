import { useMemo, useState } from "react";
import type { PlayerSlot, ResultMode, RollConfig, SystemConfig } from "../types";

type Draft = {
  id?: string;
  name: string;
  dice: string;
  variable: string;
  proficient: boolean;
};

type Props = {
  slot?: PlayerSlot;
  rolls: RollConfig[];
  defaultResultMode: ResultMode;
  systemConfig: SystemConfig;
  onSave: (roll: RollConfig) => void;
  onDelete: (rollId: string) => void;
  onOpenQuickMenu: () => void;
};

const defaultDraft: Draft = {
  name: "Nueva tirada",
  dice: "1d20",
  variable: "STR",
  proficient: false,
};

function buildFormula(draft: Draft) {
  return `${draft.dice.trim() || "1d20"} + ${draft.variable}${draft.proficient ? " + PROF" : ""}`;
}

function draftFromRoll(roll: RollConfig, variables: Array<{ value: string; label: string }>): Draft {
  const formula = roll.formula.toUpperCase();
  const variable = variables.find((item) => formula.includes(item.value))?.value ?? variables[0]?.value ?? "STR";

  return {
    id: roll.id,
    name: roll.name,
    dice: roll.formula.split("+")[0]?.trim() || "1d20",
    variable,
    proficient: formula.includes("PROF"),
  };
}

export function PlayerRollConfigurator({
  slot,
  rolls,
  defaultResultMode,
  systemConfig,
  onSave,
  onDelete,
  onOpenQuickMenu,
}: Props) {
  const variables = useMemo(
    () => [
      ...systemConfig.stats.map((field) => ({ value: field.variable, label: field.label })),
      ...systemConfig.skills.map((field) => ({ value: field.variable, label: field.label })),
    ],
    [systemConfig.skills, systemConfig.stats],
  );
  const [draft, setDraft] = useState<Draft>({ ...defaultDraft, variable: variables[0]?.value ?? defaultDraft.variable });
  const formula = useMemo(() => buildFormula(draft), [draft]);

  function update(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function resetDraft() {
    setDraft({ ...defaultDraft, variable: variables[0]?.value ?? defaultDraft.variable });
  }

  function save() {
    if (!slot) return;

    onSave({
      id: draft.id ?? `player_roll_${slot.playerId}_${Date.now()}`,
      name: draft.name.trim() || "Tirada",
      icon: "d20",
      formula,
      ownerPlayerId: slot.playerId,
      ownerConnectionId: slot.playerConnectionId,
      description: "Tirada creada por jugador.",
      type: "normal",
      visibility: "owner_and_gm",
      target: "active_sheet",
      resultMode: defaultResultMode,
      effects: [],
    });
    resetDraft();
  }

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Mis tiradas</h2>
      </div>
      <div className="player-roll-form">
        <label>
          Nombre
          <input value={draft.name} onChange={(event) => update({ name: event.target.value })} />
        </label>
        <div className="grid-two">
          <label>
            Dados
            <input value={draft.dice} onChange={(event) => update({ dice: event.target.value })} placeholder="1d20" />
          </label>
          <label>
            Campo
            <select value={draft.variable} onChange={(event) => update({ variable: event.target.value })}>
              {variables.map((variable) => (
                <option key={variable.value} value={variable.value}>
                  {variable.label} ({variable.value})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.proficient}
            onChange={(event) => update({ proficient: event.target.checked })}
          />
          Competencia
        </label>
        <div className="formula-preview">{formula}</div>
        <div className="button-row">
          <button className="primary" onClick={save} disabled={!slot}>
            {draft.id ? "Guardar cambios" : "Guardar tirada"}
          </button>
          {draft.id ? <button onClick={resetDraft}>Cancelar edicion</button> : null}
          <button onClick={onOpenQuickMenu}>Abrir tiradas</button>
        </div>
      </div>
      <div className="roll-list">
        {rolls.length === 0 ? <p className="muted">Aun no has creado tiradas propias.</p> : null}
        {rolls.map((roll) => (
          <article className="player-roll-row" key={roll.id}>
            <button className="roll-main" onClick={() => setDraft(draftFromRoll(roll, variables))}>
              <span className="roll-icon">{roll.icon}</span>
              <span>
                <strong>{roll.name}</strong>
                <small>{roll.formula}</small>
              </span>
            </button>
            <button className="danger" onClick={() => onDelete(roll.id)}>
              Borrar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
