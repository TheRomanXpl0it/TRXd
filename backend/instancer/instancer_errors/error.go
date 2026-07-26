package instancer_errors

import "fmt"

// InvalidInstanceError represents an error that occurs when an instance is invalid.

type InvalidInstanceError struct {
	Message string
}

func (e *InvalidInstanceError) Error() string {
	return fmt.Sprintf("invalid instance: %s", e.Message)
}

func NewInvalidInstanceError(message string) *InvalidInstanceError {
	return &InvalidInstanceError{Message: message}
}

// RaceConditionError represents an error that occurs when a race condition is detected.

type RaceConditionError struct{}

func (e *RaceConditionError) Error() string {
	return "race condition"
}

func NewRaceConditionError() *RaceConditionError {
	return &RaceConditionError{}
}
