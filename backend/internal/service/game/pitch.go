package game

/*
#cgo pkg-config: aubio
#include <aubio/aubio.h>
#include <stdlib.h>
*/
import "C"

import (
	"math"
	"unsafe"
)

type PitchDetector struct {
	pitch   *C.aubio_pitch_t
	in      *C.fvec_t
	out     *C.fvec_t
	bufSize int
}

func NewPitchDetector(bufSize, sampleRate int) *PitchDetector {
	method := C.CString("yin")
	defer C.free(unsafe.Pointer(method))

	buf := C.uint(bufSize)
	sr := C.uint(sampleRate)

	pitch := C.new_aubio_pitch(method, buf, buf, sr)
	if pitch == nil {
		return nil
	}
	C.aubio_pitch_set_silence(pitch, -40)
	C.aubio_pitch_set_tolerance(pitch, 0.15)

	return &PitchDetector{
		pitch:   pitch,
		in:      C.new_fvec(buf),
		out:     C.new_fvec(1),
		bufSize: bufSize,
	}
}

func (p *PitchDetector) Detect(samples []float64) float64 {
	n := len(samples)
	if n > p.bufSize {
		n = p.bufSize
	}
	for i := 0; i < n; i++ {
		*(*C.smpl_t)(unsafe.Pointer(
			uintptr(unsafe.Pointer(p.in.data)) + uintptr(i)*unsafe.Sizeof(C.smpl_t(0)),
		)) = C.smpl_t(samples[i])
	}
	for i := n; i < p.bufSize; i++ {
		*(*C.smpl_t)(unsafe.Pointer(
			uintptr(unsafe.Pointer(p.in.data)) + uintptr(i)*unsafe.Sizeof(C.smpl_t(0)),
		)) = 0
	}

	C.aubio_pitch_do(p.pitch, p.in, p.out)
	return float64(*(*C.smpl_t)(unsafe.Pointer(p.out.data)))
}

func (p *PitchDetector) Close() {
	if p == nil {
		return
	}
	if p.pitch != nil {
		C.del_aubio_pitch(p.pitch)
		p.pitch = nil
	}
	if p.in != nil {
		C.del_fvec(p.in)
		p.in = nil
	}
	if p.out != nil {
		C.del_fvec(p.out)
		p.out = nil
	}
}

func rms(samples []float64) float64 {
	var sum float64
	for _, s := range samples {
		sum += s * s
	}
	return math.Sqrt(sum / float64(len(samples)))
}
