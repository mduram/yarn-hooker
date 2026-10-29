import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const votes = sqliteTable('votes', {
  productId: text('product_id').notNull(),
  visitorId: text('visitor_id').notNull(),
  createdAt: integer('created_at').notNull(),
}, t => [primaryKey({columns:[t.productId,t.visitorId]})]);
