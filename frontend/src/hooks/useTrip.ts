import { useMutation } from '@tanstack/react-query';
import { tripsApi } from '../services/api';
import type { TripRequest, TripResponse } from '../types';

export const useCalculateTrip = () => {
  return useMutation<TripResponse, Error, TripRequest>({
    mutationFn: tripsApi.calculate,
  });
};
