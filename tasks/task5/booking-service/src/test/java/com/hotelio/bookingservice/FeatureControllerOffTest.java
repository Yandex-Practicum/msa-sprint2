package com.hotelio.bookingservice;

import com.hotelio.bookingservice.controller.FeatureController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;

@WebMvcTest(FeatureController.class)
@AutoConfigureRestTestClient
@TestPropertySource(properties = "enable.feature.x=false")
public class FeatureControllerOffTest {

    @Autowired
    private RestTestClient restTestClient;

    @Test
    void featureOff() {
        restTestClient.get().uri("/feature")
                .exchange()
                .expectStatus().isNotFound();
    }

}
