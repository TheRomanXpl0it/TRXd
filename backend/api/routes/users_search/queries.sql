-- name: SearchUsersByName :many
-- Fuzzy search for users by name using trigram similarity and ILIKE for partial matches.
SELECT
  id, name, email, role, country
FROM users
WHERE name % sqlc.arg('name') OR name ILIKE ('%' || sqlc.arg('name') || '%')
ORDER BY similarity(name, sqlc.arg('name')) DESC;

-- name: SearchUsersByEmail :many
-- Fuzzy search for users by email using trigram similarity and ILIKE for partial matches.
SELECT
  id, name, email, role, country
FROM users
WHERE email % sqlc.arg('email') OR email ILIKE ('%' || sqlc.arg('email') || '%')
ORDER BY similarity(email, sqlc.arg('email')) DESC;
