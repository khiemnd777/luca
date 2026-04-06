package repository

import (
	"context"
	"encoding/json"
	"fmt"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/order"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitem"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemfile"
)

const PrescriptionFileType = "prescription_slip"

type orderFileMetadata struct {
	FileName  string `json:"file_name"`
	MimeType  string `json:"mime_type"`
	Format    string `json:"format"`
	SizeBytes int64  `json:"size_bytes"`
}

type CreateOrderFileParams struct {
	OrderID     int64
	OrderItemID int64
	FileName    string
	FileURL     string
	MimeType    string
	Format      string
	SizeBytes   int64
}

type OrderFileRepository interface {
	OrderExistsInDepartment(ctx context.Context, deptID int, orderID int64) (bool, error)
	ListByOrderID(ctx context.Context, orderID int64) ([]*model.OrderFileDTO, error)
	Create(ctx context.Context, params CreateOrderFileParams) (*model.OrderFileDTO, error)
	GetByID(ctx context.Context, orderID int64, fileID int64) (*model.OrderFileDTO, error)
	Delete(ctx context.Context, orderID int64, fileID int64) error
}

type orderFileRepository struct {
	db *generated.Client
}

func NewOrderFileRepository(db *generated.Client) OrderFileRepository {
	return &orderFileRepository{db: db}
}

func (r *orderFileRepository) OrderExistsInDepartment(ctx context.Context, deptID int, orderID int64) (bool, error) {
	return r.db.Order.Query().
		Where(
			order.IDEQ(orderID),
			order.DepartmentIDEQ(deptID),
			order.DeletedAtIsNil(),
		).
		Exist(ctx)
}

func (r *orderFileRepository) ListByOrderID(ctx context.Context, orderID int64) ([]*model.OrderFileDTO, error) {
	entities, err := r.db.OrderItemFile.Query().
		Where(
			orderitemfile.FileTypeEQ(PrescriptionFileType),
			orderitemfile.HasItemWith(
				orderitem.OrderIDEQ(orderID),
				orderitem.DeletedAtIsNil(),
			),
		).
		Order(generated.Desc(orderitemfile.FieldCreatedAt), generated.Desc(orderitemfile.FieldID)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]*model.OrderFileDTO, 0, len(entities))
	for _, entity := range entities {
		dto, mapErr := mapOrderFileEntity(orderID, entity)
		if mapErr != nil {
			return nil, mapErr
		}
		out = append(out, dto)
	}
	return out, nil
}

func (r *orderFileRepository) Create(ctx context.Context, params CreateOrderFileParams) (*model.OrderFileDTO, error) {
	meta, err := json.Marshal(orderFileMetadata{
		FileName:  params.FileName,
		MimeType:  params.MimeType,
		Format:    params.Format,
		SizeBytes: params.SizeBytes,
	})
	if err != nil {
		return nil, err
	}

	entity, err := r.db.OrderItemFile.Create().
		SetOrderItemID(params.OrderItemID).
		SetFileURL(params.FileURL).
		SetFileType(PrescriptionFileType).
		SetDescription(string(meta)).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	return mapOrderFileEntity(params.OrderID, entity)
}

func (r *orderFileRepository) GetByID(ctx context.Context, orderID int64, fileID int64) (*model.OrderFileDTO, error) {
	entity, err := r.db.OrderItemFile.Query().
		Where(
			orderitemfile.IDEQ(fileID),
			orderitemfile.FileTypeEQ(PrescriptionFileType),
			orderitemfile.HasItemWith(
				orderitem.OrderIDEQ(orderID),
				orderitem.DeletedAtIsNil(),
			),
		).
		Only(ctx)
	if err != nil {
		return nil, err
	}
	return mapOrderFileEntity(orderID, entity)
}

func (r *orderFileRepository) Delete(ctx context.Context, orderID int64, fileID int64) error {
	affected, err := r.db.OrderItemFile.Delete().
		Where(
			orderitemfile.IDEQ(fileID),
			orderitemfile.FileTypeEQ(PrescriptionFileType),
			orderitemfile.HasItemWith(
				orderitem.OrderIDEQ(orderID),
				orderitem.DeletedAtIsNil(),
			),
		).
		Exec(ctx)
	if err != nil {
		return err
	}
	if affected == 0 {
		return fmt.Errorf("prescription file not found")
	}
	return nil
}

func mapOrderFileEntity(orderID int64, entity *generated.OrderItemFile) (*model.OrderFileDTO, error) {
	if entity == nil {
		return nil, fmt.Errorf("order file is nil")
	}

	meta := orderFileMetadata{}
	if entity.Description != "" {
		if err := json.Unmarshal([]byte(entity.Description), &meta); err != nil {
			return nil, err
		}
	}

	return &model.OrderFileDTO{
		ID:          entity.ID,
		OrderID:     orderID,
		OrderItemID: entity.OrderItemID,
		FileName:    meta.FileName,
		FileURL:     entity.FileURL,
		FileType:    entity.FileType,
		Format:      meta.Format,
		MimeType:    meta.MimeType,
		SizeBytes:   meta.SizeBytes,
		CreatedAt:   entity.CreatedAt,
	}, nil
}

func IsPrescriptionFileNotFound(err error) bool {
	if err == nil {
		return false
	}
	return generated.IsNotFound(err)
}
