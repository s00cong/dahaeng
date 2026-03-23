import { axiosInstance } from "./axiosInstance";
import { z } from "zod";

export const TagItemSchema = z.object({
  tagId: z.number(),
  categoryId: z.number(),
  tagName: z.string(),
  categoryName: z.string(),
});
export type TagItem = z.infer<typeof TagItemSchema>;

export const tagApi = {
  // GET /api/tag — 인증 불필요 (PUBLIC_URLS)
  getList: async (): Promise<TagItem[]> => {
    const { data } = await axiosInstance.get("/api/tag");
    return z.array(TagItemSchema).parse(data);
  },
};
