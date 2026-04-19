export function sortData<T>(data: T[], sortBy?: string, order?: string): T[] {
  if (!sortBy) {
    return data;
  }

  const sortOrder = order?.toLowerCase() === 'desc' ? -1 : 1;

  return [...data].sort((a, b) => {
    const valA = a[sortBy as keyof T];
    const valB = b[sortBy as keyof T];

    if (valA === undefined && valB !== undefined) return 1 * sortOrder;
    if (valA !== undefined && valB === undefined) return -1 * sortOrder;
    if (valA === undefined && valB === undefined) return 0;

    if (valA < valB) {
      return -1 * sortOrder;
    }
    if (valA > valB) {
      return 1 * sortOrder;
    }
    return 0;
  });
}
