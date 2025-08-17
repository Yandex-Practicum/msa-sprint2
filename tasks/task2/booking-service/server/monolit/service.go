package monolit

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"booking-service/server/monolit/models"
)

type Service struct {
	client  *http.Client
	baseUrl string
}

func NewService(baseUrl string) Service {
	return Service{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		baseUrl: baseUrl,
	}
}

func getCall[T any](url string) (T, error) {
	var result T
	resp, err := http.Get(url)
	if err != nil {
		return result, fmt.Errorf("GET %s failed: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return result, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	if err = json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return result, fmt.Errorf("failed to decode response: %w", err)
	}

	return result, nil
}

func (s Service) GetUser(ctx context.Context, userID string) (models.User, error) {
	return getCall[models.User](fmt.Sprintf("%s/api/users/%s", s.baseUrl, userID))
}

func (s Service) IsHotelOperational(ctx context.Context, hotelID string) (bool, error) {
	return getCall[bool](fmt.Sprintf("%s/api/hotels/%s/operational", s.baseUrl, hotelID))
}

func (s Service) IsHotelFullyBooked(ctx context.Context, hotelID string) (bool, error) {
	return getCall[bool](fmt.Sprintf("%s/api/hotels/%s/fully-booked", s.baseUrl, hotelID))
}

func (s Service) IsReviewsHotelTrusted(ctx context.Context, hotelID string) (bool, error) {
	return getCall[bool](fmt.Sprintf("%s/api/reviews/hotel/%s/trusted", s.baseUrl, hotelID))
}

func (s Service) ValidatePromo(ctx context.Context, code, userID string) (models.PromoValidation, error) {
	reqURL, err := url.Parse(fmt.Sprintf("%s/api/promos/validate", s.baseUrl))
	if err != nil {
		return models.PromoValidation{}, fmt.Errorf("invalid base URL: %w", err)
	}

	q := reqURL.Query()
	q.Add("code", code)
	q.Add("userId", userID)
	reqURL.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "POST", reqURL.String(), nil)
	if err != nil {
		return models.PromoValidation{}, fmt.Errorf("create request failed: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return models.PromoValidation{}, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return models.PromoValidation{}, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	var result models.PromoValidation
	if err = json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return models.PromoValidation{}, fmt.Errorf("failed to decode response: %w", err)
	}

	return result, nil
}
