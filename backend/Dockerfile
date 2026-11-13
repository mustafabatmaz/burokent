# ---- Stage 1: build with the full JDK and the Maven wrapper ----
FROM eclipse-temurin:24-jdk AS build
WORKDIR /workspace
# The server builds its own images next to the running blog: keep Maven's heap small
ENV MAVEN_OPTS="-Xmx768m"

# Only the build definition first: the downloaded dependencies are reused as long as pom.xml doesn't change
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -q package -DskipTests -Dspotless.check.skip=true \
    && java -Djarmode=tools -jar target/backend-*.jar extract --layers --launcher --destination extracted

# ---- Stage 2: run with only the JRE, as a non-root user ----
FROM eclipse-temurin:24-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --no-create-home app
WORKDIR /app

# Spring Boot layers, least to most frequently changing
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

USER app
EXPOSE 8080
# The heap follows the container's memory limit; the rest is left for metaspace, threads and buffers
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
