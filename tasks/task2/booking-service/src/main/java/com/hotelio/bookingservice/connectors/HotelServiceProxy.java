package com.hotelio.bookingservice.connectors;

import org.springframework.stereotype.Service;

@Service
public class HotelServiceProxy {
    private final RestConnectionProxy restConnectionProxy;
    public HotelServiceProxy(RestConnectionProxy restConnectionProxy) {
        this.restConnectionProxy = restConnectionProxy;
    }

    public boolean isHotelOperational(String hotelId) {
        return "true".equalsIgnoreCase(restConnectionProxy.GetStringValue("hotels/" + hotelId +"/operational"));
    }

    public boolean isHotelFullyBooked(String hotelId) {
        return "true".equalsIgnoreCase(restConnectionProxy.GetStringValue("hotels/" + hotelId +"/fully-booked"));
    }
}
