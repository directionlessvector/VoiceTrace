ALTER TYPE "public"."session_type" ADD VALUE 'ledger_upload' BEFORE 'stock_update';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;