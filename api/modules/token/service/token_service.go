package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/khiemnd777/noah_api/modules/token/repository"
	"github.com/khiemnd777/noah_api/shared/auth"
	"github.com/khiemnd777/noah_api/shared/cache"
	"github.com/khiemnd777/noah_api/shared/redis"
	"github.com/khiemnd777/noah_api/shared/utils"
)

type TokenService struct {
	repo       *repository.TokenRepository
	secret     string
	refreshTTL time.Duration
	accessTTL  time.Duration
}

var ErrInvalidRefreshToken = errors.New("invalid refresh token")
var ErrInvalidDepartmentMembership = errors.New("invalid department membership")

func userPermissionCacheKey(id int) string {
	return fmt.Sprintf("user:%d:perms", id)
}

func userDepartmentCacheKey(id int) string {
	return fmt.Sprintf("user:%d:dept", id)
}

func NewTokenService(repo *repository.TokenRepository, secret string) *TokenService {
	return &TokenService{
		repo:       repo,
		secret:     secret,
		refreshTTL: 7 * 24 * time.Hour,
		accessTTL:  15 * time.Minute,
	}
}

func (s *TokenService) GetPermissionsByUserID(ctx context.Context, id int) (*map[string]struct{}, error) {
	if redis.GetInstance("cache") == nil {
		return s.repo.GetPermissionsByUserID(ctx, id)
	}
	return cache.Get(userPermissionCacheKey(id), cache.TTLLong, func() (*map[string]struct{}, error) {
		return s.repo.GetPermissionsByUserID(ctx, id)
	})
}

func (s *TokenService) GenerateTokens(ctx context.Context, id, departmentID int) (*auth.AuthTokenPair, error) {
	if departmentID <= 0 {
		return nil, ErrInvalidDepartmentMembership
	}

	user, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	isMember, err := s.repo.IsActiveDepartmentMember(ctx, id, departmentID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, ErrInvalidDepartmentMembership
	}

	perms, err := s.GetPermissionsByUserID(ctx, id)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	return s.generateTokenPair(ctx, user.ID, user.Email, departmentID, perms)
}

func (s *TokenService) generateTokenPair(ctx context.Context, userID int, email string, departmentID int, perms *map[string]struct{}) (*auth.AuthTokenPair, error) {
	access, err := utils.GenerateJWTToken(s.secret, utils.JWTTokenPayload{
		UserID:       userID,
		Email:        email,
		DepartmentID: departmentID,
		Permissions:  perms,
		Exp:          time.Now().Add(s.accessTTL),
	})
	if err != nil {
		return nil, err
	}

	refresh, err := utils.GenerateJWTToken(s.secret, utils.JWTTokenPayload{
		UserID:       userID,
		Email:        email,
		DepartmentID: departmentID,
		Permissions:  perms,
		Exp:          time.Now().Add(s.refreshTTL),
	})
	if err != nil {
		return nil, err
	}

	err = s.repo.CreateRefreshToken(ctx, userID, refresh, time.Now().Add(s.refreshTTL))
	if err != nil {
		return nil, err
	}

	return &auth.AuthTokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
	}, nil
}

func (s *TokenService) RefreshToken(ctx context.Context, refreshToken string) (*auth.AuthTokenPair, error) {
	claims, ok, err := utils.GetJWTClaimsFromToken(s.secret, refreshToken)
	if !ok || err != nil {
		return nil, ErrInvalidRefreshToken
	}
	departmentID, ok := claimInt(claims["dept_id"])
	if !ok || departmentID <= 0 {
		return nil, ErrInvalidRefreshToken
	}

	found, valid, userID, email, err := s.repo.IsRefreshTokenValid(ctx, refreshToken)

	if err != nil {
		return nil, fmt.Errorf("failed to validate refresh token: %w", err)
	}

	if !found || !valid {
		return nil, ErrInvalidRefreshToken
	}

	claimUserID, ok := claimInt(claims["user_id"])
	if !ok || claimUserID != userID {
		return nil, ErrInvalidRefreshToken
	}

	isMember, err := s.repo.IsActiveDepartmentMember(ctx, userID, departmentID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, ErrInvalidDepartmentMembership
	}

	perms, err := s.GetPermissionsByUserID(ctx, userID)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	return s.generateTokenPair(ctx, userID, email, departmentID, perms)
}

func (s *TokenService) DeleteRefreshToken(ctx context.Context, refreshToken string) error {
	return s.repo.DeleteRefreshToken(ctx, refreshToken)
}

func (s *TokenService) CleanupExpiredRefreshTokens(ctx context.Context) error {
	return s.repo.DeleteExpiredRefreshTokens(ctx)
}

func claimInt(raw any) (int, bool) {
	switch v := raw.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	default:
		return 0, false
	}
}
