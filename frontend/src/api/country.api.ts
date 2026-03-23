import { axiosInstance } from "./axiosInstance";
import { z } from "zod";

const CountryListItemSchema = z.object({
  id: z.number(),
  countryName: z.string(),
  imgUrl: z.string().nullable(),
});

export interface CountryMaps {
  flagMap: Map<string, string>;
  idMap: Map<string, number>;
}

export const countryApi = {
  // GET /api/country/list → { flagMap, idMap }
  getCountryMaps: async (): Promise<CountryMaps> => {
    const { data } = await axiosInstance.get("/api/country/list");
    const parsed = z.array(CountryListItemSchema).parse(data);
    const flagMap = new Map(
      parsed
        .filter((c) => c.imgUrl)
        .map((c) => [c.countryName, c.imgUrl!]),
    );
    const idMap = new Map(parsed.map((c) => [c.countryName, c.id]));
    return { flagMap, idMap };
  },
};
