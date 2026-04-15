package repository

import (
	"context"

	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/material"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitem"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/orderitemmaterial"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/mapper"
	"github.com/khiemnd777/noah_api/shared/utils"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

func (r *orderItemMaterialRepository) GetLoanerMaterials(
	ctx context.Context,
	query table.TableQuery,
) (table.TableListResult[model.OrderItemMaterialDTO], error) {
	base := r.db.OrderItemMaterial.
		Query().
		Where(
			orderitemmaterial.TypeEQ("loaner"),
			orderitemmaterial.StatusIn("on_loan", "partial_returned"),
			orderitemmaterial.IsCloneableIsNil(),
		)

	list, err := table.TableListV2(
		ctx,
		base,
		query,
		orderitemmaterial.Table,
		orderitemmaterial.FieldID,
		orderitemmaterial.FieldID,
		func(q *generated.OrderItemMaterialQuery) *generated.OrderItemMaterialQuery {
			return q.
				Select(
					orderitemmaterial.FieldID,
					orderitemmaterial.FieldMaterialCode,
					orderitemmaterial.FieldMaterialID,
					orderitemmaterial.FieldOrderItemID,
					orderitemmaterial.FieldOrderID,
					orderitemmaterial.FieldQuantity,
					orderitemmaterial.FieldType,
					orderitemmaterial.FieldStatus,
					orderitemmaterial.FieldRetailPrice,
					orderitemmaterial.FieldNote,
					orderitemmaterial.FieldClinicID,
					orderitemmaterial.FieldClinicName,
					orderitemmaterial.FieldDentistID,
					orderitemmaterial.FieldDentistName,
					orderitemmaterial.FieldPatientID,
					orderitemmaterial.FieldPatientName,
					orderitemmaterial.FieldOnLoanAt,
					orderitemmaterial.FieldReturnedAt,
				).
				WithOrderItem(func(oq *generated.OrderItemQuery) {
					oq.Select(orderitem.FieldCode)
				}).
				WithMaterial(func(mq *generated.MaterialQuery) {
					mq.Select(material.FieldName)
				})
		},
		func(src []*generated.OrderItemMaterial) []*model.OrderItemMaterialDTO {
			out := make([]*model.OrderItemMaterialDTO, 0, len(src))
			for _, item := range src {
				if item == nil {
					continue
				}
				dto := mapper.MapAs[*generated.OrderItemMaterial, *model.OrderItemMaterialDTO](item)
				if item.Edges.OrderItem != nil {
					dto.OrderItemCode = item.Edges.OrderItem.Code
				}
				if item.Edges.Material != nil {
					dto.MaterialName = item.Edges.Material.Name
				}
				out = append(out, dto)
			}
			return out
		},
	)
	if err != nil {
		var zero table.TableListResult[model.OrderItemMaterialDTO]
		return zero, err
	}

	return list, nil
}

func (r *orderItemMaterialRepository) PrepareLoanerMaterials(dto *model.OrderItemDTO) []*model.OrderItemMaterialDTO {
	if dto == nil {
		return nil
	}

	combined := append([]*model.OrderItemMaterialDTO{}, dto.LoanerMaterials...)
	combined = append(combined, dto.ImplantAccessories...)
	if len(combined) == 0 {
		return nil
	}

	out := make([]*model.OrderItemMaterialDTO, 0, len(combined))
	seen := make(map[int]struct{}, len(combined))

	for _, material := range combined {
		if material == nil || material.MaterialID == 0 {
			continue
		}
		if _, ok := seen[material.MaterialID]; ok {
			continue
		}
		seen[material.MaterialID] = struct{}{}

		qty := r.normalizeQuantity(material.Quantity)
		out = append(out, &model.OrderItemMaterialDTO{
			ID:                  material.ID,
			MaterialID:          material.MaterialID,
			MaterialCode:        material.MaterialCode,
			MaterialName:        material.MaterialName,
			OrderItemID:         material.OrderItemID,
			OrderItemCode:       material.OrderItemCode,
			OriginalOrderItemID: material.OriginalOrderItemID,
			OrderID:             material.OrderID,
			Quantity:            qty,
			Type:                utils.Ptr("loaner"),
			Status:              material.Status,
			IsCloneable:         material.IsCloneable,
			Note:                material.Note,
			ReturnedAt:          material.ReturnedAt,
			OnLoanAt:            material.OnLoanAt,
			PatientID:           material.PatientID,
			PatientName:         material.PatientName,
			ClinicID:            material.ClinicID,
			ClinicName:          material.ClinicName,
			DentistID:           material.DentistID,
			DentistName:         material.DentistName,
		})
	}

	return out
}

func (r *orderItemMaterialRepository) PrepareLoanerForCreate(materials []*model.OrderItemMaterialDTO) []*model.OrderItemMaterialDTO {
	if len(materials) == 0 {
		return materials
	}

	status := utils.Ptr("on_loan")
	for _, material := range materials {
		if material == nil {
			continue
		}
		material.Status = status
	}

	return materials
}

func (r *orderItemMaterialRepository) appendLoanerMaterial(target *model.OrderItemDTO, materialDTO *model.OrderItemMaterialDTO, isImplant bool) {
	if target == nil || materialDTO == nil {
		return
	}
	if isImplant {
		target.ImplantAccessories = append(target.ImplantAccessories, materialDTO)
		return
	}
	target.LoanerMaterials = append(target.LoanerMaterials, materialDTO)
}

func (r *orderItemMaterialRepository) splitLoanerRows(rows []*generated.OrderItemMaterial) ([]*model.OrderItemMaterialDTO, []*model.OrderItemMaterialDTO) {
	loanerMaterials := make([]*model.OrderItemMaterialDTO, 0)
	implantAccessories := make([]*model.OrderItemMaterialDTO, 0)

	for _, row := range rows {
		if row == nil {
			continue
		}

		dto := mapper.MapAs[*generated.OrderItemMaterial, *model.OrderItemMaterialDTO](row)
		isImplant := false
		if row.Edges.Material != nil {
			dto.MaterialName = row.Edges.Material.Name
			isImplant = row.Edges.Material.IsImplant
		}

		if isImplant {
			implantAccessories = append(implantAccessories, dto)
		} else {
			loanerMaterials = append(loanerMaterials, dto)
		}
	}

	return loanerMaterials, implantAccessories
}

func (r *orderItemMaterialRepository) replaceLoanerCurrent(
	ctx context.Context,
	tx *generated.Tx,
	orderID int64,
	orderItemID int64,
	materials []*model.OrderItemMaterialDTO,
) error {

	// Delete ALL loaner rows of CURRENT order item (FULL STATE)
	if _, err := tx.OrderItemMaterial.Delete().
		Where(
			orderitemmaterial.OrderItemIDEQ(orderItemID),
			orderitemmaterial.TypeEQ("loaner"),
		).
		Exec(ctx); err != nil {
		return err
	}

	if len(materials) == 0 {
		return nil
	}

	bulk := make([]*generated.OrderItemMaterialCreate, 0, len(materials))

	for _, m := range materials {
		if m == nil || m.MaterialID == 0 {
			continue
		}

		qty := r.normalizeQuantity(m.Quantity)

		origOID := orderItemID
		if m.OriginalOrderItemID != nil && *m.OriginalOrderItemID != 0 {
			origOID = *m.OriginalOrderItemID
		}

		c := tx.OrderItemMaterial.Create().
			SetOrderID(orderID).
			SetOrderItemID(orderItemID).
			SetOriginalOrderItemID(origOID).
			SetMaterialID(m.MaterialID).
			SetQuantity(qty).
			SetType("loaner").
			SetNillableStatus(m.Status).
			SetNillableIsCloneable(m.IsCloneable).
			SetNillableClinicID(m.ClinicID).
			SetNillableClinicName(m.ClinicName).
			SetNillableDentistID(m.DentistID).
			SetNillableDentistName(m.DentistName).
			SetNillablePatientID(m.PatientID).
			SetNillablePatientName(m.PatientName).
			SetNillableOnLoanAt(m.OnLoanAt).
			SetNillableReturnedAt(m.ReturnedAt).
			SetNillableNote(m.Note)

		// Optional:
		// c.SetNillableMaterialCode(m.MaterialCode)
		// c.SetNillableMaterialName(m.MaterialName)
		// c.SetNillableOrderItemCode(m.OrderItemCode)

		bulk = append(bulk, c)
	}

	if len(bulk) == 0 {
		return nil
	}

	_, err := tx.OrderItemMaterial.CreateBulk(bulk...).Save(ctx)
	return err
}

func (r *orderItemMaterialRepository) SyncLoaner(
	ctx context.Context,
	tx *generated.Tx,
	orderID int64,
	orderItemID int64,
	materials []*model.OrderItemMaterialDTO,
) ([]*model.OrderItemMaterialDTO, []*model.OrderItemMaterialDTO, error) {

	logger.Debug("SyncLoanerV2: start",
		"orderItemID", orderItemID,
		"inputCount", len(materials),
	)

	current := make([]*model.OrderItemMaterialDTO, 0, len(materials))
	cloneToParent := make(map[int64][]*model.OrderItemMaterialDTO)
	cloneToChildren := make([]*model.OrderItemMaterialDTO, 0)

	for _, m := range materials {
		if m == nil || m.MaterialID == 0 {
			continue
		}

		current = append(current, m)

		isCloneable := m.IsCloneable != nil && *m.IsCloneable

		if isCloneable {
			if m.OriginalOrderItemID != nil && *m.OriginalOrderItemID != orderItemID {
				parentOID := *m.OriginalOrderItemID
				cloneToParent[parentOID] = append(cloneToParent[parentOID], m)
			}
		} else {
			cloneToChildren = append(cloneToChildren, m)
		}
	}

	// WRITE CURRENT
	if err := r.replaceLoanerCurrent(
		ctx, tx, orderID, orderItemID, current,
	); err != nil {
		return nil, nil, err
	}

	// UP
	for parentOID, items := range cloneToParent {
		if parentOID == orderItemID {
			continue
		}

		if err := r.syncLoanerFromDerived(
			ctx,
			tx,
			orderID,
			parentOID,
			items,
		); err != nil {
			return nil, nil, err
		}

		if err := r.syncLoanerFromSource(
			ctx,
			tx,
			orderID,
			parentOID,
			items,
		); err != nil {
			return nil, nil, err
		}
	}

	// DOWN
	if len(cloneToChildren) > 0 {
		if err := r.syncLoanerFromSource(
			ctx, tx,
			orderID,
			orderItemID,
			cloneToChildren,
		); err != nil {
			return nil, nil, err
		}
	}

	rows, err := tx.OrderItemMaterial.
		Query().
		Where(
			orderitemmaterial.OrderItemIDEQ(orderItemID),
			orderitemmaterial.TypeEQ("loaner"),
		).
		WithMaterial(func(mq *generated.MaterialQuery) {
			mq.Select(material.FieldName, material.FieldIsImplant)
		}).
		All(ctx)
	if err != nil {
		return nil, nil, err
	}
	loanerMaterials, implantAccessories := r.splitLoanerRows(rows)

	logger.Debug("SyncLoanerV2: done",
		"orderItemID", orderItemID,
		"finalCount", len(loanerMaterials)+len(implantAccessories),
	)

	return loanerMaterials, implantAccessories, nil
}

func (r *orderItemMaterialRepository) syncLoanerFromDerived(
	ctx context.Context,
	tx *generated.Tx,
	orderID int64,
	sourceOrderItemID int64,
	materials []*model.OrderItemMaterialDTO,
) error {

	if _, err := tx.OrderItemMaterial.Delete().
		Where(
			orderitemmaterial.OrderItemIDEQ(sourceOrderItemID),
			orderitemmaterial.OriginalOrderItemIDEQ(sourceOrderItemID),
			orderitemmaterial.TypeEQ("loaner"),
		).
		Exec(ctx); err != nil {
		return err
	}

	if len(materials) == 0 {
		return nil
	}

	bulk := r.buildMaterialBulk(
		tx,
		orderID,
		sourceOrderItemID,
		sourceOrderItemID,
		materials,
		materialBulkOptions{
			materialType: "loaner",
			withStatus:   true,
		},
	)

	if len(bulk) > 0 {
		if _, err := tx.OrderItemMaterial.CreateBulk(bulk...).Save(ctx); err != nil {
			return err
		}
	}

	return nil
}

func (r *orderItemMaterialRepository) syncLoanerFromSource(
	ctx context.Context,
	tx *generated.Tx,
	orderID int64,
	sourceOrderItemID int64,
	sourceMaterials []*model.OrderItemMaterialDTO,
) error {
	return r.syncFromSource(
		ctx,
		tx,
		orderID,
		sourceOrderItemID,
		sourceMaterials,
		materialBulkOptions{materialType: "loaner", withStatus: true},
	)
}

func (r *orderItemMaterialRepository) LoadLoaner(ctx context.Context, items ...*model.OrderItemDTO) error {
	if len(items) == 0 {
		return nil
	}

	itemIndex := make(map[int64]*model.OrderItemDTO, len(items))
	itemIDs := make([]int64, 0, len(items))
	for _, it := range items {
		if it == nil {
			continue
		}
		itemIDs = append(itemIDs, it.ID)
		itemIndex[it.ID] = it
	}

	if len(itemIDs) == 0 {
		return nil
	}

	relations, err := r.db.OrderItemMaterial.Query().
		Where(
			orderitemmaterial.OrderItemIDIn(itemIDs...),
			orderitemmaterial.TypeEQ("loaner"),
		).
		WithMaterial(func(mq *generated.MaterialQuery) {
			mq.Select(material.FieldName, material.FieldIsImplant)
		}).
		All(ctx)
	if err != nil {
		return err
	}

	for _, rel := range relations {
		if dto, ok := itemIndex[rel.OrderItemID]; ok {
			mapped := mapper.MapAs[*generated.OrderItemMaterial, *model.OrderItemMaterialDTO](rel)
			isImplant := false
			if rel.Edges.Material != nil {
				mapped.MaterialName = rel.Edges.Material.Name
				isImplant = rel.Edges.Material.IsImplant
			}
			r.appendLoanerMaterial(dto, mapped, isImplant)
		}
	}

	return nil
}

func (r *orderItemMaterialRepository) PrepareLoanerForRemake(
	ctx context.Context,
	items ...*model.OrderItemDTO,
) error {
	if len(items) == 0 {
		return nil
	}

	itemIndex := make(map[int64]*model.OrderItemDTO, len(items))
	itemIDs := make([]int64, 0, len(items))

	for _, it := range items {
		if it == nil {
			continue
		}
		itemIDs = append(itemIDs, it.ID)
		itemIndex[it.ID] = it
	}

	if len(itemIDs) == 0 {
		return nil
	}

	relations, err := r.db.OrderItemMaterial.
		Query().
		Where(
			orderitemmaterial.OrderItemIDIn(itemIDs...),
			orderitemmaterial.TypeEQ("loaner"),
		).
		WithMaterial(func(mq *generated.MaterialQuery) {
			mq.Select(material.FieldName, material.FieldIsImplant)
		}).
		All(ctx)
	if err != nil {
		return err
	}

	for _, rel := range relations {
		dto, ok := itemIndex[rel.OrderItemID]
		if !ok {
			continue
		}

		mapped := mapper.MapAs[
			*generated.OrderItemMaterial,
			*model.OrderItemMaterialDTO,
		](rel)
		isImplant := false
		if rel.Edges.Material != nil {
			mapped.MaterialName = rel.Edges.Material.Name
			isImplant = rel.Edges.Material.IsImplant
		}

		cloneable := true
		mapped.IsCloneable = &cloneable

		r.appendLoanerMaterial(dto, mapped, isImplant)
	}

	return nil
}
