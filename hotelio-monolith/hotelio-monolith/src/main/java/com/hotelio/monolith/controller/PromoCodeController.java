package com.hotelio.monolith.controller;

import com.hotelio.monolith.entity.PromoCode;
import com.hotelio.monolith.service.PromoCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/promos")
public class PromoCodeController {

    private final PromoCodeService promoCodeService;

    public PromoCodeController(PromoCodeService promoCodeService) {
        this.promoCodeService = promoCodeService;
    }

    // GET /api/promos/{code}
    @GetMapping("/{code}")
    public ResponseEntity<PromoCode> getPromoByCode(@PathVariable String code) {
        return promoCodeService.findByCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/promos/{code}/valid?isVipUser=true
    @GetMapping("/{code}/valid")
    public boolean isPromoValid(@PathVariable String code,
                                @RequestParam(defaultValue = "false") boolean isVipUser) {
        return promoCodeService.isPromoValid(code, isVipUser);
    }

    // POST /api/promos/validate
    @PostMapping("/validate")
    public ResponseEntity<PromoCode> validatePromo(@RequestParam String code,
                                                   @RequestParam String userId) {
        PromoCode promo = promoCodeService.validate(code, userId);
        if (promo != null) {
            return ResponseEntity.ok(promo);
        } else {
            return ResponseEntity.badRequest().build();
        }
    }
}
