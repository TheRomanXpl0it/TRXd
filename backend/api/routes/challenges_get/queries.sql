-- name: GetFlagsByChallenge :many
-- Retrieve all flags associated with a challenge
SELECT flag, regex FROM flags WHERE chall_id = $1;

-- name: GetChallAttachments :many
-- Retrieve all attachments associated with a challenge
SELECT
    (a.hash || '/' || a.name)::TEXT AS attachments
  FROM attachments a
  WHERE chall_id = $1;
