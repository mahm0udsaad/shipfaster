-- Human roles, part 1 of 2 — the enum value only.
--
-- Split from 0008 because Postgres will not let a newly added enum value be USED in the same
-- transaction that adds it. Migrations run in a transaction, so the policies that reference
-- 'media_buyer' have to land in a second one. This file is deliberately one statement.
--
-- A media buyer schedules content and nothing else: they are a member of the account for the
-- content calendar's sake, not a colleague with the run of the books. Modelling that as a
-- membership role (rather than "a member we hope only visits /content") is what lets the
-- database enforce it in 0008 — route guards alone would leave PostgREST wide open to their
-- session token.

alter type account_role add value if not exists 'media_buyer';
