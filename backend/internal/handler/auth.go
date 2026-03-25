package handler

import (
	"net/http"
	"os"
	"time"

	"singxd/internal/service/auth"
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
)

const sessionDuration = 5 * 24 * time.Hour

type AuthHandler struct {
	authService *auth.AuthService
}

func NewAuthHandler(authService *auth.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// ============================================================================================
// Handlers

type createSessionRequest struct {
	IDToken string `json:"idToken"`
}

func (h *AuthHandler) CreateSession(c *gin.Context) {
	var req createSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		transport.BadRequest(c, "A valid Firebase ID token is required.")
		return
	}

	sessionCookie, err := h.authService.CreateSessionCookie(c.Request.Context(), req.IDToken, sessionDuration)
	if err != nil {
		transport.ServiceError(c, err)
		return
	}

	secure := shouldUseSecureCookies()
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(auth.SessionCookieName, sessionCookie, int(sessionDuration.Seconds()), "/", "", secure, true)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AuthHandler) ClearSession(c *gin.Context) {
	secure := shouldUseSecureCookies()
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(auth.SessionCookieName, "", -1, "/", "", secure, true)
	c.Status(http.StatusNoContent)
}

func shouldUseSecureCookies() bool {
	return os.Getenv("COOKIE_SECURE") == "true" || os.Getenv("GIN_MODE") == "release"
}
