-- name: GetChallengeByID :one
-- Retrieve a challenge by its ID
SELECT
  id,
  name,
  category,
  description,
  authors,
  tags,
  instance_type,
  hidden,

  max_points,
  score_type,
  points,
  solves,

  host,
  port,
  conn_type,
  hash_domain,

  image,
  compose,
  COALESCE(NULLIF(lifetime, 0), (SELECT value::INTEGER FROM configs WHERE key='instance-lifetime'))::INTEGER AS lifetime,
  renewable,
  envs,
  COALESCE(NULLIF(max_memory, 0), (SELECT value::INTEGER FROM configs WHERE key='instance-max-memory'))::INTEGER AS max_memory,
  COALESCE(NULLIF(max_cpu, ''), (SELECT value FROM configs WHERE key='instance-max-cpu'))::TEXT AS max_cpu
FROM challenges
WHERE id = $1;

-- name: GetHiddenAndAttachments :one
-- Checks if a challenge is hidden
SELECT
  c.hidden, 
  (ARRAY_AGG(a.hash || '/' || a.name) FILTER (WHERE a.name IS NOT NULL))::TEXT[] AS attachments
FROM challenges c
LEFT JOIN attachments a
  ON a.chall_id = c.id
WHERE c.id = $1
GROUP BY c.hidden;

-- name: GetTotalCategoryChallenges :many
-- Retrieve the total number of challenges for each category
SELECT category, COUNT(*)
FROM challenges
WHERE hidden = FALSE
GROUP BY category
ORDER BY category ASC;
