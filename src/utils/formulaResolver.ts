import type { CharacterMetadata, ExtensionSettings } from "../types";

const variablePattern = /\b[A-Z_]+\b/g;

export function getFormulaVariables(formula: string) {
  return Array.from(new Set(formula.match(variablePattern) ?? []));
}

export function resolveFormula(formula: string, character?: CharacterMetadata, settings?: ExtensionSettings) {
  if (!formula.trim()) {
    throw new Error("La fórmula no puede estar vacía.");
  }

  const coldClothingBonus = character?.cold.hasColdWeatherClothing && !character.cold.wetClothing ? 5 : 0;
  const coldCharacterBonus = (character?.bonuses ?? [])
    .filter((bonus) => bonus.scope === "cold")
    .reduce((total, bonus) => total + bonus.value, 0);
  const coldGlobalBonus = (settings?.globalBonuses ?? [])
    .filter((bonus) => bonus.scope === "cold")
    .reduce((total, bonus) => total + bonus.value, 0);

  const variables: Record<string, number | undefined> = {
    STR: character?.stats.str,
    DEX: character?.stats.dex,
    CON: character?.stats.con,
    INT: character?.stats.int,
    WIS: character?.stats.wis,
    CHA: character?.stats.cha,
    PROF: character?.stats.proficiencyBonus,
    SURVIVAL: character?.skills?.survival,
    PERCEPTION: character?.skills?.perception,
    ATHLETICS: character?.skills?.athletics,
    COLD_BONUS: coldClothingBonus + coldCharacterBonus + coldGlobalBonus,
    FROST: character?.cold.frost,
    EXHAUSTION: character?.cold.exhaustion,
  };

  const unknown = getFormulaVariables(formula).filter((name) => !(name in variables));
  if (unknown.length > 0) {
    throw new Error(`Variables desconocidas: ${unknown.join(", ")}.`);
  }

  const missing = getFormulaVariables(formula).filter((name) => typeof variables[name] !== "number");
  if (missing.length > 0) {
    throw new Error(`La fórmula usa ${missing.join(", ")}, pero el personaje no tiene esos datos configurados.`);
  }

  return formula
    .replace(variablePattern, (name) => String(variables[name] ?? 0))
    .replace(/\s+/g, "")
    .replace(/\+\-/g, "-");
}

export function rollFormulaLocally(formula: string) {
  const normalized = formula.replace(/\s+/g, "");
  const terms = normalized.match(/[+-]?[^+-]+/g) ?? [];
  let total = 0;
  let natural: number | undefined;
  const rolls: string[] = [];

  for (const term of terms) {
    const sign = term.startsWith("-") ? -1 : 1;
    const body = term.replace(/^[+-]/, "");
    const dice = body.match(/^(\d*)d(\d+)$/i);
    if (dice) {
      const count = Number(dice[1] || 1);
      const sides = Number(dice[2]);
      for (let i = 0; i < count; i += 1) {
        const result = Math.floor(Math.random() * sides) + 1;
        if (sides === 20 && natural === undefined) natural = result;
        total += sign * result;
        rolls.push(`${sign < 0 ? "-" : ""}d${sides}:${result}`);
      }
    } else {
      total += sign * Number(body);
    }
  }

  return { total, natural, detail: rolls };
}
