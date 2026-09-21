import type { RouteAnalysisResponse, DemoRoute, SimulationResponse } from './types';

const API_BASE = '/api/routes';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDemoRoutes(): Promise<DemoRoute[]> {
  const res = await fetch(`${API_BASE}/demo`);
  return handleResponse<DemoRoute[]>(res);
}

export async function analyzeDemo(
  demoId: string,
  overrides?: { descentTolerance?: number; minGain?: number; minGrade?: number }
): Promise<RouteAnalysisResponse> {
  const params = new URLSearchParams({ demoRouteId: demoId });
  if (overrides?.descentTolerance != null) params.set('descentTolerance', String(overrides.descentTolerance));
  if (overrides?.minGain != null) params.set('minSignificantGain', String(overrides.minGain));
  if (overrides?.minGrade != null) params.set('minSignificantGrade', String(overrides.minGrade));

  const res = await fetch(`${API_BASE}/analyze?${params}`, { method: 'POST' });
  return handleResponse<RouteAnalysisResponse>(res);
}

export async function analyzeFile(
  file: File,
  overrides?: { descentTolerance?: number; minGain?: number; minGrade?: number }
): Promise<RouteAnalysisResponse> {
  const form = new FormData();
  form.append('file', file);
  if (overrides?.descentTolerance != null) form.append('descentTolerance', String(overrides.descentTolerance));
  if (overrides?.minGain != null) form.append('minSignificantGain', String(overrides.minGain));
  if (overrides?.minGrade != null) form.append('minSignificantGrade', String(overrides.minGrade));

  const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: form });
  return handleResponse<RouteAnalysisResponse>(res);
}

export async function simulate(
  routeId: string,
  excludeStartIndex: number,
  excludeEndIndex: number
): Promise<SimulationResponse> {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeId, excludeStartIndex, excludeEndIndex }),
  });
  return handleResponse<SimulationResponse>(res);
}

export async function compareRoutes(routeAId: string, routeBId: string): Promise<import('./types').ComparisonResponse> {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeAId, routeBId }),
  });
  return handleResponse<import('./types').ComparisonResponse>(res);
}
