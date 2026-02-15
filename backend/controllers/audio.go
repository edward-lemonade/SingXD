package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"singxd/db"
	"singxd/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

var s3Client *db.S3Client

func SetS3Client(client *db.S3Client) {
	s3Client = client
}

// SeparateAudioResponse represents the response structure for audio separation
type SeparateAudioResponse struct {
	VocalsURL       string `json:"vocalsUrl"`
	InstrumentalURL string `json:"instrumentalUrl"`
	SessionID       string `json:"sessionId"`
}

// GenerateTimingsResponse represents the response structure for timing generation
type GenerateTimingsResponse struct {
	Timings []models.Timing `json:"timings"`
}

// handles audio file separation request
func SeparateAudio(c *gin.Context) {
	fmt.Println("SeparateAudio request received")

	file, err := c.FormFile("audio")
	if err != nil {
		fmt.Println("Missing audio file:", err)
		c.JSON(400, gin.H{"error": "No audio file provided"})
		return
	}

	// -------------------------------------------------------------------------
	// Create temp directory and save uploaded file

	tempDir := fmt.Sprintf("/tmp/audio_separation_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		fmt.Println("Failed to create temp dir:", err)
		c.JSON(500, gin.H{"error": "Failed to create temp directory"})
		return
	}

	defer os.RemoveAll(tempDir)

	inputPath := filepath.Join(tempDir, "input.mp3")
	if err := c.SaveUploadedFile(file, inputPath); err != nil {
		fmt.Println("Failed to save uploaded file:", err)
		c.JSON(500, gin.H{"error": "Failed to save uploaded file"})
		return
	}

	// -------------------------------------------------------------------------
	// Look for separation Python script + venv Python binary

	scriptPath, err := filepath.Abs("../ctc/separator.py")
	if err != nil {
		fmt.Println("Failed to resolve script path:", err)
		c.JSON(500, gin.H{"error": "Script path resolution failed"})
		return
	}

	venvPython := filepath.Join("..", "ctc", ".venv", "bin", "python")
	venvPythonAbs, err := filepath.Abs(venvPython)
	if err != nil {
		fmt.Println("Failed to resolve venv Python path:", err)
		c.JSON(500, gin.H{"error": "Python path resolution failed"})
		return
	}
	if _, err := os.Stat(venvPythonAbs); err != nil {
		fmt.Println("Python interpreter not found:", venvPythonAbs)
		c.JSON(500, gin.H{"error": "Python interpreter not found"})
		return
	}

	fmt.Println("Running separator:", scriptPath)
	fmt.Println("Using Python:", venvPythonAbs)

	// -------------------------------------------------------------------------
	// Execute separation script, verify outputs

	cmd := exec.Command(venvPythonAbs, scriptPath, inputPath, tempDir)
	cmd.Env = os.Environ() // ensure PATH, PYTHONPATH exist

	output, err := cmd.CombinedOutput()
	fmt.Println("Python output:\n", string(output))

	if err != nil {
		fmt.Println("Separator failed:", err)
		c.JSON(500, gin.H{
			"error":   "Separation failed",
			"details": string(output),
		})
		return
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	instPath := filepath.Join(tempDir, "inst.wav")

	if _, err := os.Stat(vocalsPath); err != nil {
		fmt.Println("Vocals missing:", err)
		c.JSON(500, gin.H{"error": "Vocals file not generated"})
		return
	}
	if _, err := os.Stat(instPath); err != nil {
		fmt.Println("Instrumental missing:", err)
		c.JSON(500, gin.H{"error": "Instrumental file not generated"})
		return
	}

	// -------------------------------------------------------------------------
	// Initialize file uploads

	sessionID := uuid.New().String()
	ctx := context.TODO()

	// -------------------------------------------------------------------------
	// Upload vocals

	vocalsFile, err := os.Open(vocalsPath)
	vocalsKey := fmt.Sprintf("creates/%s/vocals.wav", sessionID)
	if err != nil {
		fmt.Println("Failed to open vocals file:", err)
		c.JSON(500, gin.H{"error": "Failed to read vocals file"})
		return
	}
	defer vocalsFile.Close()
	if err := s3Client.UploadFileWithExpiry(ctx, vocalsKey, vocalsFile, 60*24); err != nil {
		fmt.Println("Failed to upload vocals:", err)
		c.JSON(500, gin.H{"error": "Failed to upload vocals"})
		return
	}

	// -------------------------------------------------------------------------
	// Upload instrumentals

	instFile, err := os.Open(instPath)
	instKey := fmt.Sprintf("creates/%s/inst.wav", sessionID)
	if err != nil {
		fmt.Println("Failed to open instrumental file:", err)
		c.JSON(500, gin.H{"error": "Failed to read instrumental file"})
		return
	}
	defer instFile.Close()
	if err := s3Client.UploadFileWithExpiry(ctx, instKey, instFile, 60*24); err != nil {
		fmt.Println("Failed to upload instrumental:", err)
		c.JSON(500, gin.H{"error": "Failed to upload instrumental"})
		return
	}

	// -------------------------------------------------------------------------
	// Get presigned URLs for client access

	vocalsURL, err := s3Client.GetPresignedURL(ctx, vocalsKey, 3600) // 1 hour expiry
	if err != nil {
		fmt.Println("Failed to get vocals URL:", err)
		c.JSON(500, gin.H{"error": "Failed to generate vocals URL"})
		return
	}
	instURL, err := s3Client.GetPresignedURL(ctx, instKey, 3600)
	if err != nil {
		fmt.Println("Failed to get instrumental URL:", err)
		c.JSON(500, gin.H{"error": "Failed to generate instrumental URL"})
		return
	}

	response := SeparateAudioResponse{
		VocalsURL:       vocalsURL,
		InstrumentalURL: instURL,
		SessionID:       sessionID,
	}

	c.JSON(200, response)
}

// handles generating timings for lyrics and audio
func GenerateTimings(c *gin.Context) {
	sessionID := c.PostForm("sessionID")
	lyrics := c.PostForm("lyrics")
	if sessionID == "" || lyrics == "" {
		c.JSON(400, gin.H{"error": "Missing sessionID or lyrics"})
		return
	}

	// -------------------------------------------------------------------------
	// Create temp folder

	tempDir := fmt.Sprintf("/tmp/alignment_%d", time.Now().Unix())
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		fmt.Println("Failed to create temp dir:", err)
		c.JSON(500, gin.H{"error": "Failed to create temp directory"})
		return
	}
	defer os.RemoveAll(tempDir)

	// -------------------------------------------------------------------------
	// Download vocals from S3 (use cache in the future)

	vocalsKey := fmt.Sprintf("creates/%s/vocals.wav", sessionID)
	vocalsData, err := s3Client.DownloadFile(context.TODO(), vocalsKey)
	if err != nil {
		fmt.Println("Failed to download vocals:", err)
		c.JSON(500, gin.H{"error": "Failed to download vocals"})
		return
	}

	vocalsPath := filepath.Join(tempDir, "vocals.wav")
	if err := os.WriteFile(vocalsPath, vocalsData, 0644); err != nil {
		fmt.Println("Failed to save vocals:", err)
		c.JSON(500, gin.H{"error": "Failed to save vocals"})
		return
	}

	// -------------------------------------------------------------------------
	// Save lyrics to temp file

	lyricsPath := filepath.Join(tempDir, "lyrics.txt")

	// Parse the JSON lines array using proper types
	var lines []models.Line
	if err := json.Unmarshal([]byte(lyrics), &lines); err != nil {
		fmt.Println("Failed to parse lyrics JSON:", err)
		c.JSON(500, gin.H{"error": "Failed to parse lyrics"})
		return
	}

	var allWords []string
	for _, line := range lines {
		for _, word := range line.Words {
			allWords = append(allWords, word.Text)
		}
	}

	lyricsText := strings.Join(allWords, "\n")

	if err := os.WriteFile(lyricsPath, []byte(lyricsText), 0644); err != nil {
		fmt.Println("Failed to save lyrics:", err)
		c.JSON(500, gin.H{"error": "Failed to save lyrics"})
		return
	}

	// -------------------------------------------------------------------------
	// Find Python script and interpreter

	alignScript, err := filepath.Abs("../ctc/align.py")
	if err != nil {
		fmt.Println("Failed to resolve align script path:", err)
		c.JSON(500, gin.H{"error": "Script path resolution failed"})
		return
	}

	venvPython, err := filepath.Abs("../ctc/.venv/bin/python")
	if err != nil {
		fmt.Println("Failed to resolve venv Python path:", err)
		c.JSON(500, gin.H{"error": "Python path resolution failed"})
		return
	}
	if _, err := os.Stat(venvPython); err != nil {
		fmt.Println("Python interpreter not found:", venvPython)
		c.JSON(500, gin.H{"error": "Python interpreter not found"})
		return
	}

	// -------------------------------------------------------------------------
	// Execute

	outputJson := filepath.Join(tempDir, "timings.json")

	fmt.Println("Running alignment script:", alignScript)

	// Run align.py
	cmd := exec.Command(venvPython, alignScript, vocalsPath, lyricsPath, outputJson)
	cmd.Env = os.Environ()

	output, err := cmd.CombinedOutput()
	fmt.Println("Align Python output:\n", string(output))

	if err != nil {
		fmt.Println("Alignment failed:", err)
		c.JSON(500, gin.H{
			"error":   "Alignment failed",
			"details": string(output),
		})
		return
	}

	// -------------------------------------------------------------------------
	// Reformat Output using proper types

	jsonData, err := os.ReadFile(outputJson)
	if err != nil {
		fmt.Println("Failed to read timings JSON:", err)
		c.JSON(500, gin.H{"error": "Failed to read timings"})
		return
	}

	var timings []models.Timing
	if err := json.Unmarshal(jsonData, &timings); err != nil {
		fmt.Println("Failed to parse timings JSON:", err)
		c.JSON(500, gin.H{"error": "Failed to parse timings"})
		return
	}

	response := GenerateTimingsResponse{
		Timings: timings,
	}

	c.JSON(200, response)
}
