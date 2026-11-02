package com.hotelio.client;

import com.hotelio.dto.PromoCodeDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "promo", url = "${clients.promo.url}")
public interface PromoCodeClient {

    @PostMapping("/validate")
    ResponseEntity<PromoCodeDTO> validatePromo(@RequestParam String code,
                                                      @RequestParam String userId);
}
