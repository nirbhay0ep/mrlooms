ALTER TABLE wl_listings ADD COLUMN specs_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE wl_listings ADD COLUMN photo_ids TEXT NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS wl_photos (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,storage_key TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS wl_photo_owner ON wl_photos(user_id);
CREATE TABLE IF NOT EXISTS wl_reviews (id TEXT PRIMARY KEY,listing_id TEXT NOT NULL,user_id TEXT NOT NULL,display_name TEXT NOT NULL,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),quality_rating INTEGER NOT NULL CHECK(quality_rating BETWEEN 1 AND 5),experience TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,UNIQUE(listing_id,user_id));
CREATE INDEX IF NOT EXISTS wl_review_listing ON wl_reviews(listing_id,created_at);
