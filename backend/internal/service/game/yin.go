package game

const (
	DefaultSampleRate = 44100
	DefaultThreshold  = 0.15
	// Plausible vocal range (Hz). Yin can report ~22k from noise at tau=2; restrict to this range.
	MinVocalHz = 70
	MaxVocalHz = 2500

	MaxCentDiff = 48 // maximum cent diff before 0 score (4 semitones)
)

func DetectHz(samples []float64, sampleRate int, threshold float64) float64 {
	if len(samples) < 2 {
		return 0
	}

	bufSize := len(samples) / 2
	diff := make([]float64, bufSize)
	cumulativeMean := make([]float64, bufSize)

	for tau := 1; tau < bufSize; tau++ {
		for j := 0; j < bufSize; j++ {
			delta := samples[j] - samples[j+tau]
			diff[tau] += delta * delta
		}
	}

	cumulativeMean[0] = 1.0
	var runningSum float64
	for tau := 1; tau < bufSize; tau++ {
		runningSum += diff[tau]
		if runningSum == 0 {
			cumulativeMean[tau] = 1.0
		} else {
			cumulativeMean[tau] = diff[tau] * float64(tau) / runningSum
		}
	}

	// Only search in plausible vocal range so we don't pick up ~22kHz from noise at tau=2.
	minTau := 1
	if sampleRate/MaxVocalHz > minTau {
		minTau = sampleRate / MaxVocalHz
	}
	maxTau := bufSize - 1
	if sampleRate/MinVocalHz < maxTau {
		maxTau = sampleRate / MinVocalHz
	}
	if minTau >= maxTau {
		return 0
	}

	tau := -1
	for t := minTau; t <= maxTau; t++ {
		if cumulativeMean[t] < threshold {
			for t+1 <= maxTau && cumulativeMean[t+1] < cumulativeMean[t] {
				t++
			}
			tau = t
			break
		}
	}
	if tau == -1 {
		return 0
	}

	if tau > 0 && tau < bufSize-1 {
		s0, s1, s2 := cumulativeMean[tau-1], cumulativeMean[tau], cumulativeMean[tau+1]
		denom := s0 - 2*s1 + s2
		if denom != 0 {
			tau_f := float64(tau) + (s0-s2)/(2*denom)
			hz := float64(sampleRate) / tau_f
			if hz >= MinVocalHz && hz <= MaxVocalHz {
				return hz
			}
		}
	}

	hz := float64(sampleRate) / float64(tau)
	if hz >= MinVocalHz && hz <= MaxVocalHz {
		return hz
	}
	return 0
}

func DetectReferenceHz(samples []float64, offset, windowSize, sampleRate int, threshold float64) float64 {
	end := offset + windowSize
	if offset >= len(samples) {
		return 0
	}
	if end > len(samples) {
		end = len(samples)
	}
	return DetectHz(samples[offset:end], sampleRate, threshold)
}
