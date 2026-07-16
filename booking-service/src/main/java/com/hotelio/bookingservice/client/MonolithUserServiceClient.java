package com.hotelio.bookingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "userservice", url = "${monolith.userservice.url}")
public interface MonolithUserServiceClient {

    @GetMapping("/{userId}/status")
    ResponseEntity<String> getUserStatus(@PathVariable("userId") String userId);

    @GetMapping("/{userId}/active")
    boolean isUserActive(@PathVariable("userId") String userId);

    @GetMapping("/{userId}/blacklisted")
    boolean isUserBlacklisted(@PathVariable("userId") String userId);
}
