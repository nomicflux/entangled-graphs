const PADIC_QUERY_PARAM = "padic";

export const isPadicWorkspaceEnabledFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search);
  return params.has(PADIC_QUERY_PARAM);
};
