using BookingHistoryService.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace BookingHistoryService.Data
{
    public class BookingHistoryDbContext : DbContext
    {
        public BookingHistoryDbContext(DbContextOptions<BookingHistoryDbContext> options) : base(options) { }

        public DbSet<BookingHistory> BookingHistory { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<BookingHistory>()
                .HasIndex(b => b.Id);

        }
        //protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        //{
            
        //}
    }
}
