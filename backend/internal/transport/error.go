package transport

import (
	"errors"
	"fmt"
	"net/http"

	"singxd/internal/services/chart"
	"singxd/internal/services/chart_draft"

	"github.com/gin-gonic/gin"
)

func BadRequest(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": msg})
}
func ServiceError(c *gin.Context, err error) {
	status, msg := resolve(err)
	c.JSON(status, gin.H{"error": msg})
}

var errorMap = []struct {
	sentinel error
	status   int
	message  string
}{
	// chart_draft
	{chart_draft.ErrMissingSessionID, http.StatusBadRequest, "Session ID is required."},
	{chart_draft.ErrInvalidImageType, http.StatusBadRequest, "Unsupported image format. Please upload a JPG, PNG, GIF, or WebP file."},
	{chart_draft.ErrParsingLyrics, http.StatusBadRequest, "The lyrics could not be parsed. Please check the format and try again."},
	{chart_draft.ErrSeparationFailed, http.StatusUnprocessableEntity, "Audio separation failed. Please check that your file is a valid audio track."},
	{chart_draft.ErrVocalsNotGenerated, http.StatusUnprocessableEntity, "Could not extract vocals from the audio. Please try a different file."},
	{chart_draft.ErrInstrumentalNotGenerated, http.StatusUnprocessableEntity, "Could not extract the instrumental track. Please try a different file."},
	{chart_draft.ErrAlignmentFailed, http.StatusUnprocessableEntity, "Lyrics alignment failed. Make sure the lyrics match the audio content."},
	{chart_draft.ErrPythonInterpreterNotFound, http.StatusInternalServerError, "The server is not configured correctly. Please contact support."},

	// chart
	{chart.ErrChartNotFound, http.StatusNotFound, "The requested sync map could not be found."},
	{chart.ErrNoAudioFilesForSession, http.StatusNotFound, "No audio files were found for this session."},
	{chart.ErrNoInstrumentalFile, http.StatusNotFound, "No instrumental track was found for this session."},
	{chart.ErrDbNotConfigured, http.StatusInternalServerError, "The server is not configured correctly. Please contact support."},
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
