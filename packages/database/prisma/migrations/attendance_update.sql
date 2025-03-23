-- Update Attendance model with additional fields
ALTER TABLE "attendance" 
ADD COLUMN IF NOT EXISTS "check_in_time" TEXT,
ADD COLUMN IF NOT EXISTS "check_out_time" TEXT,
ADD COLUMN IF NOT EXISTS "work_hours" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "leave_type" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "location_check_in" TEXT,
ADD COLUMN IF NOT EXISTS "location_check_out" TEXT,
ADD COLUMN IF NOT EXISTS "photo_check_in" TEXT,
ADD COLUMN IF NOT EXISTS "photo_check_out" TEXT,
ADD COLUMN IF NOT EXISTS "is_manual_entry" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
ADD COLUMN IF NOT EXISTS "updated_by_id" TEXT;

-- Create LeaveRequest model
CREATE TABLE IF NOT EXISTS "leave_request" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "employee_id" TEXT NOT NULL,
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3) NOT NULL,
  "leave_type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "contact_info" TEXT,
  "is_half_day" BOOLEAN DEFAULT false,
  "number_of_days" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL,
  "notes" TEXT,
  "documents" TEXT[],
  "approved_days" DOUBLE PRECISION,
  "approved_by_id" TEXT,
  "approved_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "leave_request_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_organization_id_fkey" 
FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_employee_id_fkey" 
FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "leave_request_organization_id_idx" ON "leave_request"("organization_id");
CREATE INDEX "leave_request_employee_id_idx" ON "leave_request"("employee_id");
CREATE INDEX "leave_request_status_idx" ON "leave_request"("status");