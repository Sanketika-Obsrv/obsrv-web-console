CREATE TABLE IF NOT EXISTS "user_session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "user_session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "user_session" ("expire");

CREATE TABLE IF NOT EXISTS "oauth_access_tokens" (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  client_id VARCHAR(255),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "oauth_refresh_tokens" (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  client_id VARCHAR(255),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "oauth_authorization_codes" (
  id VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255),
  redirect_uri VARCHAR(255),
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "oauth_clients" (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  client_id VARCHAR(255) UNIQUE,
  client_secret VARCHAR(255),
  redirect_uri VARCHAR(255),
  is_trusted BOOLEAN,
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_on TIMESTAMP NULL
);

 CREATE TABLE IF NOT EXISTS "oauth_users" (
  id VARCHAR(255) PRIMARY KEY,
  user_name VARCHAR(255),
  password VARCHAR(255) NULL,
  first_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  provider VARCHAR(255) NULL,
  email_address VARCHAR(255) UNIQUE,
  mobile_number VARCHAR(255) NULL,
  created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_on TIMESTAMP NULL
);

INSERT INTO "oauth_users" ("id", "user_name", "password", "first_name", "last_name", "email_address", "created_on", "last_updated_on") VALUES ('1', 'obsrv_admin', '$2a$10$bG9R7ioA4/pfw8m0GPcWTOZMhc2sNN4wEkKV.j50RvQW5iUki/4Za', 'obsrv', 'admin', 'admin@obsrv.in', NOW(), NOW());

CREATE TABLE IF NOT EXISTS "alerts" (
    "id" varchar NOT NULL,
    "manager" varchar,
    "name" varchar,
    "status" varchar,
    "description" varchar,
    "expression" varchar,
    "severity" varchar,
    "category" varchar,
    "annotations" json DEFAULT '{}'::json,
    "labels" json DEFAULT '{}'::json,
    "frequency" varchar DEFAULT '1m'::character varying,
    "interval" varchar DEFAULT '1m'::character varying,
    "metadata" json DEFAULT '{}'::json,
    "created_by" varchar DEFAULT 'SYSTEM'::character varying,
    "updated_by" varchar DEFAULT 'SYSTEM'::character varying,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "context" json DEFAULT '{}'::json,
    "notification" json DEFAULT '{}'::json,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notificationChannel" (
    "id" varchar NOT NULL,
    "manager" varchar,
    "name" varchar,
    "status" varchar,
    "type" varchar,
    "config" json DEFAULT '{}'::json,
    "created_by" varchar DEFAULT 'SYSTEM'::character varying,
    "updated_by" varchar DEFAULT 'SYSTEM'::character varying,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "context" json DEFAULT '{}'::json,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "metrics" (
    "id" varchar NOT NULL,
    "alias" varchar UNIQUE,
    "component" varchar,
    "metric" varchar,
    "context" json DEFAULT '{}'::json,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    "subComponent" varchar,
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "silences" (
    "id" text NOT NULL,
    "manager" text NOT NULL,
    "alert_id" text NOT NULL,
    "created_by" text NOT NULL,
    "updated_by" text NOT NULL,
    "start_time" timestamptz NOT NULL,
    "end_time" timestamptz NOT NULL,
    "context" json,
    "createdAt" timestamptz NOT NULL,
    "updatedAt" timestamptz NOT NULL,
    PRIMARY KEY ("id")
);