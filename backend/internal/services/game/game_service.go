package game

import (
	"encoding/binary"
	"math"
)

type ChunkScore struct {
	Timestamp float64
	Detected  float64
	Reference float64
	Score     float64
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

type GameSession struct {
	Reference     []float64
	Chunks        []ChunkScore
	OffsetSamples int
	Elapsed       float64
}

func (s *GameService) NewSession(reference []float64) *GameSession {
	return &GameSession{
		Reference: reference,
		Chunks:    nil,
	}
}

// ====================================================================================
// Operations

func (s *GameService) ProcessChunk(sess *GameSession, data []byte) ChunkScore {
	chunk := s.scoreChunk(data, sess.Reference, sess.OffsetSamples, sess.Elapsed)
	sess.Chunks = append(sess.Chunks, chunk)
	sess.OffsetSamples += s.samplesElapsed(data)
	sess.Elapsed += float64(s.samplesElapsed(data)) / float64(DefaultSampleRate)
	return chunk
}

func (s *GameService) Summarise(sess *GameSession) GameSummary {
	chunks := sess.Chunks
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

func (s *GameService) DecodePCM16(data []byte) []float64 {
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

// ====================================================================================
// Helpers

func (s *GameService) samplesElapsed(chunk []byte) int {
	return len(chunk) / 2
}

// compares a raw PCM-16 chunk from the user against the reference vocals track at the given offset
func (s *GameService) scoreChunk(chunk []byte, reference []float64, offsetSamples int, elapsed float64) ChunkScore {
	detectedHz := Detect(chunk, s.sampleRate, s.threshold)
	windowSize := len(chunk) / 2
	refHz := s.referencePitchAt(reference, offsetSamples, windowSize)
	score := Score(detectedHz, refHz)

	return ChunkScore{
		Timestamp: elapsed,
		Detected:  detectedHz,
		Reference: refHz,
		Score:     score,
	}
}

func (s *GameService) referencePitchAt(samples []float64, offset, windowSize int) float64 {
	end := offset + windowSize
	if offset >= len(samples) {
		return 0
	}
	if end > len(samples) {
		end = len(samples)
	}
	pcm := floatToPCM16(samples[offset:end])
	return Detect(pcm, s.sampleRate, s.threshold)
}

func floatToPCM16(samples []float64) []byte {
	out := make([]byte, len(samples)*2)
	for i, s := range samples {
		s = math.Max(-1, math.Min(1, s))
		v := int16(s * 32767)
		binary.LittleEndian.PutUint16(out[i*2:], uint16(v))
	}
	return out
}
