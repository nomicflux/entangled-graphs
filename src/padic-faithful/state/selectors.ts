import { computed } from "vue";
import { derivedNodesFromRows } from "../derived/geometry";
import { outcomeRowsFromPairing, sortOutcomeRowsByShell } from "../engine/pairing";
import { statisticalOperatorFromRaw } from "../engine/operator";
import { sovmFromRawEffects } from "../engine/sovm";
import type { PAdicOutcomePrefixGroup, PAdicOutcomeRow, PAdicOutcomeShell, PAdicStageCard } from "../types";
import { pAdicFaithfulState } from "./store";

const formatScalar = (value: number): string => {
  if (!Number.isFinite(value)) {
    return value > 0 ? "+∞" : "-∞";
  }
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e4) {
    return value.toExponential(3);
  }
  return value.toFixed(6);
};

const formatValuation = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "+∞";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
};

const DIGIT_PREFIX_WIDTH = 3;

const prefixForRow = (row: PAdicOutcomeRow): string => {
  const prefixDigits = row.digits.digits.slice(0, DIGIT_PREFIX_WIDTH);
  const core = prefixDigits.length > 0 ? prefixDigits.join(" ") : "0";
  const signPrefix = row.digits.sign < 0 ? "-" : "";
  const truncatedSuffix = row.digits.digits.length > DIGIT_PREFIX_WIDTH || row.digits.truncated ? " ..." : "";
  return `${signPrefix}${core}${truncatedSuffix}`;
};

export const faithfulRhoResult = computed(() =>
  statisticalOperatorFromRaw(pAdicFaithfulState.rhoRows, pAdicFaithfulState.prime),
);

export const faithfulSovmResult = computed(() =>
  sovmFromRawEffects(pAdicFaithfulState.effects, pAdicFaithfulState.prime),
);

export const faithfulErrors = computed<ReadonlyArray<string>>(() => {
  const errors: string[] = [];
  if (faithfulRhoResult.value.error) {
    errors.push(faithfulRhoResult.value.error);
  }
  if (faithfulSovmResult.value.error) {
    errors.push(faithfulSovmResult.value.error);
  }
  return errors;
});

export const faithfulOutcomeRows = computed(() => {
  const rho = faithfulRhoResult.value.operator;
  const sovm = faithfulSovmResult.value.sovm;
  if (!rho || !sovm) {
    return [];
  }

  return sortOutcomeRowsByShell(outcomeRowsFromPairing(rho, sovm, pAdicFaithfulState.prime));
});

export const faithfulOutcomeShells = computed<ReadonlyArray<PAdicOutcomeShell>>(() => {
  const grouped = new Map<string, { key: string; valuation: number; rows: PAdicOutcomeRow[] }>();

  for (const row of faithfulOutcomeRows.value) {
    const valuation = Number.isFinite(row.v_p) ? row.v_p : Number.POSITIVE_INFINITY;
    const key = Number.isFinite(valuation) ? String(valuation) : "inf";

    const shell = grouped.get(key) ?? {
      key,
      valuation,
      rows: [],
    };

    shell.rows.push(row);
    grouped.set(key, shell);
  }

  return [...grouped.values()]
    .sort((left, right) => {
      const leftValue = Number.isFinite(left.valuation) ? left.valuation : Number.POSITIVE_INFINITY;
      const rightValue = Number.isFinite(right.valuation) ? right.valuation : Number.POSITIVE_INFINITY;
      return leftValue - rightValue;
    })
    .map((shell) => {
      const prefixMap = new Map<string, { key: string; prefix: string; residue: number | null; rows: PAdicOutcomeRow[] }>();

      for (const row of shell.rows) {
        const prefix = prefixForRow(row);
        const residue = row.unitResidue;
        const key = `${prefix}|${residue === null ? "null" : String(residue)}`;
        const group = prefixMap.get(key) ?? {
          key,
          prefix,
          residue,
          rows: [],
        };
        group.rows.push(row);
        prefixMap.set(key, group);
      }

      const prefixGroups: PAdicOutcomePrefixGroup[] = [...prefixMap.values()].sort((left, right) => {
        if (left.prefix !== right.prefix) {
          return left.prefix.localeCompare(right.prefix);
        }

        const leftResidue = left.residue ?? Number.POSITIVE_INFINITY;
        const rightResidue = right.residue ?? Number.POSITIVE_INFINITY;
        return leftResidue - rightResidue;
      });

      return {
        key: shell.key,
        valuation: shell.valuation,
        prefixGroups,
        rows: shell.rows,
      } satisfies PAdicOutcomeShell;
    });
});

export const faithfulSelectedOutcome = computed(() => {
  const selectedId = pAdicFaithfulState.selectedOutcomeId;
  if (selectedId === null) {
    return faithfulOutcomeRows.value[0] ?? null;
  }

  return faithfulOutcomeRows.value.find((row) => row.id === selectedId) ?? null;
});

export const faithfulStageCards = computed<ReadonlyArray<PAdicStageCard>>(() => {
  const rho = faithfulRhoResult.value.operator;
  const shells = faithfulOutcomeShells.value;

  const rhoCard: PAdicStageCard = {
    id: "rho",
    title: "Stage 1",
    subtitle: "Statistical Operator rho",
    primary: rho ? `tr(rho) = ${formatScalar(rho.trace)}` : "rho invalid",
    secondary: rho ? "Selfadjoint + trace-one" : "Fix rho to continue",
  };

  const outputCard: PAdicStageCard = {
    id: "omega",
    title: "Stage 2",
    subtitle: "Pairing omega_i = tr(rho F_i)",
    primary: `${faithfulOutcomeRows.value.length} outcomes`,
    secondary: `${shells.length} valuation shells`,
  };

  return [rhoCard, outputCard];
});

export const faithfulDerivedNodes = computed(() =>
  derivedNodesFromRows(
    faithfulOutcomeRows.value,
    pAdicFaithfulState.prime,
    pAdicFaithfulState.viewMode,
  ),
);

export const faithfulDisplay = {
  formatScalar,
  formatValuation,
};
