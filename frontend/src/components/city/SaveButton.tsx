import { Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateBookmark } from '@/hooks/bookmark/useCreateBookmark';
import type { CityDetail } from '@/schemas/city.schema';

interface SaveButtonProps {
  city: CityDetail;
}

export function SaveButton({ city }: SaveButtonProps) {
  const { mutate: createBookmark, isPending } = useCreateBookmark();

  const handleSave = () => {
    if (!city.recommendId) return;
    createBookmark({
      cityId: city.cityId,
      recommendId: city.recommendId,
      json: city,
    });
  };

  return (
    <Button
      onClick={handleSave}
      disabled={isPending}
      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl h-10 text-sm gap-2"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Bookmark className="size-4" />
      )}
      저장하기
    </Button>
  );
}
