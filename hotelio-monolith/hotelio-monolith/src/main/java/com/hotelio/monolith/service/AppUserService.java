package com.hotelio.monolith.service;

import com.hotelio.monolith.entity.AppUser;
import com.hotelio.monolith.repository.AppUserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AppUserService {

    private final AppUserRepository repository;

    public AppUserService(AppUserRepository repository) {
        this.repository = repository;
    }

    public boolean isUserBlacklisted(String userId) {
        return repository.findById(userId)
                .map(AppUser::isBlacklisted)
                .orElse(false);
    }

    public boolean isUserActive(String userId) {
        return repository.findById(userId)
                .map(AppUser::isActive)
                .orElse(false);
    }

    public Optional<String> getUserStatus(String userId) {
        return repository.findById(userId)
                .map(AppUser::getStatus);
    }

    public Optional<AppUser> getUserById(String userId) {
        return repository.findById(userId);
    }

    public boolean isVipUser(String userId) {
        return repository.findById(userId)
                .map(user -> "VIP".equalsIgnoreCase(user.getStatus()))
                .orElse(false);
    }

    public boolean isAuthorized(String userId) {
        return repository.findById(userId)
                .map(user -> user.isActive() && !user.isBlacklisted())
                .orElse(false);
    }
}
