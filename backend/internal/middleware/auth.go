package middleware

import (
	"singxd/internal/service/auth"
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
)

const UIDKey = "uid"

func Auth(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionCookie, cookieErr := c.Cookie(auth.SessionCookieName)
		if cookieErr != nil || sessionCookie == "" {
			transport.ServiceError(c, auth.ErrMissingToken)
			c.Abort()
			return
		}

		token, err := authService.VerifySessionCookie(c.Request.Context(), sessionCookie)
		if err != nil {
			transport.ServiceError(c, err)
			c.Abort()
			return
		}

		c.Set(UIDKey, token.UID)
		c.Next()
	}
}

func OptionalAuth(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionCookie, cookieErr := c.Cookie(auth.SessionCookieName)
		if cookieErr != nil || sessionCookie == "" {
			c.Next()
			return
		}

		token, err := authService.VerifySessionCookie(c.Request.Context(), sessionCookie)
		if err != nil {
			c.Next()
			return
		}

		c.Set(UIDKey, token.UID)
		c.Next()
	}
}
