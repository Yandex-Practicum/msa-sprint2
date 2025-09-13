from mcr.microsoft.com/dotnet/sdk:9.0 as build-env

WORKDIR ./src
COPY ./src /src

RUN dotnet restore HotelioBookingService.csproj
RUN dotnet publish HotelioBookingService.csproj -c Release --no-restore -o /out


FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS run-env
WORKDIR /app

COPY --from=build-env /out .

EXPOSE 80

ENTRYPOINT ["dotnet", "HotelioBookingService.dll"]