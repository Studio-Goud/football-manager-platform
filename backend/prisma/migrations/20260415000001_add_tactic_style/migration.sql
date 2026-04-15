-- Add tactic_style to teams table
ALTER TABLE "teams" ADD COLUMN "tactic_style" TEXT NOT NULL DEFAULT 'BALANCED';
