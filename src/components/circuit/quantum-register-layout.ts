export const CIRCUIT_ROW_HEIGHT_PX = 56;

export const quantumRegisterHeight = (rowCount: number, rowHeight = CIRCUIT_ROW_HEIGHT_PX): number =>
  rowCount * rowHeight;

export const quantumRowTopY = (row: number, rowHeight = CIRCUIT_ROW_HEIGHT_PX): number =>
  row * rowHeight;

export const quantumRowBottomY = (row: number, rowHeight = CIRCUIT_ROW_HEIGHT_PX): number =>
  (row + 1) * rowHeight;

export const quantumRowCenterY = (row: number, rowHeight = CIRCUIT_ROW_HEIGHT_PX): number =>
  quantumRowTopY(row, rowHeight) + (rowHeight * 0.5);

export const quantumGridTemplateRows = (rowCount: number, rowHeight = CIRCUIT_ROW_HEIGHT_PX): string =>
  `repeat(${rowCount}, ${rowHeight}px)`;

export const quantumRegisterStyleVars = (
  rowCount: number,
  rowHeight = CIRCUIT_ROW_HEIGHT_PX,
): Record<string, string> => ({
  "--circuit-row-height": `${rowHeight}px`,
  "--circuit-row-count": String(rowCount),
  "--circuit-quantum-height": `${quantumRegisterHeight(rowCount, rowHeight)}px`,
});
