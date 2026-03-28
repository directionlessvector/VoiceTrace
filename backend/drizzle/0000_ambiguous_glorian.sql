CREATE TYPE "public"."business_type" AS ENUM('retail', 'wholesale', 'service', 'agriculture');--> statement-breakpoint
CREATE TYPE "public"."correction_status" AS ENUM('pending', 'accepted', 'rejected', 'manually_corrected');--> statement-breakpoint
CREATE TYPE "public"."flag_type" AS ENUM('wrong_amount', 'wrong_item', 'wrong_party', 'duplicate_detected', 'unclear_speech', 'unit_mismatch', 'date_mismatch');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'transcribed', 'parsed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('ledger_entry', 'stock_update', 'customer_update', 'query', 'general');--> statement-breakpoint
CREATE TYPE "public"."entry_category" AS ENUM('goods', 'services', 'salary', 'rent', 'utilities', 'other');--> statement-breakpoint
CREATE TYPE "public"."entry_source" AS ENUM('voice', 'ocr', 'manual');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('sale', 'purchase', 'expense', 'income');--> statement-breakpoint
CREATE TYPE "public"."customer_txn_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('in', 'out', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."location_source" AS ENUM('manual', 'scraped', 'google_maps');--> statement-breakpoint
CREATE TYPE "public"."anomaly_type" AS ENUM('duplicate_entry', 'unusual_amount', 'large_variance', 'stock_mismatch', 'pattern_break');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."delivery_channel" AS ENUM('sms', 'whatsapp', 'call_agent', 'dashboard');--> statement-breakpoint
CREATE TYPE "public"."pattern_type" AS ENUM('sales_trend', 'stock_pattern', 'expense_spike', 'seasonal_behavior', 'customer_payment');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('low_stock', 'anomaly_detected', 'payment_due', 'weather_advisory', 'pattern_break', 'vendor_score_change');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('sms', 'whatsapp', 'dashboard', 'push_pwa');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'support' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"business_type" "business_type",
	"language_preference" text DEFAULT 'en',
	"city" text,
	"state" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "voice_flagged_anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voice_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"flag_type" "flag_type" NOT NULL,
	"original_text" text NOT NULL,
	"start_sec" numeric(8, 3),
	"end_sec" numeric(8, 3),
	"suggested_correction" text,
	"corrected_value" text,
	"correction_status" "correction_status" DEFAULT 'pending' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"cloudinary_url" text NOT NULL,
	"cloudinary_public_id" text NOT NULL,
	"cloudinary_format" text,
	"cloudinary_version" text,
	"mime_type" text,
	"file_size_bytes" integer,
	"duration_seconds" integer,
	"recorded_at" timestamp,
	"transcription_raw" text,
	"transcription_clean" text,
	"language_detected" text,
	"session_type" "session_type" DEFAULT 'general' NOT NULL,
	"processing_status" "processing_status" DEFAULT 'pending' NOT NULL,
	"highlights" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"voice_session_id" uuid,
	"entry_type" "entry_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"quantity" numeric(12, 3),
	"unit" text,
	"item_name" text,
	"party_name" text,
	"entry_category" "entry_category",
	"notes" text,
	"entry_date" date NOT NULL,
	"entry_source" "entry_source" DEFAULT 'manual' NOT NULL,
	"ocr_raw_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"voice_session_id" uuid,
	"txn_type" "customer_txn_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"txn_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"voice_session_id" uuid,
	"ledger_entry_id" uuid,
	"movement_type" "movement_type" NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"unit" text NOT NULL,
	"current_quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"low_stock_threshold" numeric(12, 3),
	"price_per_unit" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address_raw" text,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"location_source" "location_source" DEFAULT 'manual',
	"category" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"voice_session_id" uuid,
	"ledger_entry_id" uuid,
	"stock_movement_id" uuid,
	"anomaly_type" "anomaly_type" NOT NULL,
	"description" text NOT NULL,
	"severity" "severity" NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"summary_text" text NOT NULL,
	"summary_audio_url" text,
	"summary_date" date NOT NULL,
	"delivered_via" "delivery_channel",
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pattern_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pattern_type" "pattern_type" NOT NULL,
	"data" jsonb,
	"period_start" date,
	"period_end" date,
	"confidence_score" numeric(4, 3),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"overall_score" numeric(5, 2),
	"payment_regularity_score" numeric(5, 2),
	"sales_consistency_score" numeric(5, 2),
	"stock_management_score" numeric(5, 2),
	"factors" jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "weather_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stock_item_id" uuid,
	"suggestion_text" text NOT NULL,
	"weather_data" jsonb,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_type" "alert_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"reference_id" uuid,
	"reference_type" text,
	"alert_severity" "alert_severity" DEFAULT 'info' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"alert_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"message_body" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"admin_user_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voice_flagged_anomalies" ADD CONSTRAINT "voice_flagged_anomalies_voice_session_id_voice_sessions_id_fk" FOREIGN KEY ("voice_session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_flagged_anomalies" ADD CONSTRAINT "voice_flagged_anomalies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_voice_session_id_voice_sessions_id_fk" FOREIGN KEY ("voice_session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_ledger" ADD CONSTRAINT "customer_ledger_voice_session_id_voice_sessions_id_fk" FOREIGN KEY ("voice_session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_voice_session_id_voice_sessions_id_fk" FOREIGN KEY ("voice_session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_voice_session_id_voice_sessions_id_fk" FOREIGN KEY ("voice_session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_stock_movement_id_stock_movements_id_fk" FOREIGN KEY ("stock_movement_id") REFERENCES "public"."stock_movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern_detections" ADD CONSTRAINT "pattern_detections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_scores" ADD CONSTRAINT "vendor_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_suggestions" ADD CONSTRAINT "weather_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_suggestions" ADD CONSTRAINT "weather_suggestions_stock_item_id_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."stock_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_admin_user_id_admin_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;