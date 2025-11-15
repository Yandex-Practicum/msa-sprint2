package com.hotelio.bookinghistory;

import jakarta.persistence.*;

@Entity
@Table(name = "booking_stats")
public class BookingStat {
    @Id
    private String userId;
    private int totalBookings;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public int getTotalBookings() { return totalBookings; }
    public void setTotalBookings(int totalBookings) { this.totalBookings = totalBookings; }
}
