package attachments_create

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"trxd/db"
	"trxd/utils"
	"trxd/utils/consts"
	"trxd/utils/crypto_utils"
	"trxd/validator"

	"trxd/utils/log"

	"github.com/go-playground/form/v4"
	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
)

type Data struct {
	ChallID *int32 `form:"chall_id" validate:"required,id"`
}

func extractValidatedAttachments(c *fiber.Ctx, multipartForm *multipart.Form, data Data) ([]string, []*multipart.FileHeader, error) {
	if len(multipartForm.File) == 0 {
		return nil, nil, utils.Error(c, fiber.StatusBadRequest, consts.MissingRequiredFields)
	}

	valid, err := validator.Struct(c, data)
	if err != nil || !valid {
		return nil, nil, err
	}

	names := make([]string, 0)
	headers := make([]*multipart.FileHeader, 0)
	for _, files := range multipartForm.File {
		for _, file := range files {
			names = append(names, file.Filename)
			headers = append(headers, file)
		}
	}

	valid, err = validator.Struct(c, struct {
		Attachments []string `validate:"required,attachments"`
	}{Attachments: names})
	if err != nil || !valid {
		return nil, nil, err
	}

	return names, headers, nil
}

func saveFiles(c *fiber.Ctx, challID int32, headers []*multipart.FileHeader) ([]string, error) {
	dir := fmt.Sprintf("attachments/%d/", challID)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		err := os.MkdirAll(dir, 0755)
		if err != nil {
			return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCreatingAttachmentsDir, err)
		}
	}

	hashes := make([]string, 0, len(headers))
	for _, file := range headers {
		cleanPath := filepath.Clean(dir + filepath.Base(file.Filename))
		if !strings.HasPrefix(cleanPath, dir) {
			return nil, utils.Error(c, fiber.StatusBadRequest, consts.InvalidFilePath)
		}

		f, err := file.Open()
		if err != nil {
			return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorHashingFile, err)
		}
		defer func() {
			err := f.Close()
			if err != nil {
				log.Error("Failed to close file after hashing", "err", err)
			}
		}()

		hash, err := crypto_utils.HashFile(f)
		if err != nil {
			return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorHashingFile, err)
		}

		hashes = append(hashes, hash)

		hashedPath := dir + hash + "/"
		if _, err := os.Stat(hashedPath); os.IsNotExist(err) {
			err := os.MkdirAll(hashedPath, 0755)
			if err != nil {
				return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCreatingAttachmentsDir, err)
			}
		}

		cleanPath = filepath.Clean(hashedPath + filepath.Base(file.Filename))
		if !strings.HasPrefix(cleanPath, hashedPath) {
			return nil, utils.Error(c, fiber.StatusBadRequest, consts.InvalidFilePath)
		}

		err = c.SaveFile(file, cleanPath)
		if err != nil {
			return nil, utils.Error(c, fiber.StatusInternalServerError, consts.ErrorSavingFile, err)
		}
	}

	return hashes, nil
}

// @Summary [Author+] Creates new attachments for a challenge
// @Description Requires **Author** privileges or higher.
// @Description Creates new attachments for an existing challenge with the provided files.
// @Tags attachments
// @Accept mpfd
// @Produce json
// @Param data body Data true "all fields are required"
// @Param files formData []file true "the list of files to upload (at least one file is required)"
// @Success 200
// @Failure 400 {object} models.Error "Possible errors: `Invalid multipart form` | `Invalid form data` | `Missing required fields` | `ChallID must be at least 0` | `Attachments[i] must not exceed 128`"
// @Failure 404 {object} models.Error "Possible errors: `Challenge not found`"
// @Failure 409 {object} models.Error "Possible errors: `Attachment already exists`"
// @Failure 500 {object} models.Error "Possible errors: `Error fetching challenge` | `Error creating attachments`"
// @Router /api/attachments [post]
func Route(c *fiber.Ctx) error {
	multipartForm, err := c.MultipartForm()
	if err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidMultipartForm)
	}

	var data Data
	decoder := form.NewDecoder()
	if err = decoder.Decode(&data, multipartForm.Value); err != nil {
		return utils.Error(c, fiber.StatusBadRequest, consts.InvalidFormData)
	}

	names, headers, err := extractValidatedAttachments(c, multipartForm, data)
	if err != nil || names == nil || headers == nil {
		return err
	}

	challenge, err := db.GetChallengeByID(c.Context(), *data.ChallID)
	if err != nil {
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorFetchingChallenge, err)
	}
	if challenge == nil {
		return utils.Error(c, fiber.StatusNotFound, consts.ChallengeNotFound)
	}

	hashes, err := saveFiles(c, *data.ChallID, headers)
	if err != nil || hashes == nil {
		return err
	}

	err = CreateAttachments(c.Context(), *data.ChallID, names, hashes)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == consts.PGUniqueViolation {
				return utils.Error(c, fiber.StatusConflict, consts.AttachmentAlreadyExists)
			}
		}
		return utils.Error(c, fiber.StatusInternalServerError, consts.ErrorCreatingAttachments, err)
	}

	return c.SendStatus(fiber.StatusOK)
}
