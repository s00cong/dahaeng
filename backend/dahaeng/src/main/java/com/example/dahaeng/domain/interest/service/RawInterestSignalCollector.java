package com.example.dahaeng.domain.interest.service;

import com.example.dahaeng.domain.interest.dto.RawInterestSignal;
import com.example.dahaeng.domain.interest.enums.InterestSourceType;
import com.example.dahaeng.domain.interest.repository.RawSignalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RawInterestSignalCollector {

    private final RawSignalRepository rawSignalRepository;

    public List<RawInterestSignal> collect(Long accountId) {
        List<RawInterestSignal> result = new ArrayList<>();

        rawSignalRepository.findPlaylistTitles(accountId)
                .forEach(r -> result.add(RawInterestSignal.builder()
                        .rawText(r.text)
                        .signalTime(r.time)
                        .sourceType(InterestSourceType.PLAYLIST_TITLE)
                        .build()));

        rawSignalRepository.findPlaylistVideoTitles(accountId)
                .forEach(r -> result.add(RawInterestSignal.builder()
                        .rawText(r.text)
                        .signalTime(r.time)
                        .sourceType(InterestSourceType.PLAYLIST_VIDEO_TITLE)
                        .build()));

        rawSignalRepository.findPlaylistVideoTags(accountId)
                .forEach(r -> result.add(RawInterestSignal.builder()
                        .rawText(r.text)
                        .signalTime(r.time)
                        .sourceType(InterestSourceType.PLAYLIST_VIDEO_TAG)
                        .build()));

        rawSignalRepository.findLikedVideoTitles(accountId)
                .forEach(r -> result.add(RawInterestSignal.builder()
                        .rawText(r.text)
                        .signalTime(r.time)
                        .sourceType(InterestSourceType.LIKED_VIDEO_TITLE)
                        .build()));

        rawSignalRepository.findLikedVideoTags(accountId)
                .forEach(r -> result.add(RawInterestSignal.builder()
                        .rawText(r.text)
                        .signalTime(r.time)
                        .sourceType(InterestSourceType.LIKED_VIDEO_TAG)
                        .build()));

        rawSignalRepository.findSubscriptionTitles(accountId)
                .forEach(r -> result.add(RawInterestSignal.builder()
                        .rawText(r.text)
                        .signalTime(r.time)
                        .sourceType(InterestSourceType.SUBSCRIPTION_TITLE)
                        .build()));

        return result;
    }
}
