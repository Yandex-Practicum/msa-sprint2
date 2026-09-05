package com.hotelio.bookingservice.connectors;

import org.springframework.stereotype.Service;

@Service
public class ReviewServiceProxy {
    private final RestConnectionProxy restConnectionProxy;

    public ReviewServiceProxy(RestConnectionProxy restConnectionProxy) {
        this.restConnectionProxy = restConnectionProxy;
    }

    public boolean isTrustedHotel(String hotelId) {
        return "true".equalsIgnoreCase(restConnectionProxy.GetStringValue("reviews/hotel/" + hotelId +"/trusted"));
    }
}