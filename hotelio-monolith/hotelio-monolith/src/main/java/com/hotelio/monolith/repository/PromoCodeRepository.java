package com.hotelio.monolith.repository;

import com.hotelio.monolith.entity.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromoCodeRepository extends JpaRepository<PromoCode, String> {
}
