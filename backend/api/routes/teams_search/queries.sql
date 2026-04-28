-- name: SearchTeamsByName :many
-- Fuzzy search for teams by name using trigram similarity and ILIKE for partial matches.
SELECT
  t.id, t.name, u.email, u.role, t.country, u.id AS user_id
FROM teams t
JOIN (
  SELECT DISTINCT ON (team_id)
    id, email, role, team_id
  FROM users
  WHERE team_id IS NOT NULL
) u ON t.id = u.team_id
WHERE t.name % sqlc.arg('name') OR t.name ILIKE ('%' || sqlc.arg('name') || '%')
ORDER BY similarity(t.name, sqlc.arg('name')) DESC;

-- name: SearchTeamsByEmail :many
-- Fuzzy search for teams by email using trigram similarity and ILIKE for partial matches.
SELECT
  t.id, t.name, u.email, u.role, t.country, u.id AS user_id
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
WHERE u.team_id IS NOT NULL AND
  (u.email % sqlc.arg('email') OR u.email ILIKE ('%' || sqlc.arg('email') || '%'))
ORDER BY similarity(u.email, sqlc.arg('email')) DESC;
