package model

type StaffCatalogOverviewSectionLoadDTO struct {
	SectionName   string `json:"section_name"`
	StaffCount    int    `json:"staff_count"`
	OpenProcesses int    `json:"open_processes"`
}

type StaffCatalogOverviewPerformerDTO struct {
	StaffID                  int64   `json:"staff_id"`
	Name                     string  `json:"name"`
	OpenProcesses            int     `json:"open_processes"`
	RecentCompletedProcesses int     `json:"recent_completed_processes"`
	RecentOrders             int     `json:"recent_orders"`
	RecentRevenue            float64 `json:"recent_revenue"`
}

type StaffCatalogOverviewCoverageDTO struct {
	ExpectedStaffs      int `json:"expected_staffs"`
	StaffsWithOrderData int `json:"staffs_with_order_data"`
	FailedStaffs        int `json:"failed_staffs"`
}

type StaffCatalogOverviewSummaryDTO struct {
	TotalStaff                    int                                   `json:"total_staff"`
	ActiveStaff                   int                                   `json:"active_staff"`
	InactiveStaff                 int                                   `json:"inactive_staff"`
	AssignedStaffCount            int                                   `json:"assigned_staff_count"`
	IdleStaffCount                int                                   `json:"idle_staff_count"`
	TotalOpenProcesses            int                                   `json:"total_open_processes"`
	TotalRecentCompletedProcesses int                                   `json:"total_recent_completed_processes"`
	TotalRecentOrders             int                                   `json:"total_recent_orders"`
	TotalRecentRevenue            float64                               `json:"total_recent_revenue"`
	AvgOpenProcessesPerAssigned   float64                               `json:"avg_open_processes_per_assigned"`
	EngagementRate                float64                               `json:"engagement_rate"`
	BacklogStatusCounts           map[string]int                        `json:"backlog_status_counts,omitempty"`
	SectionLoads                  []*StaffCatalogOverviewSectionLoadDTO `json:"section_loads,omitempty"`
	WorkforceSections             []*StaffCatalogOverviewSectionLoadDTO `json:"workforce_sections,omitempty"`
	TopPerformers                 []*StaffCatalogOverviewPerformerDTO   `json:"top_performers,omitempty"`
	Coverage                      *StaffCatalogOverviewCoverageDTO      `json:"coverage,omitempty"`
}

type StaffCatalogOverviewDTO struct {
	Summary *StaffCatalogOverviewSummaryDTO `json:"summary,omitempty"`
}
