import { computed } from "vue";
import { derivedNodesFromEntries } from "../derived/geometry";
import { sortOutcomeRowsByShell } from "../engine/pairing";
import {
  operatorEntryRowsFromOperator,
  outcomeRowsFromDensityDiagonal,
  stageOperatorsFromPreparedInputsAndCircuit,
} from "../engine/system";
import type { PAdicOutcomePrefixGroup, PAdicOutcomeRow, PAdicOutcomeShell, PAdicStageCard, PAdicStageView } from "../types";
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

const outcomeShellsFromRows = (rows: ReadonlyArray<PAdicOutcomeRow>): ReadonlyArray<PAdicOutcomeShell> => {
  const grouped = new Map<string, { key: string; valuation: number; rows: PAdicOutcomeRow[] }>();

  for (const row of rows) {
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
};

const faithfulStageOperatorResult = computed(() =>
  stageOperatorsFromPreparedInputsAndCircuit(
    pAdicFaithfulState.preparedInputs,
    pAdicFaithfulState.columns,
    pAdicFaithfulState.qubitCount,
    pAdicFaithfulState.prime,
  ),
);

export const faithfulRhoResult = computed(() => {
  if (faithfulStageOperatorResult.value.error) {
    return {
      operator: null,
      error: faithfulStageOperatorResult.value.error,
    };
  }

  const stages = faithfulStageOperatorResult.value.stages;
  const lastStage = stages[stages.length - 1];
  if (!lastStage) {
    return {
      operator: null,
      error: "rho must have trace one.",
    };
  }

  return {
    operator: lastStage.operator,
    error: null,
  };
});

export const faithfulSovmResult = computed(() =>
  ({
    sovm: {
      effects: Array.from({ length: Math.pow(2, pAdicFaithfulState.qubitCount) }, (_, index) => ({
        id: `omega_${index}`,
        label: `F_${index}`,
        operator: [],
      })),
    },
    error: null,
  }),
);

export const faithfulErrors = computed<ReadonlyArray<string>>(() => {
  const errors: string[] = [];
  if (faithfulRhoResult.value.error) {
    errors.push(faithfulRhoResult.value.error);
  }
  return errors;
});

export const faithfulOutcomeRows = computed(() => {
  const rho = faithfulRhoResult.value.operator;
  if (!rho) {
    return [];
  }

  const rows = outcomeRowsFromDensityDiagonal(rho, pAdicFaithfulState.qubitCount, pAdicFaithfulState.prime);
  return sortOutcomeRowsByShell(rows);
});

export const faithfulOutcomeShells = computed<ReadonlyArray<PAdicOutcomeShell>>(() => {
  return outcomeShellsFromRows(faithfulOutcomeRows.value);
});

export const faithfulSelectedOutcome = computed(() => {
  const selectedId = pAdicFaithfulState.selectedOutcomeId;
  if (selectedId === null) {
    return faithfulOutcomeRows.value[0] ?? null;
  }

  return faithfulOutcomeRows.value.find((row) => row.id === selectedId) ?? null;
});

export const faithfulStageViews = computed<ReadonlyArray<PAdicStageView>>(() => {
  if (faithfulStageOperatorResult.value.error) {
    return [];
  }

  return faithfulStageOperatorResult.value.stages.map((stage) => {
    const rows = sortOutcomeRowsByShell(
      outcomeRowsFromDensityDiagonal(stage.operator, pAdicFaithfulState.qubitCount, pAdicFaithfulState.prime),
    );
    const entries = operatorEntryRowsFromOperator(stage.operator, pAdicFaithfulState.qubitCount, pAdicFaithfulState.prime);
    const shells = outcomeShellsFromRows(rows);

    const dominant = rows.reduce<PAdicOutcomeRow | null>((best, row) => {
      if (!best || row.w_norm > best.w_norm) {
        return row;
      }
      return best;
    }, null);

    return {
      id: stage.id,
      index: stage.index,
      label: stage.label,
      columnIndex: stage.columnIndex,
      dimension: stage.operator.dimension,
      trace: stage.operator.trace,
      rows,
      entries,
      shells,
      dominantOutcomeLabel: dominant ? dominant.label : "--",
      dominantWeight: dominant ? dominant.w_norm : 0,
      nonZeroEntryCount: entries.filter((entry) => entry.abs_p > 0).length,
      nonZeroOffDiagonalCount: entries.filter((entry) => !entry.isDiagonal && entry.abs_p > 0).length,
    } satisfies PAdicStageView;
  });
});

export const faithfulStageCards = computed<ReadonlyArray<PAdicStageCard>>(() => {
  return faithfulStageViews.value.map((stage) => ({
    id: stage.id,
    title: stage.label,
    subtitle: stage.columnIndex === null ? "Prepared p-adic operator" : `After circuit column ${stage.columnIndex + 1}`,
    primary: `${stage.rows.length} outcomes`,
    secondary: `${stage.shells.length} valuation shells`,
  }));
});

export const faithfulDerivedNodes = computed(() =>
  derivedNodesFromEntries(
    faithfulStageViews.value[faithfulStageViews.value.length - 1]?.entries ?? [],
    pAdicFaithfulState.prime,
    pAdicFaithfulState.viewMode,
  ),
);

export const faithfulDisplay = {
  formatScalar,
  formatValuation,
};
