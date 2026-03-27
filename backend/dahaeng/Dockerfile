# syntax=docker/dockerfile:1.7

FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /workspace

# Copy Gradle wrapper and build metadata first for better layer caching.
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./

RUN chmod +x gradlew

# Copy source after dependency-related files.
COPY src src

RUN ./gradlew --no-daemon clean bootJar -x test && \
    JAR_FILE="$(find build/libs -maxdepth 1 -type f -name '*.jar' ! -name '*-plain.jar' | head -n 1)" && \
    test -n "${JAR_FILE}" && \
    cp "${JAR_FILE}" /workspace/app.jar

FROM eclipse-temurin:17-jre-jammy AS runtime

WORKDIR /app

# Run as non-root user in runtime container.
RUN groupadd --system spring && useradd --system --gid spring spring

COPY --from=builder /workspace/app.jar /app/app.jar

USER spring:spring

EXPOSE 8080

ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
