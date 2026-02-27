package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
)

// ServiceError provides status and details for service failures.
type ServiceError struct {
	Status  int
	Message string
	Details string
	Err     error
}

func (e *ServiceError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func NewServiceError(status int, message string, err error) *ServiceError {
	return &ServiceError{
		Status:  status,
		Message: message,
		Err:     err,
	}
}

func NewServiceErrorWithDetails(status int, message string, details string, err error) *ServiceError {
	return &ServiceError{
		Status:  status,
		Message: message,
		Details: details,
		Err:     err,
	}
}

func SaveMultipartFile(file *multipart.FileHeader, dest string) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}
