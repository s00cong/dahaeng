import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Globe,
  Star,
  BookOpen,
  Share2,
  Clock,
  Sparkles,
  Route,
  AlertCircle,
} from "lucide-react";
import Map, { Marker, Popup, NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Skeleton } from "@/components/ui/skeleton";
import type { CityDetail } from "@/schemas/city.schema";
import { useCityList } from "@/hooks/city/useCityList";
import { usePlaces } from "@/hooks/spot/usePlaces";
import type { Place } from "@/api/places.api";
import { useNearbyAttractions } from "@/hooks/spot/useNearbyAttractions";
import type { NearbyAttractionFeature } from "@/api/nearbyAttractions.api";
import { useTravelCourse } from "@/hooks/spot/useTravelCourse";
import { CITY_NAME_KO } from "@/data/cityNameKo";


interface SpotTabProps {
  city: CityDetail;
  isRecommended?: boolean;
}

// ── Google Maps URL 생성 ───────────────────────────────────────────────────────

function buildGoogleMapsUrl(name: string, address?: string | null): string {
  const query = address ? `${name} ${address}` : name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// ── 섹션 헤더 ─────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ── 1. AI 추천 관광지 카드 (recommend=true, 텍스트 전용) ─────────────────────

type TouristSpot = NonNullable<CityDetail["touristSpot"]>[number];

function TouristSpotCard({
  spot,
  cityName,
  courseOrder,
  courseDescription,
  courseTip,
}: {
  spot: TouristSpot;
  cityName: string;
  courseOrder?: number;
  courseDescription?: string;
  courseTip?: string;
}) {
  const tags = spot.tags ?? [];
  const spotScore = spot.spotScore != null ? Math.round(spot.spotScore * 100) : null;

  const displayName = spot.koName || spot.name;
  const descriptionText = courseDescription ?? (
    spot.description && spot.description !== "Overture Place" && spot.description !== spot.name && spot.description !== displayName
      ? spot.description
      : null
  );

  const mapUrl = buildGoogleMapsUrl(displayName, spot.address ?? cityName);

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-col gap-2 rounded-xl border bg-white p-3 hover:shadow-sm transition-all cursor-pointer ${courseOrder != null ? 'border-indigo-200 hover:border-indigo-300' : 'border-border hover:border-blue-200'}`}>
      {/* 순번 뱃지 + 이름 + 점수 */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-start gap-1.5 min-w-0">
          {courseOrder != null && (
            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold mt-0.5">
              {courseOrder}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{displayName}</p>
            {spot.koName && spot.koName.trim() !== "" && spot.koName !== spot.name && (
              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1">{spot.name}</p>
            )}
          </div>
        </div>
        {spotScore != null && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Star className="size-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-amber-600 font-bold">{spotScore}점</span>
          </div>
        )}
      </div>

      {/* 설명 */}
      {descriptionText && (
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
          {descriptionText}
        </p>
      )}

      {/* 추천 활동 */}
      {courseTip && (
        <span className="self-start text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
          ✅ {courseTip}
        </span>
      )}

      {/* 태그 + tagScore */}
      {tags.length > 0 && (
        <div className="flex flex-col gap-1">
          {tags.map((tag) => {
            const tagScore = tag.tagScore != null ? Math.round(tag.tagScore * 100) : null;
            return (
              <div key={tag.name} className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 truncate">
                  #{tag.name}
                </span>
                {tagScore != null && (
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {tagScore}점
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </a>
  );
}

// ── 2. Places 카드 (/api/{cityId}/places) ────────────────────────────────────

function PlaceCard({ place }: { place: Place }) {
  const displayName = place.koName || place.name;
  const mapUrl = buildGoogleMapsUrl(displayName, place.address);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 hover:border-blue-200 hover:shadow-sm transition-all">
      {/* 이름 */}
      <div>
        <p className="text-xs font-semibold text-foreground leading-snug">{displayName}</p>
        {place.koName && place.koName.trim() !== "" && place.koName !== place.name && (
          <p className="text-[10px] text-muted-foreground leading-snug">{place.name}</p>
        )}
      </div>

      {/* 태그 + 점수 */}
      {place.tags.length > 0 && (
        <div className="flex flex-col gap-1">
          {place.tags.map((t) => {
            const score = Math.round(t.score * 100);
            return (
              <span key={t.tagName} className="self-start flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                #{t.tagName}
                <span className="text-emerald-500 font-bold">{score}점</span>
              </span>
            );
          })}
        </div>
      )}

      {/* 주소 */}
      {place.address && (
        <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
          <MapPin className="size-2.5 shrink-0 mt-0.5" />
          <span className="line-clamp-1">{place.address}</span>
        </div>
      )}

      {/* 링크 버튼 */}
      <div className="flex gap-1.5 mt-1 flex-wrap">
        <a href={mapUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors text-[10px] text-muted-foreground">
          <MapPin className="size-2.5" />지도
        </a>
        {place.socialUrl && (
          <a href={place.socialUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors text-[10px] text-muted-foreground">
            <Share2 className="size-2.5" />SNS
          </a>
        )}
        {place.websiteUrl && (
          <a href={place.websiteUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors text-[10px] text-muted-foreground">
            <Globe className="size-2.5" />웹사이트
          </a>
        )}
      </div>
    </div>
  );
}


// ── 3. 근처 관광지 카드 (/api/{cityId}/nearby-attractions) ────────────────────

function NearbyAttractionCard({
  feature,
  courseOrder,
  courseDescription,
  courseTip,
  visitTime,
}: {
  feature: NearbyAttractionFeature;
  courseOrder?: number;
  courseDescription?: string;
  courseTip?: string;
  visitTime?: string;
}) {
  const p = feature.properties;
  const mainName = p.nameKo ?? p.nameEn ?? p.name;
  const subName = p.nameKo
    ? (p.name !== p.nameKo ? p.name : undefined)
    : (p.nameEn && p.name !== p.nameEn ? p.name : undefined);
  const category = p.categories?.[0] ?? null;
  const mapUrl = buildGoogleMapsUrl(mainName, p.formatted);

  return (
    <div className={`flex flex-col rounded-xl border bg-white overflow-hidden hover:shadow-sm transition-all ${courseOrder != null ? 'border-indigo-200 hover:border-indigo-300' : 'border-border hover:border-orange-200'}`}>
      {/* 이미지 */}
      {p.imageUrl && (
        <div className="relative h-28 bg-slate-200 shrink-0">
          <img
            src={p.imageUrl}
            alt={p.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              const wrapper = e.currentTarget.parentElement as HTMLElement;
              if (wrapper) wrapper.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {category && (
            <span className="absolute bottom-1.5 left-2 text-[9px] font-medium text-white bg-orange-500/80 rounded-full px-1.5 py-0.5 truncate">
              {category.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}

      <div className="p-3 flex flex-col gap-2">
      {/* 카테고리 뱃지 (이미지 없을 때) */}
      {!p.imageUrl && category && (
        <span className="self-start text-[9px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-1.5 py-0.5 truncate">
          {category.replace(/_/g, ' ')}
        </span>
      )}

      {/* 순번 배지 + 이름 */}
      <div className="flex items-start gap-1.5">
        {courseOrder != null && (
          <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold mt-0.5">
            {courseOrder}
          </span>
        )}
        <div>
          <p className="text-xs font-semibold text-foreground leading-snug">{mainName}</p>
          {subName && (
            <p className="text-[10px] text-muted-foreground">{subName}</p>
          )}
        </div>
      </div>

      {/* 코스 설명 (우선) 또는 기존 설명 */}
      {(courseDescription ?? p.descriptionKo ?? p.description) && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
          {courseDescription ?? p.descriptionKo ?? p.description}
        </p>
      )}

      {/* 추천 활동 */}
      {courseTip && (
        <span className="self-start text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
          ✅ {courseTip}
        </span>
      )}

      {/* 주소 */}
      {p.formatted && (
        <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
          <MapPin className="size-2.5 shrink-0 mt-0.5" />
          <span className="line-clamp-1">{p.formatted}</span>
        </div>
      )}

      {/* 방문 시간 (코스 포함 시) */}
      {visitTime && (
        <span className="self-start text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
          🕐 {visitTime}
        </span>
      )}

      {/* 운영시간 */}
      {p.opening_hours && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="size-2.5 shrink-0" />
          <span className="truncate">{p.opening_hours}</span>
        </div>
      )}

      {/* 링크 */}
      <div className="flex gap-1.5 mt-1 flex-wrap">
        <a href={mapUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors text-[10px] text-muted-foreground">
          <MapPin className="size-2.5" />지도
        </a>
        {p.website && (
          <a href={p.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors text-[10px] text-muted-foreground">
            <Globe className="size-2.5" />웹사이트
          </a>
        )}
        {p.wiki_and_media?.wikipedia && (
          <a href={p.wiki_and_media.wikipedia} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-orange-300 hover:text-orange-600 transition-colors text-[10px] text-muted-foreground">
            <BookOpen className="size-2.5" />위키
          </a>
        )}
      </div>
      </div>
    </div>
  );
}

// ── 지도 마커 타입 ────────────────────────────────────────────────────────────

interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  name: string;
  type: "ai" | "place" | "nearby";
  tagName?: string;
  score?: number;
  imageUrl?: string;
  description?: string;
  address?: string;
  category?: string;
  courseOrder?: number;
  courseDescription?: string;
  courseTip?: string;
  visitTime?: string;
}

// ── 관광지 지도 컴포넌트 ──────────────────────────────────────────────────────

function SpotMap({
  markers,
  centerLat,
  centerLon,
  courseRoute,
}: {
  markers: MapMarker[];
  centerLat: number;
  centerLon: number;
  courseRoute?: [number, number][];
}) {
  const [popup, setPopup] = useState<MapMarker | null>(null);

  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null =
    courseRoute && courseRoute.length >= 2
      ? { type: 'Feature', geometry: { type: 'LineString', coordinates: courseRoute }, properties: {} }
      : null;

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 380 }}>
      <Map
        initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: 12 }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {/* 코스 경로 선 */}
        {routeGeoJSON && (
          <Source id="course-route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="course-route-line"
              type="line"
              paint={{ 'line-color': '#6366f1', 'line-width': 2.5, 'line-dasharray': [3, 2] }}
            />
          </Source>
        )}

        {markers.map((m) => (
          <Marker
            key={m.id}
            longitude={m.lon}
            latitude={m.lat}
            anchor="bottom"
            onClick={(e) => { e.originalEvent.stopPropagation(); setPopup(m); }}
          >
            {m.type === "ai" ? (
              /* AI 추천: 항상 별 아이콘, 코스 포함 시 indigo로 색 변경 */
              <div
                className={`relative flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform ${
                  m.courseOrder != null ? "bg-indigo-500" : "bg-amber-400"
                }`}
                title={m.name}
              >
                <Star className="size-3.5 text-white fill-white" />
                {m.courseOrder != null && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-white border border-indigo-400 text-indigo-600 text-[9px] font-bold shadow">
                    {m.courseOrder}
                  </span>
                )}
              </div>
            ) : m.courseOrder != null ? (
              /* 근처 관광지 + 코스 포함: 번호 뱃지 */
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform bg-indigo-500 text-white text-[11px] font-bold"
                title={m.name}
              >
                {m.courseOrder}
              </div>
            ) : (
              /* 근처 관광지 기본 */
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform bg-orange-400"
                title={m.name}
              >
                <MapPin className="size-3 text-white" />
              </div>
            )}
          </Marker>
        ))}

        {popup && (
          <Popup
            longitude={popup.lon}
            latitude={popup.lat}
            anchor="bottom"
            offset={32}
            onClose={() => setPopup(null)}
            closeButton={false}
            maxWidth="220px"
          >
            <div className="flex flex-col rounded-lg overflow-hidden w-[200px]">
              {/* 이미지 */}
              {popup.imageUrl && (
                <div className="relative h-24 bg-slate-200 shrink-0">
                  <img
                    src={popup.imageUrl}
                    alt={popup.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  {popup.category && (
                    <span className="absolute bottom-1.5 left-2 text-[9px] font-medium text-white bg-orange-500/80 rounded-full px-1.5 py-0.5">
                      {popup.category.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              )}

              <div className="p-2.5 flex flex-col gap-1.5">
                {/* 타입 배지 */}
                <div className="flex items-center gap-1.5">
                  {popup.type === "ai" ? (
                    <span className="text-[9px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">AI 추천</span>
                  ) : (
                    !popup.imageUrl && popup.category && (
                      <span className="text-[9px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-1.5 py-0.5">
                        {popup.category.replace(/_/g, ' ')}
                      </span>
                    )
                  )}
                  {popup.score != null && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-bold ml-auto">
                      <Star className="size-2.5 fill-amber-400 text-amber-400" />{popup.score}점
                    </span>
                  )}
                </div>

                {/* 이름 */}
                <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">{popup.name}</p>

                {/* 태그 */}
                {popup.tagName && (
                  <span className="text-[10px] text-blue-600">#{popup.tagName}</span>
                )}

                {/* 방문 시간 */}
                {popup.visitTime && (
                  <span className="self-start text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                    🕐 {popup.visitTime}
                  </span>
                )}

                {/* 코스 설명 (우선) 또는 기존 설명 */}
                {(popup.courseDescription ?? popup.description) && (
                  <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                    {popup.courseDescription ?? popup.description}
                  </p>
                )}

                {/* 추천 활동 */}
                {popup.courseTip && (
                  <span className="self-start text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                    ✅ {popup.courseTip}
                  </span>
                )}

                {/* 주소 */}
                {popup.address && (
                  <div className="flex items-start gap-1 text-[10px] text-slate-400">
                    <MapPin className="size-2.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{popup.address}</span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function SpotTab({ city, isRecommended = false }: SpotTabProps) {
  // recommend=false일 때 latitude/longitude가 0 → cityList에서 실제 좌표 보완
  const { data: cities } = useCityList();
  const cityInfo = cities?.find((c) => c.cityId === city.cityId);
  const lat = city.latitude || cityInfo?.latitude;
  const lon = city.longitude || cityInfo?.longitude;

  const { data: places, isLoading: isPlacesLoading, isError: isPlacesError } = usePlaces(city.cityId);
  const { data: nearbyAttractions, isError: isNearbyError } = useNearbyAttractions(city.cityId);
  const { courses, selectedCourse, selectedIndex, setSelectedIndex, isLoading: isCourseLoading, error: courseError, generate, reset } = useTravelCourse();

  const cityNameKo = CITY_NAME_KO[city.cityName] ?? city.cityName;

  // recommend=true 일 때 서버 AI 추천 관광지 (name 중복 제거 — imgUrl 있는 것 우선)
  const touristSpots = useMemo(() => {
    const raw = isRecommended && city.touristSpot && city.touristSpot.length > 0
      ? city.touristSpot
      : null;
    if (!raw) return null;
    const nameMap = new globalThis.Map<string, typeof raw[number]>();
    for (const s of raw) {
      const existing = nameMap.get(s.name);
      if (!existing || (!existing.imageUrl && s.imageUrl)) {
        nameMap.set(s.name, s);
      }
    }
    return [...nameMap.values()];
  }, [isRecommended, city.touristSpot]);

  // 코스 이름 → { order, description } 맵
  const courseMap = useMemo(() => {
    const m = new globalThis.Map<string, { order: number; description: string; tip: string; visitTime: string }>();
    if (selectedCourse) {
      selectedCourse.attractions.forEach((a) => m.set(a.name, { order: a.order, description: a.description, tip: a.tip, visitTime: a.visitTime }));
    }
    return m;
  }, [selectedCourse]);

  // 코스 경로 좌표 (순서대로)
  const courseRoute = useMemo<[number, number][]>(() => {
    if (!selectedCourse) return [];
    return [...selectedCourse.attractions]
      .sort((a, b) => a.order - b.order)
      .map((a) => [a.lon, a.lat] as [number, number]);
  }, [selectedCourse]);

  // 지도 마커 생성
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const markers: MapMarker[] = [];
    touristSpots?.forEach((s, i) => {
      if (s.lat != null && s.lon != null) {
        const descriptionText =
          s.description && s.description !== "Overture Place" && s.description !== s.name
            ? s.description
            : undefined;
        const courseInfo = courseMap.get(s.name);
        markers.push({
          id: `ai-${i}`,
          lat: s.lat,
          lon: s.lon,
          name: s.name,
          type: "ai",
          tagName: s.tags?.[0]?.name,
          score: s.spotScore != null ? Math.round(s.spotScore * 100) : undefined,
          description: descriptionText,
          courseOrder: courseInfo?.order,
          courseDescription: courseInfo?.description,
          courseTip: courseInfo?.tip,
          visitTime: courseInfo?.visitTime,
        });
      }
    });
    nearbyAttractions?.forEach((f, i) => {
      const p = f.properties;
      if (p.lat != null && p.lon != null) {
        const name = p.nameKo ?? p.nameEn ?? p.name;
        const info = courseMap.get(name);
        markers.push({
          id: `nearby-${i}`,
          lat: p.lat,
          lon: p.lon,
          name,
          type: "nearby",
          imageUrl: p.imageUrl,
          description: p.descriptionKo ?? p.description ?? undefined,
          address: p.formatted ?? undefined,
          category: p.categories?.[0] ?? undefined,
          courseOrder: info?.order,
          courseDescription: info?.description,
          courseTip: info?.tip,
          visitTime: info?.visitTime,
        });
      }
    });
    return markers;
  }, [touristSpots, nearbyAttractions, courseMap]);

  // AI 추천 관광지 이름 set
  const aiSpotNames = useMemo(
    () => new Set(touristSpots?.map((s) => s.name) ?? []),
    [touristSpots],
  );

  // 명소: name 내부 중복 제거 후 AI 추천과 중복 제거 (명소에는 사진 없으므로 예외 없음)
  const filteredPlaces = useMemo(() => {
    const seen = new Set<string>();
    const unique: Place[] = [];
    for (const p of (places ?? [])) {
      if (!seen.has(p.name)) { seen.add(p.name); unique.push(p); }
    }
    return unique.filter((p) => !aiSpotNames.has(p.name));
  }, [places, aiSpotNames]);

  // 명소 이름 set (중복 제거 후)
  const placeNames = useMemo(
    () => new Set(filteredPlaces.map((p) => p.name)),
    [filteredPlaces],
  );

  // 근처 관광지 정렬: 코스 포함(순서대로) → 이미지 있음 → 나머지
  const sortedNearby = useMemo(() => {
    if (!nearbyAttractions) return [];
    // 근처관광지 내부 name 중복 제거 (사진 있는 것 우선)
    const nameMap: Record<string, NearbyAttractionFeature> = {};
    for (const f of nearbyAttractions) {
      const name = f.properties.name;
      if (!name) continue;
      const existing = nameMap[name];
      if (!existing || (!existing.properties.imageUrl && f.properties.imageUrl)) {
        nameMap[name] = f;
      }
    }
    const unique = Object.values(nameMap);

    // 상위 소스(AI 추천, 명소)와 중복 시 사진 없으면 제거
    const deduped = unique.filter((f) => {
      const displayName = f.properties.nameKo ?? f.properties.nameEn ?? f.properties.name;
      const hasPhoto = !!f.properties.imageUrl;
      if (aiSpotNames.has(displayName) && !hasPhoto) return false;
      if (placeNames.has(displayName) && !hasPhoto) return false;
      return true;
    });

    return [...deduped].sort((a, b) => {
      const nameA = a.properties.nameKo ?? a.properties.nameEn ?? a.properties.name;
      const nameB = b.properties.nameKo ?? b.properties.nameEn ?? b.properties.name;
      const orderA = courseMap.get(nameA)?.order ?? Infinity;
      const orderB = courseMap.get(nameB)?.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return (b.properties.imageUrl ? 1 : 0) - (a.properties.imageUrl ? 1 : 0);
    });
  }, [nearbyAttractions, courseMap, aiSpotNames, placeNames]);

  const centerLat = lat ?? city.latitude ?? 0;
  const centerLon = lon ?? city.longitude ?? 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="list"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="h-full overflow-y-auto"
      >
          <div className="p-5 flex flex-col gap-6 pb-8">

            {/* ── Section 0: 관광지 지도 + AI 여행 코스 ── */}
            {mapMarkers.length > 0 && centerLat !== 0 && (
              <section>
                <SectionHeader
                  icon={<MapPin className="size-4 text-slate-500" />}
                  title="관광지 지도"
                  sub={`${mapMarkers.length}곳`}
                />
                <SpotMap
                  markers={mapMarkers}
                  centerLat={centerLat}
                  centerLon={centerLon}
                  courseRoute={courseRoute.length >= 2 ? courseRoute : undefined}
                />

                {/* AI 여행 코스 버튼 + 탭 */}
                {nearbyAttractions && nearbyAttractions.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Route className="size-4 text-indigo-500" />
                        <h3 className="text-sm font-semibold text-foreground">AI 여행 코스</h3>
                      </div>
                      {courses ? (
                        <button
                          onClick={reset}
                          className="text-[10px] text-slate-400 hover:text-red-400 transition-colors"
                        >
                          초기화
                        </button>
                      ) : (
                        <button
                          onClick={() => nearbyAttractions && generate(nearbyAttractions, cityNameKo, touristSpots ?? undefined, city.tags ?? undefined)}
                          disabled={isCourseLoading}
                          className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                          {isCourseLoading ? (
                            <>
                              <Route className="size-3 animate-pulse" />
                              코스 생성 중...
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3" />
                              AI 여행 코스 생성
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {courseError && (
                      <p className="text-xs text-red-500 mb-2">{courseError}</p>
                    )}
                    {courses && (
                      <div className="flex flex-col gap-1.5">
                        {courses.courses.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedIndex(i)}
                            className={`flex items-center justify-between gap-2 text-left px-3 py-1.5 rounded-xl border transition-colors ${
                              selectedIndex === i
                                ? 'bg-indigo-500 text-white border-indigo-500'
                                : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            <span className="text-[11px] font-medium">{c.courseTitle}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ── Section 1: AI 추천 관광지 (recommend=true 전용) ── */}
            {touristSpots && (
              <section>
                <SectionHeader
                  icon={<Star className="size-4 text-amber-500" />}
                  title="AI 추천 관광지"
                  sub={`${touristSpots.length}곳`}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  {touristSpots.map((spot, i) => {
                    const info = courseMap.get(spot.name);
                    return (
                      <TouristSpotCard
                        key={i}
                        spot={spot}
                        cityName={cityNameKo}
                        courseOrder={info?.order}
                        courseDescription={info?.description}
                        courseTip={info?.tip}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Section 2: 명소 리스트 (/api/{cityId}/places) ── */}
            <section>
              <SectionHeader
                icon={<MapPin className="size-4 text-blue-500" />}
                title="명소"
              />
              {isPlacesLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border p-3 flex flex-col gap-2">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-6 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : isPlacesError ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                  <AlertCircle className="size-4 text-destructive shrink-0" />
                  명소 정보를 불러오지 못했습니다.
                </div>
              ) : filteredPlaces.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {filteredPlaces.map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">명소 정보가 없습니다.</p>
              )}
            </section>

            {/* ── Section 3: 근처 관광지 + AI 여행 코스 ── */}
            {isNearbyError && (
              <section>
                <SectionHeader icon={<MapPin className="size-4 text-orange-500" />} title="근처 관광지" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                  <AlertCircle className="size-4 text-destructive shrink-0" />
                  근처 관광지 정보를 불러오지 못했습니다.
                </div>
              </section>
            )}
            {!isNearbyError && nearbyAttractions && nearbyAttractions.length > 0 && (
              <section>
                <SectionHeader
                  icon={<MapPin className="size-4 text-orange-500" />}
                  title="근처 관광지"
                  sub={`${nearbyAttractions.length}곳`}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  {sortedNearby.map((feature, i) => {
                    const name = feature.properties.nameKo ?? feature.properties.nameEn ?? feature.properties.name;
                    const info = courseMap.get(name);
                    return (
                      <NearbyAttractionCard
                        key={i}
                        feature={feature}
                        courseOrder={info?.order}
                        courseDescription={info?.description}
                        courseTip={info?.tip}
                        visitTime={info?.visitTime}
                      />
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        </motion.div>
    </AnimatePresence>
  );
}
