from proto import hotel_pb2, hotel_pb2_grpc

from files.services import HotelServices, hotel_services

from data.files.schemas import HotelSchema

from logging import INFO, getLogger, basicConfig


basicConfig(level=INFO)

logger = getLogger("[HOTEL: MAIN]")


class HotelConntroller(hotel_pb2_grpc.HotelServiceServicer):
    def __init__(self, hotel_services: HotelServices):
        super().__init__()

        self.hotel_services = hotel_services

    async def ListHotels(self, request, context):
        """Handles ListHotelss RPC call."""
        hotels_list_dto = await self.hotel_services.list_hotels(request.ids)
        logger.info(hotels_list_dto)

        response = hotel_pb2.HotelsListResponse()
        for hotel_dto in hotels_list_dto:
            response.hotels.append(
                hotel_pb2.HotelResponse(
                    id=hotel_dto.id,
                    operational=hotel_dto.operational,
                    fullyBooked=hotel_dto.fullyBooked,
                    city=hotel_dto.city,
                    rating=hotel_dto.rating,
                    description=hotel_dto.description,
                )
            )

        return response

    async def CreateHotel(self, request, context):
        create_hotel_dto = HotelSchema(
            id=request.id,
            operational=request.operational,
            fullyBooked=request.fullyBooked,
            city=request.city,
            rating=request.rating,
            description=request.description,
        )

        hotel_dto = await self.hotel_services.create_hotel(data=create_hotel_dto)

        response = hotel_pb2.HotelResponse(
            id=hotel_dto.id,
            operational=hotel_dto.operational,
            fullyBooked=hotel_dto.fullyBooked,
            city=hotel_dto.city,
            rating=hotel_dto.rating,
            description=hotel_dto.description,
        )

        return response


hotel_controller = HotelConntroller(hotel_services=hotel_services)
