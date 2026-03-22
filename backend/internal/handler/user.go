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
	c.JSON(http.StatusOK, gin.H{"uid": uidString})
}
