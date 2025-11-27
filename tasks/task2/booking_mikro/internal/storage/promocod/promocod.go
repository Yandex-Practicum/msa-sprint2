package promocod

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/practikum/booking_mikro/internal/domain/model"
)

type Storage struct {
	client http.Client
	url    string
}

func New(url string) *Storage {
	return &Storage{
		client: http.Client{Timeout: 5 * time.Second},
		url:    url,
	}
}

func (s *Storage) Validate(promoCode, userId string) (float64, error) {
	resp, err := s.client.Get(fmt.Sprintf("%s/api/promos/validate", s.url))
	if err != nil {
		return 0, fmt.Errorf("Validate.client.Get: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("Validate.client.Get: %w", err)
	}
	var discount model.Discount
	err = json.Unmarshal(body, &discount)
	if err != nil {
		return 0, fmt.Errorf("Validate.client.Get: %w", err)
	}

	return discount.DiscountPercent, nil
}
