package com.hotelio.microservice.controller

import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class PingController {
    companion object {
        val logger = LoggerFactory.getLogger(PingController::class.java)
    }

    @GetMapping("/ping")
    fun ping(): String {
        logger.info("Pinged...")
        return "pong-v2..."
    }
}