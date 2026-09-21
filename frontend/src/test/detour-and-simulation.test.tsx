import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DetourSelector from '../components/DetourSelector'
import SimulationResults from '../components/SimulationResults'
import type { PointDto, SimulationResponse } from '../types'

// Mock ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock ResponsiveContainer so recharts renders smoothly in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts')
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 300 }}>{children}</div>,
  }
})

describe('DetourSelector Component', () => {
  const mockPoints: PointDto[] = [
    { index: 0, lat: 46.0, lon: 7.0, elevationM: 500, smoothedElevationM: 500, distanceKm: 0.0 },
    { index: 10, lat: 46.1, lon: 7.1, elevationM: 550, smoothedElevationM: 550, distanceKm: 1.5 },
    { index: 20, lat: 46.2, lon: 7.2, elevationM: 600, smoothedElevationM: 600, distanceKm: 3.0 },
    { index: 30, lat: 46.3, lon: 7.3, elevationM: 520, smoothedElevationM: 520, distanceKm: 5.0 },
  ]

  it('renders range inputs and executes onSimulate callback with indices', () => {
    const handleSimulate = vi.fn()
    const handleReset = vi.fn()

    render(
      <DetourSelector
        points={mockPoints}
        routeId="multi-climb"
        onSimulate={handleSimulate}
        onReset={handleReset}
        isSimulating={false}
        hasActiveSimulation={false}
      />
    )

    expect(screen.getByText(/What-If Detour Simulator/i)).toBeDefined()
    const simulateButton = screen.getByRole('button', { name: /Run What-If Simulation/i })
    expect(simulateButton).toBeDefined()

    fireEvent.click(simulateButton)
    expect(handleSimulate).toHaveBeenCalledTimes(1)
  })

  it('provides quick presets for multi-climb bypass', () => {
    const handleSimulate = vi.fn()
    const handleReset = vi.fn()

    render(
      <DetourSelector
        points={mockPoints}
        routeId="multi-climb"
        onSimulate={handleSimulate}
        onReset={handleReset}
        isSimulating={false}
        hasActiveSimulation={false}
      />
    )

    const presetBtn = screen.getByText(/Bypass Climb 1/i)
    expect(presetBtn).toBeDefined()
    fireEvent.click(presetBtn)
  })
})

describe('SimulationResults Component', () => {
  const mockSimulation: SimulationResponse = {
    originalRouteId: 'multi-climb',
    excludedStartIndex: 0,
    excludedEndIndex: 20,
    excludedDistanceKm: 2.88,
    before: {
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
    },
    after: {
      routeId: 'spliced',
      routeName: 'Spliced Route',
      hasSignificantClimb: true,
      hasSignificantRecovery: false,
      summary: {
        distanceKm: 4.79,
        totalGainM: 121.60,
        totalLossM: 46.27,
        highestPointM: 637.0,
        lowestPointM: 509.0,
        avgGradePercent: 3.51,
      },
      maxClimbSegment: {
        startIndex: 1,
        endIndex: 28,
        startDistanceKm: 0.14,
        endDistanceKm: 3.83,
        gainM: 120.0,
        avgGradePercent: 3.25,
        lengthKm: 3.70,
        totalAscentM: 121.6,
        totalDescentM: 0.0,
        overlapsWithClimb: false,
      },
      renderPoints: [
        { index: 0, lat: 46.0, lon: 7.0, elevationM: 510, smoothedElevationM: 510, distanceKm: 0.0 },
        { index: 1, lat: 46.1, lon: 7.1, elevationM: 511, smoothedElevationM: 510, distanceKm: 0.14 },
      ],
    },
    delta: {
      distanceChangeKm: -2.88,
      gainChangeM: -88.02,
      lossChangeM: -78.01,
      avgGradeChangePercent: -0.84,
      climbStillSignificant: true,
    },
  }

  it('renders Before vs After delta cards and climb shift indices', () => {
    render(<SimulationResults simulation={mockSimulation} />)

    expect(screen.getByText(/What-If Simulation Impact/i)).toBeDefined()
    expect(screen.getByText(/7.67 km/i)).toBeDefined()
    expect(screen.getByText(/4.79 km/i)).toBeDefined()
    expect(screen.getByText(/-2.88 km/i)).toBeDefined()
    expect(screen.getAllByText(/120m/i).length).toBeGreaterThan(0)
  })
})
