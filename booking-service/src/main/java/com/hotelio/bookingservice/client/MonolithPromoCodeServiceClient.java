package com.hotelio.bookingservice.client;

import com.hotelio.bookingservice.dto.PromoCode;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "promocodeservice", url = "${monolith.promocodeservice.url}")
public interface MonolithPromoCodeServiceClient {

    @PostMapping("/validate")
    PromoCode validate(@RequestParam(name = "code", required = false) String promoCode, @RequestParam(name = "userId", required = false) String userId);
}
