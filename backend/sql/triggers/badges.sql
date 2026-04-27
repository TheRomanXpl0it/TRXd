-- utils

CREATE OR REPLACE FUNCTION fn_badges_handler(category_name VARCHAR, team INTEGER)
RETURNS VOID AS $$
DECLARE
  category_solves INTEGER;
  visible_challs INTEGER;
BEGIN
  SELECT COUNT(*) INTO category_solves
    FROM submissions
    JOIN users ON users.id = submissions.user_id
      AND users.team_id = team
      AND users.role = 'Player'
    JOIN challenges ON challenges.id = submissions.chall_id
      AND challenges.category = category_name
      AND challenges.hidden = FALSE
    WHERE submissions.status = 'Correct';

  SELECT categories.visible_challs INTO visible_challs
    FROM categories
    WHERE categories.name = category_name;

  IF visible_challs > 0 AND category_solves >= visible_challs THEN
    IF NOT EXISTS(SELECT 1 FROM badges WHERE name = category_name AND team_id = team) THEN
      INSERT INTO badges (name, description, team_id)
        VALUES (category_name, 'Completed all ' || category_name || ' challenges', team);
    END IF;
  ELSE
    DELETE FROM badges
      WHERE name = category_name
        AND team_id = team;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- tr_badges_solve_insert

CREATE OR REPLACE FUNCTION fn_badges_solve_insert()
RETURNS TRIGGER AS $$
DECLARE
  team INTEGER;
  category_name VARCHAR;
BEGIN
  IF (SELECT role FROM users WHERE id = NEW.user_id) != 'Player' THEN
    RETURN NEW;
  END IF;

  SELECT users.team_id, challenges.category
    INTO team, category_name
    FROM users
    JOIN challenges ON challenges.id = NEW.chall_id
    WHERE users.id = NEW.user_id;

  PERFORM fn_badges_handler(category_name, team);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badges_solve_insert
AFTER INSERT ON submissions
FOR EACH ROW
WHEN (NEW.status = 'Correct')
EXECUTE FUNCTION fn_badges_solve_insert();


-- tr_badges_solve_del

CREATE OR REPLACE FUNCTION fn_badges_solve_del()
RETURNS TRIGGER AS $$
DECLARE
  team INTEGER;
  category_name VARCHAR;
BEGIN
  IF (SELECT role FROM users WHERE id = OLD.user_id) != 'Player' THEN
    RETURN OLD;
  END IF;

  SELECT users.team_id, challenges.category
    INTO team, category_name
    FROM users
    JOIN challenges ON challenges.id = OLD.chall_id
    WHERE users.id = OLD.user_id;

  PERFORM fn_badges_handler(category_name, team);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badges_solve_del
AFTER DELETE ON submissions
FOR EACH ROW
WHEN (OLD.status = 'Correct')
EXECUTE FUNCTION fn_badges_solve_del();


-- tr_badges_chall_del

CREATE OR REPLACE FUNCTION fn_badges_chall_del()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_badges_handler(OLD.category, id) FROM teams;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badges_chall_del
BEFORE DELETE ON challenges
FOR EACH ROW
EXECUTE FUNCTION fn_badges_chall_del();


-- tr_badges_user_del

CREATE OR REPLACE FUNCTION fn_badges_user_del()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role != 'Player' THEN
    RETURN OLD;
  END IF;

  PERFORM fn_badges_handler(name, OLD.team_id) FROM categories;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badges_user_del
AFTER DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION fn_badges_user_del();


-- tr_badges_chall_category_change

CREATE OR REPLACE FUNCTION fn_badges_recompute_both()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    fn_badges_handler(OLD.name, id),
    fn_badges_handler(NEW.name, id)
  FROM teams;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badges_chall_category_change
AFTER UPDATE ON challenges
FOR EACH ROW
WHEN (NEW.category != OLD.category)
EXECUTE FUNCTION fn_badges_recompute_both();


-- tr_badges_recompute

CREATE OR REPLACE FUNCTION fn_badges_recompute()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM fn_badges_handler(NEW.name, id) FROM teams;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_badges_recompute
AFTER UPDATE ON categories
FOR EACH ROW
WHEN (NEW.visible_challs != OLD.visible_challs)
EXECUTE FUNCTION fn_badges_recompute();
