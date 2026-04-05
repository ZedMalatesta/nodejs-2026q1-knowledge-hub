export function paginate<T>(data: T[], pageStr?: string, limitStr?: string) {
  if (pageStr !== undefined || limitStr !== undefined) {
    const page = pageStr !== undefined ? parseInt(pageStr, 10) : 1;
    const limit = limitStr !== undefined ? parseInt(limitStr, 10) : 10;

    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validLimit = isNaN(limit) || limit < 1 ? 10 : limit;

    const total = data.length;
    const startIndex = (validPage - 1) * validLimit;
    const endIndex = startIndex + validLimit;

    return {
      total,
      page: validPage,
      limit: validLimit,
      data: data.slice(startIndex, endIndex),
    };
  }
  return data;
}
