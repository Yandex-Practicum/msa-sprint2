package com.hotelio.bookingservice.connectors;

import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AppUserServiceProxy {
    private final RestConnectionProxy restConnectionProxy;

    public AppUserServiceProxy(RestConnectionProxy restConnectionProxy) {
        this.restConnectionProxy = restConnectionProxy;
    }

    public boolean isUserBlacklisted(String userId) {
        return "true".equalsIgnoreCase(restConnectionProxy.GetStringValue("users/" + userId +"/blacklisted"));
    }

    public boolean isUserActive(String userId) {
        return "true".equalsIgnoreCase(restConnectionProxy.GetStringValue("users/" + userId +"/active"));
    }

    public Optional<String> getUserStatus(String userId) {
        return Optional.ofNullable(restConnectionProxy.GetStringValue("users/" + userId +"/status")); 
    }
}
