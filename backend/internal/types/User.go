package types

import "time"

type User struct {
	ID          string    `json:"id"`  // public id
	UID         string    `json:"uid"` // firebase id
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	LastVisited time.Time `json:"lastVisited"`
	Username    string    `json:"username"`
	Description string    `json:"description"`
}
