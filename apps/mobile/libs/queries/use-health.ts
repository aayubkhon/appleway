import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { fetchHealth, type HealthReport } from '../services/health.service';
import { healthKeys } from './keys';

export function useHealth(): UseQueryResult<HealthReport, Error> {
  return useQuery({
    queryKey: healthKeys.status(),
    queryFn: fetchHealth,
    retry: 1,
    staleTime: 10_000,
  });
}
