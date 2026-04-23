package model

type RawMaterialExcelRow struct {
	CategoryName string `json:"category_name"`
	Code         string `json:"code,omitempty"`
	Name         string `json:"name"`
}

type RawMaterialImportResult struct {
	TotalRows int      `json:"totalRows"`
	Added     int      `json:"added"`
	Skipped   int      `json:"skipped"`
	Errors    []string `json:"errors,omitempty"`
}
