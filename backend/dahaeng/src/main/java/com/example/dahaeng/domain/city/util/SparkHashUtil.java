package com.example.dahaeng.domain.city.util;

import java.nio.charset.StandardCharsets;

/**
 * Spark의 F.hash() + abs() + cast("long") 과 동일한 해시값을 Java에서 계산합니다.
 * Spark: abs(hash(city_code)).cast("long")
 * Spark hash() = MurmurHash3 x86 32-bit, seed = 42
 *
 * ⚠️ 임시 유틸: MariaDB city 테이블이 완성되면 제거 예정
 */
public class SparkHashUtil {

    private static final int SPARK_HASH_SEED = 42;

    private SparkHashUtil() {
    }

    /**
     * city_code 문자열을 Spark F.abs(F.hash(col)) 결과와 동일한 Long 값으로 변환
     */
    public static long computeMongoId(String cityCode) {
        byte[] bytes = cityCode.getBytes(StandardCharsets.UTF_8);
        int hash = murmur3_x86_32(bytes, 0, bytes.length, SPARK_HASH_SEED);
        return Math.abs((long) hash);
    }

    // ── MurmurHash3 x86 32-bit (Spark 내부 구현과 동일) ──────────────────────

    private static int murmur3_x86_32(byte[] data, int offset, int length, int seed) {
        int h1 = seed;
        final int c1 = 0xcc9e2d51;
        final int c2 = 0x1b873593;

        int roundedEnd = offset + (length & 0xFFFFFFFC);

        for (int i = offset; i < roundedEnd; i += 4) {
            int k1 = (data[i] & 0xff)
                    | ((data[i + 1] & 0xff) << 8)
                    | ((data[i + 2] & 0xff) << 16)
                    | ((data[i + 3]) << 24);

            k1 *= c1;
            k1 = Integer.rotateLeft(k1, 15);
            k1 *= c2;

            h1 ^= k1;
            h1 = Integer.rotateLeft(h1, 13);
            h1 = h1 * 5 + 0xe6546b64;
        }

        int k1 = 0;
        int tail = offset + (length & 0x3);

        switch (length & 0x3) {
            case 3:
                k1 ^= (data[tail + 2] & 0xff) << 16;
            case 2:
                k1 ^= (data[tail + 1] & 0xff) << 8;
            case 1:
                k1 ^= (data[tail] & 0xff);
                k1 *= c1;
                k1 = Integer.rotateLeft(k1, 15);
                k1 *= c2;
                h1 ^= k1;
        }

        h1 ^= length;
        h1 = fmix32(h1);

        return h1;
    }

    private static int fmix32(int h) {
        h ^= (h >>> 16);
        h *= 0x85ebca6b;
        h ^= (h >>> 13);
        h *= 0xc2b2ae35;
        h ^= (h >>> 16);
        return h;
    }
}
