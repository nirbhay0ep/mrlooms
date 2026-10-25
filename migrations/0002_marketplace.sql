CREATE TABLE IF NOT EXISTS wl_users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,name TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS wl_sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS wl_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS wl_listings (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,company TEXT NOT NULL,segment TEXT NOT NULL,city TEXT NOT NULL,state TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,moq TEXT NOT NULL,capacity TEXT NOT NULL,phone TEXT NOT NULL,email TEXT NOT NULL,gstin TEXT NOT NULL DEFAULT '',website TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS wl_listing_owner ON wl_listings(user_id);
CREATE TABLE IF NOT EXISTS wl_requests (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,supplier_id TEXT,listing_id TEXT,kind TEXT NOT NULL,title TEXT NOT NULL,details TEXT NOT NULL,quantity TEXT NOT NULL,origin TEXT NOT NULL,destination TEXT NOT NULL,needed_by TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Submitted',quote TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS wl_request_buyer ON wl_requests(user_id);
CREATE INDEX IF NOT EXISTS wl_request_supplier ON wl_requests(supplier_id);
