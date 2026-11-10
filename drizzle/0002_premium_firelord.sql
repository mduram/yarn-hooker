CREATE TABLE `owner_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`encrypted_token` text NOT NULL
);
