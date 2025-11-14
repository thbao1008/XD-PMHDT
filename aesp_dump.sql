--
-- PostgreSQL database dump
--

\restrict za4sdgBtfLh3ba962AD7rvpRFHhksgEPfBN1pFkLqDl2LIfZR1b4uievYMGiVjD

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: purchase_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.purchase_status AS ENUM (
    'active',
    'expired',
    'paused'
);


ALTER TYPE public.purchase_status OWNER TO postgres;

--
-- Name: auto_assign_mentor(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_assign_mentor() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  best_mentor_id INT;
BEGIN
  -- Nếu learner bị ban thì không gán mentor
  IF EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = NEW.user_id AND u.status = 'banned'
  ) THEN
    RETURN NEW;
  END IF;

  -- Chỉ chạy khi mentor_id chưa có
  IF NEW.mentor_id IS NULL THEN
    SELECT m.id
    INTO best_mentor_id
    FROM mentors m
    LEFT JOIN learners l ON l.mentor_id = m.id
    WHERE NOT EXISTS (
      SELECT 1 FROM mentor_blocklist b
      WHERE b.learner_id = NEW.id AND b.mentor_id = m.id
    )
    GROUP BY m.id
    HAVING COUNT(l.id) < 15   -- giới hạn số learners/mentor
    ORDER BY COUNT(l.id) ASC, m.rating DESC
    LIMIT 1;

    -- Nếu tìm được mentor thì gán, kể cả rating = 0
    IF best_mentor_id IS NOT NULL THEN
      NEW.mentor_id := best_mentor_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_assign_mentor() OWNER TO postgres;

--
-- Name: auto_insert_mentor(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_insert_mentor() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.role = 'mentor' THEN
    INSERT INTO mentors (user_id, bio, experience_years, specialization, rating, created_at)
    VALUES (NEW.id, '', 0, '', 0, NOW());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_insert_mentor() OWNER TO postgres;

--
-- Name: create_learner_on_user_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_learner_on_user_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.role = 'learner' THEN
    INSERT INTO learners(user_id, start_date)
    VALUES (NEW.id, NOW());
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_learner_on_user_insert() OWNER TO postgres;

--
-- Name: create_purchase_on_user_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_purchase_on_user_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.role = 'learner' AND NEW.package_id IS NOT NULL THEN
    INSERT INTO purchases(user_id, package_id, status, created_at, extra_days)
    VALUES (NEW.id, NEW.package_id, 'active', NOW(), 0);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_purchase_on_user_insert() OWNER TO postgres;

--
-- Name: delete_learner_and_purchase_on_user_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_learner_and_purchase_on_user_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Xoá purchases liên quan
  DELETE FROM purchase WHERE user_id = OLD.id;

  -- Xoá learner liên quan
  DELETE FROM learners WHERE user_id = OLD.id;

  RETURN OLD;
END;
$$;


ALTER FUNCTION public.delete_learner_and_purchase_on_user_delete() OWNER TO postgres;

--
-- Name: delete_purchase_on_learner_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_purchase_on_learner_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM purchase WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION public.delete_purchase_on_learner_delete() OWNER TO postgres;

--
-- Name: set_expiry_date(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_expiry_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  SELECT NOW() + (duration_days || ' days')::interval
  INTO NEW.expiry_date
  FROM packages
  WHERE id = NEW.package_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_expiry_date() OWNER TO postgres;

--
-- Name: update_expiry_date(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_expiry_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.renewed_at IS NOT NULL THEN
    SELECT NEW.renewed_at + (duration_days || ' days')::interval
    INTO NEW.expiry_date
    FROM packages
    WHERE id = NEW.package_id;
  ELSIF NEW.changed_at IS NOT NULL THEN
    SELECT NEW.changed_at + (duration_days || ' days')::interval
    INTO NEW.expiry_date
    FROM packages
    WHERE id = NEW.package_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_expiry_date() OWNER TO postgres;

--
-- Name: update_expiry_date_on_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_expiry_date_on_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Nếu learner đổi gói (changed_at có giá trị)
  IF NEW.changed_at IS NOT NULL THEN
    SELECT NEW.changed_at + (duration_days || ' days')::interval
    INTO NEW.expiry_date
    FROM packages
    WHERE id = NEW.package_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_expiry_date_on_change() OWNER TO postgres;

--
-- Name: update_expiry_date_on_renew(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_expiry_date_on_renew() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Nếu renewed_at được set (không null)
  IF NEW.renewed_at IS NOT NULL THEN
    SELECT NEW.renewed_at + (duration_days || ' days')::interval
    INTO NEW.expiry_date
    FROM packages
    WHERE id = NEW.package_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_expiry_date_on_renew() OWNER TO postgres;

--
-- Name: update_mentor_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_mentor_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_mentor_sessions_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: learners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.learners (
    id integer NOT NULL,
    user_id integer NOT NULL,
    start_date date NOT NULL,
    note text,
    mentor_id integer,
    updated_at timestamp without time zone
);


ALTER TABLE public.learners OWNER TO postgres;

--
-- Name: packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.packages (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    duration_days integer NOT NULL,
    price integer NOT NULL,
    original_price integer NOT NULL,
    updated_at timestamp without time zone
);


ALTER TABLE public.packages OWNER TO postgres;

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchases (
    id integer NOT NULL,
    learner_id integer NOT NULL,
    package_id integer NOT NULL,
    status public.purchase_status DEFAULT 'active'::public.purchase_status,
    created_at timestamp without time zone DEFAULT now(),
    renewed_at timestamp without time zone,
    charged_at timestamp without time zone,
    extra_days integer DEFAULT 0,
    expired_at timestamp without time zone DEFAULT now(),
    changed_at timestamp without time zone,
    expiry_date timestamp without time zone
);


ALTER TABLE public.purchases OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(20),
    dob date,
    password text NOT NULL,
    role character varying(20) DEFAULT 'learner'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['learner'::character varying, 'mentor'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'banned'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: learner_package_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.learner_package_view AS
 SELECT l.id AS learner_id,
    u.name AS learner_name,
    u.email,
    u.phone,
    u.dob,
    l.mentor_id,
    l.start_date,
    l.note,
    p.id AS purchase_id,
    p.status,
    p.created_at,
    p.renewed_at,
    p.changed_at,
    (COALESCE(p.expiry_date, (p.created_at + ((pkg.duration_days || ' days'::text))::interval)) + ((p.extra_days || ' days'::text))::interval) AS expiry_date,
    pkg.id AS package_id,
    pkg.name AS package_name,
    pkg.price,
    pkg.duration_days,
        CASE
            WHEN (p.status = 'paused'::public.purchase_status) THEN NULL::double precision
            ELSE GREATEST((0)::double precision, date_part('day'::text, (((COALESCE(p.expiry_date, (p.created_at + ((pkg.duration_days || ' days'::text))::interval)) + ((p.extra_days || ' days'::text))::interval))::timestamp with time zone - now())))
        END AS days_left
   FROM (((public.learners l
     JOIN public.users u ON ((l.user_id = u.id)))
     LEFT JOIN public.purchases p ON ((p.learner_id = l.id)))
     LEFT JOIN public.packages pkg ON ((p.package_id = pkg.id)));


ALTER VIEW public.learner_package_view OWNER TO postgres;

--
-- Name: learners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.learners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.learners_id_seq OWNER TO postgres;

--
-- Name: learners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.learners_id_seq OWNED BY public.learners.id;


--
-- Name: mentor_blocklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_blocklist (
    id integer NOT NULL,
    learner_id integer,
    mentor_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.mentor_blocklist OWNER TO postgres;

--
-- Name: mentor_blocklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_blocklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_blocklist_id_seq OWNER TO postgres;

--
-- Name: mentor_blocklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_blocklist_id_seq OWNED BY public.mentor_blocklist.id;


--
-- Name: mentor_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_feedback (
    id integer NOT NULL,
    session_id integer,
    pronunciation_notes text,
    grammar_notes text,
    vocabulary_notes text,
    confidence_notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mentor_feedback OWNER TO postgres;

--
-- Name: mentor_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_feedback_id_seq OWNER TO postgres;

--
-- Name: mentor_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_feedback_id_seq OWNED BY public.mentor_feedback.id;


--
-- Name: mentor_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_sessions (
    id integer NOT NULL,
    mentor_id integer NOT NULL,
    date date NOT NULL,
    type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    note text,
    is_exam boolean DEFAULT false,
    paused boolean DEFAULT false,
    CONSTRAINT chk_time_order CHECK ((end_time > start_time)),
    CONSTRAINT mentor_sessions_type_check CHECK (((type)::text = ANY ((ARRAY['online'::character varying, 'offline'::character varying])::text[])))
);


ALTER TABLE public.mentor_sessions OWNER TO postgres;

--
-- Name: mentor_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_sessions_id_seq OWNER TO postgres;

--
-- Name: mentor_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_sessions_id_seq OWNED BY public.mentor_sessions.id;


--
-- Name: mentor_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_skills (
    id integer NOT NULL,
    mentor_id integer,
    skill_name character varying(100),
    description text
);


ALTER TABLE public.mentor_skills OWNER TO postgres;

--
-- Name: mentor_skills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentor_skills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentor_skills_id_seq OWNER TO postgres;

--
-- Name: mentor_skills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentor_skills_id_seq OWNED BY public.mentor_skills.id;


--
-- Name: mentors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentors (
    id integer NOT NULL,
    user_id integer,
    bio text,
    experience_years integer,
    specialization character varying(100),
    rating numeric(3,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mentors OWNER TO postgres;

--
-- Name: mentors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mentors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mentors_id_seq OWNER TO postgres;

--
-- Name: mentors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mentors_id_seq OWNED BY public.mentors.id;


--
-- Name: packages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.packages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.packages_id_seq OWNER TO postgres;

--
-- Name: packages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.packages_id_seq OWNED BY public.packages.id;


--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchases_id_seq OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    reporter_id integer NOT NULL,
    target_id integer NOT NULL,
    content text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    reply text,
    reply_by character varying(50),
    reply_at timestamp without time zone
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_id_seq OWNER TO postgres;

--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: support_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_requests (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(20),
    note text,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.support_requests OWNER TO postgres;

--
-- Name: support_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_requests_id_seq OWNER TO postgres;

--
-- Name: support_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_requests_id_seq OWNED BY public.support_requests.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: learners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learners ALTER COLUMN id SET DEFAULT nextval('public.learners_id_seq'::regclass);


--
-- Name: mentor_blocklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_blocklist ALTER COLUMN id SET DEFAULT nextval('public.mentor_blocklist_id_seq'::regclass);


--
-- Name: mentor_feedback id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_feedback ALTER COLUMN id SET DEFAULT nextval('public.mentor_feedback_id_seq'::regclass);


--
-- Name: mentor_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_sessions ALTER COLUMN id SET DEFAULT nextval('public.mentor_sessions_id_seq'::regclass);


--
-- Name: mentor_skills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_skills ALTER COLUMN id SET DEFAULT nextval('public.mentor_skills_id_seq'::regclass);


--
-- Name: mentors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentors ALTER COLUMN id SET DEFAULT nextval('public.mentors_id_seq'::regclass);


--
-- Name: packages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages ALTER COLUMN id SET DEFAULT nextval('public.packages_id_seq'::regclass);


--
-- Name: purchases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: support_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests ALTER COLUMN id SET DEFAULT nextval('public.support_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: learners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.learners (id, user_id, start_date, note, mentor_id, updated_at) FROM stdin;
3	285	2025-11-10	\N	3	\N
2	35	2025-11-08	aabbbcc	1	2025-11-10 21:48:21.838251
5	647	2025-11-11	\N	3	\N
4	286	2025-11-10	aaa	1	2025-11-11 16:01:19.735561
6	753	2025-11-11	phong cách	1	2025-11-12 18:07:32.415363
\.


--
-- Data for Name: mentor_blocklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_blocklist (id, learner_id, mentor_id, created_at) FROM stdin;
\.


--
-- Data for Name: mentor_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_feedback (id, session_id, pronunciation_notes, grammar_notes, vocabulary_notes, confidence_notes, created_at) FROM stdin;
\.


--
-- Data for Name: mentor_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_sessions (id, mentor_id, date, type, created_at, updated_at, start_time, end_time, note, is_exam, paused) FROM stdin;
63	1	2025-11-22	online	2025-11-12 22:27:37.308924	2025-11-12 22:27:37.308924	22:27:00	22:28:00		t	f
64	1	2025-11-21	online	2025-11-12 22:28:29.613535	2025-11-12 22:28:29.613535	22:28:00	23:27:00		f	f
65	1	2025-11-21	online	2025-11-12 22:28:32.747673	2025-11-12 22:28:32.747673	22:28:00	23:27:00		f	f
66	1	2025-11-19	online	2025-11-12 22:46:27.906366	2025-11-12 22:46:27.906366	22:48:00	23:50:00	test	f	f
67	1	2025-11-19	online	2025-11-12 22:47:19.379328	2025-11-12 22:47:19.379328	22:48:00	23:50:00	test	f	f
69	1	2025-11-19	online	2025-11-12 22:52:23.908498	2025-11-12 22:52:23.908498	22:48:00	23:50:00	test	f	f
70	1	2025-11-19	online	2025-11-12 23:08:21.410036	2025-11-12 23:08:21.410036	22:48:00	23:50:00	test	f	f
71	1	2025-11-19	online	2025-11-12 23:08:46.574737	2025-11-12 23:08:46.574737	22:48:00	23:50:00	test	f	f
72	1	2025-11-19	online	2025-11-12 23:16:07.299263	2025-11-12 23:16:07.299263	22:48:00	23:50:00	test	f	f
74	1	2025-11-22	offline	2025-11-12 23:16:07.306096	2025-11-12 23:16:07.306096	22:46:00	22:47:00	test	f	f
73	1	2025-11-20	online	2025-11-12 23:16:07.304515	2025-11-12 23:16:28.421021	22:46:00	23:46:00	test	f	t
\.


--
-- Data for Name: mentor_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_skills (id, mentor_id, skill_name, description) FROM stdin;
\.


--
-- Data for Name: mentors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentors (id, user_id, bio, experience_years, specialization, rating, created_at, updated_at) FROM stdin;
1	78		0		0.00	2025-11-09 10:10:58.770855+07	2025-11-09 10:10:58.770855+07
3	173		0		0.00	2025-11-09 16:22:41.715187+07	2025-11-09 16:22:41.715187+07
\.


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.packages (id, name, duration_days, price, original_price, updated_at) FROM stdin;
1	Basic	30	599000	799000	\N
2	Pro	90	1899000	2397000	\N
3	VIP	180	3999000	4794000	2025-11-12 23:57:51.051945
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchases (id, learner_id, package_id, status, created_at, renewed_at, charged_at, extra_days, expired_at, changed_at, expiry_date) FROM stdin;
2	2	2	active	2025-11-08 19:35:20.482589	\N	\N	0	2025-11-08 19:35:20.482589	\N	\N
5	4	1	active	2025-11-10 00:20:43.691676	\N	\N	0	2025-11-10 00:20:43.691676	\N	2025-12-10 00:20:43.691676
7	6	2	paused	2025-11-11 17:12:28.741261	\N	\N	0	2025-11-11 17:12:28.741261	\N	2026-02-09 17:12:28.741261
6	5	1	active	2025-11-11 13:19:22.586086	\N	\N	0	2025-11-11 13:19:22.586086	\N	2025-12-11 13:19:22.586086
4	3	1	paused	2025-11-10 00:19:28.280527	\N	\N	0	2025-11-10 00:19:28.280527	\N	2025-12-10 00:19:28.280527
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, reporter_id, target_id, content, status, created_at, updated_at, reply, reply_by, reply_at) FROM stdin;
39	78	286	aaa	resolved	2025-11-11 16:54:47.609704	2025-11-11 16:55:01.817542	[Admin trả lời - 11/11/2025 16:55:01] Học viên đã được xử lý theo quy định.	admin	2025-11-11 16:55:01.817542
40	78	35	cccc\n[Report bổ sung - 11/11/2025 17:06:38] aaa	resolved	2025-11-11 16:54:49.80575	2025-11-11 17:06:59.790903	[Admin trả lời - 11/11/2025 17:06:59] Học viên đã được xử lý theo quy định.	admin	2025-11-11 17:06:59.790903
42	78	753	[Report - 11/11/2025 17:12:46] aaaaa	resolved	2025-11-11 17:12:46.586097	2025-11-11 23:30:37.24626	[Admin trả lời - 11/11/2025 23:30:37] Học viên đã được xử lý theo quy định.	admin	2025-11-11 23:30:37.24626
\.


--
-- Data for Name: support_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_requests (id, name, email, phone, note, status, created_at) FROM stdin;
1	Nguyễn	a@gmail.com	0987654321	Đăng ký từ trang Home	resolved	2025-11-06 13:31:44.401149
2	bé Bi	ntb100804@gmail.com	aaaaa	Đăng ký từ trang Home	pending	2025-11-11 16:17:28.244445
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, phone, dob, password, role, status, created_at, updated_at) FROM stdin;
78	Kkk	mentor@gmail.com	0900000000	2025-11-08	$2b$10$qSciikN.GLX/T8W8BGTg3OpuQ1w.MwKo35H/OugLG0Mwkn78.AzYC	mentor	active	2025-11-08 22:33:18.576965	2025-11-08 22:33:18.576965
753	Phonk Crack	learner@gmail.com	0990009090	2025-11-11	$2b$10$NT5chKSTktgjWhT93zAXNuRJdjcvrhp8uLGuHA0JoDyFqGU1PCtr6	learner	banned	2025-11-11 17:12:28.731663	2025-11-11 23:13:37.177031
647	Nhóm 2	n2@gmail.com	0987678909	2025-11-11	$2b$10$cg9TCHitF5kTzQId.ZRZEeM2HU4h1Wy1yM1qVaEYWRnh43P//nyee	learner	active	2025-11-11 13:19:22.56343	2025-11-11 23:17:08.605487
35	A	ab@gmail.com	0000000000	2025-11-08	$2b$10$D4hQDy8auKoUI4e.zgJEZO69efb8kugt2fFnPGS1SGoeScJFS4Wpy	learner	active	2025-11-08 19:35:20.47811	2025-11-08 20:05:38.589968
286	Bảo	bao@gmail.com	0900000001	2025-11-10	$2b$10$QFFgl4dzbkIKVWqjSaRavuY.YhP0ktLjl6LAN2QQ3jQliHY/P0/Sq	learner	active	2025-11-10 00:20:43.68506	2025-11-11 12:24:22.817655
173	Bao	aa@gmail.com	0987999000	2025-11-09	$2b$10$0ojxzCCxQVMOJxK5rEvSmuu5qwZPsrS5r.buNLEN8Ehmpg7mYrMWq	mentor	active	2025-11-09 16:22:41.715187	2025-11-09 16:22:41.715187
285	Trang	tr@gmail.com	0119291291	2025-11-10	$2b$10$8coMOgGp18T.Ml5g/6UjxuEduZ8BPKnmOSywOJJyky5vy1MoeCAZy	learner	banned	2025-11-10 00:19:28.270335	2025-11-12 12:40:57.674952
1	Admin	admin@gmail.com	0123456789	2000-01-01	$2b$10$wOA3n3iY.CbFRHeOjHfKJuSDvYS6pjVunN8VBmBWyGJqnkuDhuy7y	admin	active	2025-11-08 16:34:10.844488	2025-11-13 12:25:48.001022
2	Thao Bảnh 04	ntb100804@gmail.com	0867675205	2004-08-10	$2b$10$R1LxXZDSXF3dONvAHDkKxO6D8d2wUXLCWCpOzZ7.dQwE7K41AxuiS	admin	active	2025-11-08 16:34:10.929487	2025-11-13 12:25:48.074442
3	Test Admin	testadmin@gmail.com	0999999999	1990-01-01	$2b$10$TC.gIMUXpglyXWB5MtvjheFUvn.NGUNDq/ahb9itCB.MBH3PWz58.	admin	active	2025-11-08 16:34:11.008433	2025-11-13 12:25:48.144487
\.


--
-- Name: learners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.learners_id_seq', 6, true);


--
-- Name: mentor_blocklist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_blocklist_id_seq', 1, false);


--
-- Name: mentor_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_feedback_id_seq', 1, false);


--
-- Name: mentor_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_sessions_id_seq', 74, true);


--
-- Name: mentor_skills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentor_skills_id_seq', 1, false);


--
-- Name: mentors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mentors_id_seq', 3, true);


--
-- Name: packages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.packages_id_seq', 7, true);


--
-- Name: purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchases_id_seq', 7, true);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reports_id_seq', 42, true);


--
-- Name: support_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_requests_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1119, true);


--
-- Name: learners learners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learners
    ADD CONSTRAINT learners_pkey PRIMARY KEY (id);


--
-- Name: mentor_blocklist mentor_blocklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_blocklist
    ADD CONSTRAINT mentor_blocklist_pkey PRIMARY KEY (id);


--
-- Name: mentor_feedback mentor_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_pkey PRIMARY KEY (id);


--
-- Name: mentor_sessions mentor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_sessions
    ADD CONSTRAINT mentor_sessions_pkey PRIMARY KEY (id);


--
-- Name: mentor_skills mentor_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_skills
    ADD CONSTRAINT mentor_skills_pkey PRIMARY KEY (id);


--
-- Name: mentors mentors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: support_requests support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);


--
-- Name: reports unique_report; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT unique_report UNIQUE (reporter_id, target_id);


--
-- Name: reports unique_report_pair; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT unique_report_pair UNIQUE (reporter_id, target_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_unique_report_pair; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_report_pair ON public.reports USING btree (reporter_id, target_id);


--
-- Name: learners auto_assign_mentor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER auto_assign_mentor BEFORE INSERT OR UPDATE ON public.learners FOR EACH ROW EXECUTE FUNCTION public.auto_assign_mentor();


--
-- Name: learners trg_auto_assign_mentor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_auto_assign_mentor BEFORE INSERT OR UPDATE ON public.learners FOR EACH ROW EXECUTE FUNCTION public.auto_assign_mentor();


--
-- Name: purchases trg_set_expiry_date; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_expiry_date BEFORE INSERT ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_expiry_date();


--
-- Name: purchases trg_update_expiry_date; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_expiry_date BEFORE INSERT OR UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_expiry_date();


--
-- Name: purchases trg_update_expiry_date_on_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_expiry_date_on_change BEFORE UPDATE OF changed_at ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_expiry_date_on_change();


--
-- Name: purchases trg_update_expiry_date_on_renew; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_expiry_date_on_renew BEFORE UPDATE OF renewed_at ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_expiry_date_on_renew();


--
-- Name: mentor_sessions trg_update_mentor_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_mentor_sessions_updated_at BEFORE UPDATE ON public.mentor_sessions FOR EACH ROW EXECUTE FUNCTION public.update_mentor_sessions_updated_at();


--
-- Name: users trigger_auto_insert_mentor; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_insert_mentor AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.auto_insert_mentor();


--
-- Name: learners fk_learners_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learners
    ADD CONSTRAINT fk_learners_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: purchases fk_purchases_learner; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_learner FOREIGN KEY (learner_id) REFERENCES public.learners(id) ON DELETE CASCADE;


--
-- Name: purchases fk_purchases_package; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT fk_purchases_package FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: reports fk_reporter; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_reporter FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports fk_target; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_target FOREIGN KEY (target_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: learners learners_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learners
    ADD CONSTRAINT learners_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE SET NULL;


--
-- Name: mentor_blocklist mentor_blocklist_learner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_blocklist
    ADD CONSTRAINT mentor_blocklist_learner_id_fkey FOREIGN KEY (learner_id) REFERENCES public.learners(id);


--
-- Name: mentor_blocklist mentor_blocklist_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_blocklist
    ADD CONSTRAINT mentor_blocklist_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id);


--
-- Name: mentor_sessions mentor_sessions_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_sessions
    ADD CONSTRAINT mentor_sessions_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE CASCADE;


--
-- Name: mentor_skills mentor_skills_mentor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_skills
    ADD CONSTRAINT mentor_skills_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE CASCADE;


--
-- Name: mentors mentors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentors
    ADD CONSTRAINT mentors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict za4sdgBtfLh3ba962AD7rvpRFHhksgEPfBN1pFkLqDl2LIfZR1b4uievYMGiVjD

