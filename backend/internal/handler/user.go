package handler

import (
	"net/http"

	"singxd/internal/middleware"
	"singxd/internal/service/user"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userService *user.UserService
}

func NewUserHandler(service *user.UserService) *UserHandler {
	return &UserHandler{userService: service}
}

// =========================================================
// Operations

func (a *UserHandler) Me(c *gin.Context) {
	uid, _ := c.Get(middleware.UIDKey)
	uidString, _ := uid.(string)

	currentUser, err := a.userService.GetOrCreateByUID(c.Request.Context(), uidString)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch current user."})
		return
	}

	c.JSON(http.StatusOK, currentUser)
}
