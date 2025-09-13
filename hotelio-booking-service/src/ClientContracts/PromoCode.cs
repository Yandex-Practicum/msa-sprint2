namespace HotelioBookingService.ClientContracts;

public class PromoCode
{
    public string Code { get; set; }

    public double Discount { get; set; }
    
    public bool VipOnly { get; set; }
    
    public bool Expired { get; set; }

    public DateTime ValidUntil { get; set; }
    
    public string Description { get; set; }
}