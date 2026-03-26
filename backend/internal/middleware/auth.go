// middleware/auth.go
package middleware

import (
	"singxd/internal/service/auth"
	"singxd/internal/transport"
	"strings"

	firebaseauth "firebase.google.com/go/v4/auth"
	"github.com/gin-gonic/gin"
)

const UIDKey = "uid"

func Auth(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := extractAndVerify(c, authService)
		if err != nil {
			transport.ServiceError(c, auth.ErrMissingToken)
			c.Abort()
			return
		}
		c.Set(UIDKey, token.UID)
		c.Next()
	}
}

func OptionalAuth(authService *auth.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := extractAndVerify(c, authService)
		if err != nil {
			c.Next()
			return
		}
		c.Set(UIDKey, token.UID)
		c.Next()
	}
}

func extractAndVerify(c *gin.Context, authService *auth.AuthService) (*firebaseauth.Token, error) {
	header := c.GetHeader("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return nil, auth.ErrMissingToken
	}
	idToken := strings.TrimPrefix(header, "Bearer ")
	return authService.VerifyIDToken(c.Request.Context(), idToken)
}
