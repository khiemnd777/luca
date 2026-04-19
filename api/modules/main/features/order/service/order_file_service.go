package service

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/order/repository"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/module"
	sharedstorage "github.com/khiemnd777/noah_api/shared/storage"
	"github.com/khiemnd777/noah_api/shared/utils"
)

const (
	prescriptionStorageDir          = "files"
	defaultPrescriptionMaxSizeMB    = 10
	prescriptionMaxSizeEnv          = "PRESCRIPTION_FILES_MAX_SIZE_MB"
	prescriptionAllowedMimesEnv     = "PRESCRIPTION_FILES_ALLOWED_MIME_TYPES"
	defaultPrescriptionAllowedMimes = "image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

type OrderFileService interface {
	List(ctx context.Context, deptID int, orderID int64) ([]*model.OrderFileDTO, error)
	Upload(ctx context.Context, deptID int, orderID int64, fileHeader *multipart.FileHeader) (*model.OrderFileDTO, error)
	Delete(ctx context.Context, deptID int, orderID int64, fileID int64) error
	GetFilePath(ctx context.Context, deptID int, orderID int64, fileID int64) (string, string, string, error)
	BuildContentURL(ctx context.Context, deptID int, orderID int64, fileID int64) string
}

type orderFileService struct {
	repo          repository.OrderFileRepository
	orderItemRepo repository.OrderItemRepository
	deps          *module.ModuleDeps[config.ModuleConfig]
	storage       sharedstorage.Storage
}

func NewOrderFileService(
	repo repository.OrderFileRepository,
	orderItemRepo repository.OrderItemRepository,
	deps *module.ModuleDeps[config.ModuleConfig],
) OrderFileService {
	return &orderFileService{
		repo:          repo,
		orderItemRepo: orderItemRepo,
		deps:          deps,
		storage:       sharedstorage.NewLocalStorage(filepath.Join(resolveStorageRoot(), prescriptionStorageDir), "", ""),
	}
}

func (s *orderFileService) List(ctx context.Context, deptID int, orderID int64) ([]*model.OrderFileDTO, error) {
	if err := s.ensureOrderInDepartment(ctx, deptID, orderID); err != nil {
		return nil, err
	}
	return s.repo.ListByOrderID(ctx, orderID)
}

func (s *orderFileService) Upload(
	ctx context.Context,
	deptID int,
	orderID int64,
	fileHeader *multipart.FileHeader,
) (*model.OrderFileDTO, error) {
	if err := s.ensureOrderInDepartment(ctx, deptID, orderID); err != nil {
		return nil, err
	}

	format, mimeType, err := validatePrescriptionFile(fileHeader)
	if err != nil {
		return nil, err
	}

	orderItemID, err := s.orderItemRepo.GetLatestOrderItemIDByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	relPath := buildPrescriptionStoragePath(orderID, format)
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to read file")
	}
	defer file.Close()

	if _, err := s.storage.Upload(ctx, relPath, file); err != nil {
		return nil, err
	}

	dto, err := s.repo.Create(ctx, repository.CreateOrderFileParams{
		OrderID:     orderID,
		OrderItemID: orderItemID,
		FileName:    strings.TrimSpace(fileHeader.Filename),
		FileURL:     relPath,
		MimeType:    mimeType,
		Format:      format,
		SizeBytes:   fileHeader.Size,
	})
	if err != nil {
		_ = os.Remove(filepath.Join(resolveStorageRoot(), prescriptionStorageDir, filepath.FromSlash(relPath)))
		return nil, err
	}

	keys := append([]string{kOrderByID(orderID), kOrderByIDAll(orderID)}, kOrderAll(deptID)...)
	invalidateKeysHook(keys...)
	return dto, nil
}

func (s *orderFileService) Delete(ctx context.Context, deptID int, orderID int64, fileID int64) error {
	if err := s.ensureOrderInDepartment(ctx, deptID, orderID); err != nil {
		return err
	}

	dto, err := s.repo.GetByID(ctx, orderID, fileID)
	if err != nil {
		return err
	}

	if err := s.repo.Delete(ctx, orderID, fileID); err != nil {
		return err
	}

	fullPath := filepath.Join(resolveStorageRoot(), prescriptionStorageDir, filepath.FromSlash(strings.TrimLeft(dto.FileURL, "/")))
	if removeErr := os.Remove(fullPath); removeErr != nil && !os.IsNotExist(removeErr) {
		logger.Warn("prescription_file_remove_failed", "file_id", fileID, "path", fullPath, "error", removeErr.Error())
	}

	keys := append([]string{kOrderByID(orderID), kOrderByIDAll(orderID)}, kOrderAll(deptID)...)
	invalidateKeysHook(keys...)
	return nil
}

func (s *orderFileService) GetFilePath(
	ctx context.Context,
	deptID int,
	orderID int64,
	fileID int64,
) (string, string, string, error) {
	if err := s.ensureOrderInDepartment(ctx, deptID, orderID); err != nil {
		return "", "", "", err
	}

	dto, err := s.repo.GetByID(ctx, orderID, fileID)
	if err != nil {
		return "", "", "", err
	}

	fullPath := filepath.Join(resolveStorageRoot(), prescriptionStorageDir, filepath.FromSlash(strings.TrimLeft(dto.FileURL, "/")))
	if _, err := os.Stat(fullPath); err != nil {
		return "", "", "", err
	}
	return fullPath, dto.MimeType, dto.FileName, nil
}

func (s *orderFileService) BuildContentURL(ctx context.Context, deptID int, orderID int64, fileID int64) string {
	baseRoute := strings.TrimRight(strings.TrimSpace(s.deps.Config.Server.Route), "/")
	if baseRoute == "" {
		baseRoute = "/api/department"
	}
	return fmt.Sprintf("%s/%d/order/%d/prescription-files/%d/content", baseRoute, deptID, orderID, fileID)
}

func (s *orderFileService) ensureOrderInDepartment(ctx context.Context, deptID int, orderID int64) error {
	if deptID <= 0 || orderID <= 0 {
		return fmt.Errorf("invalid order id")
	}
	exists, err := s.repo.OrderExistsInDepartment(ctx, deptID, orderID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("order not found")
	}
	return nil
}

func resolveStorageRoot() string {
	root := strings.TrimSpace(os.Getenv("STORAGE_ROOT"))
	if root == "" {
		root = "storage"
	}
	return utils.ExpandHomeDir(root)
}

func buildPrescriptionStoragePath(orderID int64, format string) string {
	ext := format
	if ext != "" && !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}
	return path.Join(fmt.Sprintf("orders/%d", orderID), uuid.NewString()+ext)
}

func validatePrescriptionFile(fileHeader *multipart.FileHeader) (string, string, error) {
	maxSizeBytes := prescriptionFileMaxSizeBytes()
	if fileHeader == nil || fileHeader.Size <= 0 || fileHeader.Size > maxSizeBytes {
		return "", "", fmt.Errorf("file exceeds the maximum allowed size")
	}

	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(strings.TrimSpace(fileHeader.Filename)), "."))
	if ext == "doc" {
		return "", "", fmt.Errorf("unsupported file format")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", "", fmt.Errorf("failed to open file")
	}
	defer file.Close()

	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", "", fmt.Errorf("failed to read file")
	}

	detected := strings.ToLower(strings.TrimSpace(http.DetectContentType(buffer[:n])))
	allowed := allowedPrescriptionMimeTypes()
	switch ext {
	case "jpg", "jpeg", "png", "webp":
		mimeType := normalizeImageMimeType(ext, detected)
		if _, ok := allowed[mimeType]; !ok {
			return "", "", fmt.Errorf("unsupported file mime type")
		}
		return ext, mimeType, nil
	case "pdf":
		if detected != "application/pdf" {
			return "", "", fmt.Errorf("unsupported file mime type")
		}
		if _, ok := allowed["application/pdf"]; !ok {
			return "", "", fmt.Errorf("unsupported file mime type")
		}
		return ext, "application/pdf", nil
	case "docx":
		docxMime := "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		if _, ok := allowed[docxMime]; !ok {
			return "", "", fmt.Errorf("unsupported file mime type")
		}
		return ext, docxMime, nil
	default:
		return "", "", fmt.Errorf("unsupported file format")
	}
}

func normalizeImageMimeType(ext string, detected string) string {
	switch ext {
	case "jpg", "jpeg":
		return "image/jpeg"
	case "png":
		return "image/png"
	case "webp":
		return "image/webp"
	default:
		return detected
	}
}

func allowedPrescriptionMimeTypes() map[string]struct{} {
	raw := strings.TrimSpace(os.Getenv(prescriptionAllowedMimesEnv))
	if raw == "" {
		raw = defaultPrescriptionAllowedMimes
	}

	out := map[string]struct{}{}
	for _, item := range strings.Split(raw, ",") {
		value := strings.ToLower(strings.TrimSpace(item))
		if value == "" {
			continue
		}
		out[value] = struct{}{}
	}
	return out
}

func prescriptionFileMaxSizeBytes() int64 {
	value := strings.TrimSpace(os.Getenv(prescriptionMaxSizeEnv))
	if value == "" {
		return int64(defaultPrescriptionMaxSizeMB) * 1024 * 1024
	}

	mb, err := strconv.ParseInt(value, 10, 64)
	if err != nil || mb <= 0 {
		return int64(defaultPrescriptionMaxSizeMB) * 1024 * 1024
	}
	return mb * 1024 * 1024
}
