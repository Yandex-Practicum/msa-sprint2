package com.hotelio.bookingservice;

import com.hotelio.bookingservice.connectors.RestConnectionProxy;
import com.hotelio.bookingservice.service.BookingService;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication(scanBasePackages = {"com.hotelio", "com.hotelio.bookingserviceapp"})
public class BookingServiceApp {
    public static void main(String[] args) {
        SpringApplication.run(BookingServiceApp.class, args);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }    

    @Bean
    public RestConnectionProxy restConnectionProxy() {
        return new RestConnectionProxy(new RestTemplate());
    }    
    
    @Bean
    public CommandLineRunner logBeans(ApplicationContext ctx) {
        return args -> {
            String[] beans = ctx.getBeanNamesForType(BookingService.class);
            System.out.println("➡️  BookingService beans:");
            for (String name : beans) {
                System.out.println("    - " + name + ": " + ctx.getBean(name).getClass());
            }
        };
    }

}
