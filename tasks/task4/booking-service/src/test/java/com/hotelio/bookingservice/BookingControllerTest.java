package com.hotelio.bookingservice;

import com.hotelio.bookingservice.controller.BookingController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.client.RestTestClient;

@WebMvcTest(BookingController.class)
@AutoConfigureRestTestClient
class BookingControllerTest {

	@Autowired
	private RestTestClient restTestClient;

	@Test
	void pingTest() {
		restTestClient.get().uri("/ping")
				.exchange()
				.expectBody(String.class)
				.isEqualTo("pong");
	}

}
