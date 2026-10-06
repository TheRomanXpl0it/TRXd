-- name: GetChallengeSolves :many
-- Retrieve all teams that solved a challenge
SELECT teams.id, teams.name, submissions.timestamp
  FROM submissions
  JOIN users ON users.id = submissions.user_id
  JOIN teams ON users.team_id = teams.id
  WHERE users.role = 'Player'
    AND submissions.chall_id = $1
    AND submissions.status = 'Correct'
  ORDER BY submissions.timestamp ASC;
