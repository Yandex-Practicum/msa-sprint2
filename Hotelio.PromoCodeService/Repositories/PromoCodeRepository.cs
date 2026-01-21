using Microsoft.EntityFrameworkCore;

namespace Hotelio.PromoCodeService.Repositories
{
    public interface IPromoCodeRepository
    {
        Task<PromoCode?> GetByCodeAsync(string code);
        Task<bool> ExistsAsync(string code);

    }

    public class PromoCodeRepository : IPromoCodeRepository
    {
        private readonly PromoCodeDbContext _context;
        

        public PromoCodeRepository(
            PromoCodeDbContext context
        )
        {
            _context = context;
        }

        public async Task<PromoCode?> GetByCodeAsync(string code)
        {
            return await _context.PromoCodes
                .FirstOrDefaultAsync(p => p.Code == code);
        }

        public async Task<bool> ExistsAsync(string code)
        {
            return await _context.PromoCodes
                .AnyAsync(p => p.Code == code);
        }
    }
}
