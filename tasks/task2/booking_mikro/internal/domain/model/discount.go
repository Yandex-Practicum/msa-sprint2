package model

type Discount struct {
	Code            string
	DiscountPercent float64
	Active          bool
	VipOnly         bool
}
