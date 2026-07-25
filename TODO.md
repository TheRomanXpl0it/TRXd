# TODO
 - clean instancer
 - resolve TODOs left into the code
 - tests:
   - integration tests (for generic behaviour)
   - tests for distributed functioning (already live testing & hand tested)

## Frontend
 - check/fix challenge connection type (now NONE is removed, default is TCP)
 - check/fix challenge instance type (instead of Normal is now Static)
 - check/fix challenge instance type (before was called type, now is instance_type)
 - add Change Role (modal / dropdown or whatever) in another user (if the user is Player or Author) if the session user is Admin (refer to PATCH /api/users/role)
 - add a red drop if challenge is first blodded (on the card) in the /challenges page
 - [/] Extra:
   - [ ] Add custom button themes for first/second/third bloods? (Analysis done)

## Ideas / Features
 - add author only tags (private tags) for challenges
 - reclaimer python tests
 - split /challenges/:id into player and author endpoints
 - instancer container restart policy editable
 - instancer container ingress only bool
 - instancer container disk space limit
 - no instances with tcp hash domain support
 - multi port & domain support for instances
 - rename "hash domain" (not an hash anymore, only rand bytes)
 - submissions page filers (first bloods, only wrong, group filter [correct, repeated])
 - extract data for ctftime
 - ban user/team support
 - N instance limit per team
 - scoreboard freeze (idea: use a table or a view to take a snapshot of the scoreboard, update it every time someone solves if not in freeze time (or just prefetch and compute if not exists))
 - telegram bot for first bloods (and webhook generalization) + pipeline tests
 - login via CTFTime
 - default starting points for challenges as global config
 - kube support
 - swarm support
 - ctf stats page
 - flag submit that checks for all challenges and mark solved the one of the correct flag (credits to: midnightsun)
 - writeups for challs into the platform (visible after ctf ends)
 - signed flags (AES ECB or hmac with team id (4 byte) and chall id (4 byte))
 - hook system for team based attachments (a different/unique attachment for each team)
 - likes and dislikes for challs (only for who actually solved)
 - kick user from team
 - endpoint to store image files (like badges and pfp)
 - flag format validator
 - ingress only challenges (verify if useful)
 - chall time schedule release
 - login via /verify with a valid token
 - chall sequence (unlock a challenge by solving another chall)
