-- tr_sort_order_create_challenge

CREATE OR REPLACE FUNCTION fn_sort_order_create_challenge()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1
    FROM challenges
    WHERE category = NEW.category
    FOR UPDATE;

  NEW.sort_order = (
    SELECT COALESCE(MAX(sort_order), 0) + 1
      FROM challenges
      WHERE category = NEW.category);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sort_order_create_challenge
BEFORE INSERT ON challenges
FOR EACH ROW
EXECUTE FUNCTION fn_sort_order_create_challenge();


-- tr_sort_order_delete_challenge

CREATE OR REPLACE FUNCTION fn_sort_order_delete_challenge()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1
    FROM challenges
    WHERE category = OLD.category
      AND sort_order > OLD.sort_order
    FOR UPDATE;

  UPDATE challenges
    SET sort_order = sort_order - 1
    WHERE category = OLD.category
      AND sort_order > OLD.sort_order;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sort_order_delete_challenge
AFTER DELETE ON challenges
FOR EACH ROW
EXECUTE FUNCTION fn_sort_order_delete_challenge();


-- tr_sort_order_update_challenge_category

CREATE OR REPLACE FUNCTION fn_sort_order_update_challenge_category()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1
    FROM challenges
    WHERE category = OLD.category
      AND sort_order > OLD.sort_order
    FOR UPDATE;

  UPDATE challenges
    SET sort_order = sort_order - 1
    WHERE category = OLD.category
      AND sort_order > OLD.sort_order;

  PERFORM 1
    FROM challenges
    WHERE category = NEW.category
    FOR UPDATE;

  UPDATE challenges
    SET sort_order = (
      SELECT COALESCE(MAX(sort_order), 0) + 1
        FROM challenges
        WHERE category = NEW.category
          AND id != NEW.id)
    WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sort_order_update_challenge_category
AFTER UPDATE OF category ON challenges
FOR EACH ROW
WHEN (OLD.category IS DISTINCT FROM NEW.category)
EXECUTE FUNCTION fn_sort_order_update_challenge_category();
