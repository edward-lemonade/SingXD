package handler

import (
	"net/http"

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
	uid, _ := getRequiredUID(c)

	currentUser, err := a.userService.GetOrCreateByUID(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch current user."})
		return
	}

	c.JSON(http.StatusOK, currentUser)
}
