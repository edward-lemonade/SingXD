package transport

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"singxd/internal/service/auth"
	"singxd/internal/service/chart"
	"singxd/internal/service/draft"
	"singxd/internal/service/game"

	"github.com/gin-gonic/gin"
)

func BadRequest(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": msg})
}

func ServiceError(c *gin.Context, err error) {
	log.Printf("[Service Error]: %v", err)
	status, msg := resolve(err)
	c.JSON(status, gin.H{"error": msg})
}

var errorMap = []struct {
	sentinel error
	status   int
	message  string
}{
	// auth
	{auth.ErrMissingToken, http.StatusUnauthorized, "Authorization token is required."},
	{auth.ErrInvalidToken, http.StatusUnauthorized, "Authorization token is invalid or expired."},
	{auth.ErrMissingIDToken, http.StatusBadRequest, "Firebase ID token is required."},

	// draft
	{draft.ErrDbNotConfigured, http.StatusInternalServerError, "The server is not configured correctly. Please contact support."},
	{draft.ErrMissingUUID, http.StatusBadRequest, "Draft UUID is required."},
	{draft.ErrInvalidImageType, http.StatusBadRequest, "Unsupported image format. Please upload a JPG, PNG, GIF, or WebP file."},
	{draft.ErrParsingLyrics, http.StatusBadRequest, "The lyrics could not be parsed. Please check the format and try again."},
	{draft.ErrSeparationFailed, http.StatusUnprocessableEntity, "Audio separation failed. Please check that your file is a valid audio track."},
	{draft.ErrVocalsNotGenerated, http.StatusUnprocessableEntity, "Could not extract vocals from the audio. Please try a different file."},
	{draft.ErrInstrumentalNotGenerated, http.StatusUnprocessableEntity, "Could not extract the instrumental track. Please try a different file."},
	{draft.ErrAlignmentFailed, http.StatusUnprocessableEntity, "Lyrics alignment failed. Make sure the lyrics match the audio content."},
	{draft.ErrPythonInterpreterNotFound, http.StatusInternalServerError, "The server is not configured correctly. Please contact support."},
	{draft.ErrDraftNotFound, http.StatusNotFound, "Draft not found."},

	// chart
	{chart.ErrChartNotFound, http.StatusNotFound, "The requested sync map could not be found."},
	{chart.ErrNoAudioFilesForUUID, http.StatusNotFound, "No audio files were found for this draft."},
	{chart.ErrNoInstrumentalFile, http.StatusNotFound, "No instrumental track was found for this draft."},
	{chart.ErrDbNotConfigured, http.StatusInternalServerError, "The server is not configured correctly. Please contact support."},

	// game
	{game.ErrInvalidChartID, http.StatusBadRequest, "Invalid chart id."},
	{game.ErrVocalsUnavailable, http.StatusNotFound, "Vocals are not available for this chart."},
	{game.ErrUpgradeFailed, http.StatusInternalServerError, "The game connection could not be established. Please try again."},
}

func resolve(err error) (int, string) {
	fmt.Println("[service error]", err)
	for _, e := range errorMap {
		if errors.Is(err, e.sentinel) {
			return e.status, e.message
		}
	}
	return http.StatusInternalServerError, "An unexpected error occurred. Please try again."
}
