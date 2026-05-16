package com.hotelio.history

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class BookingHistoryServiceApplication

fun main(args: Array<String>) {
    runApplication<BookingHistoryServiceApplication>(*args)
}