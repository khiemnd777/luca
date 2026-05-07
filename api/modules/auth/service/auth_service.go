package service

import (
	"context"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/google/uuid"
	authErrors "github.com/khiemnd777/noah_api/modules/auth/model/error"
	"github.com/khiemnd777/noah_api/modules/auth/repository"
	"github.com/khiemnd777/noah_api/shared/auth"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	tokenApi "github.com/khiemnd777/noah_api/shared/modules/token"
	"github.com/khiemnd777/noah_api/shared/pubsub"
	"github.com/khiemnd777/noah_api/shared/utils"
)

type AuthService struct {
	repo       *repository.AuthRepository
	secret     string
	refreshTTL time.Duration
	accessTTL  time.Duration
}

const departmentSelectionPurpose = "department_selection"

var ErrInvalidSelectionToken = errors.New("invalid department selection token")
var ErrInvalidDepartmentMembership = errors.New("invalid department membership")

func NewAuthService(repo *repository.AuthRepository, secret string) *AuthService {
	return &AuthService{
		repo:       repo,
		secret:     secret,
		refreshTTL: 7 * 24 * time.Hour,
		accessTTL:  15 * time.Minute,
	}
}

func (s *AuthService) CreateNewUser(ctx context.Context, phoneOrEmail, password, name string) (*generated.User, error) {
	var phone *string
	var email *string

	switch {
	case utils.IsEmail(phoneOrEmail):
		email = &phoneOrEmail
		if exists, _ := s.repo.CheckEmailExists(ctx, *email); exists {
			return nil, authErrors.ErrPhoneOrEmailExists
		}
	case utils.IsPhone(phoneOrEmail):
		normalizedPhone := utils.NormalizePhone(&phoneOrEmail)
		phone = &normalizedPhone

		if exists, _ := s.repo.CheckPhoneExists(ctx, *phone); exists {
			return nil, authErrors.ErrPhoneOrEmailExists
		}
	default:
		return nil, authErrors.ErrPhoneOrEmailExists
	}

	dummyAvatar := utils.GetDummyAvatarURL(name)

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	refCode := uuid.NewString()
	qrCode := utils.GenerateQRCodeStringForUser(refCode)

	user, err := s.repo.CreateNewUser(ctx, phone, email, string(hashedPassword), name, &dummyAvatar, &refCode, &qrCode)

	if err != nil {
		return nil, err
	}

	// Assign default role
	pubsub.PublishAsync("role:default", utils.AssignDefaultRole{
		UserID:  user.ID,
		RoleIDs: []int{1},
	})

	return user, nil
}

func (s *AuthService) Login(ctx context.Context, phoneOrEmail, password string) (*auth.AuthLoginResponse, error) {
	var (
		resp *auth.AuthLoginResponse
		err  error
	)
	switch {
	case utils.IsEmail(phoneOrEmail):
		_, resp, err = s.LoginWithEmail(ctx, phoneOrEmail, password)
	case utils.IsPhone(phoneOrEmail):
		_, resp, err = s.LoginWithPhone(ctx, phoneOrEmail, password)
	default:
		return nil, authErrors.ErrInvalidCredentials
	}

	return resp, err
}

func (s *AuthService) LoginWithPhone(ctx context.Context, phone, password string) (*generated.User, *auth.AuthLoginResponse, error) {
	user, err := s.repo.GetUserByPhone(ctx, phone)

	if err != nil {
		return nil, nil, authErrors.ErrInvalidCredentials
	}

	return s.loginUser(ctx, user, password)
}

func (s *AuthService) LoginWithEmail(ctx context.Context, email, password string) (*generated.User, *auth.AuthLoginResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)

	if err != nil {
		return user, nil, authErrors.ErrInvalidCredentials
	}

	return s.loginUser(ctx, user, password)
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*auth.AuthTokenPair, error) {
	tokens, err := tokenApi.RefreshTokens(ctx, refreshToken)
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	return tokenApi.DeleteRefreshToken(ctx, refreshToken)
}

func (s *AuthService) SelectDepartment(ctx context.Context, selectionToken string, departmentID int) (*auth.AuthTokenPair, error) {
	if departmentID <= 0 {
		return nil, ErrInvalidDepartmentMembership
	}

	claims, ok, err := utils.GetJWTClaimsFromToken(s.secret, selectionToken)
	if !ok || err != nil {
		return nil, ErrInvalidSelectionToken
	}
	if purpose, _ := claims["purpose"].(string); purpose != departmentSelectionPurpose {
		return nil, ErrInvalidSelectionToken
	}

	userID, ok := claimInt(claims["user_id"])
	if !ok || userID <= 0 {
		return nil, ErrInvalidSelectionToken
	}

	isMember, err := s.repo.IsActiveDepartmentMember(ctx, userID, departmentID)
	if err != nil {
		return nil, err
	}
	if !isMember {
		return nil, ErrInvalidDepartmentMembership
	}

	jti, _ := claims["jti"].(string)
	consumed, err := s.repo.ConsumeDepartmentSelectionToken(ctx, jti, userID)
	if err != nil {
		return nil, err
	}
	if !consumed {
		return nil, ErrInvalidSelectionToken
	}

	return tokenApi.GenerateTokens(ctx, userID, departmentID)
}

func (s *AuthService) loginUser(ctx context.Context, user *generated.User, password string) (*generated.User, *auth.AuthLoginResponse, error) {
	if user == nil {
		return nil, nil, authErrors.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, nil, authErrors.ErrInvalidCredentials
	}

	departments, err := s.repo.ListActiveDepartmentMemberships(ctx, user.ID)
	if err != nil {
		return nil, nil, err
	}
	if len(departments) == 0 {
		return nil, nil, ErrInvalidDepartmentMembership
	}
	if len(departments) > 1 {
		expiresAt := time.Now().Add(5 * time.Minute)
		jti := uuid.NewString()
		selectionToken, err := utils.GenerateJWTToken(s.secret, utils.JWTTokenPayload{
			UserID:  user.ID,
			Email:   user.Email,
			Purpose: departmentSelectionPurpose,
			JTI:     jti,
			Exp:     expiresAt,
		})
		if err != nil {
			return nil, nil, err
		}
		if err := s.repo.StoreDepartmentSelectionToken(ctx, jti, user.ID, expiresAt); err != nil {
			return nil, nil, err
		}
		return user, &auth.AuthLoginResponse{
			RequiresDepartmentSelection: true,
			SelectionToken:              selectionToken,
			Departments:                 mapDepartmentOptions(departments),
		}, nil
	}

	tokens, err := tokenApi.GenerateTokens(ctx, user.ID, departments[0].ID)
	if err != nil {
		return nil, nil, err
	}

	return user, &auth.AuthLoginResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
	}, nil
}

func mapDepartmentOptions(departments []*generated.Department) []*auth.DepartmentSelectionOption {
	options := make([]*auth.DepartmentSelectionOption, 0, len(departments))
	for _, dept := range departments {
		if dept == nil {
			continue
		}
		options = append(options, &auth.DepartmentSelectionOption{
			ID:           dept.ID,
			Name:         dept.Name,
			Slug:         dept.Slug,
			Active:       dept.Active,
			Logo:         dept.Logo,
			LogoRect:     dept.LogoRect,
			Address:      dept.Address,
			PhoneNumber:  dept.PhoneNumber,
			PhoneNumber2: dept.PhoneNumber2,
			PhoneNumber3: dept.PhoneNumber3,
			Email:        dept.Email,
			Tax:          dept.Tax,
		})
	}
	return options
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
