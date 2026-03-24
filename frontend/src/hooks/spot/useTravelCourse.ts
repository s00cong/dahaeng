import { useState } from 'react';
import type { NearbyAttractionFeature } from '@/api/nearbyAttractions.api';
import { generateTravelCourses, type TravelCourse, type TravelCourses } from '@/api/gemini.api';
import type { CityDetail } from '@/schemas/city.schema';

export function useTravelCourse() {
  const [courses, setCourses] = useState<TravelCourses | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (
    features: NearbyAttractionFeature[],
    cityNameKo: string,
    touristSpots?: NonNullable<CityDetail['touristSpot']>,
    cityTags?: NonNullable<CityDetail['tags']>,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateTravelCourses(features, cityNameKo, touristSpots, cityTags);
      setCourses(result);
      setSelectedIndex(0);
    } catch {
      setError('추천 코스를 생성하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setCourses(null); setError(null); setSelectedIndex(0); };

  const selectedCourse: TravelCourse | null = courses?.courses[selectedIndex] ?? null;

  return { courses, selectedCourse, selectedIndex, setSelectedIndex, isLoading, error, generate, reset };
}
