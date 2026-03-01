import type { GateId, QubitRow } from "../../../types";

type InjectedError = {
  gate: GateId;
  row: QubitRow;
};

const formatSingleInjectedError = (error: InjectedError): string => `${error.gate} on q${error.row}`;

export const formatInjectedErrorsLabel = (errors: ReadonlyArray<InjectedError>): string => {
  if (errors.length === 0) {
    return "None";
  }
  if (errors.length === 1) {
    return formatSingleInjectedError(errors[0]!);
  }
  return `${errors.length} injected errors: ${errors.map(formatSingleInjectedError).join("; ")}`;
};
