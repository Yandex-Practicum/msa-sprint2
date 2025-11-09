package monolith

import (
	"fmt"
	"io"
	"net/http"
	"strings"
)

type Client struct{ Base string }

func (c Client) check(url, want string, invert bool) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	body := strings.TrimSpace(string(b))
	ok := strings.Contains(body, want)
	if invert {
		ok = !ok
	}
	if !ok {
		return fmt.Errorf("validation failed for %s (got=%s)", url, body)
	}
	return nil
}

func (c Client) Validate(userID, hotelID string) error {
	checks := []struct {
		url, want string
		invert    bool
	}{
		{fmt.Sprintf("%s/api/users/%s/active", c.Base, userID), "true", false},
		{fmt.Sprintf("%s/api/users/%s/blacklisted", c.Base, userID), "true", true},
		{fmt.Sprintf("%s/api/hotels/%s/operational", c.Base, hotelID), "true", false},
		{fmt.Sprintf("%s/api/reviews/hotel/%s/trusted", c.Base, hotelID), "true", false},
		{fmt.Sprintf("%s/api/hotels/%s/fully-booked", c.Base, hotelID), "false", false},
	}
	for _, cdef := range checks {
		if err := c.check(cdef.url, cdef.want, cdef.invert); err != nil {
			return err
		}
	}
	return nil
}

func (c Client) ValidatePromo(code, userID string) bool {
	url := fmt.Sprintf("%s/api/promos/validate?code=%s&userId=%s", c.Base, code, userID)
	resp, err := http.Post(url, "application/json", nil)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return strings.Contains(string(b), code)
}
