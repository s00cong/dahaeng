import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Mountain,
  ExternalLink,
  Globe,
  Star,
  BookOpen,
  Compass,
  Share2,
  Wifi,
  Dog,
  Accessibility,
  Clock,
  Building2,
} from "lucide-react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Skeleton } from "@/components/ui/skeleton";
import type { CityDetail } from "@/schemas/city.schema";
import { useCityList } from "@/hooks/city/useCityList";
import { usePlaces } from "@/hooks/spot/usePlaces";
import { useOpenTripMapSpots } from "@/hooks/spot/useOpenTripMapSpots";
import { useGeoapifySpots } from "@/hooks/spot/useGeoapifySpots";
import { type OtmSpot, getKindLabel } from "@/api/opentripmap.api";
import { type GeoapifySpot } from "@/api/geoapify.api";
import type { Place } from "@/api/places.api";
import { useNearbyAttractions } from "@/hooks/spot/useNearbyAttractions";
import type { NearbyAttractionFeature } from "@/api/nearbyAttractions.api";

interface SpotTabProps {
  city: CityDetail;
  isRecommended?: boolean;
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

function TouristSpotCard({ spot, cityName }: { spot: TouristSpot; cityName: string }) {
  const tags = spot.tags ?? [];
  const spotScore = spot.spotScore != null ? Math.round(spot.spotScore * 100) : null;

  const descriptionText =
    spot.description && spot.description !== "Overture Place" && spot.description !== spot.name
      ? spot.description
      : null;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spot.name} ${cityName}`)}`;

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer">
      {/* 이름 + 종합 점수 */}
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{spot.name}</p>
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
  const mapQuery = place.address ?? place.name;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3 hover:border-blue-200 hover:shadow-sm transition-all">
      {/* 이름 */}
      <p className="text-xs font-semibold text-foreground leading-snug">{place.name}</p>

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

// ── 3. OpenTripMap 카드 ───────────────────────────────────────────────────────

function OtmSpotCard({ spot, onClick, onImageError }: { spot: OtmSpot; onClick: () => void; onImageError: (xid: string) => void }) {
  const kindLabel = getKindLabel(spot.kinds);

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl overflow-hidden border border-border hover:border-blue-300 hover:shadow-md transition-all text-left group"
    >
      <div className="relative h-32 bg-slate-200 shrink-0">
        <img
          src={spot.imageUrl}
          alt={spot.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => onImageError(spot.xid)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-2 left-2">
          <span className="text-[9px] font-medium text-white bg-blue-500/80 rounded-full px-1.5 py-0.5">
            {kindLabel}
          </span>
        </div>
      </div>
      <div className="px-2.5 py-2 bg-white flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-foreground truncate">{spot.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {spot.addressCity && (
            <span className="truncate">{spot.addressCity}</span>
          )}
          {spot.dist > 0 && (
            <span className="shrink-0 flex items-center gap-0.5">
              <MapPin className="size-2.5" />
              {spot.dist >= 1000
                ? `${(spot.dist / 1000).toFixed(1)}km`
                : `${Math.round(spot.dist)}m`}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── OpenTripMap 상세 ──────────────────────────────────────────────────────────

function OtmSpotDetail({ spot, onBack }: { spot: OtmSpot; onBack: () => void }) {
  const [imgError, setImgError] = useState(false);
  const kindLabel = getKindLabel(spot.kinds);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-5 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ArrowLeft className="size-4" />
        관광지 목록으로
      </button>

      <div className="relative h-52 bg-slate-200 mx-5 rounded-xl overflow-hidden shrink-0">
        {spot.imageUrl && !imgError ? (
          <img
            src={spot.imageUrl}
            alt={spot.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
            <Mountain className="size-12 text-slate-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
              {kindLabel}
            </span>
          </div>
          <h3 className="text-xl font-bold text-foreground">{spot.name}</h3>
          {spot.addressCity && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3 shrink-0" />{spot.addressCity}
            </p>
          )}
        </div>

        {spot.description && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <p className="text-xs text-slate-600 leading-relaxed">{spot.description}</p>
          </div>
        )}

        {(spot.url || spot.wikipedia || spot.wikiVoyage || spot.otm) && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-foreground">바로가기</h4>
            <div className="flex flex-col gap-1.5">
              {spot.url && (
                <a href={spot.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-blue-300 hover:text-blue-600 transition-colors text-xs text-muted-foreground">
                  <Globe className="size-3.5 shrink-0" />공식 홈페이지<ExternalLink className="size-3 ml-auto" />
                </a>
              )}
              {spot.wikipedia && (
                <a href={spot.wikipedia} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-blue-300 hover:text-blue-600 transition-colors text-xs text-muted-foreground">
                  <BookOpen className="size-3.5 shrink-0" />위키백과<ExternalLink className="size-3 ml-auto" />
                </a>
              )}
              {spot.wikiVoyage && (
                <a href={spot.wikiVoyage} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-blue-300 hover:text-blue-600 transition-colors text-xs text-muted-foreground">
                  <Compass className="size-3.5 shrink-0" />여행 가이드 (WikiVoyage)<ExternalLink className="size-3 ml-auto" />
                </a>
              )}
              {spot.otm && (
                <a href={spot.otm} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-blue-300 hover:text-blue-600 transition-colors text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />OpenTripMap<ExternalLink className="size-3 ml-auto" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 4. Geoapify 카드 ──────────────────────────────────────────────────────────

function GeoapifySpotCard({ spot }: { spot: GeoapifySpot }) {
  // 이름 표시 우선순위: 한국어 > 영어+현지어
  const mainName = spot.nameKo ?? spot.nameEn ?? spot.name;
  // 메인과 다른 보조 이름 (현지 원어)
  const subName = spot.nameKo
    ? (spot.name !== spot.nameKo ? spot.name : undefined)
    : (spot.nameEn && spot.name !== spot.nameEn ? spot.name : undefined);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lon}`;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-white overflow-hidden hover:border-violet-200 hover:shadow-sm transition-all">
      {/* 이미지 */}
      {spot.imageUrl && (
        <div className="relative h-28 bg-slate-200 shrink-0">
          <img
            src={spot.imageUrl || undefined}
            alt={mainName}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              const wrapper = e.currentTarget.parentElement as HTMLElement;
              if (wrapper) wrapper.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span className="absolute bottom-1.5 left-2 text-[9px] font-medium text-white bg-violet-500/80 rounded-full px-1.5 py-0.5">
            {spot.categoryLabel}
          </span>
        </div>
      )}

      <div className="p-3 flex flex-col gap-2">
        {/* 이미지 없을 때 카테고리 뱃지 */}
        {!spot.imageUrl && (
          <span className="self-start text-[9px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-1.5 py-0.5">
            {spot.categoryLabel}
          </span>
        )}

        {/* 이름: 메인(한국어 or 영어) + 보조(현지어) */}
        <div>
          <p className="text-xs font-semibold text-foreground leading-snug">{mainName}</p>
          {subName && (
            <p className="text-[10px] text-muted-foreground">{subName}</p>
          )}
        </div>

        {/* 설명 */}
        {spot.description && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
            {spot.description}
          </p>
        )}

        {/* 운영시간 */}
        {spot.openingHours && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-2.5 shrink-0" />
            <span className="truncate">{spot.openingHours}</span>
          </div>
        )}

        {/* 건물 정보 */}
        {(spot.building?.architecture || spot.historic?.startDate) && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Building2 className="size-2.5 shrink-0" />
            <span>
              {[
                spot.building?.architecture,
                spot.historic?.startDate ? `${spot.historic.startDate}년` : undefined,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}

        {/* 편의시설 아이콘 */}
        {spot.facilities && (
          <div className="flex items-center gap-2">
            {spot.facilities.wheelchair && (
              <span title="휠체어 접근 가능">
                <Accessibility className="size-3 text-blue-400" />
              </span>
            )}
            {spot.facilities.internetAccess && (
              <span title="와이파이 제공">
                <Wifi className="size-3 text-green-400" />
              </span>
            )}
            {spot.facilities.dogs === false && (
              <span title="반려동물 불가">
                <Dog className="size-3 text-red-300" />
              </span>
            )}
            {spot.isFree && (
              <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">
                무료
              </span>
            )}
          </div>
        )}

        {/* 링크 */}
        <div className="flex gap-1.5 mt-1 flex-wrap">
          <a href={mapUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-violet-300 hover:text-violet-600 transition-colors text-[10px] text-muted-foreground">
            <MapPin className="size-2.5" />지도
          </a>
          {spot.website && (
            <a href={spot.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-violet-300 hover:text-violet-600 transition-colors text-[10px] text-muted-foreground">
              <Globe className="size-2.5" />웹사이트
            </a>
          )}
          {spot.wikipedia && (
            <a href={spot.wikipedia} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-violet-300 hover:text-violet-600 transition-colors text-[10px] text-muted-foreground">
              <BookOpen className="size-2.5" />위키
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 5. 근처 관광지 카드 (/api/{cityId}/nearby-attractions) ────────────────────

function NearbyAttractionCard({ feature }: { feature: NearbyAttractionFeature }) {
  const p = feature.properties;
  const category = p.categories?.[0] ?? null;
  const mapQuery = p.formatted ? `${p.name} ${p.formatted}` : p.name;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-white overflow-hidden hover:border-orange-200 hover:shadow-sm transition-all">
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

      {/* 이름 */}
      <p className="text-xs font-semibold text-foreground leading-snug">{p.name}</p>

      {/* 설명 */}
      {p.description && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
          {p.description}
        </p>
      )}

      {/* 주소 */}
      {p.formatted && (
        <div className="flex items-start gap-1 text-[10px] text-muted-foreground">
          <MapPin className="size-2.5 shrink-0 mt-0.5" />
          <span className="line-clamp-1">{p.formatted}</span>
        </div>
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

// ── 스켈레톤 ─────────────────────────────────────────────────────────────────

function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border">
          <Skeleton className="h-32 w-full" />
          <div className="p-2.5 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
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
}

// ── 관광지 지도 컴포넌트 ──────────────────────────────────────────────────────

function SpotMap({ markers, centerLat, centerLon }: { markers: MapMarker[]; centerLat: number; centerLon: number }) {
  const [popup, setPopup] = useState<MapMarker | null>(null);

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 280 }}>
      <Map
        initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: 12 }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" />

        {markers.map((m) => (
          <Marker
            key={m.id}
            longitude={m.lon}
            latitude={m.lat}
            anchor="bottom"
            onClick={(e) => { e.originalEvent.stopPropagation(); setPopup(m); }}
          >
            <div
              className={`flex items-center justify-center rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform ${
                m.type === "ai"
                  ? "w-7 h-7 bg-amber-400"
                  : m.type === "nearby"
                    ? "w-6 h-6 bg-orange-400"
                    : "w-6 h-6 bg-blue-500"
              }`}
              title={m.name}
            >
              {m.type === "ai"
                ? <Star className="size-3.5 text-white fill-white" />
                : <MapPin className="size-3 text-white" />
              }
            </div>
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

                {/* 설명 */}
                {popup.description && (
                  <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{popup.description}</p>
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
  const [selectedOtmSpot, setSelectedOtmSpot] = useState<OtmSpot | null>(null);
  const [failedXids, setFailedXids] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((xid: string) => {
    setFailedXids((prev) => new Set(prev).add(xid));
  }, []);

  // recommend=false일 때 latitude/longitude가 0 → cityList에서 실제 좌표 보완
  const { data: cities } = useCityList();
  const cityInfo = cities?.find((c) => c.cityId === city.cityId);
  const lat = city.latitude || cityInfo?.latitude;
  const lon = city.longitude || cityInfo?.longitude;

  const { data: places, isLoading: isPlacesLoading } = usePlaces(city.cityId);
  const { data: otmSpots, isLoading: isOtmLoading } = useOpenTripMapSpots(lat, lon);
  const { data: geoapifySpots, isLoading: isGeoapifyLoading } = useGeoapifySpots(lat, lon);
  const { data: nearbyAttractions } = useNearbyAttractions(city.cityId);

  // 이미지 로드 실패한 spot 제거
  const visibleOtmSpots = otmSpots?.filter((s) => !failedXids.has(s.xid)) ?? [];

  // recommend=true 일 때 서버 AI 추천 관광지
  const touristSpots = isRecommended && city.touristSpot && city.touristSpot.length > 0
    ? city.touristSpot
    : null;

  // 지도 마커 생성 (AI 추천 + 근처 관광지, 좌표 있는 것만)
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const markers: MapMarker[] = [];
    touristSpots?.forEach((s, i) => {
      if (s.lat != null && s.lon != null) {
        const descriptionText =
          s.description && s.description !== "Overture Place" && s.description !== s.name
            ? s.description
            : undefined;
        markers.push({
          id: `ai-${i}`,
          lat: s.lat,
          lon: s.lon,
          name: s.name,
          type: "ai",
          tagName: s.tags?.[0]?.name,
          score: s.spotScore != null ? Math.round(s.spotScore * 100) : undefined,
          description: descriptionText,
        });
      }
    });
    nearbyAttractions?.forEach((f, i) => {
      const p = f.properties;
      if (p.lat != null && p.lon != null) {
        markers.push({
          id: `nearby-${i}`,
          lat: p.lat,
          lon: p.lon,
          name: p.name,
          type: "nearby",
          imageUrl: p.imageUrl,
          description: p.description ?? undefined,
          address: p.formatted ?? undefined,
          category: p.categories?.[0] ?? undefined,
        });
      }
    });
    return markers;
  }, [touristSpots, nearbyAttractions]);

  const centerLat = lat ?? city.latitude ?? 0;
  const centerLon = lon ?? city.longitude ?? 0;

  return (
    <AnimatePresence mode="wait">
      {/* OpenTripMap 상세 뷰 */}
      {selectedOtmSpot ? (
        <motion.div
          key="otm-detail"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
        >
          <OtmSpotDetail spot={selectedOtmSpot} onBack={() => setSelectedOtmSpot(null)} />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full overflow-y-auto"
        >
          <div className="p-5 flex flex-col gap-6 pb-8">

            {/* ── Section 0: 관광지 지도 ── */}
            {mapMarkers.length > 0 && centerLat !== 0 && (
              <section>
                <SectionHeader
                  icon={<MapPin className="size-4 text-slate-500" />}
                  title="관광지 지도"
                  sub={`${mapMarkers.length}곳`}
                />
                <SpotMap markers={mapMarkers} centerLat={centerLat} centerLon={centerLon} />
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
                  {touristSpots.map((spot, i) => (
                    <TouristSpotCard key={i} spot={spot} cityName={city.cityName} />
                  ))}
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
              ) : places && places.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {places.map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">명소 정보가 없습니다.</p>
              )}
            </section>

            {/* ── Section 3: 주변 명소 (OpenTripMap) ── */}
            <section>
              <SectionHeader
                icon={<Compass className="size-4 text-emerald-500" />}
                title="주변 명소"
                sub="OpenTripMap"
              />
              {isOtmLoading ? (
                <CardSkeleton count={6} />
              ) : visibleOtmSpots.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {visibleOtmSpots.map((spot) => (
                    <OtmSpotCard key={spot.xid} spot={spot} onClick={() => setSelectedOtmSpot(spot)} onImageError={handleImageError} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">주변 명소 데이터를 불러올 수 없습니다.</p>
              )}
            </section>

            {/* ── Section 4: 관광지 (Geoapify) ── */}
            <section>
              <SectionHeader
                icon={<Building2 className="size-4 text-violet-500" />}
                title="관광 명소"
                sub="Geoapify"
              />
              {isGeoapifyLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border p-3 flex flex-col gap-2">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  ))}
                </div>
              ) : geoapifySpots && geoapifySpots.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {geoapifySpots.map((spot) => (
                    <GeoapifySpotCard key={spot.placeId} spot={spot} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">관광지 데이터를 불러올 수 없습니다.</p>
              )}
            </section>

            {/* ── Section 5: 근처 관광지 (/api/{cityId}/nearby-attractions) ── */}
            {nearbyAttractions && nearbyAttractions.length > 0 && (
              <section>
                <SectionHeader
                  icon={<MapPin className="size-4 text-orange-500" />}
                  title="근처 관광지"
                  sub={`${nearbyAttractions.length}곳`}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  {nearbyAttractions.map((feature, i) => (
                    <NearbyAttractionCard key={i} feature={feature} />
                  ))}
                </div>
              </section>
            )}

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
