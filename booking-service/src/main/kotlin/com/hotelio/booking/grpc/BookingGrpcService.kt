package com.hotelio.booking.grpc

import com.hotelio.proto.booking.BookingServiceGrpc
import com.hotelio.proto.booking.BookingRequest
import com.hotelio.proto.booking.BookingResponse
import com.hotelio.proto.booking.BookingListRequest
import com.hotelio.proto.booking.BookingListResponse
import com.hotelio.booking.service.BookingService
import io.grpc.stub.StreamObserver
import net.devh.boot.grpc.server.service.GrpcService
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@GrpcService
class BookingGrpcService(
    private val bookingService: BookingService
) : BookingServiceGrpc.BookingServiceImplBase() {

    override fun createBooking(request: BookingRequest, responseObserver: StreamObserver<BookingResponse>) {
        try {
            val booking = bookingService.createBooking(
                userId = request.userId,
                hotelId = request.hotelId,
                promoCode = request.promoCode.ifEmpty { null }
            )

            val response = BookingResponse.newBuilder()
                .setId(booking.id.toString())
                .setUserId(booking.userId)
                .setHotelId(booking.hotelId)
                .setPromoCode(booking.promoCode ?: "")
                .setPrice(booking.price)
                .setCreatedAt(booking.createdAt.atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")))
                .build()

            responseObserver.onNext(response)
            responseObserver.onCompleted()
        } catch (e: Exception) {
            responseObserver.onError(
                io.grpc.Status.INTERNAL
                    .withDescription(e.message)
                    .asRuntimeException()
            )
        }
    }

    override fun listBookings(request: BookingListRequest, responseObserver: StreamObserver<BookingListResponse>) {
        try {
            val bookings = bookingService.getUserBookings(request.userId)
            val response = BookingListResponse.newBuilder()
                .addAllBookings(bookings.map { booking ->
                    BookingResponse.newBuilder()
                        .setId(booking.id.toString())
                        .setUserId(booking.userId)
                        .setHotelId(booking.hotelId)
                        .setPromoCode(booking.promoCode ?: "")
                        .setPrice(booking.price)
                        .setCreatedAt(booking.createdAt.atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")))
                        .build()
                })
                .build()

            responseObserver.onNext(response)
            responseObserver.onCompleted()
        } catch (e: Exception) {
            responseObserver.onError(
                io.grpc.Status.INTERNAL
                    .withDescription(e.message)
                    .asRuntimeException()
            )
        }
    }
}