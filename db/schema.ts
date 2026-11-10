import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const votes = sqliteTable('votes', {
  productId: text('product_id').notNull(),
  visitorId: text('visitor_id').notNull(),
  createdAt: integer('created_at').notNull(),
}, t => [primaryKey({columns:[t.productId,t.visitorId]})]);
export const ownerSessions = sqliteTable('owner_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
});
export const ownerAttempts = sqliteTable('owner_attempts', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull(),
  windowStart: integer('window_start').notNull(),
});
export const ownerSettings = sqliteTable('owner_settings', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
});
