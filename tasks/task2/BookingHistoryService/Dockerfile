# Этап сборки
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["BookingHistoryService.csproj", "./"]
RUN dotnet restore "BookingHistoryService.csproj"

COPY . .
RUN dotnet publish "BookingHistoryService.csproj" -c Release -o /app/publish

# Этап запуска (runtime меньше чем sdk)
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "BookingHistoryService.dll"]