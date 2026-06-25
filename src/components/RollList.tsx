import type { RollConfig } from "../types";

type Props = {
  rolls: RollConfig[];
  onCreate: () => void;
  onEdit: (roll: RollConfig) => void;
  onDelete: (rollId: string) => void;
  onLoadPreset: () => void;
  onOpenQuickMenu: () => void;
};

export function RollList({ rolls, onCreate, onEdit, onDelete, onLoadPreset, onOpenQuickMenu }: Props) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>Tiradas configuradas</h2>
        <button className="icon-button" onClick={onCreate} title="Nueva tirada">
          +
        </button>
      </div>
      <div className="button-row">
        <button onClick={onLoadPreset}>Cargar preset Icewind Dale</button>
        <button onClick={onOpenQuickMenu}>Abrir tiradas</button>
      </div>
      <div className="roll-list">
        {rolls.length === 0 ? <p className="muted">No hay tiradas configuradas.</p> : null}
        {rolls.map((roll) => (
          <article className="roll-row" key={roll.id}>
            <button className="roll-main" onClick={() => onEdit(roll)}>
              <span className="roll-icon">{roll.icon}</span>
              <span>
                <strong>{roll.name}</strong>
                <small>{roll.formula}</small>
              </span>
            </button>
            <button onClick={() => onEdit(roll)}>Editar</button>
            <button className="danger" onClick={() => onDelete(roll.id)}>
              Borrar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
