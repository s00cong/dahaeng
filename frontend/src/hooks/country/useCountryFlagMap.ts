import { useQuery } from "@tanstack/react-query";
import { countryApi } from "@/api/country.api";
import { queryKeys } from "@/utils/queryKeys";

const useCountryMaps = () =>
  useQuery({
    queryKey: queryKeys.country.maps,
    queryFn: countryApi.getCountryMaps,
    staleTime: 24 * 60 * 60 * 1000, // 24시간
  });

export const useCountryFlagMap = () => {
  const { data, ...rest } = useCountryMaps();
  return { data: data?.flagMap, ...rest };
};

export const useCountryIdMap = () => {
  const { data, ...rest } = useCountryMaps();
  return { data: data?.idMap, ...rest };
};
