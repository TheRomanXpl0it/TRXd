-- name: UpdateChallengeOrder :exec
SELECT update_challenge_sort_order(sqlc.arg('chall_id')::INTEGER, sqlc.arg('new_order')::INTEGER);
