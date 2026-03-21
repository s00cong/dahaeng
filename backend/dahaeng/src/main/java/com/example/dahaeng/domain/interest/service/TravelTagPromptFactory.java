package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class TravelTagPromptFactory {

    private final TravelTagProvider tagProvider;

    public String createSystemPrompt() {
        return String.format("""
            당신은 사용자의 관심 키워드를 우리 서비스의 여행 태그로 분류하는 분류 엔진입니다.
            새로운 태그를 만들지 말고, 반드시 허용된 태그 목록 안에서만 선택하세요.

            [최우선 규칙]
            1. category 값은 다음 중 하나만 사용하세요.
               - Vibe
               - Landscape
               - Activity
               - Who
               - Climate
            2. tag 값은 허용된 태그 목록에 있는 값만 사용하세요.
            3. 입력 keyword 값을 그대로 tag로 복사하면 안 됩니다.
            4. 적절한 태그가 없으면 억지로 만들지 말고 제외하세요.
            5. 출력은 반드시 JSON 객체 하나만 반환하세요.

            [허용 태그 목록]
            %s

            [분석 기준]
            - 입력은 상위 관심 키워드 목록입니다.
            - 각 키워드는 id, keyword, score, confidence, travelRelevance, sourceType을 가집니다.
            - score와 travelRelevance가 높은 키워드를 더 중요하게 해석하세요.
            - 여러 키워드가 같은 여행 취향을 가리키면 하나의 태그로 묶어도 됩니다.

            [reason 규칙]
            - 각 태그마다 반드시 reason 필드를 작성하세요.
            - reason은 왜 이 태그를 선택했는지 입력 키워드 기반으로 설명하는 짧은 한국어 문장 1개여야 합니다.
            - 추측성 표현은 사용하지 마세요.
            - 태그명만 반복하지 말고 선택 근거를 설명하세요.
            - 15자 이상 80자 이하로 작성하세요.

            [evidenceKeywordIds 규칙]
            - 각 태그마다 반드시 evidenceKeywordIds 필드를 작성하세요.
            - evidenceKeywordIds에는 입력으로 받은 keyword id만 넣으세요.
            - 태그당 2개 이상 5개 이하만 선택하세요.
            - 입력에 없는 id를 만들면 안 됩니다.
            - 같은 id를 중복으로 넣으면 안 됩니다.

            [점수 규칙]
            - score와 confidence는 반드시 0.0 이상 1.0 이하의 실수여야 합니다.

            [출력 형식]
            {
              "tags": [
                {
                  "category": "Vibe",
                  "tag": "야경",
                  "score": 0.82,
                  "confidence": 0.77,
                  "reason": "도시 야경과 브이로그 관련 키워드가 반복적으로 나타남",
                  "evidenceKeywordIds": [1, 4, 7]
                }
              ]
            }

            [출력 제약]
            - tags는 배열입니다.
            - 각 원소는 category, tag, score, confidence, reason, evidenceKeywordIds 필드를 모두 포함해야 합니다.
            - 동일한 category/tag 조합은 중복되면 안 됩니다.
            - 결과 태그는 0개 이상 8개 이하로 반환하세요.
            """, tagProvider.getAllowedTagsPrompt());
    }

    public String createUserPrompt(List<InterestKeywordCandidate> keywords) {
        if (keywords == null || keywords.isEmpty()) {
            return """
                입력 데이터가 비어 있습니다.
                다음 JSON만 반환하세요.

                {
                  "tags": []
                }
                """;
        }

        AtomicInteger idGenerator = new AtomicInteger(1);
        String jsonData = keywords.stream()
                .limit(60)
                .map(k -> String.format(
                        "{\"id\":%d,\"keyword\":\"%s\",\"score\":%.2f,\"confidence\":%.2f,\"travelRelevance\":%.2f,\"sourceType\":\"%s\"}",
                        idGenerator.getAndIncrement(),
                        escape(k.getNormalizedKeyword()),
                        normalize(k.getScore()),
                        normalize(k.getConfidence()),
                        normalize(k.getTravelRelevance()),
                        escape(k.getSourceType() != null ? k.getSourceType().name() : "")
                ))
                .collect(Collectors.joining(",\n  ", "[\n  ", "\n]"));

        return """
            아래는 사용자의 관심 키워드 목록입니다.
            이 목록을 종합해서 여행 취향 태그를 추출하세요.

            [중요]
            - keyword 값을 그대로 tag로 쓰지 마세요.
            - 허용 태그 목록에서만 고르세요.
            - 각 태그에는 reason과 evidenceKeywordIds를 반드시 포함하세요.
            - evidenceKeywordIds는 아래 입력 id만 사용하세요.
            - 출력은 JSON만 반환하세요.

            [입력 데이터]
            """ + jsonData;
    }

    private String escape(String s) {
        if (s == null) {
            return "";
        }
        return s
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private double normalize(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.0;
        }
        if (value < 0.0) {
            return 0.0;
        }
        if (value > 1.0) {
            return 1.0;
        }
        return value;
    }
}
