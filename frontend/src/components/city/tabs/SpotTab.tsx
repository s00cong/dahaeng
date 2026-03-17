import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Mountain,
  ExternalLink,
  Globe,
} from "lucide-react";
import type { CityDetail } from "@/schemas/city.schema";

type TouristSpot = NonNullable<CityDetail["touristSpot"]>[number];

interface SpotTabProps {
  city: CityDetail;
}

// ── 더미 데이터 ─────────────────────────────────────────────────────────────

const DUMMY_SPOTS: TouristSpot[] = [
  {
    name: "도쿄 스카이트리",
    description:
      "높이 634m로 일본에서 가장 높은 전파탑이자 도쿄의 새로운 랜드마크. 두 개의 전망대에서 맑은 날에는 후지산까지 조망할 수 있으며, 하부에는 대형 쇼핑몰과 수족관도 위치해 있습니다.",
    lat: 35.7101,
    lon: 139.8107,
    imageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    address: "일본 도쿄도 스미다구 오시아게 1-1-2",
    snsLink: "https://www.instagram.com/tokyoskytree_official/",
    websiteLink: "https://www.tokyo-skytree.jp/",
    tags: [
      { name: "랜드마크", tagScore: 0.95 },
      { name: "전망대", tagScore: 0.88 },
      { name: "도시관광", tagScore: 0.82 },
    ],
  },
  {
    name: "센소지",
    description:
      "628년에 창건된 도쿄에서 가장 오래된 사원. 아사쿠사 지역의 상징으로, 대형 제등이 걸린 카미나리몬(뇌문)을 지나면 나카미세 상점가가 이어집니다. 전통 공예품과 길거리 음식을 즐길 수 있어 연간 3,000만 명이 방문합니다.",
    lat: 35.7148,
    lon: 139.7967,
    imageUrl:
      "https://images.unsplash.com/photo-1583416750470-965b2707b355?w=600&q=80",
    address: "일본 도쿄도 다이토구 아사쿠사 2-3-1",
    snsLink: "https://www.instagram.com/senso.ji/",
    websiteLink: "https://www.senso-ji.jp/",
    tags: [
      { name: "전통문화", tagScore: 0.97 },
      { name: "사원", tagScore: 0.93 },
      { name: "역사", tagScore: 0.89 },
    ],
  },
  {
    name: "시부야 스크램블 교차로",
    description:
      "세계에서 가장 바쁜 교차로 중 하나. 신호가 바뀌면 최대 3,000명이 동시에 건너는 장관을 연출합니다. 주변 스타벅스나 고층 건물 전망대에서 내려다보는 전경이 특히 인기 있습니다.",
    lat: 35.6595,
    lon: 139.7004,
    imageUrl:
      "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600&q=80",
    address: "일본 도쿄도 시부야구 도겐자카 2-2-1",
    snsLink: "https://www.instagram.com/explore/tags/shibuyacrossing/",
    websiteLink: null,
    tags: [
      { name: "도시관광", tagScore: 0.91 },
      { name: "쇼핑", tagScore: 0.85 },
      { name: "야경", tagScore: 0.78 },
    ],
  },
  {
    name: "메이지 신궁",
    description:
      "메이지 천황과 황후를 모시는 신사로 1920년에 완공되었습니다. 도심 속 70만 평방미터의 울창한 숲에 둘러싸여 있어 도시 소음을 피해 자연 속 산책을 즐길 수 있습니다. 새해 참배객이 일본 최다인 명소입니다.",
    lat: 35.6763,
    lon: 139.6993,
    imageUrl:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80",
    address: "일본 도쿄도 시부야구 요요기가미조노초 1-1",
    snsLink: "https://www.instagram.com/meijijingu_official/",
    websiteLink: "https://www.meijijingu.or.jp/",
    tags: [
      { name: "자연", tagScore: 0.88 },
      { name: "전통문화", tagScore: 0.92 },
      { name: "힐링", tagScore: 0.85 },
    ],
  },
  {
    name: "신주쿠 교엔",
    description:
      "144만 평방미터의 넓은 국립공원으로 일본식, 프랑스식, 영국식 정원이 공존하는 아름다운 장소입니다. 봄에는 약 1,100그루의 벚꽃나무가 장관을 이루며, 도심 속 최고의 피크닉 장소로 손꼽힙니다.",
    lat: 35.6851,
    lon: 139.7100,
    imageUrl:
      "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&q=80",
    address: "일본 도쿄도 신주쿠구 나이토마치 11",
    snsLink: "https://www.instagram.com/explore/tags/shinjukugyoen/",
    websiteLink: "https://www.env.go.jp/garden/shinjukugyoen/",
    tags: [
      { name: "자연", tagScore: 0.94 },
      { name: "벚꽃", tagScore: 0.98 },
      { name: "공원", tagScore: 0.90 },
    ],
  },
  {
    name: "아키하바라",
    description:
      "세계적으로 유명한 전자제품·애니메이션·게임 문화의 메카. 수십 개의 전자상가와 애니메이션 굿즈 매장, 메이드 카페 등이 밀집해 있습니다. 일본 오타쿠 문화의 중심지로 매년 수백만 명의 관광객이 찾습니다.",
    lat: 35.7023,
    lon: 139.7745,
    imageUrl:
      "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&q=80",
    address: "일본 도쿄도 지요다구 소토칸다",
    snsLink: "https://www.instagram.com/explore/tags/akihabara/",
    websiteLink: null,
    tags: [
      { name: "쇼핑", tagScore: 0.96 },
      { name: "애니메이션", tagScore: 0.99 },
      { name: "전자제품", tagScore: 0.94 },
    ],
  },
];

// ── 카드 그리드 (목록) ───────────────────────────────────────────────────────

function SpotGrid({
  city,
  spots,
  onSelect,
}: {
  city: CityDetail;
  spots: TouristSpot[];
  onSelect: (spot: TouristSpot) => void;
}) {
  return (
    <div className="p-5 h-full overflow-y-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="size-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-foreground">
          {city.cityName} 추천 관광지
        </h3>
        <span className="text-xs text-muted-foreground">({spots.length}곳)</span>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-3 gap-3">
        {spots.map((spot, idx) => (
          <SpotCard
            key={idx}
            spot={spot}
            onClick={() => onSelect(spot)}
          />
        ))}
      </div>
    </div>
  );
}

// ── 개별 카드 ────────────────────────────────────────────────────────────────

function SpotCard({
  spot,
  onClick,
}: {
  spot: TouristSpot;
  onClick: () => void;
}) {
  const tags = (spot.tags ?? []).slice(0, 3);

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl overflow-hidden border border-border hover:border-blue-300 hover:shadow-md transition-all text-left group"
    >
      {/* 이미지 영역 */}
      <div className="relative h-32 bg-slate-200 shrink-0">
        {spot.imageUrl ? (
          <img
            src={spot.imageUrl}
            alt={spot.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
            <Mountain className="size-8 text-slate-400" />
          </div>
        )}

        {/* 그라데이션 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* 태그 (하단) */}
        {tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag.name}
                className="text-[9px] font-medium text-white bg-blue-500/80 rounded-full px-1.5 py-0.5"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 관광지 이름 + 주소 */}
      <div className="px-2.5 py-2 bg-white flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-foreground truncate">{spot.name}</p>
        {spot.address && (
          <p className="text-[10px] text-muted-foreground truncate">{spot.address}</p>
        )}
      </div>
    </button>
  );
}

// ── 상세 보기 ─────────────────────────────────────────────────────────────────

function SpotDetail({
  spot,
  onBack,
}: {
  spot: TouristSpot;
  onBack: () => void;
}) {
  const tags = spot.tags ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-5 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ArrowLeft className="size-4" />
        관광지 목록으로
      </button>

      {/* 이미지 */}
      <div className="relative h-52 bg-slate-200 mx-5 rounded-xl overflow-hidden shrink-0">
        {spot.imageUrl ? (
          <img
            src={spot.imageUrl}
            alt={spot.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
            <Mountain className="size-12 text-slate-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* 콘텐츠 */}
      <div className="flex flex-col gap-4 p-5">
        {/* 관광지명 */}
        <div>
          <h3 className="text-xl font-bold text-foreground">{spot.name}</h3>

          {/* 주소 */}
          {spot.address && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0 mt-0.5 text-slate-400" />
              <span>{spot.address}</span>
            </div>
          )}

          {/* 좌표 */}
          {spot.lat != null && spot.lon != null && !spot.address && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0 text-slate-400" />
              <span>
                {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        {/* 링크 버튼들 */}
        {(spot.snsLink || spot.websiteLink) && (
          <div className="flex gap-2 flex-wrap">
            {spot.snsLink && (
              <a
                href={spot.snsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                SNS
              </a>
            )}
            {spot.websiteLink && (
              <a
                href={spot.websiteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Globe className="size-3.5" />
                공식 웹사이트
              </a>
            )}
          </div>
        )}

        {/* 관광지 설명 */}
        {spot.description && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              {spot.description}
            </p>
          </div>
        )}

        {/* 관광지별 태그 및 점수 */}
        {tags.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-foreground">관련 태그</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.name}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm"
                >
                  <span className="text-xs font-medium text-slate-700">
                    #{tag.name}
                  </span>
                  {tag.tagScore != null && (
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 rounded-full px-1.5 py-0.5">
                      {(tag.tagScore * 100).toFixed(0)}점
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 외부 링크 (ExternalLink 아이콘) */}
        {spot.websiteLink && (
          <a
            href={spot.websiteLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-xs text-muted-foreground hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            <ExternalLink className="size-3.5" />
            더 많은 정보 보기
          </a>
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function SpotTab({ city }: SpotTabProps) {
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);

  // 실제 데이터가 없으면 더미 데이터 사용
  const spots = (city.touristSpot && city.touristSpot.length > 0)
    ? city.touristSpot
    : DUMMY_SPOTS;

  return (
    <AnimatePresence mode="wait">
      {selectedSpot ? (
        <motion.div
          key="detail"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
        >
          <SpotDetail
            spot={selectedSpot}
            onBack={() => setSelectedSpot(null)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
        >
          <SpotGrid spots={spots} city={city} onSelect={setSelectedSpot} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
