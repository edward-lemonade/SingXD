package auth

import (
	"context"
	"fmt"
	"time"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type AuthService struct {
	client *firebaseauth.Client
}

const SessionCookieName = "singxd_session"

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

// validates a Firebase ID token and returns the decoded token
func (s *AuthService) VerifyIDToken(ctx context.Context, idToken string) (*firebaseauth.Token, error) {
	token, err := s.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}
	return token, nil
}

// exchanges a Firebase ID token for a Firebase session cookie
func (s *AuthService) CreateSessionCookie(ctx context.Context, idToken string, expiresIn time.Duration) (string, error) {
	if idToken == "" {
		return "", ErrMissingIDToken
	}

	cookie, err := s.client.SessionCookie(ctx, idToken, expiresIn)
	if err != nil {
		return "", fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}

	return cookie, nil
}

// validates a Firebase session cookie and returns the decoded token
func (s *AuthService) VerifySessionCookie(ctx context.Context, sessionCookie string) (*firebaseauth.Token, error) {
	token, err := s.client.VerifySessionCookie(ctx, sessionCookie)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}

	return token, nil
}
