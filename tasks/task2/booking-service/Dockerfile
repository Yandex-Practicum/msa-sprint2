FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["booking-service.csproj", "."]
RUN dotnet restore "booking-service.csproj"

COPY . .
RUN dotnet build "booking-service.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "booking-service.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
RUN apt-get update && apt-get install -y libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 9090
ENTRYPOINT ["dotnet", "booking-service.dll"]
