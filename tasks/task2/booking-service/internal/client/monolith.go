package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"booking-service/internal/models"
)

type MonolithClient struct {
	baseURL string
	client  *http.Client
}

func NewMonolithClient(baseURL string) *MonolithClient {
	return &MonolithClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *MonolithClient) GetUser(userID string) (*models.User, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/users/%s", c.baseURL, userID))
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("user not found: status %d", resp.StatusCode)
	}

	var user models.User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode user response: %w", err)
	}

	return &user, nil
}

func (c *MonolithClient) IsUserActive(userID string) (bool, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/users/%s/active", c.baseURL, userID))
	if err != nil {
		return false, fmt.Errorf("failed to check user active status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check user active status: status %d", resp.StatusCode)
	}

	var active bool
	if err := json.NewDecoder(resp.Body).Decode(&active); err != nil {
		return false, fmt.Errorf("failed to decode active status: %w", err)
	}

	return active, nil
}

func (c *MonolithClient) IsUserBlacklisted(userID string) (bool, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/users/%s/blacklisted", c.baseURL, userID))
	if err != nil {
		return false, fmt.Errorf("failed to check user blacklist status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check blacklist status: status %d", resp.StatusCode)
	}

	var blacklisted bool
	if err := json.NewDecoder(resp.Body).Decode(&blacklisted); err != nil {
		return false, fmt.Errorf("failed to decode blacklist status: %w", err)
	}

	return blacklisted, nil
}

func (c *MonolithClient) GetUserStatus(userID string) (string, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/users/%s/status", c.baseURL, userID))
	if err != nil {
		return "", fmt.Errorf("failed to get user status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to get user status: status %d", resp.StatusCode)
	}

	var status string
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return "", fmt.Errorf("failed to decode status: %w", err)
	}

	return status, nil
}

func (c *MonolithClient) GetHotel(hotelID string) (*models.Hotel, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/hotels/%s", c.baseURL, hotelID))
	if err != nil {
		return nil, fmt.Errorf("failed to get hotel: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("hotel not found: status %d", resp.StatusCode)
	}

	var hotel models.Hotel
	if err := json.NewDecoder(resp.Body).Decode(&hotel); err != nil {
		return nil, fmt.Errorf("failed to decode hotel response: %w", err)
	}

	return &hotel, nil
}

func (c *MonolithClient) IsHotelOperational(hotelID string) (bool, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/hotels/%s/operational", c.baseURL, hotelID))
	if err != nil {
		return false, fmt.Errorf("failed to check hotel operational status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check hotel operational status: status %d", resp.StatusCode)
	}

	var operational bool
	if err := json.NewDecoder(resp.Body).Decode(&operational); err != nil {
		return false, fmt.Errorf("failed to decode operational status: %w", err)
	}

	return operational, nil
}

func (c *MonolithClient) IsHotelFullyBooked(hotelID string) (bool, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/hotels/%s/fully-booked", c.baseURL, hotelID))
	if err != nil {
		return false, fmt.Errorf("failed to check hotel booking status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check hotel booking status: status %d", resp.StatusCode)
	}

	var fullyBooked bool
	if err := json.NewDecoder(resp.Body).Decode(&fullyBooked); err != nil {
		return false, fmt.Errorf("failed to decode booking status: %w", err)
	}

	return fullyBooked, nil
}

func (c *MonolithClient) IsHotelTrusted(hotelID string) (bool, error) {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/reviews/hotel/%s/trusted", c.baseURL, hotelID))
	if err != nil {
		return false, fmt.Errorf("failed to check hotel trust status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check hotel trust status: status %d", resp.StatusCode)
	}

	var trusted bool
	if err := json.NewDecoder(resp.Body).Decode(&trusted); err != nil {
		return false, fmt.Errorf("failed to decode trust status: %w", err)
	}

	return trusted, nil
}

func (c *MonolithClient) ValidatePromoCode(code, userID string) (*models.PromoCode, error) {
	resp, err := c.client.Post(
		fmt.Sprintf("%s/api/promos/validate?code=%s&userId=%s", c.baseURL, code, userID),
		"application/json",
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to validate promo code: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("promo code validation failed: status %d", resp.StatusCode)
	}

	var promo models.PromoCode
	if err := json.NewDecoder(resp.Body).Decode(&promo); err != nil {
		return nil, fmt.Errorf("failed to decode promo response: %w", err)
	}

	return &promo, nil
}