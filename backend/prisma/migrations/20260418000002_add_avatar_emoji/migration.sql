-- Add avatar_emoji to users
ALTER TABLE users ADD COLUMN avatar_emoji TEXT NOT NULL DEFAULT '⚽';
