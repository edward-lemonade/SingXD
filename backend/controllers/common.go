package controllers

import (
	"log"
	"net/http"

	"singxd/services"

	"github.com/gin-gonic/gin"
)

func RespondServiceError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	if svcErr, ok := err.(*services.ServiceError); ok {
		// Log full error server-side so failures show up in terminal logs.
		log.Printf("request_failed method=%s path=%s status=%d message=%q details=%q err=%v",
			c.Request.Method,
			c.Request.URL.Path,
			svcErr.Status,
			svcErr.Message,
			svcErr.Details,
			svcErr.Err,
		)
		payload := gin.H{"error": svcErr.Message}
		if svcErr.Details != "" {
			payload["details"] = svcErr.Details
		}
		c.JSON(svcErr.Status, payload)
		return
	}

	log.Printf("request_failed method=%s path=%s status=%d err=%v",
		c.Request.Method,
		c.Request.URL.Path,
		http.StatusInternalServerError,
		err,
	)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
}
