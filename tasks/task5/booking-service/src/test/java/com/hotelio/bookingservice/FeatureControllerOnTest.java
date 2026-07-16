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
@TestPropertySource(properties = "enable.feature.x=true")
public class FeatureControllerOnTest {

    @Autowired
    private RestTestClient restTestClient;

    @Test
    void featureOn() {
        restTestClient.get().uri("/feature")
                .exchange()
                .expectBody(String.class)
                .isEqualTo("Feature X is enabled!");
    }

}
