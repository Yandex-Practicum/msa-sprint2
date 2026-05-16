package com.hotelio.monolith.entity;

import jakarta.persistence.*;

@Entity
public class Hotel {

    @Id
    private String id;

    private boolean operational;
    private boolean fullyBooked;

    private String city;
    private double rating;

    @Column(length = 1000)
    private String description;

    public String getId() {
        return id;
    }

    public boolean isOperational() {
        return operational;
    }

    public void setOperational(boolean operational) {
        this.operational = operational;
    }

    public boolean isFullyBooked() {
        return fullyBooked;
    }

    public void setFullyBooked(boolean fullyBooked) {
        this.fullyBooked = fullyBooked;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
