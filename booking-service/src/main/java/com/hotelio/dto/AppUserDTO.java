package com.hotelio.dto;

public record AppUserDTO(
        String id,
        String status,
        boolean blacklisted,
        boolean active,
        String name,
        String email,
        String city
) {
}
