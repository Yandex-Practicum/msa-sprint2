package com.hotelio.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user", url = "${clients.user.url}")
public interface AppUserClient {

    @GetMapping("/{userId}/active")
    boolean isUserActive(@PathVariable String userId);

    @GetMapping("/{userId}/blacklisted")
    boolean isUserBlacklisted(@PathVariable String userId);

    @GetMapping("/{userId}/status")
    ResponseEntity<String> getUserStatus(@PathVariable String userId);
}
