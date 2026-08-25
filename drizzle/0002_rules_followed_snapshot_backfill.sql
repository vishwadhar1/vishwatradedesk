-- Data-only migration. No schema change: rules_followed has been jsonb since
-- 0000, and widening its Drizzle $type<>() from Record<ruleId, boolean> to
-- [{ id, text, followed }] is erased at compile time, so nothing regenerated
-- and rows written before the change still hold the object shape. The calc
-- engine reads that column on every screen; left alone, those rows reach
-- rules.filter(...) and throw.
--
-- Rule TEXT is the part the object shape never stored. It is recovered here
-- from the playbook the position references, which is the closest thing to
-- the text actually scored against: these rows all predate the playbook
-- editor shipping, so no edit can have moved the text out from under them.
-- After this runs, a snapshot is genuinely a snapshot.

--> statement-breakpoint
-- Rows whose playbook still exists: rebuild in the playbook's own rule order,
-- carrying each rule's id and text, and defaulting a rule the legacy object
-- never answered to false.
UPDATE "positions" AS p
SET "rules_followed" = sub.converted
FROM (
  SELECT
    pos."id" AS position_id,
    jsonb_agg(
      jsonb_build_object(
        'id',       rule.value ->> 'id',
        'text',     rule.value ->> 'text',
        'followed', COALESCE(
                      pos."rules_followed" -> (rule.value ->> 'id') = 'true'::jsonb,
                      false
                    )
      )
      ORDER BY rule.ordinality
    ) AS converted
  FROM "positions" AS pos
  JOIN "playbooks" AS pb ON pb."id" = pos."playbook_id"
  CROSS JOIN LATERAL jsonb_array_elements(pb."rules")
    WITH ORDINALITY AS rule(value, ordinality)
  WHERE jsonb_typeof(pos."rules_followed") = 'object'
  GROUP BY pos."id"
) AS sub
WHERE p."id" = sub.position_id;

--> statement-breakpoint
-- Anything still in the object shape has no playbook to recover text from
-- (orphaned or null playbook_id). Convert it anyway so the engine cannot
-- crash on it; text is left empty rather than invented.
UPDATE "positions"
SET "rules_followed" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object('id', kv.key, 'text', '', 'followed', kv.value = 'true'::jsonb)
      ORDER BY kv.key
    )
    FROM jsonb_each("rules_followed") AS kv
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof("rules_followed") = 'object';
