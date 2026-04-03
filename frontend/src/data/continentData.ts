export const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // 아시아
  Japan: "아시아",
  China: "아시아",
  Thailand: "아시아",
  Philippines: "아시아",
  Taiwan: "아시아",
  Singapore: "아시아",
  Malaysia: "아시아",
  Cambodia: "아시아",
  Mongolia: "아시아",
  India: "아시아",
  Indonesia: "아시아",
  Laos: "아시아",
  Vietnam: "아시아",
  Nepal: "아시아",
  Kazakhstan: "아시아",
  "South Korea": "아시아",
  Qatar: "아시아",
  "United Arab Emirates": "아시아",
  Maldives: "아시아",
  Palau: "아시아",
  // 유럽
  France: "유럽",
  Russia: "유럽",
  "United Kingdom": "유럽",
  Germany: "유럽",
  Italy: "유럽",
  Netherlands: "유럽",
  Switzerland: "유럽",
  "Czech Republic": "유럽",
  Austria: "유럽",
  Croatia: "유럽",
  Portugal: "유럽",
  Greece: "유럽",
  Poland: "유럽",
  Sweden: "유럽",
  Norway: "유럽",
  Iceland: "유럽",
  Denmark: "유럽",
  Belgium: "유럽",
  Hungary: "유럽",
  Finland: "유럽",
  Turkey: "유럽",
  Spain: "유럽",
  // 북아메리카
  Canada: "북아메리카",
  Mexico: "북아메리카",
  Cuba: "북아메리카",
  "United States": "북아메리카",
  // 남아메리카
  Brazil: "남아메리카",
  Bolivia: "남아메리카",
  Argentina: "남아메리카",
  Chile: "남아메리카",
  Peru: "남아메리카",
  // 아프리카
  "South Africa": "아프리카",
  Egypt: "아프리카",
  Mauritius: "아프리카",
  Morocco: "아프리카",
  Kenya: "아프리카",
  // 오세아니아
  Australia: "오세아니아",
  "New Zealand": "오세아니아",
};

// 대륙별 연한 파스텔 색상
export const CONTINENT_COLORS: Record<string, string> = {
  아시아: "#93c5fd",    // blue-300
  유럽: "#c4b5fd",      // violet-300
  북아메리카: "#86efac", // green-300
  남아메리카: "#6ee7b7", // emerald-300
  아프리카: "#fca5a5",   // red-300
  오세아니아: "#fcd34d", // amber-300
};

export const DEFAULT_CONTINENT_COLOR = "#94a3b8"; // slate-400 (매핑 없는 국가)
