package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/module"
)

type WorkItem struct {
	OrderID               int64
	OrderItemID           int64
	InProgressID          int64
	OrderCode             *string
	OrderItemCode         *string
	ProcessID             *int64
	ProcessName           *string
	SectionID             *int
	SectionName           *string
	AssignedUserID        *int64
	AssignedName          *string
	StartedAt             *time.Time
	DeliveryAt            *time.Time
	RemainingProcessCount int
}

type StaffCandidate struct {
	UserID       int64
	Name         string
	SectionNames *string
}

type ProductionPlanningRepository interface {
	GetConfig(ctx context.Context, deptID int) (*model.ProductionPlanningConfigDTO, error)
	SaveConfig(ctx context.Context, deptID int, cfg *model.ProductionPlanningConfigDTO) (*model.ProductionPlanningConfigDTO, error)
	ListOpenWork(ctx context.Context, deptID int) ([]*WorkItem, error)
	ListStaffCandidates(ctx context.Context, deptID int) ([]*StaffCandidate, error)
	GetWorkItemByInProgressID(ctx context.Context, deptID int, inProgressID int64) (*WorkItem, error)
}

type productionPlanningRepository struct {
	db    *generated.Client
	sqlDB *sql.DB
	deps  *module.ModuleDeps[config.ModuleConfig]
}

func NewProductionPlanningRepository(
	db *generated.Client,
	sqlDB *sql.DB,
	deps *module.ModuleDeps[config.ModuleConfig],
) ProductionPlanningRepository {
	return &productionPlanningRepository{db: db, sqlDB: sqlDB, deps: deps}
}

func DefaultConfig(deptID int) *model.ProductionPlanningConfigDTO {
	return &model.ProductionPlanningConfigDTO{
		DepartmentID:       deptID,
		Enabled:            true,
		ConfigComplete:     false,
		DefaultDurationMin: 0,
		BusinessHours: model.ProductionPlanningBusinessHoursDTO{
			StartHour: 8,
			EndHour:   17,
			WorkDays:  []int{1, 2, 3, 4, 5, 6},
		},
		ProcessDurations: map[string]int{},
		SectionCapacity:  map[string]float64{},
		StaffCapacity:    map[string]float64{},
		DisabledSections: []string{},
		DisabledStaff:    []string{},
	}
}

func normalizeConfig(deptID int, enabled bool, cfg model.ProductionPlanningConfigDTO) *model.ProductionPlanningConfigDTO {
	def := DefaultConfig(deptID)
	def.Enabled = enabled
	if cfg.DefaultDurationMin > 0 {
		def.DefaultDurationMin = cfg.DefaultDurationMin
	}
	if cfg.BusinessHours.StartHour >= 0 && cfg.BusinessHours.EndHour > cfg.BusinessHours.StartHour {
		def.BusinessHours.StartHour = cfg.BusinessHours.StartHour
		def.BusinessHours.EndHour = cfg.BusinessHours.EndHour
	}
	if len(cfg.BusinessHours.WorkDays) > 0 {
		def.BusinessHours.WorkDays = cfg.BusinessHours.WorkDays
	}
	if cfg.ProcessDurations != nil {
		def.ProcessDurations = cfg.ProcessDurations
	}
	if cfg.SectionCapacity != nil {
		def.SectionCapacity = cfg.SectionCapacity
	}
	if cfg.StaffCapacity != nil {
		def.StaffCapacity = cfg.StaffCapacity
	}
	if cfg.DisabledSections != nil {
		def.DisabledSections = cfg.DisabledSections
	}
	if cfg.DisabledStaff != nil {
		def.DisabledStaff = cfg.DisabledStaff
	}
	def.ConfigComplete = def.Enabled && (def.DefaultDurationMin > 0 || len(def.ProcessDurations) > 0)
	return def
}

func (r *productionPlanningRepository) GetConfig(ctx context.Context, deptID int) (*model.ProductionPlanningConfigDTO, error) {
	row := r.sqlDB.QueryRowContext(ctx, `
SELECT enabled, config
FROM production_planning_configs
WHERE department_id = $1
`, deptID)
	var enabled bool
	var raw []byte
	if err := row.Scan(&enabled, &raw); err != nil {
		if err == sql.ErrNoRows {
			return DefaultConfig(deptID), nil
		}
		return nil, err
	}
	var cfg model.ProductionPlanningConfigDTO
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return nil, err
		}
	}
	return normalizeConfig(deptID, enabled, cfg), nil
}

func (r *productionPlanningRepository) SaveConfig(ctx context.Context, deptID int, cfg *model.ProductionPlanningConfigDTO) (*model.ProductionPlanningConfigDTO, error) {
	if cfg == nil {
		cfg = DefaultConfig(deptID)
	}
	normalized := normalizeConfig(deptID, cfg.Enabled, *cfg)
	raw, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	_, err = r.sqlDB.ExecContext(ctx, `
INSERT INTO production_planning_configs (department_id, enabled, config, updated_at)
VALUES ($1, $2, $3::jsonb, now())
ON CONFLICT (department_id)
DO UPDATE SET
  enabled = EXCLUDED.enabled,
  config = EXCLUDED.config,
  updated_at = now()
`, deptID, normalized.Enabled, string(raw))
	if err != nil {
		return nil, err
	}
	return normalized, nil
}

func (r *productionPlanningRepository) ListOpenWork(ctx context.Context, deptID int) ([]*WorkItem, error) {
	const q = `
WITH candidate_items AS (
  SELECT
    o.id AS order_id,
    oi.id AS order_item_id,
    o.code_latest,
    oi.code AS order_item_code,
    o.process_name_latest,
    COALESCE(NULLIF(oi.custom_fields->>'delivery_date', '')::timestamptz, o.delivery_date) AS delivery_at
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
  WHERE
    o.department_id = $1
    AND o.deleted_at IS NULL
    AND COALESCE(NULLIF(o.status_latest, ''), 'received') NOT IN ('completed', 'cancelled')
    AND COALESCE(NULLIF(oi.status, ''), 'received') NOT IN ('completed', 'cancelled')
  ORDER BY COALESCE(NULLIF(oi.custom_fields->>'delivery_date', '')::timestamptz, o.delivery_date) ASC NULLS LAST
  LIMIT 1000
),
open_ip AS (
  SELECT DISTINCT ON (ip.order_item_id)
    ip.id,
    ip.order_id,
    ip.order_item_id,
    ip.order_item_code,
    ip.process_id,
    ip.product_id,
    op.process_name,
    ip.section_id,
    COALESCE(ip.section_name, op.section_name) AS section_name,
    ip.assigned_id,
    ip.assigned_name,
    ip.started_at
  FROM order_item_process_in_progresses ip
  JOIN candidate_items ci ON ci.order_item_id = ip.order_item_id
  LEFT JOIN order_item_processes op ON op.id = ip.process_id
  WHERE ip.completed_at IS NULL
  ORDER BY ip.order_item_id, ip.started_at DESC NULLS LAST, ip.created_at DESC
),
remaining AS (
  SELECT
    oip.order_item_id,
    COUNT(*) FILTER (WHERE oip.completed_at IS NULL) AS remaining_process_count
  FROM order_item_processes oip
  JOIN candidate_items ci ON ci.order_item_id = oip.order_item_id
  GROUP BY oip.order_item_id
)
SELECT
  ci.order_id,
  ci.order_item_id,
  COALESCE(open_ip.id, 0),
  ci.code_latest,
  ci.order_item_code,
  open_ip.process_id,
  COALESCE(open_ip.process_name, ci.process_name_latest),
  open_ip.section_id,
  open_ip.section_name,
  open_ip.assigned_id,
  open_ip.assigned_name,
  open_ip.started_at,
  ci.delivery_at,
  COALESCE(remaining.remaining_process_count, 0)
FROM candidate_items ci
LEFT JOIN open_ip ON open_ip.order_item_id = ci.order_item_id
LEFT JOIN remaining ON remaining.order_item_id = ci.order_item_id
ORDER BY ci.delivery_at ASC NULLS LAST
LIMIT 200;
`
	return r.scanWorkItems(ctx, q, deptID)
}

func (r *productionPlanningRepository) GetWorkItemByInProgressID(ctx context.Context, deptID int, inProgressID int64) (*WorkItem, error) {
	const q = `
WITH remaining AS (
  SELECT
    oip.order_item_id,
    COUNT(*) FILTER (WHERE oip.completed_at IS NULL) AS remaining_process_count
  FROM order_item_processes oip
  GROUP BY oip.order_item_id
)
SELECT
  o.id,
  oi.id,
  ip.id,
  o.code_latest,
  oi.code,
  ip.process_id,
  COALESCE(op.process_name, o.process_name_latest),
  ip.section_id,
  COALESCE(ip.section_name, op.section_name),
  ip.assigned_id,
  ip.assigned_name,
  ip.started_at,
  COALESCE(NULLIF(oi.custom_fields->>'delivery_date', '')::timestamptz, o.delivery_date),
  COALESCE(remaining.remaining_process_count, 0)
FROM order_item_process_in_progresses ip
LEFT JOIN order_item_processes op ON op.id = ip.process_id
JOIN order_items oi ON oi.id = ip.order_item_id AND oi.deleted_at IS NULL
JOIN orders o ON o.id = oi.order_id AND o.deleted_at IS NULL
LEFT JOIN remaining ON remaining.order_item_id = oi.id
WHERE o.department_id = $1 AND ip.id = $2
LIMIT 1;
`
	items, err := r.scanWorkItems(ctx, q, deptID, inProgressID)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, sql.ErrNoRows
	}
	return items[0], nil
}

func (r *productionPlanningRepository) scanWorkItems(ctx context.Context, q string, args ...any) ([]*WorkItem, error) {
	rows, err := r.sqlDB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*WorkItem, 0)
	for rows.Next() {
		item := &WorkItem{}
		if err := rows.Scan(
			&item.OrderID,
			&item.OrderItemID,
			&item.InProgressID,
			&item.OrderCode,
			&item.OrderItemCode,
			&item.ProcessID,
			&item.ProcessName,
			&item.SectionID,
			&item.SectionName,
			&item.AssignedUserID,
			&item.AssignedName,
			&item.StartedAt,
			&item.DeliveryAt,
			&item.RemainingProcessCount,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *productionPlanningRepository) ListStaffCandidates(ctx context.Context, deptID int) ([]*StaffCandidate, error) {
	rows, err := r.sqlDB.QueryContext(ctx, `
SELECT s.user_staff, u.name, s.section_names
FROM staffs s
JOIN users u ON u.id = s.user_staff AND u.deleted_at IS NULL AND u.active = TRUE
WHERE s.department_id = $1
ORDER BY u.name ASC
`, deptID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*StaffCandidate, 0)
	for rows.Next() {
		item := &StaffCandidate{}
		if err := rows.Scan(&item.UserID, &item.Name, &item.SectionNames); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func CandidateMatchesSection(candidate *StaffCandidate, sectionName *string) bool {
	if candidate == nil || sectionName == nil {
		return true
	}
	sections := strings.ToLower(strings.TrimSpace(fmt.Sprint(candidate.SectionNames)))
	if sections == "" {
		return true
	}
	return strings.Contains(sections, strings.ToLower(strings.TrimSpace(*sectionName)))
}
