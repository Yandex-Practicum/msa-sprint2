package com.hotelio.bookingservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.HttpRequestHandlerServlet;

@RestController
public class BookingController {

    @Value("${APP_VERSION:unknown}")
    private String appVersion;

    @GetMapping("/ping")
    public String ping(HttpServletRequest request){
        String featureHeader = request.getHeader("X-Feature-Enabled");
        if ("true".equals(featureHeader)) {
            return "pong_v2_flag";
        }
        return "pong_" + appVersion;
    }
}
