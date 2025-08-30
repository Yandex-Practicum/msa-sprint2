package com.hotelio.microservice.controller

import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController

@RestController
class FeatureController {
    companion object {
        val logger = LoggerFactory.getLogger(FeatureController::class.java)
    }

    @GetMapping("/feature")
    fun checkFeature(@RequestHeader("X-Feature-Enabled", required = false, defaultValue = "false") enabled: String): ResponseEntity<String> {
        if (enabled.toBoolean()) {
            logger.info("Feature enabled!")
        } else {
            logger.info("Feature not enabled (no header)")
            return ResponseEntity.notFound().build()
        }
        return ResponseEntity.ok("working-v2...")
    }
}