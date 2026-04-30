import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const nutritionMythsCache = pgTable('nutrition_myths_cache', {
  id: text('id').primaryKey(),
  dateKey: text('date_key').notNull(),
  claim: text('claim').notNull(),
  verdict: text('verdict').notNull(),
  oneLiner: text('one_liner').notNull(),
  explanation: text('explanation').notNull(),
  studiesJson: text('studies_json').notNull().default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
