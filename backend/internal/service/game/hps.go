package game

import (
	"math"
	"math/cmplx"
)

const hpsHarmonics = 5 // number of times to downsample; more = more selective, but loses high freqs

func rms(samples []float64) float64 {
	var sum float64
	for _, s := range samples {
		sum += s * s
	}
	return math.Sqrt(sum / float64(len(samples)))
}

// fft computes the in-place Cooley-Tukey FFT. len(x) must be a power of 2.
func fft(x []complex128) {
	n := len(x)
	if n <= 1 {
		return
	}

	even := make([]complex128, n/2)
	odd := make([]complex128, n/2)
	for i := 0; i < n/2; i++ {
		even[i] = x[2*i]
		odd[i] = x[2*i+1]
	}

	fft(even)
	fft(odd)

	for k := 0; k < n/2; k++ {
		t := cmplx.Exp(complex(0, -2*math.Pi*float64(k)/float64(n))) * odd[k]
		x[k] = even[k] + t
		x[k+n/2] = even[k] - t
	}
}

// nextPow2 returns the smallest power of 2 >= n.
func nextPow2(n int) int {
	p := 1
	for p < n {
		p <<= 1
	}
	return p
}

// applyHannWindow applies a Hann window in-place to reduce spectral leakage.
func applyHannWindow(samples []float64) {
	n := len(samples)
	for i := range samples {
		samples[i] *= 0.5 * (1 - math.Cos(2*math.Pi*float64(i)/float64(n-1)))
	}
}

func DetectHz(samples []float64, sampleRate int, _ float64) float64 {
	if len(samples) < 2 {
		return 0
	}
	if rms(samples) < 0.01 {
		return 0
	}

	// Copy + window before FFT
	windowed := make([]float64, len(samples))
	copy(windowed, samples)
	applyHannWindow(windowed)

	n := nextPow2(len(windowed))
	cx := make([]complex128, n)
	for i, s := range windowed {
		cx[i] = complex(s, 0)
	}

	fft(cx)

	// Magnitude spectrum (only positive frequencies needed)
	half := n / 2
	mag := make([]float64, half)
	for i := range mag {
		mag[i] = cmplx.Abs(cx[i])
	}

	// HPS: multiply downsampled copies together
	hps := make([]float64, half)
	copy(hps, mag)
	for h := 2; h <= hpsHarmonics; h++ {
		for i := 0; i < half/h; i++ {
			hps[i] *= mag[i*h]
		}
		// zero out the region that couldn't be multiplied
		for i := half / h; i < half; i++ {
			hps[i] = 0
		}
	}

	// Bin range corresponding to vocal frequency bounds
	minBin := int(float64(MinVocalHz) * float64(n) / float64(sampleRate))
	maxBin := int(float64(MaxVocalHz) * float64(n) / float64(sampleRate))
	if minBin < 1 {
		minBin = 1
	}
	if maxBin >= half {
		maxBin = half - 1
	}
	if minBin >= maxBin {
		return 0
	}

	// Find peak bin within vocal range
	peakBin := minBin
	for i := minBin + 1; i <= maxBin; i++ {
		if hps[i] > hps[peakBin] {
			peakBin = i
		}
	}

	// Parabolic interpolation for sub-bin accuracy
	if peakBin > 0 && peakBin < half-1 {
		s0, s1, s2 := hps[peakBin-1], hps[peakBin], hps[peakBin+1]
		denom := s0 - 2*s1 + s2
		if math.Abs(denom) > 1e-9 {
			peakF := float64(peakBin) + (s0-s2)/(2*denom)
			hz := peakF * float64(sampleRate) / float64(n)
			if hz >= MinVocalHz && hz <= MaxVocalHz {
				return hz
			}
		}
	}

	hz := float64(peakBin) * float64(sampleRate) / float64(n)
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
