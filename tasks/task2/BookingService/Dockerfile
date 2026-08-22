# Этап сборки
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Сначала копируем csproj для кэширования зависимостей
COPY ["BookingService.csproj", "./"]
RUN dotnet restore "BookingService.csproj"

# Теперь копируем весь проект
COPY . .
RUN dotnet publish "BookingService.csproj" -c Release -o /app/publish

# Этап запуска
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 9090
ENTRYPOINT ["dotnet", "BookingService.dll"]