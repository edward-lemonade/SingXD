package controllers

import (
	"net/http"

	"singxd/services"

	"github.com/gin-gonic/gin"
)

func RespondServiceError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	if svcErr, ok := err.(*services.ServiceError); ok {
		payload := gin.H{"error": svcErr.Message}
		if svcErr.Details != "" {
			payload["details"] = svcErr.Details
		}
		c.JSON(svcErr.Status, payload)
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
}
