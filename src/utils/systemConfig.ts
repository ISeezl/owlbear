import type { CharacterMetadata, SystemConfig, SystemField } from "../types";

const keyPattern = /^[a-z][a-z0-9_]*$/;

export const defaultSystemConfig: SystemConfig = {
  name: "D&D 5e",
  version: "1.0.0",
  stats: [
    { key: "str", label: "FUE", variable: "STR", defaultValue: 0 },
    { key: "dex", label: "DES", variable: "DEX", defaultValue: 0 },
    { key: "con", label: "CON", variable: "CON", defaultValue: 0 },
    { key: "int", label: "INT", variable: "INT", defaultValue: 0 },
    { key: "wis", label: "SAB", variable: "WIS", defaultValue: 0 },
    { key: "cha", label: "CAR", variable: "CHA", defaultValue: 0 },
    { key: "proficiencyBonus", label: "PROF", variable: "PROF", defaultValue: 2 },
  ],
  skills: [
    { key: "survival", label: "Supervivencia", variable: "SURVIVAL", defaultValue: 0 },
    { key: "perception", label: "Percepcion", variable: "PERCEPTION", defaultValue: 0 },
    { key: "athletics", label: "Atletismo", variable: "ATHLETICS", defaultValue: 0 },
  ],
};

function normalizeVariable(value: string, fallback: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  return normalized || fallback.toUpperCase();
}

function normalizeKey(value: string, fallback: string) {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_]/g, "_");
  const camelish = normalized.charAt(0).toLowerCase() + normalized.slice(1);
  return keyPattern.test(camelish) ? camelish : fallback;
}

function normalizeFields(fields: SystemField[] | undefined, defaults: SystemField[]) {
  const source = fields?.length ? fields : defaults;
  const usedKeys = new Set<string>();
  const usedVariables = new Set<string>();

  return source.map((field, index) => {
    const defaultField = defaults[index] ?? defaults[0];
    let key = normalizeKey(field.key, defaultField.key);
    let variable = normalizeVariable(field.variable, defaultField.variable);

    while (usedKeys.has(key)) key = `${key}_${index + 1}`;
    while (usedVariables.has(variable)) variable = `${variable}_${index + 1}`;

    usedKeys.add(key);
    usedVariables.add(variable);

    return {
      key,
      label: field.label.trim() || field.key || defaultField.label,
      variable,
      defaultValue: Number.isFinite(field.defaultValue) ? field.defaultValue : defaultField.defaultValue ?? 0,
    };
  });
}

export function normalizeSystemConfig(config?: Partial<SystemConfig>): SystemConfig {
  return {
    name: config?.name?.trim() || defaultSystemConfig.name,
    version: config?.version?.trim() || "1.0.0",
    stats: normalizeFields(config?.stats, defaultSystemConfig.stats),
    skills: normalizeFields(config?.skills, defaultSystemConfig.skills),
  };
}

export function getSystemConfig(settings?: { systemConfig?: SystemConfig }) {
  return normalizeSystemConfig(settings?.systemConfig);
}

export function buildDefaultStats(config: SystemConfig) {
  return Object.fromEntries(config.stats.map((field) => [field.key, field.defaultValue ?? 0]));
}

export function buildDefaultSkills(config: SystemConfig) {
  return Object.fromEntries(config.skills.map((field) => [field.key, field.defaultValue ?? 0]));
}

export function ensureCharacterSystemFields(character: CharacterMetadata, config: SystemConfig): CharacterMetadata {
  return {
    ...character,
    stats: { ...buildDefaultStats(config), ...character.stats },
    skills: { ...buildDefaultSkills(config), ...(character.skills ?? {}) },
  };
}
