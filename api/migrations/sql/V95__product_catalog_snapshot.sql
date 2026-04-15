-- Snapshot current product catalog Google Sheet into department 1.
-- Scope:
--   - category path backfill / upsert
--   - product template imports into products + product_* joins
--   - ref table backfill for brand_names/raw_materials/techniques/restoration_types
--   - metadata collections / fields required by the existing product/category forms

CREATE TEMP TABLE tmp_v95_catalog_raw (
  sheet_key TEXT NOT NULL,
  sheet_order INT NOT NULL,
  code TEXT,
  name TEXT,
  lv2 TEXT,
  lv3 TEXT,
  raw_material_name TEXT,
  brand_name TEXT,
  technique_name TEXT,
  restoration_type_name TEXT,
  process_path TEXT,
  retail_price_raw TEXT
) ON COMMIT DROP;

INSERT INTO tmp_v95_catalog_raw (
  sheet_key,
  sheet_order,
  code,
  name,
  lv2,
  lv3,
  raw_material_name,
  brand_name,
  technique_name,
  restoration_type_name,
  process_path,
  retail_price_raw
)
VALUES
  ('CỐ ĐỊNH', 1001, 'CĐZIFUKERO', 'Full Contour Zirconia Kerox', 'Không kim Loại', 'Full', NULL, 'Kerox', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  990,000 '),
  ('CỐ ĐỊNH', 1002, 'CĐZIFUCERC', 'Full Contour Zirconia Cercon', 'Không kim Loại', 'Full', NULL, 'Cercon', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1003, 'CĐZIFULAVA', 'Full Contour Zirconia Lava', 'Không kim Loại', 'Full', NULL, 'Lava', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,400,000 '),
  ('CỐ ĐỊNH', 1004, 'CĐZIFUVITA', 'Full Contour Zirconia Vita', 'Không kim Loại', 'Full', NULL, 'Vita', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1005, 'CĐZIVEKERO', 'Veneer Zirconia Kerox', 'Không kim Loại', 'Veneer', NULL, 'Kerox', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  990,000 '),
  ('CỐ ĐỊNH', 1006, 'CĐZIVECERC', 'Veneer Zirconia Cercon', 'Không kim Loại', 'Veneer', NULL, 'Cercon', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1007, 'CĐZIVELAVA', 'Veneer Zirconia Lava', 'Không kim Loại', 'Veneer', NULL, 'Lava', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,400,000 '),
  ('CỐ ĐỊNH', 1008, 'CĐZIVEVITA', 'Veneer Zirconia Vita', 'Không kim Loại', 'Veneer', NULL, 'Vita', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1009, 'CĐZIĐAKERO', 'Sứ Zirconia Kerox', 'Không kim Loại', 'Đắp sứ', NULL, 'Kerox', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  990,000 '),
  ('CỐ ĐỊNH', 1010, 'CĐZIĐACERC', 'Sứ Zirconia Cercon', 'Không kim Loại', 'Đắp sứ', NULL, 'Cercon', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1011, 'CĐZIĐALAVA', 'Sứ Zirconia Lava', 'Không kim Loại', 'Đắp sứ', NULL, 'Lava', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,400,000 '),
  ('CỐ ĐỊNH', 1012, 'CĐZIĐAVITA', 'Sứ Zirconia Vita', 'Không kim Loại', 'Đắp sứ', NULL, 'Vita', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1013, 'CĐZISUKERO', 'Sườn Zirconia Kerox', 'Không kim Loại', 'Làm sườn', NULL, 'Kerox', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Admin', '  350,000 '),
  ('CỐ ĐỊNH', 1014, 'CĐZISUCERC', 'Sườn Zirconia Cercon', 'Không kim Loại', 'Làm sườn', NULL, 'Cercon', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Admin', '  450,000 '),
  ('CỐ ĐỊNH', 1015, 'CĐZISULAVA', 'Sườn Zirconia Lava', 'Không kim Loại', 'Làm sườn', NULL, 'Lava', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Admin', '  450,000 '),
  ('CỐ ĐỊNH', 1016, 'CĐZISUVITA', 'Sườn Zirconia Vita', 'Không kim Loại', 'Làm sườn', NULL, 'Vita', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Admin', '  450,000 '),
  ('CỐ ĐỊNH', 1017, 'CĐZIONKERO', 'Onlay Zirconia Kerox', 'Không kim Loại', 'Onlay', NULL, 'Kerox', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  800,000 '),
  ('CỐ ĐỊNH', 1018, 'CĐZIONCERC', 'Onlay Zirconia Cercon', 'Không kim Loại', 'Onlay', NULL, 'Cercon', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1019, 'CĐZIONLAVA', 'Onlay Zirconia Lava', 'Không kim Loại', 'Onlay', NULL, 'Lava', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1020, 'CĐZIINKERO', 'Inlay Zirconia Kerox', 'Không kim Loại', 'Inlay', NULL, 'Kerox', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  800,000 '),
  ('CỐ ĐỊNH', 1021, 'CĐZIINCERC', 'Inlay Zirconia Cercon', 'Không kim Loại', 'Inlay', NULL, 'Cercon', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1022, 'CĐZIINLAVA', 'Inlay Zirconia Lava', 'Không kim Loại', 'Inlay', NULL, 'Lava', NULL, NULL, 'Đai mẫu- Cadcam- Sườn- Sứ- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1023, 'CĐZICGKERO', 'Cùi giả Zirconia Kerox', 'Không kim Loại', 'Cùi giả', NULL, 'Kerox', NULL, NULL, 'Đai mẫu- Sáp- Cadcam- Sườn- Admin', '  600,000 '),
  ('CỐ ĐỊNH', 1024, 'CĐZICGCERC', 'Cùi giả Zirconia Cercon', 'Không kim Loại', 'Cùi giả', NULL, 'Cercon', NULL, NULL, 'Đai mẫu- Sáp- Cadcam- Sườn- Admin', '  800,000 '),
  ('CỐ ĐỊNH', 1025, 'CĐZICGLAVA', 'Cùi giả Zirconia Lava', 'Không kim Loại', 'Cùi giả', NULL, 'Lava', NULL, NULL, 'Đai mẫu- Sáp- Cadcam- Sườn- Admin', '  800,000 '),
  ('CỐ ĐỊNH', 1026, 'CĐMTTUCUNG', 'Mão tạm nhựa tự cứng', 'Không kim Loại', 'Răng tạm', NULL, NULL, NULL, NULL, 'Đai mẫu- Sứ- Admin', '  50,000 '),
  ('CỐ ĐỊNH', 1027, 'CĐMTPMMA', 'Mão tạm PMMA', 'Không kim Loại', 'Răng tạm', NULL, NULL, NULL, NULL, 'Đai mẫu- Cadcam- Sứ- Admin', '  150,000 '),
  ('CỐ ĐỊNH', 1028, 'CĐVENEEREP', 'Veneer Sứ Ép Emax', 'Không kim Loại', 'Sứ ép', NULL, 'Emax', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Sứ - Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1029, 'CĐKLFUNICR', 'Full Kim Loại Ni-Cr', 'Kim Loại', 'Full', NULL, 'Ni- Cr', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  200,000 '),
  ('CỐ ĐỊNH', 1030, 'CĐKLFUTITA', 'Full Kim Loại Titan', 'Kim Loại', 'Full', NULL, 'Titan', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1031, 'CĐKLFUCRCO', 'Full Kim Loại Cr-Co', 'Kim Loại ', 'Full', NULL, 'Cr- Co', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1032, 'CĐKLVENICR', 'Veneer Sứ  Ni-Cr', 'Kim loại', 'Veneer', NULL, 'Ni- Cr', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Sứ- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1033, 'CĐKLVETITA', 'Veneer Sứ Titan', 'Kim loại', 'Veneer', NULL, 'Titan', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Sứ- Admin', '  450,000 '),
  ('CỐ ĐỊNH', 1034, 'CĐKLVECRCO', 'Veneer Sứ Cr-Co', 'Kim loại', 'Veneer', NULL, 'Cr- Co', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Sứ- Admin', '  450,000 '),
  ('CỐ ĐỊNH', 1035, 'CĐKLĐANICR', 'Sứ Ni-Cr', 'Kim loại', 'Đắp sứ', NULL, 'Ni- Cr', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Sứ- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1036, 'CĐKLĐATITA', 'Sứ Titan', 'Kim loại', 'Đắp sứ', NULL, 'Titan', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Sứ- Admin', '  450,000 '),
  ('CỐ ĐỊNH', 1037, 'CĐKLĐACRCO', 'Sứ Cr-Co', 'Kim loại', 'Đắp sứ', NULL, 'Cr- Co', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Sứ- Admin', '  450,000 '),
  ('CỐ ĐỊNH', 1038, 'CĐKLSUNICR', 'Sườn Ni-Cr', 'Kim loại', 'Làm sườn', NULL, 'Ni- Cr', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  200,000 '),
  ('CỐ ĐỊNH', 1039, 'CĐKLSUTITA', 'Sườn Titan', 'Kim loại', 'Làm sườn', NULL, 'Titan', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  250,000 '),
  ('CỐ ĐỊNH', 1040, 'CĐKLSUCRCO', 'Sườn Cr-Co', 'Kim loại', 'Làm sườn', NULL, 'Cr- Co', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  250,000 '),
  ('CỐ ĐỊNH', 1041, 'CĐKLONNICR', 'Onlay Ni-Cr', 'Kim loại', 'Onlay', NULL, 'Ni- Cr', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  200,000 '),
  ('CỐ ĐỊNH', 1042, 'CĐKLONTITA', 'Onlay Titan', 'Kim loại', 'Onlay', NULL, 'Titan', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1043, 'CĐKLONCRCO', 'Onlay Cr-Co', 'Kim loại', 'Onlay', NULL, 'Cr- Co', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1044, 'CĐKLINNICR', 'Inlay Ni-Cr', 'Kim loại', 'Inlay', NULL, 'Ni- Cr', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  200,000 '),
  ('CỐ ĐỊNH', 1045, 'CĐKLINTITA', 'Inlay Titan', 'Kim loại', 'Inlay', NULL, 'Titan', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1046, 'CĐKLINCRCO', 'Inlay Cr-Co', 'Kim loại', 'Inlay', NULL, 'Cr- Co', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  300,000 '),
  ('CỐ ĐỊNH', 1047, 'CĐKLCGNICR', 'Cùi Giả Ni-Cr', 'Kim loại', 'Cùi giả', NULL, 'Ni- Cr', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  150,000 '),
  ('CỐ ĐỊNH', 1048, 'CĐKLCGTITA', 'Cùi Giả Titan', 'Kim loại', 'Cùi giả', NULL, 'Titan', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  200,000 '),
  ('CỐ ĐỊNH', 1049, 'CĐKLCGCRCO', 'Cùi Giả Cr-Co', 'Kim loại', 'Cùi giả', NULL, 'Cr- Co', NULL, NULL, 'Đai mẫu- Sáp- Sườn- Admin', '  200,000 '),
  ('CỐ ĐỊNH', 1050, 'CĐKLCGBINI', 'Cùi Giả Đầu Bi Ni-Cr Rhein83', 'Kim loại', 'Cùi giả', NULL, 'Rhein 83', NULL, NULL, 'Đai mẫu- Sáp- Tháo lắp- Sáp- Sườn- Admin', '  1,200,000 '),
  ('CỐ ĐỊNH', 1051, 'CĐKLCGBITI', 'Cùi Giả Đầu Bi Titan Rhein83', 'Kim loại', 'Cùi giả', NULL, 'Rhein 83', NULL, NULL, 'Đai mẫu- Sáp- Tháo lắp- Sáp- Sườn- Admin', '  1,400,000 '),
  ('CỐ ĐỊNH', 1052, 'CĐKLCGBICR', 'Cùi Giả Đầu Bi Cr-Co Rhein83', 'Kim loại', 'Cùi giả', NULL, 'Rhein 83', NULL, NULL, 'Đai mẫu- Sáp- Tháo lắp- Sáp- Sườn- Admin', '  1,400,000 '),
  ('CỐ ĐỊNH', 1053, 'CĐKLMCĐONN', 'Mắc Cài Bi Ni-Cr Rhein83', 'Kim loại', 'Mắc cài', NULL, 'Rhein 83', NULL, NULL, 'Cố định', '  1,200,000 '),
  ('CỐ ĐỊNH', 1054, 'CĐKLMCĐONT', 'Mắc Cài Bi Titan Rhein83', 'Kim loại', 'Mắc cài', NULL, 'Rhein 83', NULL, NULL, 'Cố định', '  1,400,000 '),
  ('CỐ ĐỊNH', 1055, 'CĐKLMCĐONC', 'Mắc Cài Bi Cr-Co Rhein83', 'Kim loại', 'Mắc cài', NULL, 'Rhein 83', NULL, NULL, 'Cố định', '  1,400,000 '),
  ('CỐ ĐỊNH', 1056, 'CĐKLMCĐOIN', 'Mắc Cài Bi 2 Tầng Ni-Cr Rhein83', 'Kim loại', 'Mắc cài', NULL, 'Rhein 83', NULL, NULL, 'Cố định', '  1,800,000 '),
  ('CỐ ĐỊNH', 1057, 'CĐKLMCĐOIT', 'Mắc Cài Bi 2 Tầng Titan Rhein83', 'Kim loại', 'Mắc cài', NULL, 'Rhein 83', NULL, NULL, 'Cố định', '  2,000,000 '),
  ('CỐ ĐỊNH', 1058, 'CĐKLMCĐOIC', 'Mắc Cài Bi 2 Tầng Cr-Co Rhein83', 'Kim loại', 'Mắc cài', NULL, 'Rhein 83', NULL, NULL, 'Cố định', '  2,000,000 ');

INSERT INTO tmp_v95_catalog_raw (
  sheet_key,
  sheet_order,
  code,
  name,
  lv2,
  lv3,
  raw_material_name,
  brand_name,
  technique_name,
  restoration_type_name,
  process_path,
  retail_price_raw
)
VALUES
  ('THÁO LẮP', 2001, 'TLHKTITAN', 'Hàm khung Titan', 'Hàm khung ', NULL, 'Kim Loại Ti', NULL, NULL, NULL, 'Tháo lắp', '  900,000 '),
  ('THÁO LẮP', 2002, 'TLHKCRCO', 'Hàm khung Cr-Co', 'Hàm khung', NULL, 'Kim Loại Cr-Co', NULL, NULL, NULL, 'Tháo lắp', '  900,000 '),
  ('THÁO LẮP', 2003, 'TLHKLKTI', 'Hàm khung liên kết Titan', 'Hàm khung liên kết', NULL, 'Kim Loại Ti ', NULL, NULL, NULL, 'Tháo lắp', '  1,100,000 '),
  ('THÁO LẮP', 2004, 'TLHKLKCR', 'Hàm khung liên kết Cr-Co', 'Hàm khung liên kết', NULL, 'Kim Loại Cr- Co', NULL, NULL, NULL, 'Tháo lắp', '  1,100,000 '),
  ('THÁO LẮP', 2005, 'TLHKLKCR', 'Hàm khung nướng sứ trên khung', 'Hàm khung', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  1,200,000 '),
  ('THÁO LẮP', 2006, 'TLHKNSU', 'Hàm khung liên kết nướng sứ trên khung', 'Hàm khung liên kết', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  1,200,000 '),
  ('THÁO LẮP', 2007, 'TLHKLKNSU', 'Hàm khung nướng sứ trên khung Răng Nhật', 'Hàm khung', NULL, NULL, 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  2,000,000 '),
  ('THÁO LẮP', 2008, 'TLHKNSUNH', 'Hàm khung nướng sứ trên khung Răng Mỹ', 'Hàm khung', NULL, NULL, 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  2,500,000 '),
  ('THÁO LẮP', 2009, 'TLHKNSUMY', 'Hàm khung nướng sứ trên khung Răng Composite', 'Hàm khung', NULL, NULL, 'Răng Composite', NULL, NULL, 'Tháo lắp', '  2,900,000 '),
  ('THÁO LẮP', 2010, 'TLHKNSUCO', 'Hàm khung nướng sứ trên khung Răng Enigmalife', 'Hàm khung', NULL, NULL, 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  2,900,000 '),
  ('THÁO LẮP', 2011, 'TLHKNSUEN', 'Hàm khung liên kết nướng sứ trên khung Răng Nhật', 'Hàm khung liên kết', NULL, NULL, 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  2,000,000 '),
  ('THÁO LẮP', 2012, 'TLHKLKNSUN', 'Hàm khung liên kết nướng sứ trên khung Răng Mỹ', 'Hàm khung liên kết', NULL, NULL, 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  2,500,000 '),
  ('THÁO LẮP', 2013, 'TLHKLKNSUM', 'Hàm khung liên kết nướng sứ trên khung Răng Composite', 'Hàm khung liên kết', NULL, NULL, 'Răng Composite', NULL, NULL, 'Tháo lắp', '  2,700,000 '),
  ('THÁO LẮP', 2014, 'TLHKLKNSUC', 'Hàm khung liên kết nướng sứ trên khung Răng Enigmalife', 'Hàm khung liên kết', NULL, NULL, 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  2,700,000 '),
  ('THÁO LẮP', 2015, 'TLHKLKNSUE', 'Hàm khung Titan Răng Nhật', 'Hàm khung', NULL, 'Kim Loại Ti', 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  1,700,000 '),
  ('THÁO LẮP', 2016, 'TLHKTIRAMY', 'Hàm khung Titan Răng Mỹ', 'Hàm khung', NULL, 'Kim Loại Ti', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  2,200,000 '),
  ('THÁO LẮP', 2017, 'TLHKTICOMP', 'Hàm khung Titan Răng Composite', 'Hàm khung', NULL, 'Kim Loại Ti', 'Răng Composite', NULL, NULL, 'Tháo lắp', '  2,400,000 '),
  ('THÁO LẮP', 2018, 'TLHKTIENIG', 'Hàm khung Titan Răng Enigmalife', 'Hàm khung', NULL, 'Kim Loại Ti', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  2,400,000 '),
  ('THÁO LẮP', 2019, 'TLHKCRNHAT', 'Hàm khung Cr-Co Răng Nhật', 'Hàm khung', NULL, 'Kim Loại Cr- Co', 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  1,500,000 '),
  ('THÁO LẮP', 2020, 'TLHKCRRAMY', 'Hàm khung Cr-Co Răng Mỹ', 'Hàm khung', NULL, 'Kim Loại Cr- Co', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  1,900,000 '),
  ('THÁO LẮP', 2021, 'TLHKCRCOMP', 'Hàm khung Cr-Co Răng Composite', 'Hàm khung', NULL, 'Kim Loại Cr- Co', 'Răng Composite', NULL, NULL, 'Tháo lắp', '  2,100,000 '),
  ('THÁO LẮP', 2022, 'TLHKCRENIG', 'Hàm khung Cr-Co Răng Enigmalife', 'Hàm khung', NULL, 'Kim Loại Cr- Co', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  2,100,000 '),
  ('THÁO LẮP', 2023, 'TLHKLKTIRN', 'Hàm khung liên kết Titan Răng Nhật', 'Hàm khung liên kết', NULL, 'Kim Loại Ti', 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  1,900,000 '),
  ('THÁO LẮP', 2024, 'TLHKLKTIRM', 'Hàm khung liên kết Titan Răng Mỹ', 'Hàm khung liên kết', NULL, 'Kim Loại Ti', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  2,400,000 '),
  ('THÁO LẮP', 2025, 'TLHKLKTIRC', 'Hàm khung liên kết Titan Răng Composite', 'Hàm khung liên kết', NULL, 'Kim Loại Ti', 'Răng Composite', NULL, NULL, 'Tháo lắp', '  2,600,000 '),
  ('THÁO LẮP', 2026, 'TLHKLKTIRE', 'Hàm khung liên kết Titan Răng Enigmalife', 'Hàm khung liên kết', NULL, 'Kim Loại Ti', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  2,600,000 '),
  ('THÁO LẮP', 2027, 'TLHKLKCRRN', 'Hàm khung liên kết Cr-Co Răng Nhật', 'Hàm khung liên kết', NULL, 'Kim Loại Cr- Co', 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  1,600,000 '),
  ('THÁO LẮP', 2028, 'TLHKLKCRRM', 'Hàm khung liên kết Cr-Co Răng Mỹ', 'Hàm khung liên kết', NULL, 'Kim Loại Cr- Co', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  2,100,000 '),
  ('THÁO LẮP', 2029, 'TLHKLKCRRC', 'Hàm khung liên kết Cr-Co Răng Composite', 'Hàm khung liên kết', NULL, 'Kim Loại Cr- Co', 'Răng Composite', NULL, NULL, 'Tháo lắp', '  2,300,000 '),
  ('THÁO LẮP', 2030, 'TLHKLKCRRE', 'Hàm khung liên kết Cr-Co Răng Enigmalife', 'Hàm khung liên kết', NULL, 'Kim Loại Cr- Co', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  2,300,000 '),
  ('THÁO LẮP', 2031, 'TLBHCLNHAT', 'Bán hàm tháo lắp nhựa cường lực Răng Nhật', 'Bán hàm', NULL, 'Cường lực', 'Răng Nhật', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2032, 'TLBHCLRAMY', 'Bán hàm tháo lắp nhựa cường lực Răng Mỹ', 'Bán hàm', NULL, 'Cường lực', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2033, 'TLBHCLCOMP', 'Bán hàm tháo lắp nhựa cường lực Răng Composite', 'Bán hàm', NULL, 'Cường lực', 'Răng Composite', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2034, 'TLBHCLENIG', 'Bán hàm tháo lắp nhựa cường lực Răng Enigmalife', 'Bán hàm', NULL, 'Cường lực', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2035, 'TLBHNTNHAT', 'Bán hàm tháo lắp nhựa thường Răng Nhật', 'Bán hàm', NULL, 'Nhựa thường', 'Răng Nhật', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2036, 'TLBHNTRAMY', 'Bán hàm tháo lắp nhựa thường Răng Mỹ', 'Bán hàm', NULL, 'Nhựa thường', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2037, 'TLBHNTCOMP', 'Bán hàm tháo lắp nhựa thường Răng Composite', 'Bán hàm', NULL, 'Nhựa thường', 'Răng Composite', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2038, 'TLBHNTENIG', 'Bán hàm tháo lắp nhựa thường Răng Enigmalife', 'Bán hàm', NULL, 'Nhựa thường', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2039, 'TLTHCLNHAT', 'Hàm tháo lắp nhựa cường lực Răng Nhật', 'Toàn hàm', NULL, 'Cường lực', 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  2,800,000 '),
  ('THÁO LẮP', 2040, 'TLTHCLRAMY', 'Hàm tháo lắp nhựa cường lực Răng Mỹ', 'Toàn hàm', NULL, 'Cường lực', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  3,300,000 '),
  ('THÁO LẮP', 2041, 'TLTHCLCOMP', 'Hàm tháo lắp nhựa cường lực Răng Composite', 'Toàn hàm', NULL, 'Cường lực', 'Răng Composite', NULL, NULL, 'Tháo lắp', '  3,500,000 '),
  ('THÁO LẮP', 2042, 'TLTHCLENIG', 'Hàm tháo lắp nhựa cường lực Răng Enigmalife', 'Toàn hàm', NULL, 'Cường lực', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  3,500,000 '),
  ('THÁO LẮP', 2043, 'TLTHNTNHAT', 'Hàm tháo lắp nhựa thường Răng Nhật', 'Toàn hàm', NULL, 'Nhựa thường', 'Răng Nhật', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2044, 'TLTHNTRAMY', 'Hàm tháo lắp nhựa thường Răng Mỹ', 'Toàn hàm', NULL, 'Nhựa thường', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2045, 'TLTHNTCOMP', 'Hàm tháo lắp nhựa thường Răng Composite', 'Toàn hàm', NULL, 'Nhựa thường', 'Răng Composite', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2046, 'TLTHNTENIG', 'Hàm tháo lắp nhựa thường Răng Enigmalife', 'Toàn hàm', NULL, 'Nhựa thường', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2047, 'TLDEBHNHAT', 'Bán hàm tháo lắp nhựa dẻo Răng Nhật', 'Bán hàm', NULL, 'Nhựa dẻo', 'Răng Nhật', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2048, 'TLDEBHRAMY', 'Bán hàm tháo lắp nhựa dẻo Răng Mỹ', 'Bán hàm', NULL, 'Nhựa dẻo', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2049, 'TLDEBHCOMP', 'Bán hàm tháo lắp nhựa dẻo Răng Composite', 'Bán hàm', NULL, 'Nhựa dẻo', 'Răng Composite', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2050, 'TLDEBHENIG', 'Bán hàm tháo lắp nhựa dẻo Răng Enigmalife', 'Bán hàm', NULL, 'Nhựa dẻo', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', NULL),
  ('THÁO LẮP', 2051, 'TLDETHNHAT', 'Hàm tháo lắp nhựa dẻo Răng Nhật', 'Toàn hàm', NULL, 'Nhựa dẻo', 'Răng Nhật', NULL, NULL, 'Tháo lắp', '  1,600,000 '),
  ('THÁO LẮP', 2052, 'TLDETHRAMY', 'Hàm tháo lắp nhựa dẻo Răng Mỹ', 'Toàn hàm', NULL, 'Nhựa dẻo', 'Răng Mỹ', NULL, NULL, 'Tháo lắp', '  2,000,000 '),
  ('THÁO LẮP', 2053, 'TLDETHCOMP', 'Hàm tháo lắp nhựa dẻo Răng Composite', 'Toàn hàm', NULL, 'Nhựa dẻo', 'Răng Composite', NULL, NULL, 'Tháo lắp', '  2,200,000 '),
  ('THÁO LẮP', 2054, 'TLDETHENIG', 'Hàm tháo lắp nhựa dẻo Răng Enigmalife', 'Toàn hàm', NULL, 'Nhựa dẻo', 'Răng Enigmalife', NULL, NULL, 'Tháo lắp', '  2,200,000 '),
  ('THÁO LẮP', 2055, 'TLBHAMDEO', 'Bán hàm nhựa dẻo', 'Phụ kiện tháo lắp', NULL, 'Nhựa dẻo', NULL, NULL, NULL, 'Tháo lắp', '  400,000 '),
  ('THÁO LẮP', 2056, 'TLNHAMDEO', 'Nền hàm nhựa dẻo', 'Phụ kiện tháo lắp', NULL, 'Nhựa dẻo', NULL, NULL, NULL, 'Tháo lắp', '  700,000 '),
  ('THÁO LẮP', 2057, 'TLNHAMCL', 'Nền hàm nhựa cường lực ', 'Phụ kiện tháo lắp', NULL, 'Cường lực', NULL, NULL, NULL, 'Tháo lắp', '  2,000,000 '),
  ('THÁO LẮP', 2058, 'TLRANGNHAT', 'Răng Nhật (Từ 1-2R)', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  90,000 '),
  ('THÁO LẮP', 2059, 'TLRNHATLE', 'Răng Nhật (Từ 3R trở lên)', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  80,000 '),
  ('THÁO LẮP', 2060, 'TLRANGMY', 'Răng Mỹ (Từ 1-2R)', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  150,000 '),
  ('THÁO LẮP', 2061, 'TLRMYLE', 'Răng Mỹ (Từ 3R trở lên)', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  130,000 '),
  ('THÁO LẮP', 2062, 'TLRANGCOMP', 'Răng Composite (Từ 1-2R)', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  170,000 '),
  ('THÁO LẮP', 2063, 'TLRCOMLE', 'Răng Composite (Từ 3R trở lên)', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  150,000 '),
  ('THÁO LẮP', 2064, 'TLRANGENI', 'Răng Enigmalife ', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  150,000 '),
  ('THÁO LẮP', 2065, 'TLĐEMHAM', 'Đệm hàm', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  300,000 '),
  ('THÁO LẮP', 2066, 'TLVAHAM', 'Vá hàm', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  300,000 '),
  ('THÁO LẮP', 2067, 'TLLƯƠIVINA', 'Lót lưới Việt Nam', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  100,000 '),
  ('THÁO LẮP', 2068, 'TLLƯƠINGOA', 'Lót lưới Ngoại', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  250,000 '),
  ('THÁO LẮP', 2069, 'TLMOCDEO', 'Móc Dẻo', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  150,000 '),
  ('THÁO LẮP', 2070, 'TLMOCĐUC', 'Móc Đúc', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  150,000 '),
  ('THÁO LẮP', 2071, 'TLMOCDAY', 'Móc Dây', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  50,000 '),
  ('THÁO LẮP', 2072, 'TLMANGNHAI', 'Máng Nhai', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  400,000 '),
  ('THÁO LẮP', 2073, 'TLMTAYMEM', 'Máng tẩy mềm', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  100,000 '),
  ('THÁO LẮP', 2074, 'TLMTAYCUNG', 'Máng tẩy cứng', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  100,000 '),
  ('THÁO LẮP', 2075, 'TLMADUYTRI', 'Máng duy trì', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  380,000 '),
  ('THÁO LẮP', 2076, 'TLGOISAP', 'Nền tạm gối sáp', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  40,000 '),
  ('THÁO LẮP', 2077, 'TLKCANHAN', 'Khay lấy dấu cá nhân', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  40,000 '),
  ('THÁO LẮP', 2078, 'TLRANGCOMPOSITE', 'Vỉ răng Composite', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  180,000 '),
  ('THÁO LẮP', 2079, 'TLRANGSU', 'Vỉ răng Sứ', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  1,100,000 '),
  ('THÁO LẮP', 2080, 'TLRANGENIG', 'Vỉ Răng Enigmalife', 'Phụ kiện tháo lắp', NULL, NULL, NULL, NULL, NULL, 'Tháo lắp', '  750,000 ');

INSERT INTO tmp_v95_catalog_raw (
  sheet_key,
  sheet_order,
  code,
  name,
  lv2,
  lv3,
  raw_material_name,
  brand_name,
  technique_name,
  restoration_type_name,
  process_path,
  retail_price_raw
)
VALUES
  ('IMPLANT', 3001, 'IMCEKLNICR', 'Sứ Ni-Cr trên Implant', 'Sứ trên implant', NULL, 'Kim loại', 'Ni- Cr', 'Đúc', 'Cement', 'Implant- Sáp- Sườn- Sứ- Admin', '  700,000 '),
  ('IMPLANT', 3002, 'IMCEKLTITA', 'Sứ Titan trên Implant', 'Sứ trên implant', NULL, 'Kim loại', 'Ti', 'Đúc', 'Cement', 'Implant- Sáp- Sườn- Sứ- Admin', '  800,000 '),
  ('IMPLANT', 3003, 'IMCEKLCRCO', 'Sứ Cr-Co trên Implant', 'Sứ trên implant', NULL, 'Kim loại', 'Cr- Co', 'Đúc/ In/ Cad Cam', 'Cement', 'Implant- Sáp- Sườn- Sứ- Admin', '  800,000 '),
  ('IMPLANT', 3004, 'IMCEZIKERO', 'Sứ Zirconia trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Kerox', 'Cad Cam', 'Cement', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,200,000 '),
  ('IMPLANT', 3005, 'IMCEZILAVA', 'Sứ Lava Zirconia trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Lava', 'Cad Cam', 'Cement', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,600,000 '),
  ('IMPLANT', 3006, 'IMCEZICERC', 'Sứ Cercon trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Cercon', 'Cad Cam', 'Cement', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,400,000 '),
  ('IMPLANT', 3007, 'IMCEZIVITA', 'Sứ Zirconia Vita trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Vita', 'Cad Cam', 'Cement', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,400,000 '),
  ('IMPLANT', 3008, 'IMCSKLNICR', 'Sứ Ni-Cr Cement bắt vít trên Implant', 'Sứ trên implant', NULL, 'Kim loại', 'Ni- Cr', 'Đúc', 'Cement bắt vít', 'Implant- Sáp- Sườn- Sứ- Admin', '  800,000 '),
  ('IMPLANT', 3009, 'IMCSKLTITA', 'Sứ Titan Cement bắt vít trên Implant', 'Sứ trên implant', NULL, 'Kim loại', 'Ti', 'Đúc', 'Cement bắt vít', 'Implant- Sáp- Sườn- Sứ- Admin', '  900,000 '),
  ('IMPLANT', 3010, 'IMCSKLCRCO', 'Sứ Cr-Co Cement bắt vít trên Implant', 'Sứ trên implant', NULL, 'Kim loại', 'Cr- Co', 'Đúc/ In/ Cad Cam', 'Cement bắt vít', 'Implant- Sáp- Sườn- Sứ- Admin', '  900,000 '),
  ('IMPLANT', 3011, 'IMCSZIKERO', 'Sứ Zirconia Kerox Cement bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Kerox', 'Cad Cam', 'Cement bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,200,000 '),
  ('IMPLANT', 3012, 'IMCSZILAVA', 'Sứ Zirconia Lava Cement bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Lava', 'Cad Cam', 'Cement bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,600,000 '),
  ('IMPLANT', 3013, 'IMCSZICERC', 'Sứ Zirconia Cercon Cement bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Cercon', 'Cad Cam', 'Cement bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,400,000 '),
  ('IMPLANT', 3014, 'IMCSZIVITA', 'Sứ Zirconia Vita Cement bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Vita', 'Cad Cam', 'Cement bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,400,000 '),
  ('IMPLANT', 3015, 'IMSCKLNANO', 'Titan Cad/Cam Phục hình bắt vít sứ Nano', 'Sứ trên implant', NULL, 'Kim loại', 'Sứ Nano', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  2,300,000 '),
  ('IMPLANT', 3016, 'IMSCZIKERO', 'Sứ Zirconia Kerox Phục hình bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Kerox', NULL, 'Bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,200,000 '),
  ('IMPLANT', 3017, 'IMSCZILAVA', 'Sứ Zirconia Lava Phục hình bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Lava', NULL, 'Bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,600,000 '),
  ('IMPLANT', 3018, 'IMSCZICERC', 'Sứ Zirconia Cercon Phục hình bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Cercon', NULL, 'Bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,400,000 '),
  ('IMPLANT', 3019, 'IMSCZIVITA', 'Sứ Zirconia Vita Phục hình bắt vít trên Implant', 'Sứ trên implant', NULL, 'Không kim loại', 'Vita', NULL, 'Bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  1,400,000 '),
  ('IMPLANT', 3020, 'IMLAITAMCL', 'Hàm lai tạm nhựa cường lực', 'Hàm lai', NULL, 'Cường lực', NULL, 'Đúc ', 'Bắt vít', 'Implant- Tháo lắp implant- Implant- Admin', '  7,000,000 '),
  ('IMPLANT', 3021, 'IMLAITAMNT', 'Hàm lai tạm nhựa cường thường', 'Hàm lai', NULL, 'Nhựa thường', NULL, 'Đúc', 'Bắt vít', 'Implant- Tháo lắp implant- Implant- Admin', '  5,000,000 '),
  ('IMPLANT', 3022, 'IMLAITAMPA', 'Hàm lai tạm PMMA', 'Hàm lai', NULL, 'PMMA', NULL, 'Đúc', 'Bắt vít', 'Implant- Cadcam- Sứ- Implant- Admin', '  3,000,000 '),
  ('IMPLANT', 3023, 'IMLAIINKSU', 'Hàm lai sứ in 3D không mill kết nối', 'Hàm lai', NULL, 'Khung sườn', 'Cr- Co', 'In 3D, không mill kết nối', 'Bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  8,000,000 '),
  ('IMPLANT', 3024, 'IMLAIINCSU', 'Hàm lai sứ in 3D có mill kết nối', 'Hàm lai', NULL, 'Khung sườn', 'Cr- Co', 'In 3D, mill kết nối', 'Bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', '  12,000,000 '),
  ('IMPLANT', 3025, 'IMLAIINCL', 'Hàm lai nhựa cường lực, răng mỹ + Khung Titan in 3D ', 'Hàm lai', NULL, 'Cường lực, khung Titan', 'Răng Mỹ', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Tháo lắp implant- Implant- Admin', '  10,000,000 '),
  ('IMPLANT', 3026, 'IMLAIINNT', 'Hàm lai nhựa thường, răng mỹ + Khung Titan in 3D ', 'Hàm lai', NULL, 'Nhựa thường, khung Titan', 'Răng Mỹ', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Tháo lắp implant- Implant- Admin', '  7,000,000 '),
  ('IMPLANT', 3027, 'IMKCINNICR', 'Hàm lai in 3D Khung cùi Titan + Mão sứ Ni-Cr', 'Hàm lai', NULL, 'Khung cùi Titan', 'Sứ Ni- Cr', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  15,000,000 '),
  ('IMPLANT', 3028, 'IMKCINCRCO', 'Hàm lai in 3D Khung cùi Titan + Mão sứ Cr-Co', 'Hàm lai', NULL, 'Khung cùi Titan', 'Sứ Cr- Co', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  17,000,000 '),
  ('IMPLANT', 3029, 'IMKCINTITA', 'Hàm lai in 3D Khung cùi Titan + Mão sứ Titan', 'Hàm lai', NULL, 'Khung cùi Titan', 'Sứ Titan', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  17,000,000 '),
  ('IMPLANT', 3030, 'IMKCINZIKE', 'Hàm lai in 3D Khung cùi Titan + Mão sứ Zirconia Kerox', 'Hàm lai', NULL, 'Khung cùi Titan', 'Kerox', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  22,000,000 '),
  ('IMPLANT', 3031, 'IMKCINZILA', 'Hàm lai in 3D Khung cùi Titan + Mão sứ Zirconia Lava', 'Hàm lai', NULL, 'Khung cùi Titan', 'Lava', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  27,000,000 '),
  ('IMPLANT', 3032, 'IMKCINZICE', 'Hàm lai in 3D Khung cùi Titan + Mão sứ Zirconia Cercon', 'Hàm lai', NULL, 'Khung cùi Titan', 'Cercon', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  24,500,000 '),
  ('IMPLANT', 3033, 'IMKCINZIVI', 'Hàm lai in 3D Khung cùi Titan + Mão sứ Zirconia Vita', 'Hàm lai', NULL, 'Khung cùi Titan', 'Vita', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  24,500,000 '),
  ('IMPLANT', 3034, 'IMKCCAKERO', 'Hàm lai Cad/Cam Khung cùi Titan + Mão sứ Zirconia Kerox', 'Hàm lai', NULL, 'Khung cùi Titan', 'Kerox', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  35,000,000 '),
  ('IMPLANT', 3035, 'IMKCCALAVA', 'Hàm lai Cad/Cam Khung cùi Titan + Mão sứ Zirconia Lava', 'Hàm lai', NULL, 'Khung cùi Titan', 'Lava', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  40,000,000 '),
  ('IMPLANT', 3036, 'IMKCCACERC', 'Hàm lai Cad/Cam Khung cùi Titan + Mão sứ Zirconia Cercon', 'Hàm lai', NULL, 'Khung cùi Titan', 'Cercon', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  37,500,000 '),
  ('IMPLANT', 3037, 'IMKCCAVITA', 'Hàm lai Cad/Cam Khung cùi Titan + Mão sứ Zirconia Vita', 'Hàm lai', NULL, 'Khung cùi Titan', 'Vita', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  37,500,000 '),
  ('IMPLANT', 3038, 'IMOTINMY', 'Hàm lai in 3D OT Bridge + Hàm nhựa cường lực Răng Mỹ', 'Hàm OT Bridge', NULL, 'Cường lực', 'Răng Mỹ', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  7,000,000 '),
  ('IMPLANT', 3039, 'IMOTINCO', 'Hàm lai in 3D OT Bridge + Hàm nhựa cường lực Răng Composite', 'Hàm OT Bridge', NULL, 'Cường lực', 'Răng Composite', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  8,500,000 '),
  ('IMPLANT', 3040, 'IMOTINKCNI', 'Hàm lai in 3D OT Bridge Khung cùi Titan + Mão sứ Ni-Cr', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Sứ Ni- Cr', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  15,000,000 '),
  ('IMPLANT', 3041, 'IMOTINKCCR', 'Hàm lai in 3D OT Bridge Khung cùi Titan + Mão sứ Cr-Co', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Sứ Cr- Co', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  17,000,000 '),
  ('IMPLANT', 3042, 'IMOTINKCTI', 'Hàm lai in 3D OT Bridge Khung cùi Titan + Mão sứ Titan', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Sứ Titan', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  17,000,000 '),
  ('IMPLANT', 3043, 'IMOTINKCZK', 'Hàm lai in 3D OT Bridge Khung cùi Titan + Mão sứ Zirconia Kerox', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Kerox', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  22,000,000 '),
  ('IMPLANT', 3044, 'IMOTINKCZL', 'Hàm lai in 3D OT Bridge Khung cùi Titan + Mão sứ Zirconia Lava', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Lava', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  24,500,000 '),
  ('IMPLANT', 3045, 'IMOTINKCZC', 'Hàm lai in 3D OT Bridge Khung cùi Titan + Mão sứ Zirconia Cercon', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Cercon', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  24,500,000 '),
  ('IMPLANT', 3046, 'IMOTINKCZV', 'Hàm lai in 3D OT Bridge Khung cùi Titan + Mão sứ Zirconia Vita', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Vita', 'In 3D', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  24,500,000 '),
  ('IMPLANT', 3047, 'IMOTCAMY', 'Hàm lai Cad/Cam OT Bridge + Hàm nhựa cường lực Răng Mỹ', 'Hàm OT Bridge', NULL, 'Cường lực', 'Răng Mỹ', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  18,000,000 '),
  ('IMPLANT', 3048, 'IMOTCACO', 'Hàm lai Cad/Cam OT Bridge + Hàm nhựa cường lực Răng Composite', 'Hàm OT Bridge', NULL, 'Cường lực', 'Răng Composite', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  19,500,000 '),
  ('IMPLANT', 3049, 'IMOTCAKCNI', 'Hàm lai Cad/Cam OT Bridge Khung cùi Titan + Mão sứ Ni-Cr', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Sứ Ni- Cr', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  28,000,000 '),
  ('IMPLANT', 3050, 'IMOTCAKCCR', 'Hàm lai Cad/Cam OT Bridge Khung cùi Titan + Mão sứ Cr-Co', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Sứ Cr- Co', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  30,000,000 '),
  ('IMPLANT', 3051, 'IMOTCAKCTI', 'Hàm lai Cad/Cam OT Bridge Khung cùi Titan + Mão sứ Titan', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Sứ Titan', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Sáp/Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  30,000,000 '),
  ('IMPLANT', 3052, 'IMOTCAKCZK', 'Hàm lai Cad/Cam OT Bridge Khung cùi Titan + Mão sứ Zirconia Kerox', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Kerox', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  35,000,000 '),
  ('IMPLANT', 3053, 'IMOTCAKCZL', 'Hàm lai Cad/Cam OT Bridge Khung cùi Titan + Mão sứ Zirconia Lava', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Lava', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  40,000,000 '),
  ('IMPLANT', 3054, 'IMOTCAKCZC', 'Hàm lai Cad/Cam OT Bridge Khung cùi Titan + Mão sứ Zirconia Cercon', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Cercon', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  37,500,000 '),
  ('IMPLANT', 3055, 'IMOTCAKCZV', 'Hàm lai Cad/Cam OT Bridge Khung cùi Titan + Mão sứ Zirconia Vita', 'Hàm OT Bridge', NULL, 'Khung cùi Titan', 'Vita', 'Cad Cam', 'Bắt vít', 'Implant- Cadcam- Implant- Cadcam- Sườn- Sứ- Implant- Tháo lắp implant- Implant- Admin', '  37,500,000 '),
  ('IMPLANT', 3056, 'IMIBAR', 'Hàm I Bar', 'Hàm lai', NULL, 'Bar Kim loại', 'Kerox', 'Cad Cam', 'Cement bắt vít', 'Implant- Cadcam- Sườn- Sứ- Implant- Admin', NULL),
  ('IMPLANT', 3057, 'IMBAINDO2M', 'Hàm Bar Dolder/Hader in 3D trên 2MU có mill lỗ + hàm nhựa răng Mỹ', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Mỹ, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  11,000,000 '),
  ('IMPLANT', 3058, 'IMBAINDO2C', 'Hàm Bar Dolder/Hader in 3D trên 2MU có mill lỗ + hàm nhựa răng Composite', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Composite, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  12,500,000 '),
  ('IMPLANT', 3059, 'IMBAINDO4M', 'Hàm Bar Dolder/Hader in 3D trên 4MU có mill lỗ + hàm nhựa răng Mỹ', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Mỹ, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  14,000,000 '),
  ('IMPLANT', 3060, 'IMBAINDO4C', 'Hàm Bar Dolder/Hader in 3D trên 4MU có mill lỗ + hàm nhựa răng Composite', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Composite, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  15,500,000 '),
  ('IMPLANT', 3061, 'IMBACADO2M', 'Hàm Bar Dolder/Hader Cad/Cam Thụy Sỹ trên 2MU có mill lỗ + hàm nhựa răng Mỹ', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Mỹ, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  15,000,000 '),
  ('IMPLANT', 3062, 'IMBACADO2C', 'Hàm Bar Dolder/Hader Cad/Cam Thụy Sỹ trên 2MU có mill lỗ + hàm nhựa răng Composite', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Composite, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  16,500,000 '),
  ('IMPLANT', 3063, 'IMBACADO4M', 'Hàm Bar Dolder/Hader Cad/Cam Thụy Sỹ trên 4MU có mill lỗ + hàm nhựa răng Mỹ', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Mỹ, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  20,000,000 '),
  ('IMPLANT', 3064, 'IMBACADO4C', 'Hàm Bar Dolder/Hader Cad/Cam Thụy Sỹ trên 4MU có mill lỗ + hàm nhựa răng Composite', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Composite, bar Thụy sỹ', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  21,500,000 '),
  ('IMPLANT', 3065, 'IMBACADBIVM', 'Hàm Bar Cad/Cam 4 bi vàng Rhein83-Italy trên 4 Implant + Hàm nhựa răng Mỹ', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Mỹ, mắc cài Rhein 83', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  35,000,000 '),
  ('IMPLANT', 3066, 'IMBACADBIVC', 'Hàm Bar Cad/Cam 4 bi vàng Rhein83-Italy trên 4 Implant + Hàm nhựa răng Composite', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Composite, mắc cài Rhein 83', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  36,500,000 '),
  ('IMPLANT', 3067, 'IMBACADBITM', 'Hàm Bar 4 bi Titan Cad/Cam trên Rhein83-Italy (4 Implant/bar) + Hàm nhựa răng Mỹ', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Mỹ, mắc cài Rhein 83', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  27,000,000 '),
  ('IMPLANT', 3068, 'IMBACADBITC', 'Hàm Bar 4 bi Titan Cad/Cam trên Rhein83-Italy (4 Implant/bar) + Hàm nhựa răng Composite', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Composite, mắc cài Rhein 83', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  28,500,000 '),
  ('IMPLANT', 3069, 'IMBACASEMY', 'Hàm Bar thụ động Seeger Cad/Cam 4 bi vàng Rhein83-Italy/bar + Hàm nhựa răng Mỹ', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Mỹ, mắc cài Rhein 83', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  35,000,000 '),
  ('IMPLANT', 3070, 'IMBACASECO', 'Hàm Bar thụ động Seeger Cad/Cam 4 bi vàng Rhein83-Italy/bar + Hàm nhựa răng Composite', 'Hàm Bar', NULL, 'Bar Kim loại', 'Răng Composite, mắc cài Rhein 83', 'Cad Cam', 'Hàm phủ', 'Implant- Cadcam- Implant- Tháo lắp implant- Implant- Admin', '  36,500,000 '),
  ('IMPLANT', 3071, 'IMCUTIHQ', 'Customized Abutment Titan Hàn Quốc', 'Sản phẩm khác', NULL, 'Trụ abutment', 'Titan, Hàn Quốc', NULL, NULL, 'Implant', '  900,000 '),
  ('IMPLANT', 3072, 'IMCUTICA', 'Customized Abutment Titan Châu Âu', 'Sản phẩm khác', NULL, 'Trụ abutment', 'Titan, Châu Âu', NULL, NULL, 'Implant', '  1,100,000 '),
  ('IMPLANT', 3073, 'IMCUZITILA', 'Customized Abutment Zirconia (bao gồm Tibase)', 'Sản phẩm khác', NULL, 'Zirconia', NULL, NULL, NULL, 'Implant', '  1,500,000 '),
  ('IMPLANT', 3074, 'IMCUZITIBS', 'Customized Abutment Zirconia (Tibase hãng)', 'Sản phẩm khác', NULL, 'Zirconia', NULL, NULL, NULL, 'Implant', '  800,000 '),
  ('IMPLANT', 3075, 'IMCUCPCAT', 'Chi phí cắt Customized Abutment ', 'Sản phẩm khác', NULL, 'Trụ abutment', NULL, NULL, NULL, 'Implant', '  600,000 ');

CREATE OR REPLACE FUNCTION pg_temp.norm_ws(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(trim(COALESCE(value, '')), '\s+', ' ', 'g'), '')
$$;

CREATE OR REPLACE FUNCTION pg_temp.norm_dash_text(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN pg_temp.norm_ws(value) IS NULL THEN NULL
    ELSE NULLIF(
      regexp_replace(
        replace(replace(replace(pg_temp.norm_ws(value), '–', '-'), '—', '-'), '−', '-'),
        '\s*-\s*',
        '-',
        'g'
      ),
      ''
    )
  END
$$;

CREATE OR REPLACE FUNCTION pg_temp.norm_process_path(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN pg_temp.norm_ws(value) IS NULL THEN NULL
    ELSE NULLIF(
      regexp_replace(
        regexp_replace(
          replace(
            replace(
              replace(
                replace(
                  replace(pg_temp.norm_ws(value), '–', '-'),
                  '—',
                  '-'
                ),
                '−',
                '-'
              ),
              '|',
              '-'
            ),
            ';',
            '-'
          ),
          '\s*/\s*',
          '-',
          'g'
        ),
        '\s*-\s*',
        '-',
        'g'
      ),
      ''
    )
  END
$$;

CREATE OR REPLACE FUNCTION pg_temp.parse_price(value TEXT)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN pg_temp.norm_ws(value) IS NULL THEN NULL
    ELSE NULLIF(regexp_replace(COALESCE(value, ''), '[^0-9-]+', '', 'g'), '')::DOUBLE PRECISION
  END
$$;

CREATE TEMP TABLE tmp_v95_catalog_stage ON COMMIT DROP AS
WITH base AS (
  SELECT
    CASE upper(sheet_key)
      WHEN 'CỐ ĐỊNH' THEN 'Cố Định'
      WHEN 'THÁO LẮP' THEN 'Tháo Lắp'
      WHEN 'IMPLANT' THEN 'Implant'
      ELSE pg_temp.norm_ws(sheet_key)
    END AS sheet_lv1,
    sheet_order,
    pg_temp.norm_dash_text(code) AS code,
    lower(unaccent_immutable(pg_temp.norm_dash_text(code))) AS code_norm,
    pg_temp.norm_ws(name) AS name,
    pg_temp.norm_ws(lv2) AS lv2_raw,
    pg_temp.norm_ws(lv3) AS lv3_raw,
    pg_temp.norm_dash_text(raw_material_name) AS raw_material_name,
    pg_temp.norm_dash_text(brand_name) AS brand_name,
    pg_temp.norm_ws(technique_name) AS technique_name,
    pg_temp.norm_ws(restoration_type_name) AS restoration_type_name,
    pg_temp.norm_process_path(process_path) AS process_path,
    pg_temp.parse_price(retail_price_raw) AS retail_price
  FROM tmp_v95_catalog_raw
),
normalized AS (
  SELECT
    sheet_lv1,
    sheet_order,
    code,
    code_norm,
    name,
    CASE lower(unaccent_immutable(lv2_raw))
      WHEN 'khong kim loai' THEN 'Không Kim Loại'
      WHEN 'kim loai' THEN 'Kim Loại'
      WHEN 'ham khung' THEN 'Hàm Khung'
      WHEN 'ham khung lien ket' THEN 'Hàm Khung Liên Kết'
      WHEN 'ban ham' THEN 'Bán Hàm'
      WHEN 'toan ham' THEN 'Toàn Hàm'
      WHEN 'phu kien thao lap' THEN 'Phụ Kiện Tháo Lắp'
      WHEN 'su tren implant' THEN 'Sứ Trên Implant'
      WHEN 'ham lai' THEN 'Hàm Lai'
      WHEN 'ham ot bridge' THEN 'Hàm OT Bridge'
      WHEN 'ham bar' THEN 'Hàm Bar'
      WHEN 'san pham khac' THEN 'Sản Phẩm Khác'
      ELSE lv2_raw
    END AS lv2,
    CASE lower(unaccent_immutable(lv3_raw))
      WHEN 'full' THEN 'Full'
      WHEN 'veneer' THEN 'Veneer'
      WHEN 'dap su' THEN 'Đắp Sứ'
      WHEN 'lam suon' THEN 'Làm Sườn'
      WHEN 'onlay' THEN 'Onlay'
      WHEN 'inlay' THEN 'Inlay'
      WHEN 'cui gia' THEN 'Cùi Giả'
      WHEN 'rang tam' THEN 'Răng Tạm'
      WHEN 'su ep' THEN 'Sứ Ép'
      WHEN 'mac cai' THEN 'Mắc Cài'
      ELSE lv3_raw
    END AS lv3,
    raw_material_name,
    brand_name,
    technique_name,
    CASE lower(unaccent_immutable(restoration_type_name))
      WHEN 'cement' THEN 'Cement'
      WHEN 'cement bat vit' THEN 'Cement Bắt Vít'
      WHEN 'bat vit' THEN 'Bắt Vít'
      WHEN 'ham phu' THEN 'Hàm Phủ'
      ELSE restoration_type_name
    END AS restoration_type_name,
    process_path,
    retail_price
  FROM base
  WHERE code IS NOT NULL
    AND name IS NOT NULL
),
ranked AS (
  SELECT
    normalized.*,
    ROW_NUMBER() OVER (PARTITION BY code_norm ORDER BY sheet_order DESC) AS rn
  FROM normalized
)
SELECT
  sheet_lv1,
  code,
  code_norm,
  name,
  lv2,
  lv3,
  raw_material_name,
  brand_name,
  technique_name,
  restoration_type_name,
  process_path,
  retail_price,
  sheet_order
FROM ranked
WHERE rn = 1;

INSERT INTO categories (
  name,
  level,
  active,
  custom_fields,
  department_id,
  created_at,
  updated_at
)
SELECT DISTINCT
  s.sheet_lv1,
  1,
  TRUE,
  '{}'::jsonb,
  1,
  NOW(),
  NOW()
FROM tmp_v95_catalog_stage s
ON CONFLICT DO NOTHING;

UPDATE categories c
SET active = TRUE,
    updated_at = NOW(),
    custom_fields = COALESCE(c.custom_fields, '{}'::jsonb)
WHERE c.department_id = 1
  AND c.level = 1
  AND c.deleted_at IS NULL
  AND c.name IN (SELECT DISTINCT sheet_lv1 FROM tmp_v95_catalog_stage);

CREATE TEMP TABLE tmp_v95_lv1_categories ON COMMIT DROP AS
SELECT id, name
FROM categories
WHERE department_id = 1
  AND level = 1
  AND deleted_at IS NULL
  AND name IN (SELECT DISTINCT sheet_lv1 FROM tmp_v95_catalog_stage);

INSERT INTO categories (
  name,
  level,
  parent_id,
  category_id_lv1,
  category_name_lv1,
  active,
  custom_fields,
  department_id,
  created_at,
  updated_at
)
SELECT DISTINCT
  s.lv2,
  2,
  c1.id,
  c1.id,
  c1.name,
  TRUE,
  '{}'::jsonb,
  1,
  NOW(),
  NOW()
FROM tmp_v95_catalog_stage s
JOIN tmp_v95_lv1_categories c1
  ON c1.name = s.sheet_lv1
WHERE s.lv2 IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE categories c
SET category_id_lv1 = c1.id,
    category_name_lv1 = c1.name,
    active = TRUE,
    updated_at = NOW(),
    custom_fields = COALESCE(c.custom_fields, '{}'::jsonb)
FROM tmp_v95_catalog_stage s
JOIN tmp_v95_lv1_categories c1
  ON c1.name = s.sheet_lv1
WHERE s.lv2 IS NOT NULL
  AND c.department_id = 1
  AND c.level = 2
  AND c.parent_id = c1.id
  AND c.name = s.lv2
  AND c.deleted_at IS NULL;

INSERT INTO categories (
  name,
  level,
  parent_id,
  category_id_lv1,
  category_name_lv1,
  category_id_lv2,
  category_name_lv2,
  active,
  custom_fields,
  department_id,
  created_at,
  updated_at
)
SELECT DISTINCT
  s.lv3,
  3,
  c2.id,
  c1.id,
  c1.name,
  c2.id,
  c2.name,
  TRUE,
  '{}'::jsonb,
  1,
  NOW(),
  NOW()
FROM tmp_v95_catalog_stage s
JOIN tmp_v95_lv1_categories c1
  ON c1.name = s.sheet_lv1
JOIN categories c2
  ON c2.department_id = 1
 AND c2.level = 2
 AND c2.parent_id = c1.id
 AND c2.name = s.lv2
 AND c2.deleted_at IS NULL
WHERE s.lv3 IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE categories c3
SET category_id_lv1 = c1.id,
    category_name_lv1 = c1.name,
    category_id_lv2 = c2.id,
    category_name_lv2 = c2.name,
    active = TRUE,
    updated_at = NOW(),
    custom_fields = COALESCE(c3.custom_fields, '{}'::jsonb)
FROM tmp_v95_catalog_stage s
JOIN tmp_v95_lv1_categories c1
  ON c1.name = s.sheet_lv1
JOIN categories c2
  ON c2.department_id = 1
 AND c2.level = 2
 AND c2.parent_id = c1.id
 AND c2.name = s.lv2
 AND c2.deleted_at IS NULL
WHERE s.lv3 IS NOT NULL
  AND c3.department_id = 1
  AND c3.level = 3
  AND c3.parent_id = c2.id
  AND c3.name = s.lv3
  AND c3.deleted_at IS NULL;

CREATE TEMP TABLE tmp_v95_catalog_resolved ON COMMIT DROP AS
SELECT
  s.sheet_lv1,
  s.code,
  s.code_norm,
  s.name,
  s.lv2,
  s.lv3,
  s.raw_material_name,
  s.brand_name,
  s.technique_name,
  s.restoration_type_name,
  s.process_path,
  s.retail_price,
  s.sheet_order,
  c1.id AS lv1_category_id,
  c1.name AS lv1_category_name,
  c2.id AS lv2_category_id,
  c2.name AS lv2_category_name,
  c3.id AS lv3_category_id,
  c3.name AS lv3_category_name,
  COALESCE(c3.id, c2.id, c1.id) AS category_id,
  COALESCE(c3.name, c2.name, c1.name) AS category_name
FROM tmp_v95_catalog_stage s
JOIN tmp_v95_lv1_categories c1
  ON c1.name = s.sheet_lv1
LEFT JOIN categories c2
  ON c2.department_id = 1
 AND c2.level = 2
 AND c2.parent_id = c1.id
 AND c2.name = s.lv2
 AND c2.deleted_at IS NULL
LEFT JOIN categories c3
  ON c3.department_id = 1
 AND c3.level = 3
 AND c3.parent_id = c2.id
 AND c3.name = s.lv3
 AND c3.deleted_at IS NULL;

DO $$
DECLARE
  missing_paths TEXT;
BEGIN
  SELECT string_agg(
           DISTINCT trim(both ' ' FROM CONCAT(
             code,
             ' => ',
             COALESCE(sheet_lv1, ''),
             CASE WHEN lv2 IS NOT NULL THEN ' > ' || lv2 ELSE '' END,
             CASE WHEN lv3 IS NOT NULL THEN ' > ' || lv3 ELSE '' END
           )),
           E'\n'
           ORDER BY trim(both ' ' FROM CONCAT(
             code,
             ' => ',
             COALESCE(sheet_lv1, ''),
             CASE WHEN lv2 IS NOT NULL THEN ' > ' || lv2 ELSE '' END,
             CASE WHEN lv3 IS NOT NULL THEN ' > ' || lv3 ELSE '' END
           ))
         )
    INTO missing_paths
  FROM tmp_v95_catalog_resolved
  WHERE category_id IS NULL
     OR (lv2 IS NOT NULL AND lv2_category_id IS NULL)
     OR (lv3 IS NOT NULL AND lv3_category_id IS NULL);

  IF missing_paths IS NOT NULL THEN
    RAISE EXCEPTION 'V95 unresolved category paths:%', E'\n' || missing_paths;
  END IF;
END $$;

INSERT INTO brand_names (
  department_id,
  category_id,
  category_name,
  name,
  created_at,
  updated_at
)
SELECT DISTINCT
  1,
  r.lv1_category_id,
  r.lv1_category_name,
  r.brand_name,
  NOW(),
  NOW()
FROM tmp_v95_catalog_resolved r
WHERE r.brand_name IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE brand_names b
SET category_name = src.category_name,
    updated_at = NOW()
FROM (
  SELECT DISTINCT lv1_category_id AS category_id, lv1_category_name AS category_name, brand_name AS name
  FROM tmp_v95_catalog_resolved
  WHERE brand_name IS NOT NULL
) src
WHERE b.department_id = 1
  AND b.deleted_at IS NULL
  AND b.category_id = src.category_id
  AND b.name = src.name;

INSERT INTO raw_materials (
  department_id,
  category_id,
  category_name,
  name,
  created_at,
  updated_at
)
SELECT DISTINCT
  1,
  r.lv1_category_id,
  r.lv1_category_name,
  r.raw_material_name,
  NOW(),
  NOW()
FROM tmp_v95_catalog_resolved r
WHERE r.raw_material_name IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE raw_materials rm
SET category_name = src.category_name,
    updated_at = NOW()
FROM (
  SELECT DISTINCT lv1_category_id AS category_id, lv1_category_name AS category_name, raw_material_name AS name
  FROM tmp_v95_catalog_resolved
  WHERE raw_material_name IS NOT NULL
) src
WHERE rm.department_id = 1
  AND rm.deleted_at IS NULL
  AND rm.category_id = src.category_id
  AND rm.name = src.name;

INSERT INTO techniques (
  department_id,
  category_id,
  category_name,
  name,
  created_at,
  updated_at
)
SELECT DISTINCT
  1,
  r.lv1_category_id,
  r.lv1_category_name,
  r.technique_name,
  NOW(),
  NOW()
FROM tmp_v95_catalog_resolved r
WHERE r.technique_name IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE techniques t
SET category_name = src.category_name,
    updated_at = NOW()
FROM (
  SELECT DISTINCT lv1_category_id AS category_id, lv1_category_name AS category_name, technique_name AS name
  FROM tmp_v95_catalog_resolved
  WHERE technique_name IS NOT NULL
) src
WHERE t.department_id = 1
  AND t.deleted_at IS NULL
  AND t.category_id = src.category_id
  AND t.name = src.name;

INSERT INTO restoration_types (
  department_id,
  category_id,
  category_name,
  name,
  created_at,
  updated_at
)
SELECT DISTINCT
  1,
  r.lv1_category_id,
  r.lv1_category_name,
  r.restoration_type_name,
  NOW(),
  NOW()
FROM tmp_v95_catalog_resolved r
WHERE r.restoration_type_name IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE restoration_types rt
SET category_name = src.category_name,
    updated_at = NOW()
FROM (
  SELECT DISTINCT lv1_category_id AS category_id, lv1_category_name AS category_name, restoration_type_name AS name
  FROM tmp_v95_catalog_resolved
  WHERE restoration_type_name IS NOT NULL
) src
WHERE rt.department_id = 1
  AND rt.deleted_at IS NULL
  AND rt.category_id = src.category_id
  AND rt.name = src.name;

CREATE TEMP TABLE tmp_v95_process_tokens ON COMMIT DROP AS
WITH expanded AS (
  SELECT
    r.code_norm,
    r.code,
    pg_temp.norm_ws(token) AS process_name,
    token_ord - 1 AS token_order
  FROM tmp_v95_catalog_resolved r
  CROSS JOIN LATERAL unnest(string_to_array(COALESCE(r.process_path, ''), '-')) WITH ORDINALITY AS t(token, token_ord)
  WHERE pg_temp.norm_ws(token) IS NOT NULL
),
dedup AS (
  SELECT
    e.*,
    ROW_NUMBER() OVER (
      PARTITION BY e.code_norm, lower(unaccent_immutable(e.process_name))
      ORDER BY e.token_order
    ) AS dedup_rn
  FROM expanded e
)
SELECT
  code_norm,
  code,
  process_name,
  ROW_NUMBER() OVER (PARTITION BY code_norm ORDER BY token_order) - 1 AS display_order
FROM dedup
WHERE dedup_rn = 1;

DO $$
DECLARE
  missing_processes TEXT;
BEGIN
  SELECT string_agg(DISTINCT t.process_name, ', ' ORDER BY t.process_name)
    INTO missing_processes
  FROM tmp_v95_process_tokens t
  LEFT JOIN processes p
    ON p.department_id = 1
   AND p.deleted_at IS NULL
   AND p.name_norm = lower(unaccent_immutable(t.process_name))
  WHERE p.id IS NULL;

  IF missing_processes IS NOT NULL THEN
    RAISE EXCEPTION 'V95 unresolved process names: %', missing_processes;
  END IF;
END $$;

DO $$
DECLARE
  duplicate_codes TEXT;
BEGIN
  SELECT string_agg(code_norm, ', ' ORDER BY code_norm)
    INTO duplicate_codes
  FROM (
    SELECT p.code_norm
    FROM products p
    WHERE p.department_id = 1
      AND p.deleted_at IS NULL
      AND p.code_norm IN (SELECT code_norm FROM tmp_v95_catalog_resolved)
    GROUP BY p.code_norm
    HAVING COUNT(*) > 1
  ) dup;

  IF duplicate_codes IS NOT NULL THEN
    RAISE EXCEPTION 'V95 found duplicate active products for code_norm(s): %', duplicate_codes;
  END IF;
END $$;

UPDATE products p
SET code = r.code,
    name = r.name,
    is_template = TRUE,
    template_id = NULL,
    active = TRUE,
    custom_fields = COALESCE(p.custom_fields, '{}'::jsonb),
    category_id = r.category_id,
    category_name = r.category_name,
    retail_price = r.retail_price,
    updated_at = NOW()
FROM tmp_v95_catalog_resolved r
WHERE p.department_id = 1
  AND p.deleted_at IS NULL
  AND p.code_norm = r.code_norm;

INSERT INTO products (
  department_id,
  code,
  name,
  is_template,
  template_id,
  active,
  custom_fields,
  category_id,
  category_name,
  retail_price,
  created_at,
  updated_at
)
SELECT
  1,
  r.code,
  r.name,
  TRUE,
  NULL,
  TRUE,
  '{}'::jsonb,
  r.category_id,
  r.category_name,
  r.retail_price,
  NOW(),
  NOW()
FROM tmp_v95_catalog_resolved r
WHERE NOT EXISTS (
  SELECT 1
  FROM products p
  WHERE p.department_id = 1
    AND p.deleted_at IS NULL
    AND p.code_norm = r.code_norm
);

CREATE TEMP TABLE tmp_v95_target_products ON COMMIT DROP AS
SELECT
  r.*,
  p.id AS product_id
FROM tmp_v95_catalog_resolved r
JOIN products p
  ON p.department_id = 1
 AND p.deleted_at IS NULL
 AND p.code_norm = r.code_norm;

DELETE FROM product_processes pp
USING tmp_v95_target_products tp
WHERE pp.product_id = tp.product_id;

DELETE FROM product_brand_names pbn
USING tmp_v95_target_products tp
WHERE pbn.product_id = tp.product_id;

DELETE FROM product_raw_materials prm
USING tmp_v95_target_products tp
WHERE prm.product_id = tp.product_id;

DELETE FROM product_techniques pt
USING tmp_v95_target_products tp
WHERE pt.product_id = tp.product_id;

DELETE FROM product_restoration_types prt
USING tmp_v95_target_products tp
WHERE prt.product_id = tp.product_id;

INSERT INTO product_processes (
  product_id,
  process_id,
  display_order,
  created_at
)
SELECT
  tp.product_id,
  p.id,
  t.display_order,
  NOW()
FROM tmp_v95_target_products tp
JOIN tmp_v95_process_tokens t
  ON t.code_norm = tp.code_norm
JOIN processes p
  ON p.department_id = 1
 AND p.deleted_at IS NULL
 AND p.name_norm = lower(unaccent_immutable(t.process_name))
ORDER BY tp.product_id, t.display_order;

INSERT INTO product_brand_names (
  product_id,
  brand_name_id,
  created_at
)
SELECT
  tp.product_id,
  b.id,
  NOW()
FROM tmp_v95_target_products tp
JOIN brand_names b
  ON b.department_id = 1
 AND b.deleted_at IS NULL
 AND b.category_id = tp.lv1_category_id
 AND b.name = tp.brand_name
WHERE tp.brand_name IS NOT NULL;

INSERT INTO product_raw_materials (
  product_id,
  raw_material_id,
  created_at
)
SELECT
  tp.product_id,
  rm.id,
  NOW()
FROM tmp_v95_target_products tp
JOIN raw_materials rm
  ON rm.department_id = 1
 AND rm.deleted_at IS NULL
 AND rm.category_id = tp.lv1_category_id
 AND rm.name = tp.raw_material_name
WHERE tp.raw_material_name IS NOT NULL;

INSERT INTO product_techniques (
  product_id,
  technique_id,
  created_at
)
SELECT
  tp.product_id,
  t.id,
  NOW()
FROM tmp_v95_target_products tp
JOIN techniques t
  ON t.department_id = 1
 AND t.deleted_at IS NULL
 AND t.category_id = tp.lv1_category_id
 AND t.name = tp.technique_name
WHERE tp.technique_name IS NOT NULL;

INSERT INTO product_restoration_types (
  product_id,
  restoration_type_id,
  created_at
)
SELECT
  tp.product_id,
  rt.id,
  NOW()
FROM tmp_v95_target_products tp
JOIN restoration_types rt
  ON rt.department_id = 1
 AND rt.deleted_at IS NULL
 AND rt.category_id = tp.lv1_category_id
 AND rt.name = tp.restoration_type_name
WHERE tp.restoration_type_name IS NOT NULL;

UPDATE products p
SET process_names = COALESCE(src.process_names, ''),
    updated_at = NOW()
FROM (
  SELECT
    tp.product_id,
    string_agg(pr.name, '|' ORDER BY t.display_order) AS process_names
  FROM tmp_v95_target_products tp
  LEFT JOIN tmp_v95_process_tokens t
    ON t.code_norm = tp.code_norm
  LEFT JOIN processes pr
    ON pr.department_id = 1
   AND pr.deleted_at IS NULL
   AND pr.name_norm = lower(unaccent_immutable(t.process_name))
  GROUP BY tp.product_id
) src
WHERE p.id = src.product_id;

INSERT INTO collections (slug, name, show_if, integration, "group")
VALUES
  ('product', 'Sản phẩm', NULL, FALSE, NULL),
  ('category', 'Danh mục', NULL, FALSE, NULL)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    show_if = EXCLUDED.show_if,
    integration = EXCLUDED.integration,
    "group" = EXCLUDED."group",
    deleted_at = NULL;

CREATE TEMP TABLE tmp_v95_product_collection_scope ON COMMIT DROP AS
WITH RECURSIVE product_tree AS (
  SELECT
    p.id AS root_id,
    p.id AS descendant_id
  FROM products p
  WHERE p.department_id = 1
    AND p.deleted_at IS NULL
    AND p.is_template = TRUE

  UNION ALL

  SELECT
    pt.root_id,
    child.id AS descendant_id
  FROM product_tree pt
  JOIN products child
    ON child.template_id = pt.descendant_id
   AND child.department_id = 1
   AND child.deleted_at IS NULL
)
SELECT
  p.id AS product_id,
  'product-' || p.id AS slug,
  COALESCE(p.name, 'product') AS name,
  jsonb_build_object(
    'any',
    jsonb_agg(
      jsonb_build_object(
        'field', 'templateId',
        'op', 'eq',
        'value', pt.descendant_id
      )
      ORDER BY CASE WHEN pt.descendant_id = p.id THEN 0 ELSE 1 END, pt.descendant_id
    )
  ) AS show_if
FROM products p
JOIN product_tree pt
  ON pt.root_id = p.id
WHERE p.department_id = 1
  AND p.deleted_at IS NULL
  AND p.is_template = TRUE
GROUP BY p.id, p.name;

INSERT INTO collections (slug, name, show_if, integration, "group")
SELECT
  scope.slug,
  scope.name,
  scope.show_if,
  TRUE,
  'product'
FROM tmp_v95_product_collection_scope scope
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    show_if = EXCLUDED.show_if,
    integration = TRUE,
    "group" = 'product',
    deleted_at = NULL;

UPDATE products p
SET collection_id = c.id,
    updated_at = NOW()
FROM tmp_v95_product_collection_scope scope
JOIN collections c
  ON c.slug = scope.slug
 AND c.deleted_at IS NULL
WHERE p.id = scope.product_id
  AND p.collection_id IS DISTINCT FROM c.id;

CREATE TEMP TABLE tmp_v95_category_collection_scope ON COMMIT DROP AS
WITH RECURSIVE category_tree AS (
  SELECT
    c.id AS root_id,
    c.id AS descendant_id
  FROM categories c
  WHERE c.department_id = 1
    AND c.deleted_at IS NULL

  UNION ALL

  SELECT
    ct.root_id,
    child.id AS descendant_id
  FROM category_tree ct
  JOIN categories child
    ON child.parent_id = ct.descendant_id
   AND child.department_id = 1
   AND child.deleted_at IS NULL
)
SELECT
  c.id AS category_id,
  'category-' || c.id AS slug,
  COALESCE(c.name, 'category') AS name,
  jsonb_build_object(
    'any',
    jsonb_agg(
      jsonb_build_object(
        'field', 'categoryId',
        'op', 'eq',
        'value', ct.descendant_id
      )
      ORDER BY CASE WHEN ct.descendant_id = c.id THEN 0 ELSE 1 END, ct.descendant_id
    )
  ) AS show_if
FROM categories c
JOIN category_tree ct
  ON ct.root_id = c.id
WHERE c.department_id = 1
  AND c.deleted_at IS NULL
GROUP BY c.id, c.name;

INSERT INTO collections (slug, name, show_if, integration, "group")
SELECT
  scope.slug,
  scope.name,
  scope.show_if,
  TRUE,
  'category'
FROM tmp_v95_category_collection_scope scope
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    show_if = EXCLUDED.show_if,
    integration = TRUE,
    "group" = 'category',
    deleted_at = NULL;

UPDATE categories c
SET collection_id = coll.id,
    updated_at = NOW()
FROM tmp_v95_category_collection_scope scope
JOIN collections coll
  ON coll.slug = scope.slug
 AND coll.deleted_at IS NULL
WHERE c.id = scope.category_id
  AND c.collection_id IS DISTINCT FROM coll.id;

CREATE TEMP TABLE tmp_v95_seed_fields (
  collection_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  required BOOLEAN NOT NULL,
  "unique" BOOLEAN NOT NULL,
  default_value JSONB,
  options JSONB,
  order_index INT NOT NULL,
  visibility TEXT NOT NULL,
  relation JSONB,
  "table" BOOLEAN NOT NULL,
  form BOOLEAN NOT NULL,
  search BOOLEAN NOT NULL,
  tag TEXT
) ON COMMIT DROP;

INSERT INTO tmp_v95_seed_fields (
  collection_slug,
  name,
  label,
  type,
  required,
  "unique",
  default_value,
  options,
  order_index,
  visibility,
  relation,
  "table",
  form,
  search,
  tag
)
VALUES
  ('product', 'category_id', 'Danh mục', 'relation', FALSE, FALSE, NULL, NULL, 1, 'public', '{"target":"product_category","type":"1","form":"category"}'::jsonb, FALSE, TRUE, FALSE, NULL),
  ('product', 'process_ids', 'Công đoạn', 'relation', FALSE, FALSE, NULL, NULL, 2, 'public', '{"target":"products_processes","form":"process"}'::jsonb, FALSE, TRUE, FALSE, NULL),
  ('category', 'process_ids', 'Công đoạn', 'relation', FALSE, FALSE, NULL, NULL, 1, 'public', '{"target":"categories_processes","form":"process"}'::jsonb, FALSE, TRUE, FALSE, NULL);

INSERT INTO tmp_v95_seed_fields (
  collection_slug,
  name,
  label,
  type,
  required,
  "unique",
  default_value,
  options,
  order_index,
  visibility,
  relation,
  "table",
  form,
  search,
  tag
)
SELECT
  'category-' || c.id,
  f.name,
  f.label,
  'relation',
  FALSE,
  FALSE,
  NULL,
  NULL,
  f.order_index,
  'public',
  jsonb_build_object(
    'target', f.target,
    'form', f.form_key,
    'where', jsonb_build_array(format('category_id=%s', c.id)),
    'type', '1'
  ),
  FALSE,
  TRUE,
  FALSE,
  'catalog'
FROM (
  SELECT
    id,
    name
  FROM categories
  WHERE department_id = 1
    AND level = 1
    AND deleted_at IS NULL
    AND name IN ('Cố Định', 'Tháo Lắp', 'Implant')
) c
JOIN LATERAL (
  SELECT *
  FROM (
    VALUES
      ('Cố Định', 'brand_name_ids', 'Thương hiệu', 1, 'products_brand_names', 'brand_name'),
      ('Tháo Lắp', 'raw_material_ids', 'Vật liệu', 1, 'products_raw_materials', 'raw_material'),
      ('Tháo Lắp', 'brand_name_ids', 'Thương hiệu', 2, 'products_brand_names', 'brand_name'),
      ('Implant', 'raw_material_ids', 'Vật liệu', 1, 'products_raw_materials', 'raw_material'),
      ('Implant', 'brand_name_ids', 'Thương hiệu', 2, 'products_brand_names', 'brand_name'),
      ('Implant', 'technique_ids', 'Công nghệ', 3, 'products_techniques', 'technique'),
      ('Implant', 'restoration_type_ids', 'Kiểu phục hình', 4, 'products_restoration_types', 'restoration_type')
  ) AS seed(lv1_name, name, label, order_index, target, form_key)
  WHERE seed.lv1_name = c.name
) f ON TRUE;

UPDATE fields f
SET label = s.label,
    type = s.type,
    required = s.required,
    "unique" = s."unique",
    default_value = s.default_value,
    options = s.options,
    order_index = s.order_index,
    visibility = s.visibility,
    relation = s.relation,
    "table" = s."table",
    form = s.form,
    search = s.search,
    tag = s.tag
FROM tmp_v95_seed_fields s
JOIN collections c
  ON c.slug = s.collection_slug
 AND c.deleted_at IS NULL
WHERE f.collection_id = c.id
  AND f.name = s.name;

INSERT INTO fields (
  collection_id,
  name,
  label,
  type,
  required,
  "unique",
  default_value,
  options,
  order_index,
  visibility,
  relation,
  "table",
  form,
  search,
  tag
)
SELECT
  c.id,
  s.name,
  s.label,
  s.type,
  s.required,
  s."unique",
  s.default_value,
  s.options,
  s.order_index,
  s.visibility,
  s.relation,
  s."table",
  s.form,
  s.search,
  s.tag
FROM tmp_v95_seed_fields s
JOIN collections c
  ON c.slug = s.collection_slug
 AND c.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM fields f
  WHERE f.collection_id = c.id
    AND f.name = s.name
);
