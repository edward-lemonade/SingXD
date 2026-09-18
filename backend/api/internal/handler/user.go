package handler

import (
	"net/http"

	"singxd/internal/apperror"
	"singxd/internal/domain/user"

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
	uid := getUID(c)
	if uid == nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	currentUser, err := a.userService.GetOrCreateByUID(c.Request.Context(), *uid)
	if err != nil {
		apperror.ServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, currentUser)
}
