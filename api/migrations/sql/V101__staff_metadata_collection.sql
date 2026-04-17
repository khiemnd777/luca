INSERT INTO collections (slug, name)
VALUES ('staff', 'Nhân sự')
ON CONFLICT (slug)
DO UPDATE SET name = EXCLUDED.name;
