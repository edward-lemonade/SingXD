package storage

import (
	"io"
	"mime/multipart"
	"os"
)

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
