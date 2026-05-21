package com.hotelio.monolith.controller;

import com.hotelio.monolith.entity.AppUser;
import com.hotelio.monolith.service.AppUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/users")
public class AppUserController {

    private final AppUserService userService;

    public AppUserController(AppUserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<AppUser> getUserById(@PathVariable String userId) {
        return userService.getUserById(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{userId}/status")
    public ResponseEntity<String> getUserStatus(@PathVariable String userId) {
        return ResponseEntity.of(userService.getUserStatus(userId));
    }

    @GetMapping("/{userId}/blacklisted")
    public boolean isUserBlacklisted(@PathVariable String userId) {
        return userService.isUserBlacklisted(userId);
    }

    @GetMapping("/{userId}/active")
    public boolean isUserActive(@PathVariable String userId) {
        return userService.isUserActive(userId);
    }

    @GetMapping("/{userId}/authorized")
    public boolean isUserAuthorized(@PathVariable String userId) {
        return userService.isAuthorized(userId);
    }

    @GetMapping("/{userId}/vip")
    public boolean isUserVip(@PathVariable String userId) {
        return userService.isVipUser(userId);
    }
}
