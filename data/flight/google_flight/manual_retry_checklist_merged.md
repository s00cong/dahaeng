# Google Flight Manual Retry Checklist

Base artifacts:
- `data/google_flight/bronze_airticket/google_flights/dt=2026-03-11/hour=merged/all_cities.jsonl`
- `data/google_flight/bronze_airticket/google_flights/dt=2026-03-11/hour=merged/failed_destinations.json`
- `data/google_flight/manual_retry_targets_merged.csv`

How to watch the current merged retry log without mojibake:

```powershell
Get-Content "C:\Users\SSAFY\Desktop\soob\S14P21D206\ai\google_flight\crawl_failed_only_merged.log" -Encoding UTF8 -Wait
```

Manual retry order:
1. `HALONG`, `AGRA` - still fail in every remaining month
2. `SIHANOUKVILLE`, `BULGAN` - fail in five remaining months
3. `UYUNI`, `KOROR` - partial failures only
4. `GRANADA`, `DEB` - one-off final cleanup

Suggested workflow per row:
1. Open the Google Travel Explore page with ICN origin and the target month selected.
2. Search using the first Korean term.
3. If nothing useful appears, try airport/city code terms from `suggested_terms`.
4. If the page opens but the crawler previously logged `destination_not_verified`, confirm the destination page is really the intended city before counting it as success.
5. When a row succeeds, mark it complete in your own notes and keep the log/output under `hour=merged` as the source of truth.

Remaining failed rows:

| Month | City | Reason | Suggested Terms |
|---|---|---|---|
| 3월 | 하롱 (`HALONG`) | `destination_select_failed` | `하롱`, `HALONG`, `VDO`, `HPH`, `하롱 베트남` |
| 3월 | 아그라 (`AGRA`) | `destination_select_failed` | `아그라`, `AGRA`, `AGR`, `DEL`, `아그라 인도` |
| 3월 | 그라나다 (`GRANADA`) | `destination_select_failed` | `그라나다`, `GRANADA`, `GRX`, `그라나다 스페인` |
| 3월 | 데브레첸 (`DEB`) | `destination_not_verified` | `데브레첸`, `DEB`, `데브레첸 헝가리` |
| 3월 | 우유니 (`UYUNI`) | `destination_select_failed` | `우유니`, `UYUNI`, `UYU`, `우유니 볼리비아` |
| 4월 | 하롱 (`HALONG`) | `destination_select_failed` | `하롱`, `HALONG`, `VDO`, `HPH`, `하롱 베트남` |
| 4월 | 시아누크빌 (`SIHANOUKVILLE`) | `destination_select_failed` | `시아누크빌`, `SIHANOUKVILLE`, `KOS`, `시아누크빌 캄보디아` |
| 4월 | 불간 (`BULGAN`) | `destination_not_verified` | `불간`, `BULGAN`, `UGA`, `UBN`, `ULN`, `불간 몽골` |
| 4월 | 아그라 (`AGRA`) | `destination_select_failed` | `아그라`, `AGRA`, `AGR`, `DEL`, `아그라 인도` |
| 5월 | 하롱 (`HALONG`) | `destination_select_failed` | `하롱`, `HALONG`, `VDO`, `HPH`, `하롱 베트남` |
| 5월 | 시아누크빌 (`SIHANOUKVILLE`) | `destination_select_failed` | `시아누크빌`, `SIHANOUKVILLE`, `KOS`, `시아누크빌 캄보디아` |
| 5월 | 불간 (`BULGAN`) | `destination_not_verified` | `불간`, `BULGAN`, `UGA`, `UBN`, `ULN`, `불간 몽골` |
| 5월 | 아그라 (`AGRA`) | `destination_select_failed` | `아그라`, `AGRA`, `AGR`, `DEL`, `아그라 인도` |
| 5월 | 우유니 (`UYUNI`) | `destination_select_failed` | `우유니`, `UYUNI`, `UYU`, `우유니 볼리비아` |
| 6월 | 하롱 (`HALONG`) | `destination_select_failed` | `하롱`, `HALONG`, `VDO`, `HPH`, `하롱 베트남` |
| 6월 | 시아누크빌 (`SIHANOUKVILLE`) | `destination_select_failed` | `시아누크빌`, `SIHANOUKVILLE`, `KOS`, `시아누크빌 캄보디아` |
| 6월 | 불간 (`BULGAN`) | `destination_not_verified` | `불간`, `BULGAN`, `UGA`, `UBN`, `ULN`, `불간 몽골` |
| 6월 | 아그라 (`AGRA`) | `destination_select_failed` | `아그라`, `AGRA`, `AGR`, `DEL`, `아그라 인도` |
| 7월 | 하롱 (`HALONG`) | `destination_select_failed` | `하롱`, `HALONG`, `VDO`, `HPH`, `하롱 베트남` |
| 7월 | 시아누크빌 (`SIHANOUKVILLE`) | `destination_select_failed` | `시아누크빌`, `SIHANOUKVILLE`, `KOS`, `시아누크빌 캄보디아` |
| 7월 | 불간 (`BULGAN`) | `destination_not_verified` | `불간`, `BULGAN`, `UGA`, `UBN`, `ULN`, `불간 몽골` |
| 7월 | 아그라 (`AGRA`) | `destination_select_failed` | `아그라`, `AGRA`, `AGR`, `DEL`, `아그라 인도` |
| 7월 | 코로르 (`KOROR`) | `destination_select_failed` | `코로르`, `KOROR`, `ROR`, `코로르 팔라우` |
| 8월 | 하롱 (`HALONG`) | `destination_select_failed` | `하롱`, `HALONG`, `VDO`, `HPH`, `하롱 베트남` |
| 8월 | 시아누크빌 (`SIHANOUKVILLE`) | `destination_select_failed` | `시아누크빌`, `SIHANOUKVILLE`, `KOS`, `시아누크빌 캄보디아` |
| 8월 | 불간 (`BULGAN`) | `destination_not_verified` | `불간`, `BULGAN`, `UGA`, `UBN`, `ULN`, `불간 몽골` |
| 8월 | 아그라 (`AGRA`) | `destination_select_failed` | `아그라`, `AGRA`, `AGR`, `DEL`, `아그라 인도` |
| 8월 | 코로르 (`KOROR`) | `destination_select_failed` | `코로르`, `KOROR`, `ROR`, `코로르 팔라우` |

Current status note:
- `HALONG`, `AGRA` are the strongest alias-loss candidates.
- `BULGAN`, `DEB` now fail at `destination_not_verified`, so the page may open but the verification step rejects it.
- `SIHANOUKVILLE`, `UYUNI`, `KOROR`, `GRANADA` are intermittent city-selection failures.

