package middleware

import (
	"strings"

	"singxd/internal/service/auth"
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
)

const UIDKey = "uid"

func Auth(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			transport.ServiceError(c, auth.ErrMissingToken)
			c.Abort()
			return
		}

		token, err := authService.VerifyIDToken(c.Request.Context(), strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			transport.ServiceError(c, err)
			c.Abort()
			return
		}

		c.Set(UIDKey, token.UID)
		c.Next()
	}
}
