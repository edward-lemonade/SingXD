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

	MaxSemitoneDiff = 3 // maximum semitone diff before 0 score
)

type GameSession struct {
	Reference    []float64
	ChunksScores []ChunkScore
	Elapsed      float64
	detectorUser *PitchDetector
	detectorRef  *PitchDetector
}

func (s *GameService) NewSession(reference []byte, chunkSize int) *GameSession {
	return &GameSession{
		Reference:    decodePCM16(reference),
		detectorUser: NewPitchDetector(chunkSize, s.sampleRate),
		detectorRef:  NewPitchDetector(chunkSize, s.sampleRate),
	}
}

func (s *GameService) CloseSession(sess *GameSession) {
	sess.detectorUser.Close()
	sess.detectorRef.Close()
}

// ====================================================================================
// Operations

func (s *GameService) ProcessChunk(sess *GameSession, chunk []byte) ChunkScore {
	elapsed := sess.Elapsed
	samplesInChunk := len(chunk) / 2 // PCM16 mono: 2 bytes per sample

	chunkPCM16 := decodePCM16(chunk)

	detectedHz := 0.0
	if rms(chunkPCM16) >= 0.01 {
		hz := sess.detectorUser.Detect(chunkPCM16)
		if hz >= MinVocalHz && hz <= MaxVocalHz {
			detectedHz = hz
		}
	}

	offsetSamples := int(elapsed * float64(s.sampleRate))
	refHz := 0.0
	refSlice := refWindow(sess.Reference, offsetSamples, samplesInChunk)
	if len(refSlice) > 0 && rms(refSlice) >= 0.01 {
		hz := sess.detectorRef.Detect(refSlice)
		if hz >= MinVocalHz && hz <= MaxVocalHz {
			refHz = hz
		}
	}

	score := computeScore(detectedHz, refHz)
	chunkScore := ChunkScore{
		Timestamp:         elapsed,
		Detected:          detectedHz,
		Reference:         refHz,
		DetectedSemitone:  hzToSemitone(detectedHz),
		ReferenceSemitone: hzToSemitone(refHz),
		Score:             score,
	}

	sess.ChunksScores = append(sess.ChunksScores, chunkScore)
	sess.Elapsed += float64(samplesInChunk) / float64(s.sampleRate)
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

func refWindow(reference []float64, offset, size int) []float64 {
	if offset >= len(reference) {
		return nil
	}
	end := offset + size
	if end > len(reference) {
		end = len(reference)
	}
	return reference[offset:end]
}

func computeScore(detected, reference float64) float64 {
	diff := math.Abs(hzToSemitone(detected) - hzToSemitone(reference))
	if diff >= MaxSemitoneDiff {
		return 0
	}
	return 1 - diff/MaxSemitoneDiff
}

// decodePCM16 decodes a PCM16 WAV (mono or stereo) to a mono []float64.
// Stereo frames are mixed down to mono by averaging the two channels.
func decodePCM16(data []byte) []float64 {
	var numChannels int
	data, numChannels = stripWAVHeader(data)
	if numChannels < 1 {
		numChannels = 1
	}

	frameCount := len(data) / (2 * numChannels)
	out := make([]float64, frameCount)
	for i := 0; i < frameCount; i++ {
		var sum float64
		for ch := 0; ch < numChannels; ch++ {
			v := int16(binary.LittleEndian.Uint16(data[(i*numChannels+ch)*2 : (i*numChannels+ch)*2+2]))
			sum += float64(v) / 32768.0
		}
		out[i] = sum / float64(numChannels)
	}
	return out
}

// stripWAVHeader finds the data chunk and returns the audio bytes and channel count.
// Falls back to mono if no RIFF header is present.
func stripWAVHeader(data []byte) ([]byte, int) {
	if len(data) < 12 || string(data[:4]) != "RIFF" {
		return data, 1
	}

	numChannels := 1
	if len(data) > 23 {
		numChannels = int(binary.LittleEndian.Uint16(data[22:24]))
	}

	for i := 12; i < len(data)-8; i++ {
		if string(data[i:i+4]) == "data" {
			dataSize := int(binary.LittleEndian.Uint32(data[i+4 : i+8]))
			start := i + 8
			end := start + dataSize
			if end > len(data) {
				end = len(data)
			}
			return data[start:end], numChannels
		}
	}

	return data[44:], numChannels
}

func hzToSemitone(hz float64) float64 {
	if hz == 0 {
		return 0
	}
	return 69 + 12*math.Log2(hz/440)
}
