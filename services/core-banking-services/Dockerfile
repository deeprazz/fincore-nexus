# Multi-stage Dockerfile for Core Banking Services
FROM maven:3.9.9-eclipse-temurin-25 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B || true

COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:25-jre-noble
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-Duser.timezone=UTC", "-jar", "app.jar"]
