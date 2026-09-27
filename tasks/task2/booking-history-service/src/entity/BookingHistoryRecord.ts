import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "booking_history" })
export class BookingHistoryRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "booking_id" })
  bookingId!: string;

  @Column({ name: "user_id" })
  userId!: string;

  @Column({ name: "hotel_id" })
  hotelId!: string;

  @Column({ name: "promo_code", type: "varchar", nullable: true })
  promoCode!: string | null;

  @Column({ name: "discount_percent", type: "double precision" })
  discountPercent!: number;

  @Column({ type: "double precision" })
  price!: number;

  @Column({ name: "booking_created_at" })
  bookingCreatedAt!: Date;

  @CreateDateColumn({ name: "received_at" })
  receivedAt!: Date;
}
