package game

import (
	"encoding/binary"
	"math"
)

type ChunkScore struct {
	Timestamp         float64
	Detected          float64
	Reference         float64
	DetectedSemitone  float64
	ReferenceSemitone float64
	Score             float64
}

type GameSummary struct {
	TotalScore  float64
	ChunkScores []ChunkScore
}

type GameService struct {
	sampleRate int
	threshold  float64
}

func NewGameService(sampleRate int, threshold float64) *GameService {
	return &GameService{sampleRate: sampleRate, threshold: threshold}
}

const (
	DefaultSampleRate = 44100
	DefaultThreshold  = 0.15

	MinVocalHz = 70
	MaxVocalHz = 2500

	MaxSemitoneDiff = 3 // maximum cent diff before 0 score (4 semitones)
)

type GameSession struct {
	Reference     []float64
	ChunksScores  []ChunkScore
	OffsetSamples int
	Elapsed       float64
}

func (s *GameService) NewSession(reference []byte) *GameSession {
	decodedReference := decodePCM16(reference)
	return &GameSession{
		Reference:    decodedReference,
		ChunksScores: nil,
	}
}

// ====================================================================================
// Operations

func (s *GameService) ProcessChunk(sess *GameSession, chunk []byte) ChunkScore {
	elapsed := sess.Elapsed
	reference := sess.Reference
	offsetSamples := sess.OffsetSamples
	windowSize := len(chunk) / 2

	// get pitches
	chunkPCM16 := decodePCM16(chunk)
	detectedHz := DetectHz(chunkPCM16, s.sampleRate, s.threshold)
	refHz := DetectReferenceHz(reference, offsetSamples, windowSize, s.sampleRate, s.threshold)

	// compute score by comparing pitches
	score := computeScore(detectedHz, refHz)
	chunkScore := ChunkScore{
		Timestamp:         elapsed,
		Detected:          detectedHz,
		Reference:         refHz,
		DetectedSemitone:  hzToSemitone(detectedHz),
		ReferenceSemitone: hzToSemitone(refHz),
		Score:             score,
	}

	// update session data
	sess.ChunksScores = append(sess.ChunksScores, chunkScore)
	sess.OffsetSamples += samplesElapsed(chunk)
	sess.Elapsed += float64(samplesElapsed(chunk)) / float64(DefaultSampleRate)
	return chunkScore
}

func (s *GameService) Summarise(sess *GameSession) GameSummary {
	chunks := sess.ChunksScores
	if len(chunks) == 0 {
		return GameSummary{TotalScore: 0, ChunkScores: chunks}
	}
	var total float64
	for _, c := range chunks {
		total += c.Score
	}
	return GameSummary{
		TotalScore:  total / float64(len(chunks)),
		ChunkScores: chunks,
	}
}

// ====================================================================================
// Helpers

func samplesElapsed(chunk []byte) int {
	return len(chunk) / 2
}

func computeScore(detected, reference float64) float64 { // score in [0, 1]
	detectedSemitone := hzToSemitone(detected)
	referenceSemitone := hzToSemitone(reference)
	semitoneDiff := math.Abs(detectedSemitone - referenceSemitone)
	if semitoneDiff >= MaxSemitoneDiff {
		return 0
	}
	return 1 - semitoneDiff/MaxSemitoneDiff
}

func decodePCM16(data []byte) []float64 {
	if len(data) > 44 && string(data[:4]) == "RIFF" {
		data = data[44:]
	}
	n := len(data) / 2
	out := make([]float64, n)
	for i := 0; i < n; i++ {
		v := int16(binary.LittleEndian.Uint16(data[i*2 : i*2+2]))
		out[i] = float64(v) / 32768.0
	}
	return out
}

func hzToSemitone(hz float64) float64 {
	if hz == 0 {
		return 0
	}
	return 69 + 12*math.Log2(hz/440)
}
