package model

type DepartmentSyncApplyRequest struct {
	PreviewToken string `json:"previewToken"`
}

type DepartmentSyncFieldDiffDTO struct {
	Label  string `json:"label"`
	Before string `json:"before,omitempty"`
	After  string `json:"after,omitempty"`
}

type DepartmentSyncItemDiffDTO struct {
	Key        string                       `json:"key"`
	Label      string                       `json:"label"`
	ChangeType string                       `json:"changeType"`
	Fields     []DepartmentSyncFieldDiffDTO `json:"fields,omitempty"`
}

type DepartmentSyncModuleDiffDTO struct {
	Key    string                      `json:"key"`
	Label  string                      `json:"label"`
	Create int                         `json:"create"`
	Update int                         `json:"update"`
	Skip   int                         `json:"skip"`
	Items  []DepartmentSyncItemDiffDTO `json:"items,omitempty"`
}

type DepartmentSyncPreviewDTO struct {
	PreviewToken       string                        `json:"previewToken"`
	SourceDepartmentID int                           `json:"sourceDepartmentId"`
	TargetDepartmentID int                           `json:"targetDepartmentId"`
	Modules            []DepartmentSyncModuleDiffDTO `json:"modules"`
	TotalCreate        int                           `json:"totalCreate"`
	TotalUpdate        int                           `json:"totalUpdate"`
	TotalSkip          int                           `json:"totalSkip"`
}

type DepartmentSyncApplyResultDTO struct {
	PreviewToken       string                        `json:"previewToken"`
	SourceDepartmentID int                           `json:"sourceDepartmentId"`
	TargetDepartmentID int                           `json:"targetDepartmentId"`
	Modules            []DepartmentSyncModuleDiffDTO `json:"modules"`
	TotalCreate        int                           `json:"totalCreate"`
	TotalUpdate        int                           `json:"totalUpdate"`
	TotalSkip          int                           `json:"totalSkip"`
}
