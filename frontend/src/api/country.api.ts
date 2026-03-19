import { axiosInstance } from "./axiosInstance";
import { z } from "zod";

const CountryListItemSchema = z.object({
  id: z.number(),
  countryName: z.string(),
  imgUrl: z.string().nullable(),
});

export const countryApi = {
  // GET /api/country → Map<countryName, imgUrl>
  getFlagMap: async (): Promise<Map<string, string>> => {
    const { data } = await axiosInstance.get("/api/country/list");
    const parsed = z.array(CountryListItemSchema).parse(data);
    return new Map(
      parsed
        .filter((c) => c.imgUrl)
        .map((c) => [c.countryName, c.imgUrl!]),
    );
  },
};
