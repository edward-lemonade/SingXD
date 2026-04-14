package game

import "math"

func rms(samples []float64) float64 {
	var sum float64
	for _, s := range samples {
		sum += s * s
	}
	return math.Sqrt(sum / float64(len(samples)))
}

func DetectHz(samples []float64, sampleRate int, _ float64) float64 {
	if len(samples) < 2 {
		return 0
	}
	if rms(samples) < 0.01 {
		return 0
	}

	n := len(samples)
	half := n / 2

	// difference function
	d := make([]float64, half)
	for tau := 1; tau < half; tau++ {
		var sum float64
		for i := 0; i < half; i++ {
			diff := samples[i] - samples[i+tau]
			sum += diff * diff
		}
		d[tau] = sum
	}

	// cumulative mean normalised difference
	cmnd := make([]float64, half)
	cmnd[0] = 1
	var runningSum float64
	for tau := 1; tau < half; tau++ {
		runningSum += d[tau]
		cmnd[tau] = d[tau] * float64(tau) / runningSum
	}

	// first tau below threshold
	const yinThreshold = 0.15
	tau := -1
	for t := 2; t < half-1; t++ {
		if cmnd[t] < yinThreshold && cmnd[t] < cmnd[t+1] {
			tau = t
			break
		}
	}
	if tau == -1 {
		return 0
	}

	// parabolic interpolation
	if tau > 0 && tau < half-1 {
		s0, s1, s2 := cmnd[tau-1], cmnd[tau], cmnd[tau+1]
		denom := s0 - 2*s1 + s2
		if math.Abs(denom) > 1e-9 {
			tau2 := float64(tau) + (s0-s2)/(2*denom)
			hz := float64(sampleRate) / tau2
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
