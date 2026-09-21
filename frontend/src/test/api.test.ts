import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchDemoRoutes, analyzeDemo, simulate } from '../api'

describe('API Service Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchDemoRoutes fetches and parses demo routes successfully', async () => {
    const mockRoutes = [
      { id: 'multi-climb', name: 'Multi-Climb', description: 'Test', distanceKm: 42.0 },
      { id: 'mountain-climb', name: 'Mountain Climb', description: 'Test 2', distanceKm: 18.0 }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRoutes,
    } as Response)

    const routes = await fetchDemoRoutes()
    expect(routes).toHaveLength(2)
    expect(routes[0].id).toBe('multi-climb')
    expect(routes[1].distanceKm).toBe(18.0)
    expect(fetch).toHaveBeenCalledWith('/api/routes/demo')
  })

  it('analyzeDemo sends parameters and handles response', async () => {
    const mockAnalysis = {
      routeId: 'multi-climb',
      routeName: 'Multi-Climb Technical',
      hasSignificantClimb: true,
      hasSignificantRecovery: true,
      summary: {
        distanceKm: 7.67,
        totalGainM: 209.62,
        totalLossM: 124.28,
        highestPointM: 637.0,
        lowestPointM: 509.0,
        avgGradePercent: 4.35,
      },
      maxClimbSegment: {
        startIndex: 23,
        endIndex: 49,
        startDistanceKm: 3.15,
        endDistanceKm: 6.71,
        gainM: 120.0,
        avgGradePercent: 3.37,
        lengthKm: 3.56,
        totalAscentM: 121.6,
        totalDescentM: 0.0,
        overlapsWithClimb: false,
      },
      maxRecoverySegment: {
        startIndex: 14,
        endIndex: 23,
        startDistanceKm: 1.92,
        endDistanceKm: 3.15,
        gainM: 78.2,
        avgGradePercent: 6.35,
        lengthKm: 1.23,
        totalAscentM: 0.0,
        totalDescentM: 78.2,
        overlapsWithClimb: false,
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnalysis,
    } as Response)

    const result = await analyzeDemo('multi-climb')
    expect(result.hasSignificantClimb).toBe(true)
    expect(result.maxClimbSegment?.gainM).toBe(120.0)
    expect(result.maxClimbSegment?.totalAscentM).toBe(121.6)
    expect(result.maxRecoverySegment?.gainM).toBe(78.2)
    expect(result.maxRecoverySegment?.overlapsWithClimb).toBe(false)
  })

  it('simulate calls POST /api/routes/simulate with correct JSON payload', async () => {
    const mockSim = {
      originalRouteId: 'multi-climb',
      excludedStartIndex: 0,
      excludedEndIndex: 20,
      excludedDistanceKm: 2.88,
      before: {
        summary: { distanceKm: 7.67, totalGainM: 209.62, totalLossM: 124.28, highestPointM: 637, lowestPointM: 509, avgGradePercent: 4.35 },
      },
      after: {
        summary: { distanceKm: 4.79, totalGainM: 121.6, totalLossM: 46.27, highestPointM: 637, lowestPointM: 509, avgGradePercent: 3.51 },
        maxClimbSegment: { startIndex: 1, endIndex: 28, gainM: 120.0, avgGradePercent: 3.25, lengthKm: 3.7 },
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSim,
    } as Response)

    const result = await simulate('multi-climb', 0, 20)

    expect(fetch).toHaveBeenCalledWith('/api/routes/simulate', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: 'multi-climb',
        excludeStartIndex: 0,
        excludeEndIndex: 20,
      }),
    }))

    expect(result.after.maxClimbSegment?.startIndex).toBe(1)
    expect(result.after.maxClimbSegment?.endIndex).toBe(28)
    expect(result.after.maxClimbSegment?.gainM).toBe(120.0)
  })

  it('throws friendly error message when server responds with 400', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid GPX format' }),
    } as Response)

    await expect(analyzeDemo('invalid-id')).rejects.toThrow('Invalid GPX format')
  })
})
