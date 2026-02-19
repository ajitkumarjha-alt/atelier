-- Migration: Restructure DDS to 9-phase deliverables model
-- Based on DDS (2).xlsx template + Policy 130 guidelines
-- Adds dependency tracking, stakeholder assignments, and scope classification

-- Add new columns to dds_items for dependency/stakeholder/scope tracking
ALTER TABLE dds_items ADD COLUMN IF NOT EXISTS dependency_text TEXT;
ALTER TABLE dds_items ADD COLUMN IF NOT EXISTS dependent_stakeholders VARCHAR(255);
ALTER TABLE dds_items ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'Plant';
ALTER TABLE dds_items ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE dds_items ADD COLUMN IF NOT EXISTS policy_day_offset INTEGER;

-- Add indexes for new filter columns
CREATE INDEX IF NOT EXISTS idx_dds_items_phase ON dds_items(phase);
CREATE INDEX IF NOT EXISTS idx_dds_items_scope ON dds_items(scope);
CREATE INDEX IF NOT EXISTS idx_dds_items_trade ON dds_items(trade);
