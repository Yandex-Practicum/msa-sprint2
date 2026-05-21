package com.hotelio.monolith.service;

import com.hotelio.monolith.entity.PromoCode;
import com.hotelio.monolith.repository.PromoCodeRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PromoCodeService {

    private final PromoCodeRepository repository;
    private final AppUserService userService;

    public PromoCodeService(PromoCodeRepository repository, AppUserService userService) {
        this.repository = repository;
        this.userService = userService;
    }

    public Optional<PromoCode> getValidPromo(String code, boolean isVipUser) {
        return repository.findById(code)
                .filter(p -> !p.isExpired())
                .filter(p -> !p.isVipOnly() || isVipUser);
    }

    public Optional<PromoCode> findByCode(String code) {
        return repository.findById(code);
    }

    public PromoCode validate(String promoCode, String userId) {
        Optional<String> status = userService.getUserStatus(userId);
        boolean isVip = status.map("VIP"::equalsIgnoreCase).orElse(false);
        return getValidPromo(promoCode, isVip).orElse(null);
    }

    public boolean isPromoValid(String code, boolean isVipUser) {
        return getValidPromo(code, isVipUser).isPresent();
    }

}
