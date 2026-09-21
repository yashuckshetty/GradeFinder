import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ComparisonPage from '../pages/ComparisonPage'
import * as api from '../api'

describe('ComparisonPage Component', () => {
  it('renders side-by-side comparative table with advantages', async () => {
    const mockCompareResponse = {
      routeA: {
        routeId: 'multi-climb',
        routeName: 'Multi-Climb Technical',
        hasSignificantClimb: true,
        hasSignificantRecovery: true,
        summary: {
          distanceKm: 7.67,
          totalGainM: 209.62,
          totalLossM: 124.28,
          highestPointM: 637,
          lowestPointM: 509,
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
      routeB: {
        routeId: 'mountain-climb',
        routeName: 'Mountain Climb',
        hasSignificantClimb: true,
        hasSignificantRecovery: true,
        summary: {
          distanceKm: 3.93,
          totalGainM: 540.27,
          totalLossM: 209.6,
          highestPointM: 1169.6,
          lowestPointM: 629.33,
          avgGradePercent: 13.76,
        },
        maxClimbSegment: {
          startIndex: 0,
          endIndex: 21,
          startDistanceKm: 0.0,
          endDistanceKm: 2.84,
          gainM: 540.27,
          avgGradePercent: 19.01,
          lengthKm: 2.84,
          totalAscentM: 540.27,
          totalDescentM: 0.0,
          overlapsWithClimb: false,
        },
      },
      summaryLine: 'Mountain Climb has the harder single climb: 540.27m gain at 19.01% vs 120.0m at 3.37% — a difference of 420.27m.',
    }

    vi.spyOn(api, 'fetchDemoRoutes').mockResolvedValue([
      { id: 'multi-climb', name: 'Multi-Climb Technical', description: '', distanceKm: 7.67 },
      { id: 'mountain-climb', name: 'Mountain Climb', description: '', distanceKm: 3.93 },
    ])

    vi.spyOn(api, 'compareRoutes').mockResolvedValue(mockCompareResponse as any)

    render(
      <MemoryRouter>
        <ComparisonPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Route Head-to-Head Comparison/i)).toBeDefined()
    expect(await screen.findByText(/Compare topography, sustained climb efforts/i)).toBeDefined()
    expect(await screen.findByText(/Mountain Climb has the harder single climb/i)).toBeDefined()
  })
})
