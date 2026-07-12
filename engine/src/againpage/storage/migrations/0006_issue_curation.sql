-- User curation of archived editions, separate from the pipeline `status`.
-- active=false is the "inactive" dump; favorite marks an edition as a favourite.
ALTER TABLE issues ADD COLUMN active   BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE issues ADD COLUMN favorite BOOLEAN NOT NULL DEFAULT false;
