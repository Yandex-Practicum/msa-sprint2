using Microsoft.EntityFrameworkCore;

namespace Hotelio.PromoCodeService
{
    public class PromoCodeDbContext : DbContext
    {

        public DbSet<PromoCode> PromoCodes { get; set; }

        public PromoCodeDbContext(DbContextOptions<PromoCodeDbContext> options)
            : base(options)
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<PromoCode>(entity =>
            {
                entity.ToTable("promocode");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).UseSerialColumn();
                entity.Property(e => e.Code).IsRequired();
                entity.Property(e => e.Discount).HasPrecision(15, 2);
                ;
            });
            modelBuilder.Entity<PromoCode>().HasData(new[]
            {
                new PromoCode{ Id =1, Code = "TESTCODE1",    Discount = 10.0m, VipOnly = false, Expired = false, ValidUntil = new DateTime(2099, 12, 31), Description = "Обычный промокод"},
                new PromoCode{ Id = 2, Code = "TESTCODE-VIP", Discount = 20.0m, VipOnly = true, Expired = false, ValidUntil = new DateTime(2099, 12, 31), Description = "Только для VIP"},
                new PromoCode { Id = 3, Code = "TESTCODE-OLD", Discount = 5.0m, VipOnly = false, Expired = true, ValidUntil = new DateTime(2000, 01, 01), Description = "Истёкший промокод" }
            });
        }
    }

    public class PromoCode
    {
        public int Id { get; set; }
        public string Code { get; set; }
        public decimal Discount { get; set; }
        public bool VipOnly { get; set; }
        public bool Expired { get; set; }
        public DateTime ValidUntil { get; set; }
        public string Description { get; set; }

        public bool IsValid(bool isVipUser)
        {
            if (Expired) return false;
            if (ValidUntil < DateTime.UtcNow.Date) return false;
            if (VipOnly && !isVipUser) return false;

            return true;
        }
    }
}