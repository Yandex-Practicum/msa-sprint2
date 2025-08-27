package com.hotelio.microservice.controller

import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@ConditionalOnBooleanProperty("feature.enabled")
class FeatureController {
    @GetMapping("/feature")
    fun checkFeature(): String {
        return "working..."
    }
}