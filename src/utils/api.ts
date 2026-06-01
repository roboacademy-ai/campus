const API_BASE = ((import.meta as any).env?.VITE_API_URL as string) || '';

export function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${API_BASE}${cleanPath}`;
}
