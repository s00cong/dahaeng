package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.InterestKeywordCandidate;
import com.example.dahaeng.domain.interest.dto.TravelTagInferenceResponse;
import com.example.dahaeng.domain.interest.dto.TravelTagScore;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Slf4j
@Component
public class TravelTagInferenceClient {

    private final ChatClient chatClient;
    private final TravelTagPromptFactory promptFactory;
    private final ObjectMapper objectMapper;

    public TravelTagInferenceClient(
            ChatClient.Builder chatClientBuilder,
            TravelTagPromptFactory promptFactory,
            ObjectMapper objectMapper
    ) {
        this.chatClient = chatClientBuilder
                .defaultSystem(promptFactory.createSystemPrompt())
                .build();
        this.promptFactory = promptFactory;
        this.objectMapper = objectMapper;
    }

    public List<TravelTagScore> inferTags(List<InterestKeywordCandidate> topKeywords) {
        log.info(">>> [Phase 2] Requesting AI inference for {} keywords.", topKeywords.size());

        try {
            String rawResponse = chatClient.prompt()
                    .user(u -> u.text("\uC0AC\uC6A9\uC790 \uBD84\uC11D \uB370\uC774\uD130:\n{data}")
                               .param("data", promptFactory.createUserPrompt(topKeywords)))
                    .call()
                    .content();

            log.info(">>> [AI RESPONSE RAW]\n{}", formatRawResponse(rawResponse));

            TravelTagInferenceResponse response = parseResponse(rawResponse);

            if (response == null || response.getTags() == null) {
                log.warn(">>> [AI EMPTY] AI returned no tags.");
                return Collections.emptyList();
            }

            log.info(">>> [AI RESPONSE] Received {} raw tags from AI.", response.getTags().size());
            log.info(">>> [AI RESPONSE TAGS]\n{}", formatParsedTags(response.getTags()));
            return response.getTags();

        } catch (Exception e) {
            log.error(">>> [AI ERROR] LLM inference failed: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    private TravelTagInferenceResponse parseResponse(String rawResponse) throws JsonProcessingException {
        if (rawResponse == null || rawResponse.isBlank()) {
            return null;
        }
        return objectMapper.readValue(rawResponse, TravelTagInferenceResponse.class);
    }

    private String formatRawResponse(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return "<empty>";
        }
        return rawResponse;
    }

    private String formatParsedTags(List<TravelTagScore> tags) {
        if (tags == null || tags.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(tags);
        } catch (JsonProcessingException e) {
            return tags.toString();
        }
    }
}
