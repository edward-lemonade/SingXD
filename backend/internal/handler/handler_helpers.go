package handler

import (
	"singxd/internal/transport"

	"github.com/gin-gonic/gin"
)

const UIDKey = "uid"

func getUID(c *gin.Context) *string {
	uid, exists := c.Get(UIDKey)
	if !exists {
		return nil
	}
	s, ok := uid.(string)
	if !ok {
		return nil
	}
	return &s
}

func getRequiredUID(c *gin.Context) (string, bool) {
	uid := getUID(c)
	if uid == nil {
		transport.Unauthorized(c)
		return "", false
	}
	return *uid, true
}
