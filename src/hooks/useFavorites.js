import { useMutation, useQuery, useQueryClient } from "react-query";
import { routingService } from "../services/routingService";
import { authService } from "../services/authService";

export function useFavoriteRoutes() {
  const user = authService.getCurrentUser();
  
  return useQuery(
    ['favoriteRoutes', user?.uid],
    () => routingService.getFavoriteRoutes(user.uid),
    {
      enabled: !!user,
      retry: 1,
    }
  );
}

export function useSaveAsFavorite() {
  const queryClient = useQueryClient();
  const user = authService.getCurrentUser();

  return useMutation(
    (routeData) => routingService.saveAsFavorite(user.uid, routeData),
    {
      onSuccess: () => {
        // Invalidate and refetch favorite routes
        queryClient.invalidateQueries(['favoriteRoutes', user?.uid]);
      },
    }
  );
}

export function useRouteHistory() {
  const user = authService.getCurrentUser();
  
  return useQuery(
    ['routeHistory', user?.uid],
    async () => {
      console.log('🔍 Fetching route history for user:', user?.uid);
      try {
        const result = await routingService.getUserRouteHistory(user.uid);
        console.log('✅ Route history fetched successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Error fetching route history:', error);
        throw error;
      }
    },
    {
      enabled: !!user,
      retry: 1,
      onError: (error) => {
        console.error('🔥 Route history query failed:', error);
      }
    }
  );
}

export function useSaveRouteHistory() {
  const queryClient = useQueryClient();
  const user = authService.getCurrentUser();

  return useMutation(
    (routeData) => routingService.saveRouteHistory(user.uid, routeData),
    {
      onSuccess: () => {
        // Invalidate and refetch route history
        queryClient.invalidateQueries(['routeHistory', user?.uid]);
      },
    }
  );
}

export function useRouteHistoryManager() {
  const saveRouteHistoryMutation = useSaveRouteHistory();
  const routeHistoryQuery = useRouteHistory();

  const saveRouteHistory = (routeData) => {
    // Call the mutation to save route history
    saveRouteHistoryMutation.mutate(routeData);
  };

  return {
    ...routeHistoryQuery,
    saveRouteHistory,
  };
}