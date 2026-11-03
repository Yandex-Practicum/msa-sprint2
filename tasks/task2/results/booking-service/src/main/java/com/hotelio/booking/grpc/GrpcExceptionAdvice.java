package com.hotelio.booking.grpc;

import com.hotelio.booking.exception.BookingRejectedException;
import com.hotelio.booking.exception.MonolithUnavailableException;
import io.grpc.Status;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.advice.GrpcAdvice;
import net.devh.boot.grpc.server.advice.GrpcExceptionHandler;

// Прокси монолита превращает любую ошибку gRPC в HTTP 500, поэтому внешний контракт сохраняется.
// Статусы gRPC различаются для тех, кто вызывает сервис напрямую.
@Slf4j
@GrpcAdvice
public class GrpcExceptionAdvice {

    @GrpcExceptionHandler(BookingRejectedException.class)
    public Status handleBookingRejected(BookingRejectedException e) {
        log.warn("Booking rejected: {}", e.getMessageCode());

        return Status.FAILED_PRECONDITION.withDescription(e.getMessage());
    }

    @GrpcExceptionHandler(MonolithUnavailableException.class)
    public Status handleMonolithUnavailable(MonolithUnavailableException e) {
        log.error("Booking failed: monolith is unavailable", e);

        return Status.UNAVAILABLE.withDescription(e.getMessage());
    }
}
