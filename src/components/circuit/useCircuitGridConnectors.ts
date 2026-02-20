import type { ComputedRef, Ref } from "vue";
import type { CircuitColumn, QubitRow } from "../../types";
import type { ConnectorSegment, PendingPlacement } from "./grid-interaction-types";

export type GridConnectorDeps = {
  rows: ComputedRef<QubitRow[]>;
  pendingPlacement: Ref<PendingPlacement | null>;
};

export const useCircuitGridConnectors = ({ rows, pendingPlacement }: GridConnectorDeps) => {
  const connectorSegments = (column: CircuitColumn, columnIndex: number): ConnectorSegment[] => {
    const committedSegments = column.gates.flatMap((gate): ConnectorSegment[] => {
      if (gate.gate === "CNOT") {
        return [{ id: gate.id, kind: "cnot", fromRow: gate.wires[0]!, toRow: gate.wires[1]!, preview: false }];
      }

      if (gate.gate === "TOFFOLI") {
        const minRow = Math.min(...gate.wires);
        const maxRow = Math.max(...gate.wires);
        return [{ id: gate.id, kind: "toffoli", fromRow: minRow, toRow: maxRow, preview: false }];
      }

      if (gate.wires.length > 1) {
        const minRow = Math.min(...gate.wires);
        const maxRow = Math.max(...gate.wires);
        return [{ id: gate.id, kind: "multi", fromRow: minRow, toRow: maxRow, preview: false }];
      }

      return [];
    });

    const pending = pendingPlacement.value;
    if (!pending || pending.column !== columnIndex) {
      return committedSegments;
    }

    if (pending.kind === "cnot") {
      const hover = pending.hoverRow ?? pending.control;
      return [
        ...committedSegments,
        {
          id: `pending-cnot-${columnIndex}`,
          kind: "cnot",
          fromRow: pending.control,
          toRow: hover,
          preview: true,
        },
      ];
    }

    if (pending.kind === "multi") {
      const previewRows = pending.hoverRow !== null ? [...pending.wires, pending.hoverRow] : pending.wires;
      return [
        ...committedSegments,
        {
          id: `pending-multi-${columnIndex}`,
          kind: "multi",
          fromRow: Math.min(...previewRows),
          toRow: Math.max(...previewRows),
          preview: true,
        },
      ];
    }

    if (pending.controlB === null) {
      const hover = pending.hoverRow ?? pending.controlA;
      return [
        ...committedSegments,
        {
          id: `pending-toffoli-c2-${columnIndex}`,
          kind: "toffoli",
          fromRow: pending.controlA,
          toRow: hover,
          preview: true,
        },
      ];
    }

    const hoverTarget = pending.hoverRow ?? pending.controlB;
    return [
      ...committedSegments,
      {
        id: `pending-toffoli-target-${columnIndex}`,
        kind: "toffoli",
        fromRow: Math.min(pending.controlA, pending.controlB, hoverTarget),
        toRow: Math.max(pending.controlA, pending.controlB, hoverTarget),
        preview: true,
      },
    ];
  };

  const rowCenterPercent = (row: number): number => ((row + 0.5) / rows.value.length) * 100;

  const connectorStyle = (segment: ConnectorSegment): Record<string, string> => {
    const start = rowCenterPercent(Math.min(segment.fromRow, segment.toRow));
    const end = rowCenterPercent(Math.max(segment.fromRow, segment.toRow));

    return {
      top: `${start}%`,
      height: `${Math.max(0, end - start)}%`,
    };
  };

  return {
    connectorSegments,
    connectorStyle,
  };
};
