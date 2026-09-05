package com.hotelio.bookingservice.connectors;

import org.springframework.web.client.RestTemplate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RestConnectionProxy {
  private final RestTemplate restConnection;  
  private static final Logger log = LoggerFactory.getLogger(RestConnectionProxy.class);

  public RestConnectionProxy(RestTemplate restConnection) {
    this.restConnection = restConnection;
  }

  public String GetStringValue(String subUrl) {
    String url = "http://hotelio-monolith:8080/api/" + subUrl;
    log.info("Calling GET for " + url);
    String result = restConnection.getForObject(url, String.class);
    log.info(url + " returned " + result);
    return result;
  }

  public String PostAndGetStringValue(String subUrl, Object request) {
    String url = "http://hotelio-monolith:8080/api/" + subUrl;
    log.info("Calling POST for " + url);
    String result = restConnection.postForObject(url, request, String.class);
    log.info(url + " returned " + result);
    return result;
  }
}

