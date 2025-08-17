package models

type PromoValidation struct {
	Code            string  `json:"code"`
	DiscountPercent float64 `json:"discountPercent"`
	Active          bool    `json:"active"`
	VipOnly         bool    `json:"vipOnly"`
}
