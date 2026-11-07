-- get_random_available_port

CREATE OR REPLACE FUNCTION get_random_available_port_from_range(min_port INTEGER, max_port INTEGER)
RETURNS INTEGER AS $$
DECLARE
  candidate INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(1337);

  SELECT port INTO candidate
    FROM generate_series(min_port, max_port) AS g(port)
    WHERE port NOT IN (SELECT i.port FROM instances i WHERE i.port IS NOT NULL)
    ORDER BY random()
    LIMIT 1;

  IF candidate IS NULL THEN
    RAISE EXCEPTION 'No available ports in range % - %', min_port, max_port;
  END IF;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_random_available_port()
RETURNS INTEGER AS $$
DECLARE
  min_port INTEGER;
  max_port INTEGER;
BEGIN
  min_port := CAST((SELECT value FROM configs WHERE key = 'min-port') AS INT);
  max_port := CAST((SELECT value FROM configs WHERE key = 'max-port') AS INT);
  RETURN get_random_available_port_from_range(min_port, max_port);
END;
$$ LANGUAGE plpgsql;


-- generate_instance_remote

CREATE OR REPLACE FUNCTION generate_instance_remote(chall_id INTEGER, hash_domain BOOLEAN)
RETURNS TABLE(host TEXT, port INTEGER) AS $$
DECLARE
  len INTEGER;
  hash TEXT;
BEGIN
  host := (SELECT challenges.host FROM challenges WHERE id = chall_id);

  IF host IS NULL OR host = '' THEN
    host := (SELECT value FROM configs WHERE key = 'domain');
  END IF;

  IF hash_domain THEN
    len := CAST((SELECT value FROM configs WHERE key = 'hash-len') AS INT);
    hash := SUBSTRING(encode(gen_random_bytes((len+1)/2),'hex'), 0, len+1);
    host := hash || '.' || host;
  ELSE
    port := get_random_available_port();
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;


-- update_challenge_sort_order

CREATE OR REPLACE FUNCTION update_challenge_sort_order(chall_id INTEGER, new_order INTEGER)
RETURNS VOID AS $$
DECLARE
  cat TEXT;
  old_order INTEGER;
  max_order INTEGER;
BEGIN
  SELECT category INTO cat
    FROM challenges
    WHERE id = chall_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge % not found', chall_id;
  END IF;

  PERFORM 1
    FROM challenges
    WHERE category = cat
      AND id != chall_id
    FOR UPDATE;

  SELECT sort_order INTO old_order
    FROM challenges
    WHERE id = chall_id;

  SELECT MAX(sort_order) INTO max_order
    FROM challenges
    WHERE category = cat;

  new_order := GREATEST(1, LEAST(new_order, max_order));

  IF old_order = new_order THEN
    RETURN;
  END IF;

  IF new_order < old_order THEN
    UPDATE challenges
      SET sort_order = sort_order + 1
      WHERE category = cat
        AND sort_order >= new_order
        AND sort_order < old_order;
  ELSE
    UPDATE challenges
      SET sort_order = sort_order - 1
      WHERE category = cat
        AND sort_order > old_order
        AND sort_order <= new_order;
  END IF;

  UPDATE challenges
    SET sort_order = new_order
    WHERE id = chall_id;

END;
$$ LANGUAGE plpgsql;
