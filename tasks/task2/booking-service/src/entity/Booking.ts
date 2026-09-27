import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "booking" })
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

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

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
