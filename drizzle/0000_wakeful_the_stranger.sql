CREATE TABLE `votes` (
	`product_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`product_id`, `visitor_id`)
);
