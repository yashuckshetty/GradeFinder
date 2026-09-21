/* ─── Backend DTO mirror types ─────────────────────────────────────────────── */

export interface SummaryDto {
  distanceKm: number;
  totalGainM: number;
  totalLossM: number;
  highestPointM: number;
  lowestPointM: number;
  avgGradePercent: number;
}

export interface SegmentDto {
  startIndex: number;
  endIndex: number;
  startDistanceKm: number;
  endDistanceKm: number;
  gainM: number;
  avgGradePercent: number;
  lengthKm: number;
  totalAscentM: number;
  totalDescentM: number;
  overlapsWithClimb?: boolean;
}

export interface ZoneDto {
  startIndex: number;
  endIndex: number;
  type: 'CLIMBING' | 'DESCENDING' | 'FLAT';
}

export interface PointDto {
  index: number;
  lat: number;
  lon: number;
  elevationM: number;
  smoothedElevationM: number;
  distanceKm: number;
}

export interface RouteAnalysisResponse {
  routeId: string;
  routeName: string;
  summary: SummaryDto;
  hasSignificantClimb: boolean;
  maxClimbSegment: SegmentDto | null;
  alternateMaxima: SegmentDto[];
  hasSignificantRecovery: boolean;
  maxRecoverySegment: SegmentDto | null;
  zones: ZoneDto[];
  renderPoints: PointDto[];
  warnings: string[];
  algorithmParameters: Record<string, number>;
  message: string | null;
}

export interface DemoRoute {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
}

export interface SimulationResponse {
  before: RouteAnalysisResponse;
  after: RouteAnalysisResponse;
  delta: Record<string, number | boolean>;
}

export interface ComparisonResponse {
  routeA: RouteAnalysisResponse;
  routeB: RouteAnalysisResponse;
  summaryLine: string;
}
