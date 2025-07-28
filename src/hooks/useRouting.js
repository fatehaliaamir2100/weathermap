import { useMutation } from "react-query";
import { routingService, geocodingService } from "../services/routingService";

export function useGeocode() {
  return useMutation(geocodingService.geocode);
}

export function useRoute() {
  return useMutation(
    ({ start, end, profile }) => routingService.getRoute(start, end, profile),
    {
      retry: 1,
    }
  );
}
