package handler

import (
	"singxd/internal/apperror"

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

func getRequiredUID(c *gin.Context) string {
	uid := getUID(c)
	if uid == nil {
		apperror.Unauthorized(c)
		return ""
	}
	return *uid
}
