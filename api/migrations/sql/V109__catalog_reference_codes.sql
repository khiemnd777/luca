CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.unaccent_immutable(text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
	SELECT unaccent('public.unaccent', $1)
$$;

ALTER TABLE brand_names
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS code_norm text GENERATED ALWAYS AS (lower(unaccent_immutable(code))) STORED;

ALTER TABLE raw_materials
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS code_norm text GENERATED ALWAYS AS (lower(unaccent_immutable(code))) STORED;

ALTER TABLE techniques
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS code_norm text GENERATED ALWAYS AS (lower(unaccent_immutable(code))) STORED;

ALTER TABLE restoration_types
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS code_norm text GENERATED ALWAYS AS (lower(unaccent_immutable(code))) STORED;

DROP TABLE IF EXISTS catalog_ref_code_counters;

DROP INDEX IF EXISTS brand_names_dept_category_code_uq;
DROP INDEX IF EXISTS raw_materials_dept_category_code_uq;
DROP INDEX IF EXISTS techniques_dept_category_code_uq;
DROP INDEX IF EXISTS restoration_types_dept_category_code_uq;

DROP INDEX IF EXISTS brand_names_dept_code_uq;
DROP INDEX IF EXISTS raw_materials_dept_code_uq;
DROP INDEX IF EXISTS techniques_dept_code_uq;
DROP INDEX IF EXISTS restoration_types_dept_code_uq;

CREATE INDEX IF NOT EXISTS idx_brand_names_code_trgm_norm
  ON brand_names USING gin (code_norm gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_raw_materials_code_trgm_norm
  ON raw_materials USING gin (code_norm gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_techniques_code_trgm_norm
  ON techniques USING gin (code_norm gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_restoration_types_code_trgm_norm
  ON restoration_types USING gin (code_norm gin_trgm_ops);

UPDATE brand_names
SET code = lower(btrim(code))
WHERE code IS NOT NULL
  AND code <> lower(btrim(code));

UPDATE raw_materials
SET code = lower(btrim(code))
WHERE code IS NOT NULL
  AND code <> lower(btrim(code));

UPDATE techniques
SET code = lower(btrim(code))
WHERE code IS NOT NULL
  AND code <> lower(btrim(code));

UPDATE restoration_types
SET code = lower(btrim(code))
WHERE code IS NOT NULL
  AND code <> lower(btrim(code));

UPDATE brand_names
SET code = gen_random_uuid()::text
WHERE deleted_at IS NULL
  AND (
    code IS NULL
    OR btrim(code) = ''
    OR code !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

UPDATE raw_materials
SET code = gen_random_uuid()::text
WHERE deleted_at IS NULL
  AND (
    code IS NULL
    OR btrim(code) = ''
    OR code !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

UPDATE techniques
SET code = gen_random_uuid()::text
WHERE deleted_at IS NULL
  AND (
    code IS NULL
    OR btrim(code) = ''
    OR code !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

UPDATE restoration_types
SET code = gen_random_uuid()::text
WHERE deleted_at IS NULL
  AND (
    code IS NULL
    OR btrim(code) = ''
    OR code !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY department_id, code_norm
      ORDER BY id
    ) AS rn
  FROM brand_names
  WHERE deleted_at IS NULL
    AND code IS NOT NULL
)
UPDATE brand_names b
SET code = gen_random_uuid()::text
FROM duplicates d
WHERE b.id = d.id
  AND d.rn > 1;

WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY department_id, code_norm
      ORDER BY id
    ) AS rn
  FROM raw_materials
  WHERE deleted_at IS NULL
    AND code IS NOT NULL
)
UPDATE raw_materials rm
SET code = gen_random_uuid()::text
FROM duplicates d
WHERE rm.id = d.id
  AND d.rn > 1;

WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY department_id, code_norm
      ORDER BY id
    ) AS rn
  FROM techniques
  WHERE deleted_at IS NULL
    AND code IS NOT NULL
)
UPDATE techniques t
SET code = gen_random_uuid()::text
FROM duplicates d
WHERE t.id = d.id
  AND d.rn > 1;

WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY department_id, code_norm
      ORDER BY id
    ) AS rn
  FROM restoration_types
  WHERE deleted_at IS NULL
    AND code IS NOT NULL
)
UPDATE restoration_types rt
SET code = gen_random_uuid()::text
FROM duplicates d
WHERE rt.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS brand_names_dept_code_uq
  ON brand_names (department_id, code_norm)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS raw_materials_dept_code_uq
  ON raw_materials (department_id, code_norm)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS techniques_dept_code_uq
  ON techniques (department_id, code_norm)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS restoration_types_dept_code_uq
  ON restoration_types (department_id, code_norm)
  WHERE deleted_at IS NULL AND code IS NOT NULL;
