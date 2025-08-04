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
    () => routingService.getUserRouteHistory(user.uid),
    {
      enabled: !!user,
      retry: 1,
    }
  );
}