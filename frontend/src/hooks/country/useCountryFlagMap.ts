import { useQuery } from "@tanstack/react-query";
import { countryApi } from "@/api/country.api";
import { queryKeys } from "@/utils/queryKeys";

export const useCountryFlagMap = () =>
  useQuery({
    queryKey: queryKeys.country.flagMap,
    queryFn: countryApi.getFlagMap,
    staleTime: 24 * 60 * 60 * 1000, // 24시간
  });
