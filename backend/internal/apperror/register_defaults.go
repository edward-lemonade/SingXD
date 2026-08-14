package apperror

import (
	"net/http"

	"google.golang.org/grpc/codes"

	"singxd/internal/domain/auth"
	"singxd/internal/domain/chart"
	"singxd/internal/domain/draft"
	"singxd/internal/domain/editor"
)

func init() {
	// auth
	Register(auth.ErrMissingToken, http.StatusUnauthorized, codes.Unauthenticated, "Authorization token is required.")
	Register(auth.ErrInvalidToken, http.StatusUnauthorized, codes.Unauthenticated, "Authorization token is invalid or expired.")
	Register(auth.ErrMissingIDToken, http.StatusBadRequest, codes.InvalidArgument, "Firebase ID token is required.")

	// draft
	Register(draft.ErrDbNotConfigured, http.StatusInternalServerError, codes.Internal, "The server is not configured correctly. Please contact support.")
	Register(draft.ErrMissingUUID, http.StatusBadRequest, codes.InvalidArgument, "Draft UUID is required.")
	Register(draft.ErrDraftNotFound, http.StatusNotFound, codes.NotFound, "Draft not found.")

	// editor
	Register(editor.ErrInvalidImageType, http.StatusBadRequest, codes.InvalidArgument, "Unsupported image format. Please upload a JPG, PNG, GIF, or WebP file.")
	Register(editor.ErrParsingLyrics, http.StatusBadRequest, codes.InvalidArgument, "The lyrics could not be parsed. Please check the format and try again.")
	Register(editor.ErrSeparationFailed, http.StatusUnprocessableEntity, codes.Internal, "Audio separation failed. Please check that your file is a valid audio track.")
	Register(editor.ErrVocalsNotGenerated, http.StatusUnprocessableEntity, codes.Internal, "Could not extract vocals from the audio. Please try a different file.")
	Register(editor.ErrInstrumentalNotGenerated, http.StatusUnprocessableEntity, codes.Internal, "Could not extract the instrumental track. Please try a different file.")
	Register(editor.ErrAlignmentFailed, http.StatusUnprocessableEntity, codes.Internal, "Lyrics alignment failed. Make sure the lyrics match the audio content.")
	Register(editor.ErrPythonInterpreterNotFound, http.StatusInternalServerError, codes.Internal, "The server is not configured correctly. Please contact support.")

	// chart
	Register(chart.ErrChartNotFound, http.StatusNotFound, codes.NotFound, "The requested sync map could not be found.")
	Register(chart.ErrNoAudioFilesForUUID, http.StatusNotFound, codes.NotFound, "No audio files were found for this draft.")
	Register(chart.ErrNoInstrumentalFile, http.StatusNotFound, codes.NotFound, "No instrumental track was found for this draft.")
	Register(chart.ErrDbNotConfigured, http.StatusInternalServerError, codes.Internal, "The server is not configured correctly. Please contact support.")
}
