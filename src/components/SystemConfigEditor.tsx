import { useMemo } from "react";
import type { SystemConfig, SystemField } from "../types";
import { defaultSystemConfig, normalizeSystemConfig } from "../utils/systemConfig";

type Props = {
  systemConfig: SystemConfig;
  onChange: (systemConfig: SystemConfig) => void;
  onNotice?: (message: string) => void;
};

type FieldKind = "stats" | "skills";

function emptyField(kind: FieldKind): SystemField {
  const suffix = Date.now().toString(36);
  return {
    key: kind === "stats" ? `stat_${suffix}` : `skill_${suffix}`,
    label: kind === "stats" ? "Nueva stat" : "Nueva habilidad",
    variable: kind === "stats" ? `STAT_${suffix.toUpperCase()}` : `SKILL_${suffix.toUpperCase()}`,
    defaultValue: 0,
  };
}

export function SystemConfigEditor({ systemConfig, onChange, onNotice }: Props) {
  const exportPayload = useMemo(() => JSON.stringify({ systemConfig }, null, 2), [systemConfig]);

  function updateField(kind: FieldKind, index: number, changes: Partial<SystemField>) {
    const fields = [...systemConfig[kind]];
    fields[index] = { ...fields[index], ...changes };
    onChange(normalizeSystemConfig({ ...systemConfig, [kind]: fields }));
  }

  function addField(kind: FieldKind) {
    onChange(normalizeSystemConfig({ ...systemConfig, [kind]: [...systemConfig[kind], emptyField(kind)] }));
  }

  function removeField(kind: FieldKind, index: number) {
    onChange(normalizeSystemConfig({ ...systemConfig, [kind]: systemConfig[kind].filter((_, fieldIndex) => fieldIndex !== index) }));
  }

  function exportConfig() {
    const blob = new Blob([exportPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${systemConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "system"}-config.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importConfig(file: File) {
    try {
      const data = JSON.parse(await file.text()) as unknown;
      const payload = data && typeof data === "object" ? (data as { systemConfig?: SystemConfig }) : undefined;
      const nextConfig = payload?.systemConfig ?? (data as SystemConfig);
      onChange(normalizeSystemConfig(nextConfig));
      onNotice?.("Configuracion de sistema importada.");
    } catch {
      onNotice?.("No se pudo importar la configuracion de sistema.");
    }
  }

  function renderFields(kind: FieldKind, title: string) {
    return (
      <>
        <div className="section-title compact">
          <h3>{title}</h3>
          <button onClick={() => addField(kind)}>Agregar</button>
        </div>
        <div className="system-field-list">
          {systemConfig[kind].map((field, index) => (
            <div className="system-field-row" key={field.key}>
              <label>
                Clave
                <input value={field.key} onChange={(event) => updateField(kind, index, { key: event.target.value })} />
              </label>
              <label>
                Nombre
                <input value={field.label} onChange={(event) => updateField(kind, index, { label: event.target.value })} />
              </label>
              <label>
                Variable
                <input value={field.variable} onChange={(event) => updateField(kind, index, { variable: event.target.value })} />
              </label>
              <label>
                Base
                <input
                  type="number"
                  value={field.defaultValue ?? 0}
                  onChange={(event) => updateField(kind, index, { defaultValue: Number(event.target.value) })}
                />
              </label>
              <button className="danger" onClick={() => removeField(kind, index)}>
                Borrar
              </button>
            </div>
          ))}
          {systemConfig[kind].length === 0 ? <p className="muted">No hay campos configurados.</p> : null}
        </div>
      </>
    );
  }

  return (
    <div className="system-config-editor">
      <div className="grid-two">
        <label>
          Sistema
          <input value={systemConfig.name} onChange={(event) => onChange(normalizeSystemConfig({ ...systemConfig, name: event.target.value }))} />
        </label>
        <label>
          Version
          <input
            value={systemConfig.version}
            onChange={(event) => onChange(normalizeSystemConfig({ ...systemConfig, version: event.target.value }))}
          />
        </label>
      </div>
      <div className="button-row">
        <button onClick={exportConfig}>Exportar sistema</button>
        <label className="file-button">
          Importar sistema
          <input
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importConfig(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button onClick={() => onChange(defaultSystemConfig)}>Restaurar D&D</button>
      </div>
      {renderFields("stats", "Estadisticas")}
      {renderFields("skills", "Habilidades")}
    </div>
  );
}
