package auth

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type AuthService struct {
	client *firebaseauth.Client
}

func NewAuthService(ctx context.Context, credentialsFile string) (*AuthService, error) {
	var app *firebase.App
	var err error

	if credentialsFile != "" {
		app, err = firebase.NewApp(ctx, nil, option.WithCredentialsFile(credentialsFile))
	} else {
		app, err = firebase.NewApp(ctx, nil)
	}
	if err != nil {
		return nil, fmt.Errorf("initializing firebase app: %w", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting firebase auth client: %w", err)
	}

	return &AuthService{client: client}, nil
}

// VerifyIDToken validates a Firebase ID token and returns the decoded token.
func (s *AuthService) VerifyIDToken(ctx context.Context, idToken string) (*firebaseauth.Token, error) {
	token, err := s.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}
	return token, nil
}
