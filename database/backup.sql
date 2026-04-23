--
-- PostgreSQL database dump
--

-- Dumped from database version 15.3 (Debian 15.3-1.pgdg120+1)
-- Dumped by pg_dump version 15.3 (Debian 15.3-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_reservation_overlap(); Type: FUNCTION; Schema: public; Owner: alumno
--

CREATE FUNCTION public.check_reservation_overlap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM reservations
        WHERE  room_id   = NEW.room_id
          AND  id       != COALESCE(NEW.id, -1)
          AND  status   IN ('confirmed', 'pending')
          AND  check_in  < NEW.check_out
          AND  check_out > NEW.check_in
    ) THEN
        RAISE EXCEPTION
            'La habitación % ya tiene una reserva activa en ese rango de fechas.',
            NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_reservation_overlap() OWNER TO alumno;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: alumno
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO alumno;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: channels; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.channels (
    id integer NOT NULL,
    name character varying(60) NOT NULL,
    slug character varying(30) NOT NULL
);


ALTER TABLE public.channels OWNER TO alumno;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    name character varying(120) NOT NULL,
    contact_name character varying(120),
    contact_email character varying(120),
    contact_phone character varying(30),
    arrival_date date NOT NULL,
    departure_date date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    personas integer,
    status character varying(20) DEFAULT 'confirmado'::character varying NOT NULL,
    CONSTRAINT groups_check CHECK ((departure_date > arrival_date)),
    CONSTRAINT groups_status_check CHECK (((status)::text = ANY ((ARRAY['confirmado'::character varying, 'cancelado'::character varying, 'pendiente'::character varying])::text[])))
);


ALTER TABLE public.groups OWNER TO alumno;

--
-- Name: guests; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.guests (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    name character varying(120) NOT NULL,
    email character varying(120),
    phone character varying(30),
    nationality character(2),
    id_number character varying(30),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.guests OWNER TO alumno;

--
-- Name: reservations; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.reservations (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    room_id integer NOT NULL,
    guest_id integer,
    channel_id integer NOT NULL,
    group_id integer,
    check_in date NOT NULL,
    check_out date NOT NULL,
    status character varying(20) DEFAULT 'confirmed'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tipo_ocupacion character varying(20) DEFAULT 'individual'::character varying,
    CONSTRAINT reservations_check CHECK ((check_out > check_in)),
    CONSTRAINT reservations_status_check CHECK (((status)::text = ANY ((ARRAY['confirmed'::character varying, 'pending'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::text[]))),
    CONSTRAINT reservations_tipo_ocupacion_check CHECK (((tipo_ocupacion)::text = ANY ((ARRAY['individual'::character varying, 'single'::character varying])::text[])))
);


ALTER TABLE public.reservations OWNER TO alumno;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.rooms (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    number character varying(10) NOT NULL,
    type character varying(20) NOT NULL,
    capacity smallint NOT NULL,
    floor smallint,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subtipo character varying(20),
    CONSTRAINT rooms_capacity_check CHECK (((capacity >= 2) AND (capacity <= 6))),
    CONSTRAINT rooms_subtipo_check CHECK (((subtipo)::text = ANY ((ARRAY['matrimonial'::character varying, 'twin'::character varying, 'individual'::character varying, 'familiar'::character varying])::text[]))),
    CONSTRAINT rooms_type_check CHECK (((type)::text = ANY ((ARRAY['double'::character varying, 'triple'::character varying, 'quad'::character varying, 'quintuple'::character varying, 'familiar'::character varying])::text[])))
);


ALTER TABLE public.rooms OWNER TO alumno;

--
-- Name: availability_view; Type: VIEW; Schema: public; Owner: alumno
--

CREATE VIEW public.availability_view AS
 SELECT r.hotel_id,
    r.id AS room_id,
    r.number AS room_number,
    r.type AS room_type,
    r.capacity,
    res.id AS reservation_id,
    res.check_in,
    res.check_out,
    res.status AS reservation_status,
    c.slug AS channel_slug,
    c.name AS channel_name,
    g.name AS guest_name,
    grp.name AS group_name
   FROM ((((public.rooms r
     LEFT JOIN public.reservations res ON (((res.room_id = r.id) AND ((res.status)::text = ANY ((ARRAY['confirmed'::character varying, 'pending'::character varying])::text[])))))
     LEFT JOIN public.channels c ON ((c.id = res.channel_id)))
     LEFT JOIN public.guests g ON ((g.id = res.guest_id)))
     LEFT JOIN public.groups grp ON ((grp.id = res.group_id)));


ALTER TABLE public.availability_view OWNER TO alumno;

--
-- Name: channels_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.channels_id_seq OWNER TO alumno;

--
-- Name: channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.channels_id_seq OWNED BY public.channels.id;


--
-- Name: configuracion; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.configuracion (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    clave character varying(50) NOT NULL,
    valor character varying(200) NOT NULL,
    descripcion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.configuracion OWNER TO alumno;

--
-- Name: configuracion_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.configuracion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.configuracion_id_seq OWNER TO alumno;

--
-- Name: configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.configuracion_id_seq OWNED BY public.configuracion.id;


--
-- Name: fichajes; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.fichajes (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    user_id integer NOT NULL,
    fecha date NOT NULL,
    hora_entrada time without time zone,
    hora_salida time without time zone,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fichajes OWNER TO alumno;

--
-- Name: fichajes_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.fichajes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fichajes_id_seq OWNER TO alumno;

--
-- Name: fichajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.fichajes_id_seq OWNED BY public.fichajes.id;


--
-- Name: gastos; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.gastos (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    fecha date NOT NULL,
    descripcion character varying(200) NOT NULL,
    monto numeric(12,2) NOT NULL,
    categoria character varying(50) DEFAULT 'otro'::character varying NOT NULL,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gastos_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['mantenimiento'::character varying, 'limpieza'::character varying, 'servicios'::character varying, 'suministros'::character varying, 'personal'::character varying, 'otro'::character varying])::text[])))
);


ALTER TABLE public.gastos OWNER TO alumno;

--
-- Name: gastos_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.gastos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.gastos_id_seq OWNER TO alumno;

--
-- Name: gastos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.gastos_id_seq OWNED BY public.gastos.id;


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.groups_id_seq OWNER TO alumno;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: guests_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.guests_id_seq OWNER TO alumno;

--
-- Name: guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.guests_id_seq OWNED BY public.guests.id;


--
-- Name: habitaciones_override; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.habitaciones_override (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    room_id integer NOT NULL,
    fecha_desde date NOT NULL,
    fecha_hasta date NOT NULL,
    tipo_override character varying(20),
    subtipo_override character varying(20),
    capacidad_override smallint,
    notas text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT habitaciones_override_check CHECK ((fecha_hasta >= fecha_desde))
);


ALTER TABLE public.habitaciones_override OWNER TO alumno;

--
-- Name: habitaciones_override_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.habitaciones_override_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.habitaciones_override_id_seq OWNER TO alumno;

--
-- Name: habitaciones_override_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.habitaciones_override_id_seq OWNED BY public.habitaciones_override.id;


--
-- Name: hotels; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.hotels (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(60) NOT NULL,
    city character varying(80),
    address text,
    phone character varying(30),
    email character varying(120),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.hotels OWNER TO alumno;

--
-- Name: hotels_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.hotels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.hotels_id_seq OWNER TO alumno;

--
-- Name: hotels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.hotels_id_seq OWNED BY public.hotels.id;


--
-- Name: precios; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.precios (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    tipo character varying(20) NOT NULL,
    fecha_desde date NOT NULL,
    fecha_hasta date NOT NULL,
    precio_noche numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    precio_grupo numeric(10,2),
    CONSTRAINT precios_check CHECK ((fecha_hasta >= fecha_desde)),
    CONSTRAINT precios_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['single'::character varying, 'double'::character varying, 'triple'::character varying, 'quad'::character varying, 'quintuple'::character varying, 'familiar'::character varying])::text[])))
);


ALTER TABLE public.precios OWNER TO alumno;

--
-- Name: precios_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.precios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.precios_id_seq OWNER TO alumno;

--
-- Name: precios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.precios_id_seq OWNED BY public.precios.id;


--
-- Name: reservations_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.reservations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reservations_id_seq OWNER TO alumno;

--
-- Name: reservations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;


--
-- Name: rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rooms_id_seq OWNER TO alumno;

--
-- Name: rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.rooms_id_seq OWNED BY public.rooms.id;


--
-- Name: sueldos; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.sueldos (
    id integer NOT NULL,
    hotel_id integer NOT NULL,
    user_id integer NOT NULL,
    sueldo_fijo numeric(12,2) DEFAULT 0 NOT NULL,
    sueldo_por_hora numeric(10,2) DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sueldos OWNER TO alumno;

--
-- Name: sueldos_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.sueldos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sueldos_id_seq OWNER TO alumno;

--
-- Name: sueldos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.sueldos_id_seq OWNED BY public.sueldos.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: alumno
--

CREATE TABLE public.users (
    id integer NOT NULL,
    hotel_id integer,
    email character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'employee'::character varying NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    phone character varying(20),
    categoria character varying(50),
    fecha_ingreso date,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['superadmin'::character varying, 'admin'::character varying, 'employee'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO alumno;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: alumno
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO alumno;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alumno
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: channels id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.channels ALTER COLUMN id SET DEFAULT nextval('public.channels_id_seq'::regclass);


--
-- Name: configuracion id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.configuracion ALTER COLUMN id SET DEFAULT nextval('public.configuracion_id_seq'::regclass);


--
-- Name: fichajes id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.fichajes ALTER COLUMN id SET DEFAULT nextval('public.fichajes_id_seq'::regclass);


--
-- Name: gastos id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.gastos ALTER COLUMN id SET DEFAULT nextval('public.gastos_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: guests id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.guests ALTER COLUMN id SET DEFAULT nextval('public.guests_id_seq'::regclass);


--
-- Name: habitaciones_override id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.habitaciones_override ALTER COLUMN id SET DEFAULT nextval('public.habitaciones_override_id_seq'::regclass);


--
-- Name: hotels id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.hotels ALTER COLUMN id SET DEFAULT nextval('public.hotels_id_seq'::regclass);


--
-- Name: precios id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.precios ALTER COLUMN id SET DEFAULT nextval('public.precios_id_seq'::regclass);


--
-- Name: reservations id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


--
-- Name: rooms id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.rooms ALTER COLUMN id SET DEFAULT nextval('public.rooms_id_seq'::regclass);


--
-- Name: sueldos id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.sueldos ALTER COLUMN id SET DEFAULT nextval('public.sueldos_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.channels (id, name, slug) FROM stdin;
1	Booking.com	booking
2	Reserva directa	direct
3	Gmail / Email	email
4	Grupo	group
5	Otro	other
\.


--
-- Data for Name: configuracion; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.configuracion (id, hotel_id, clave, valor, descripcion, created_at) FROM stdin;
1	1	umbral_grupo	15	Cantidad mínima de personas para considerar una reserva como grupo	2026-03-18 05:55:15.99772+00
\.


--
-- Data for Name: fichajes; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.fichajes (id, hotel_id, user_id, fecha, hora_entrada, hora_salida, notas, created_at) FROM stdin;
1	1	3	2026-03-18	08:00:00	18:00:00	\N	2026-03-18 05:06:51.353412+00
\.


--
-- Data for Name: gastos; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.gastos (id, hotel_id, fecha, descripcion, monto, categoria, notas, created_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.groups (id, hotel_id, name, contact_name, contact_email, contact_phone, arrival_date, departure_date, notes, created_at, personas, status) FROM stdin;
57	1	ZAMBERLAN	Zamberlan	\N	\N	2026-09-29	2026-10-03	\N	2026-03-20 19:53:39.303099+00	\N	confirmado
58	1	VERONICA GUIA	Veronica Guia	\N	\N	2026-10-03	2026-10-07	\N	2026-03-20 19:59:08.1859+00	\N	confirmado
59	1	WAVE	Federico	\N	\N	2026-10-08	2026-10-10	\N	2026-03-20 20:00:17.415839+00	\N	confirmado
60	1	MARCELO GIMENEZ	Marcelo Gimenez	\N	\N	2026-10-14	2026-10-18	\N	2026-03-20 20:01:45.488372+00	\N	confirmado
61	1	GUEST	Guest	\N	\N	2026-10-18	2026-10-20	\N	2026-03-20 20:03:29.019902+00	\N	confirmado
3	1	CONOCIENDO EL MUNDO (SUSANA)	Susana	\N	\N	2026-04-01	2026-04-04	\N	2026-03-20 04:39:45.382229+00	\N	confirmado
4	1	ANDRES TUELLS	Andres Tuells	\N	\N	2026-04-16	2026-04-19	\N	2026-03-20 04:43:27.171719+00	\N	confirmado
5	1	SEBASTIAN CARDARELLI	Sebastian Cardarelli	\N	\N	2026-04-17	2026-04-22	\N	2026-03-20 04:51:18.876513+00	\N	confirmado
6	1	BETY ALBORNOZ	Bety Albornoz	\N	\N	2026-04-23	2026-04-26	\N	2026-03-20 04:54:09.941982+00	\N	confirmado
7	1	RICKY VIÑAS	Ricky Viñas	\N	\N	2026-04-30	2026-05-03	\N	2026-03-20 05:07:12.245645+00	\N	confirmado
8	1	HIRAM	Hiram	\N	\N	2026-05-03	2026-05-05	\N	2026-03-20 05:56:41.657531+00	\N	confirmado
9	1	CRISTIAN PANUZZIO	Cristian Panuzzio	\N	\N	2026-05-08	2026-05-11	\N	2026-03-20 05:58:38.298087+00	\N	confirmado
10	1	URRUTIA	Urrutia	\N	\N	2026-05-11	2026-05-14	\N	2026-03-20 06:00:23.63337+00	\N	confirmado
11	1	SUSANA BERNAOLA	Susana bernaola	\N	\N	2026-05-11	2026-05-14	\N	2026-03-20 06:02:13.19144+00	\N	confirmado
12	1	LA PALMERITA VIAJES	Palmerita	\N	\N	2026-05-14	2026-05-17	\N	2026-03-20 06:03:31.526254+00	\N	confirmado
13	1	TATIANA ANIMATE	Tatiana	\N	\N	2026-05-19	2026-05-21	\N	2026-03-20 06:05:31.140673+00	\N	confirmado
14	1	WILMAR TURISMO	Cristina	\N	\N	2026-05-21	2026-05-22	\N	2026-03-20 06:07:03.931807+00	\N	confirmado
15	1	GUEST	Guest	\N	\N	2026-05-22	2026-05-24	\N	2026-03-20 06:08:22.665877+00	\N	confirmado
16	1	ADRIANA RAMOS	Adriana Ramos	\N	\N	2026-05-24	2026-05-25	\N	2026-03-20 06:09:52.95817+00	\N	confirmado
17	1	PABLO CHIDA	Pablo Chida	\N	\N	2026-05-25	2026-05-27	\N	2026-03-20 06:11:49.268427+00	\N	confirmado
18	1	MATIAS DIAZ SP TURISMO	Matias Diaz	\N	\N	2026-05-25	2026-05-30	\N	2026-03-20 06:13:56.177684+00	\N	confirmado
19	1	ZAMBERLAN	Zamberlan	\N	\N	2026-05-28	2026-06-01	\N	2026-03-20 06:15:19.188763+00	\N	confirmado
20	1	CARLOS ROUBAL	Carlos Roubal	\N	\N	2026-06-01	2026-06-04	\N	2026-03-20 18:34:04.492844+00	\N	confirmado
21	1	PLAN DE ESCAPE	Plan de escape	\N	\N	2026-06-02	2026-06-03	\N	2026-03-20 18:35:31.245042+00	\N	confirmado
22	1	GUSTAVO NOTTO	Gustavo Notto	\N	\N	2026-06-07	2026-06-10	\N	2026-03-20 18:36:33.092415+00	\N	confirmado
23	1	FRANCISCO TRINIDAD	Francisco Trinidad	\N	\N	2026-06-10	2026-06-12	\N	2026-03-20 18:37:51.09733+00	\N	confirmado
24	1	CAIRU VIAJES	Fabio Lozano	\N	\N	2026-06-12	2026-06-16	\N	2026-03-20 18:39:19.988642+00	\N	confirmado
25	1	TURISMO ITOITZ	Camila	\N	\N	2026-06-17	2026-06-19	\N	2026-03-20 18:41:04.580035+00	\N	confirmado
26	1	TURISMO TENTACION	Turismo tentacion	\N	\N	2026-06-19	2026-06-22	\N	2026-03-20 18:42:52.773046+00	\N	confirmado
27	1	ZAMBERLAN	Zamberlan	\N	\N	2026-06-22	2026-06-26	\N	2026-03-20 18:43:49.833469+00	\N	confirmado
28	1	ESTELA GABALDO	Estela Gabaldo	\N	\N	2026-06-26	2026-06-30	\N	2026-03-20 18:45:01.995306+00	\N	confirmado
29	1	LIDER TRAVEL	Lider travel	\N	\N	2026-07-01	2026-07-03	\N	2026-03-20 18:54:54.977147+00	\N	confirmado
30	1	TURISMO LUIS CORONEL	Viviana	\N	\N	2026-07-04	2026-07-07	\N	2026-03-20 18:56:18.15343+00	\N	confirmado
31	1	GUEST	Guest	\N	\N	2026-07-08	2026-07-12	\N	2026-03-20 18:57:45.243078+00	\N	confirmado
32	1	MARCELO GIMENEZ	Marcelo Gimenez	\N	\N	2026-07-12	2026-07-15	\N	2026-03-20 18:59:05.685989+00	\N	confirmado
33	1	RICKY VIÑAS	Ricky Viñas	\N	\N	2026-07-18	2026-07-21	\N	2026-03-20 19:00:54.763791+00	\N	confirmado
34	1	ZAMBERLAN	Zamberlan	\N	\N	2026-07-21	2026-07-23	\N	2026-03-20 19:03:03.131312+00	\N	confirmado
35	1	TURISMO ITOITZ	Camila	\N	\N	2026-07-23	2026-07-25	\N	2026-03-20 19:12:59.234601+00	\N	confirmado
36	1	VIAGGIO-ANA MARIA GENRE	Ana Maria Genre	\N	\N	2026-07-26	2026-07-28	\N	2026-03-20 19:14:23.091568+00	\N	confirmado
37	1	ZAMBERLAN	Zamberlan	\N	\N	2026-07-28	2026-08-01	\N	2026-03-20 19:15:33.298326+00	\N	confirmado
38	1	CALAMUCHITA CASTEL FRANCO	Castel Franco	\N	\N	2026-08-04	2026-08-06	\N	2026-03-20 19:24:09.658694+00	\N	confirmado
39	1	CALAMUCHITA	Calamuchita	\N	\N	2026-08-06	2026-08-08	\N	2026-03-20 19:25:17.11333+00	\N	confirmado
40	1	L Y C TURISMO	Leo	\N	\N	2026-08-08	2026-08-11	\N	2026-03-20 19:26:31.307472+00	\N	confirmado
41	1	GUEST	Guest	\N	\N	2026-08-12	2026-08-14	\N	2026-03-20 19:27:38.052103+00	\N	confirmado
42	1	BIDONE ST.JOHNS	Bidone st.johns	\N	\N	2026-08-14	2026-08-16	\N	2026-03-20 19:29:11.693505+00	\N	confirmado
43	1	FRANCISCO TRINIDAD	Francisco Trinidad	\N	\N	2026-08-16	2026-08-18	\N	2026-03-20 19:30:19.833486+00	\N	confirmado
44	1	BIDONE SANTA MARIA	Bidone Santa Maria	\N	\N	2026-08-18	2026-08-21	\N	2026-03-20 19:31:41.363965+00	\N	confirmado
45	1	MAPUCHE TURISMO	Mapuche turismo	\N	\N	2026-08-22	2026-08-23	\N	2026-03-20 19:32:54.624952+00	\N	confirmado
46	1	CALAMUCHITA MARYLAND	Maryland	\N	\N	2026-08-24	2026-08-26	\N	2026-03-20 19:34:09.517893+00	\N	confirmado
47	1	CALAMUCHITA DANTE 1	Dante	\N	\N	2026-08-26	2026-08-28	\N	2026-03-20 19:35:25.280317+00	\N	confirmado
48	1	CALAMUCHITA DANTE 2	Dante	\N	\N	2026-08-28	2026-08-30	\N	2026-03-20 19:36:41.037565+00	\N	confirmado
49	1	WAVE	Federico	\N	\N	2026-08-30	2026-09-01	\N	2026-03-20 19:37:43.426046+00	\N	confirmado
50	1	HUGO MEDINA	Hugo Medina	\N	\N	2026-09-04	2026-09-08	\N	2026-03-20 19:44:05.683768+00	\N	confirmado
51	1	BIDONE	Arriola	\N	\N	2026-09-08	2026-09-11	\N	2026-03-20 19:45:16.49329+00	\N	confirmado
52	1	CGIO.LASALLE	Lasalle	\N	\N	2026-09-12	2026-09-13	\N	2026-03-20 19:46:26.736245+00	\N	confirmado
53	1	AGUSTIN BRIGNANI (CGIO. RUDOLF STEINER)	Agustin Brignani	\N	\N	2026-09-14	2026-09-18	\N	2026-03-20 19:48:10.292225+00	\N	confirmado
54	1	GUEST	Guest	\N	\N	2026-09-23	2026-09-25	\N	2026-03-20 19:49:19.771122+00	\N	confirmado
55	1	URRUTIA	Urrutia	\N	\N	2026-09-23	2026-09-26	\N	2026-03-20 19:50:47.123379+00	\N	confirmado
56	1	CALAMUCHITA MATOVANI	Mantovani	\N	\N	2026-09-28	2026-09-29	\N	2026-03-20 19:52:15.982867+00	\N	confirmado
62	1	BIDONE, ST HILDAS	Bidone, ST HILDAS	\N	\N	2026-10-20	2026-10-23	\N	2026-03-20 20:04:49.68837+00	58	confirmado
63	1	BIDONE, GODSPELL	Bidone, Godspell	\N	\N	2026-10-20	2026-10-23	\N	2026-03-20 20:06:09.226192+00	44	confirmado
64	1	BIDONE PIRONIO	Bidone Pironio	\N	\N	2026-10-26	2026-10-29	\N	2026-03-20 20:09:09.020132+00	\N	confirmado
65	1	ZAMBERLAN	Zamberlan	\N	\N	2026-11-03	2026-11-07	\N	2026-03-20 20:12:28.983853+00	\N	confirmado
66	1	GUEST	Guest	\N	\N	2026-11-19	2026-11-21	\N	2026-03-20 20:13:44.442245+00	\N	confirmado
67	1	ESTEFANIA	Estefania	\N	\N	2026-11-19	2026-11-23	\N	2026-03-20 20:15:17.598741+00	\N	confirmado
\.


--
-- Data for Name: guests; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.guests (id, hotel_id, name, email, phone, nationality, id_number, notes, created_at) FROM stdin;
10	1	sin nombre	\N	\N	\N	\N	\N	2026-03-18 18:12:14.027367+00
11	1	Rossi	\N	\N	\N	\N	\N	2026-03-20 05:10:54.181989+00
12	1	Quimera	\N	\N	\N	\N	\N	2026-03-20 06:17:39.325349+00
13	1	Ricky Viñas	\N	\N	\N	\N	\N	2026-03-20 06:23:59.640634+00
\.


--
-- Data for Name: habitaciones_override; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.habitaciones_override (id, hotel_id, room_id, fecha_desde, fecha_hasta, tipo_override, subtipo_override, capacidad_override, notas, created_at) FROM stdin;
\.


--
-- Data for Name: hotels; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.hotels (id, name, slug, city, address, phone, email, active, created_at) FROM stdin;
1	Hostal El Puerto	hostal-el-puerto	Mar del Plata	Av. Colón 1234	+54 223 000-0000	info@hostalpuerto.com	t	2026-03-14 00:24:01.70345+00
\.


--
-- Data for Name: precios; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.precios (id, hotel_id, tipo, fecha_desde, fecha_hasta, precio_noche, created_at, precio_grupo) FROM stdin;
30	1	single	2026-03-01	2026-03-19	59200.00	2026-03-18 20:19:00.84235+00	57000.00
31	1	double	2026-03-01	2026-03-19	85000.00	2026-03-18 20:19:00.84235+00	82500.00
32	1	triple	2026-03-01	2026-03-19	108000.00	2026-03-18 20:19:00.84235+00	104000.00
33	1	quad	2026-03-01	2026-03-19	136300.00	2026-03-18 20:19:00.84235+00	128000.00
34	1	quintuple	2026-03-01	2026-03-19	150500.00	2026-03-18 20:19:00.84235+00	148000.00
35	1	familiar	2026-03-01	2026-03-19	150500.00	2026-03-18 20:19:00.84235+00	148000.00
36	1	single	2026-03-20	2026-03-23	65000.00	2026-03-18 20:19:00.908726+00	57000.00
37	1	double	2026-03-20	2026-03-23	93500.00	2026-03-18 20:19:00.908726+00	82500.00
38	1	triple	2026-03-20	2026-03-23	119000.00	2026-03-18 20:19:00.908726+00	104000.00
39	1	quad	2026-03-20	2026-03-23	149500.00	2026-03-18 20:19:00.908726+00	128000.00
40	1	quintuple	2026-03-20	2026-03-23	165000.00	2026-03-18 20:19:00.908726+00	148000.00
41	1	familiar	2026-03-20	2026-03-23	165000.00	2026-03-18 20:19:00.908726+00	148000.00
42	1	single	2026-03-24	2026-03-31	59200.00	2026-03-18 20:19:00.915662+00	57000.00
43	1	double	2026-03-24	2026-03-31	85000.00	2026-03-18 20:19:00.915662+00	82500.00
44	1	triple	2026-03-24	2026-03-31	108000.00	2026-03-18 20:19:00.915662+00	104000.00
45	1	quad	2026-03-24	2026-03-31	136300.00	2026-03-18 20:19:00.915662+00	128000.00
46	1	quintuple	2026-03-24	2026-03-31	150500.00	2026-03-18 20:19:00.915662+00	148000.00
47	1	familiar	2026-03-24	2026-03-31	150500.00	2026-03-18 20:19:00.915662+00	148000.00
48	1	single	2026-04-01	2026-04-01	61600.00	2026-03-18 20:19:00.920026+00	59000.00
49	1	double	2026-04-01	2026-04-01	88000.00	2026-03-18 20:19:00.920026+00	83900.00
50	1	triple	2026-04-01	2026-04-01	120500.00	2026-03-18 20:19:00.920026+00	106600.00
51	1	quad	2026-04-01	2026-04-01	149000.00	2026-03-18 20:19:00.920026+00	133000.00
52	1	quintuple	2026-04-01	2026-04-01	170000.00	2026-03-18 20:19:00.920026+00	154000.00
53	1	familiar	2026-04-01	2026-04-01	170000.00	2026-03-18 20:19:00.920026+00	154000.00
54	1	single	2026-04-02	2026-04-05	67500.00	2026-03-18 20:19:00.926065+00	59000.00
55	1	double	2026-04-02	2026-04-05	102000.00	2026-03-18 20:19:00.926065+00	83900.00
56	1	triple	2026-04-02	2026-04-05	139300.00	2026-03-18 20:19:00.926065+00	106600.00
57	1	quad	2026-04-02	2026-04-05	170000.00	2026-03-18 20:19:00.926065+00	133000.00
58	1	quintuple	2026-04-02	2026-04-05	189000.00	2026-03-18 20:19:00.926065+00	154000.00
59	1	familiar	2026-04-02	2026-04-05	189000.00	2026-03-18 20:19:00.926065+00	154000.00
60	1	single	2026-04-06	2026-04-30	61600.00	2026-03-18 20:19:00.930277+00	59000.00
61	1	double	2026-04-06	2026-04-30	88000.00	2026-03-18 20:19:00.930277+00	83900.00
62	1	triple	2026-04-06	2026-04-30	120500.00	2026-03-18 20:19:00.930277+00	106600.00
63	1	quad	2026-04-06	2026-04-30	149000.00	2026-03-18 20:19:00.930277+00	133000.00
64	1	quintuple	2026-04-06	2026-04-30	170000.00	2026-03-18 20:19:00.930277+00	154000.00
65	1	familiar	2026-04-06	2026-04-30	170000.00	2026-03-18 20:19:00.930277+00	154000.00
66	1	single	2026-05-01	2026-05-03	67500.00	2026-03-18 20:19:00.935323+00	59000.00
67	1	double	2026-05-01	2026-05-03	102000.00	2026-03-18 20:19:00.935323+00	83900.00
68	1	triple	2026-05-01	2026-05-03	139300.00	2026-03-18 20:19:00.935323+00	106600.00
69	1	quad	2026-05-01	2026-05-03	170000.00	2026-03-18 20:19:00.935323+00	133000.00
70	1	quintuple	2026-05-01	2026-05-03	189000.00	2026-03-18 20:19:00.935323+00	154000.00
71	1	familiar	2026-05-01	2026-05-03	189000.00	2026-03-18 20:19:00.935323+00	154000.00
72	1	single	2026-05-04	2026-05-21	61600.00	2026-03-18 20:19:00.939398+00	59000.00
73	1	double	2026-05-04	2026-05-21	88000.00	2026-03-18 20:19:00.939398+00	83900.00
74	1	triple	2026-05-04	2026-05-21	120500.00	2026-03-18 20:19:00.939398+00	106600.00
75	1	quad	2026-05-04	2026-05-21	149000.00	2026-03-18 20:19:00.939398+00	133000.00
76	1	quintuple	2026-05-04	2026-05-21	170000.00	2026-03-18 20:19:00.939398+00	154000.00
77	1	familiar	2026-05-04	2026-05-21	170000.00	2026-03-18 20:19:00.939398+00	154000.00
78	1	single	2026-05-22	2026-05-25	67500.00	2026-03-18 20:19:00.944591+00	59000.00
79	1	double	2026-05-22	2026-05-25	102000.00	2026-03-18 20:19:00.944591+00	83900.00
80	1	triple	2026-05-22	2026-05-25	139300.00	2026-03-18 20:19:00.944591+00	106600.00
81	1	quad	2026-05-22	2026-05-25	170000.00	2026-03-18 20:19:00.944591+00	133000.00
82	1	quintuple	2026-05-22	2026-05-25	189000.00	2026-03-18 20:19:00.944591+00	154000.00
83	1	familiar	2026-05-22	2026-05-25	189000.00	2026-03-18 20:19:00.944591+00	154000.00
84	1	single	2026-05-26	2026-05-31	61600.00	2026-03-18 20:19:00.949843+00	59000.00
85	1	double	2026-05-26	2026-05-31	88000.00	2026-03-18 20:19:00.949843+00	83900.00
86	1	triple	2026-05-26	2026-05-31	120500.00	2026-03-18 20:19:00.949843+00	106600.00
87	1	quad	2026-05-26	2026-05-31	149000.00	2026-03-18 20:19:00.949843+00	133000.00
88	1	quintuple	2026-05-26	2026-05-31	170000.00	2026-03-18 20:19:00.949843+00	154000.00
89	1	familiar	2026-05-26	2026-05-31	170000.00	2026-03-18 20:19:00.949843+00	154000.00
90	1	single	2026-06-01	2026-06-11	64400.00	2026-03-18 20:19:00.956354+00	61200.00
91	1	double	2026-06-01	2026-06-11	92000.00	2026-03-18 20:19:00.956354+00	87000.00
92	1	triple	2026-06-01	2026-06-11	124000.00	2026-03-18 20:19:00.956354+00	110600.00
93	1	quad	2026-06-01	2026-06-11	155000.00	2026-03-18 20:19:00.956354+00	139000.00
94	1	quintuple	2026-06-01	2026-06-11	175000.00	2026-03-18 20:19:00.956354+00	160000.00
95	1	familiar	2026-06-01	2026-06-11	175000.00	2026-03-18 20:19:00.956354+00	160000.00
96	1	single	2026-06-12	2026-06-15	70000.00	2026-03-18 20:19:00.962767+00	61200.00
97	1	double	2026-06-12	2026-06-15	101000.00	2026-03-18 20:19:00.962767+00	87000.00
98	1	triple	2026-06-12	2026-06-15	136000.00	2026-03-18 20:19:00.962767+00	110600.00
99	1	quad	2026-06-12	2026-06-15	165000.00	2026-03-18 20:19:00.962767+00	139000.00
100	1	quintuple	2026-06-12	2026-06-15	188000.00	2026-03-18 20:19:00.962767+00	160000.00
101	1	familiar	2026-06-12	2026-06-15	188000.00	2026-03-18 20:19:00.962767+00	160000.00
102	1	single	2026-06-16	2026-06-30	64400.00	2026-03-18 20:19:00.966432+00	61200.00
103	1	double	2026-06-16	2026-06-30	92000.00	2026-03-18 20:19:00.966432+00	87000.00
104	1	triple	2026-06-16	2026-06-30	124000.00	2026-03-18 20:19:00.966432+00	110600.00
105	1	quad	2026-06-16	2026-06-30	155000.00	2026-03-18 20:19:00.966432+00	139000.00
106	1	quintuple	2026-06-16	2026-06-30	175000.00	2026-03-18 20:19:00.966432+00	160000.00
107	1	familiar	2026-06-16	2026-06-30	175000.00	2026-03-18 20:19:00.966432+00	160000.00
108	1	single	2026-07-01	2026-07-09	64400.00	2026-03-18 20:19:00.971072+00	61200.00
109	1	double	2026-07-01	2026-07-09	92000.00	2026-03-18 20:19:00.971072+00	87000.00
110	1	triple	2026-07-01	2026-07-09	124000.00	2026-03-18 20:19:00.971072+00	110600.00
111	1	quad	2026-07-01	2026-07-09	155000.00	2026-03-18 20:19:00.971072+00	139000.00
112	1	quintuple	2026-07-01	2026-07-09	175000.00	2026-03-18 20:19:00.971072+00	160000.00
113	1	familiar	2026-07-01	2026-07-09	175000.00	2026-03-18 20:19:00.971072+00	160000.00
114	1	single	2026-07-10	2026-07-31	70000.00	2026-03-18 20:19:00.975098+00	67300.00
115	1	double	2026-07-10	2026-07-31	102000.00	2026-03-18 20:19:00.975098+00	95500.00
116	1	triple	2026-07-10	2026-07-31	139000.00	2026-03-18 20:19:00.975098+00	121500.00
117	1	quad	2026-07-10	2026-07-31	170000.00	2026-03-18 20:19:00.975098+00	152600.00
118	1	quintuple	2026-07-10	2026-07-31	189000.00	2026-03-18 20:19:00.975098+00	176000.00
119	1	familiar	2026-07-10	2026-07-31	189000.00	2026-03-18 20:19:00.975098+00	176000.00
120	1	single	2026-08-01	2026-08-13	66500.00	2026-03-18 20:19:00.980841+00	63500.00
121	1	double	2026-08-01	2026-08-13	95000.00	2026-03-18 20:19:00.980841+00	89900.00
122	1	triple	2026-08-01	2026-08-13	128500.00	2026-03-18 20:19:00.980841+00	115000.00
123	1	quad	2026-08-01	2026-08-13	160000.00	2026-03-18 20:19:00.980841+00	144600.00
124	1	quintuple	2026-08-01	2026-08-13	180000.00	2026-03-18 20:19:00.980841+00	166400.00
125	1	familiar	2026-08-01	2026-08-13	180000.00	2026-03-18 20:19:00.980841+00	166400.00
126	1	single	2026-08-14	2026-08-17	70000.00	2026-03-18 20:19:00.986313+00	63500.00
127	1	double	2026-08-14	2026-08-17	101000.00	2026-03-18 20:19:00.986313+00	89900.00
128	1	triple	2026-08-14	2026-08-17	136000.00	2026-03-18 20:19:00.986313+00	115000.00
129	1	quad	2026-08-14	2026-08-17	165000.00	2026-03-18 20:19:00.986313+00	144600.00
130	1	quintuple	2026-08-14	2026-08-17	188000.00	2026-03-18 20:19:00.986313+00	166400.00
131	1	familiar	2026-08-14	2026-08-17	188000.00	2026-03-18 20:19:00.986313+00	166400.00
132	1	single	2026-08-18	2026-08-31	66500.00	2026-03-18 20:19:01.007937+00	63500.00
133	1	double	2026-08-18	2026-08-31	95000.00	2026-03-18 20:19:01.007937+00	89900.00
134	1	triple	2026-08-18	2026-08-31	128500.00	2026-03-18 20:19:01.007937+00	115000.00
135	1	quad	2026-08-18	2026-08-31	160000.00	2026-03-18 20:19:01.007937+00	144600.00
136	1	quintuple	2026-08-18	2026-08-31	180000.00	2026-03-18 20:19:01.007937+00	166400.00
137	1	familiar	2026-08-18	2026-08-31	180000.00	2026-03-18 20:19:01.007937+00	166400.00
138	1	single	2026-09-01	2026-09-30	66500.00	2026-03-18 20:19:01.011973+00	63500.00
139	1	double	2026-09-01	2026-09-30	95000.00	2026-03-18 20:19:01.011973+00	89900.00
140	1	triple	2026-09-01	2026-09-30	128500.00	2026-03-18 20:19:01.011973+00	115000.00
141	1	quad	2026-09-01	2026-09-30	160000.00	2026-03-18 20:19:01.011973+00	144600.00
142	1	quintuple	2026-09-01	2026-09-30	180000.00	2026-03-18 20:19:01.011973+00	166400.00
143	1	familiar	2026-09-01	2026-09-30	180000.00	2026-03-18 20:19:01.011973+00	166400.00
144	1	single	2026-10-01	2026-10-08	67000.00	2026-03-18 20:19:01.017038+00	64800.00
145	1	double	2026-10-01	2026-10-08	96500.00	2026-03-18 20:19:01.017038+00	91500.00
146	1	triple	2026-10-01	2026-10-08	131000.00	2026-03-18 20:19:01.017038+00	117300.00
147	1	quad	2026-10-01	2026-10-08	163000.00	2026-03-18 20:19:01.017038+00	147500.00
148	1	quintuple	2026-10-01	2026-10-08	183500.00	2026-03-18 20:19:01.017038+00	169700.00
149	1	familiar	2026-10-01	2026-10-08	183500.00	2026-03-18 20:19:01.017038+00	169700.00
150	1	single	2026-10-09	2026-10-12	72000.00	2026-03-18 20:19:01.022502+00	64800.00
151	1	double	2026-10-09	2026-10-12	103000.00	2026-03-18 20:19:01.022502+00	91500.00
152	1	triple	2026-10-09	2026-10-12	140000.00	2026-03-18 20:19:01.022502+00	117300.00
153	1	quad	2026-10-09	2026-10-12	170000.00	2026-03-18 20:19:01.022502+00	147500.00
154	1	quintuple	2026-10-09	2026-10-12	192000.00	2026-03-18 20:19:01.022502+00	169700.00
155	1	familiar	2026-10-09	2026-10-12	192000.00	2026-03-18 20:19:01.022502+00	169700.00
156	1	single	2026-10-13	2026-10-31	67000.00	2026-03-18 20:19:01.028729+00	64800.00
157	1	double	2026-10-13	2026-10-31	96500.00	2026-03-18 20:19:01.028729+00	91500.00
158	1	triple	2026-10-13	2026-10-31	131000.00	2026-03-18 20:19:01.028729+00	117300.00
159	1	quad	2026-10-13	2026-10-31	163000.00	2026-03-18 20:19:01.028729+00	147500.00
160	1	quintuple	2026-10-13	2026-10-31	183500.00	2026-03-18 20:19:01.028729+00	169700.00
161	1	familiar	2026-10-13	2026-10-31	183500.00	2026-03-18 20:19:01.028729+00	169700.00
162	1	single	2026-11-01	2026-11-19	61600.00	2026-03-18 20:19:01.03337+00	59000.00
163	1	double	2026-11-01	2026-11-19	88000.00	2026-03-18 20:19:01.03337+00	83900.00
164	1	triple	2026-11-01	2026-11-19	120500.00	2026-03-18 20:19:01.03337+00	106600.00
165	1	quad	2026-11-01	2026-11-19	149000.00	2026-03-18 20:19:01.03337+00	133000.00
166	1	quintuple	2026-11-01	2026-11-19	170000.00	2026-03-18 20:19:01.03337+00	154000.00
167	1	familiar	2026-11-01	2026-11-19	170000.00	2026-03-18 20:19:01.03337+00	154000.00
168	1	single	2026-11-20	2026-11-22	67500.00	2026-03-18 20:19:01.038429+00	59000.00
169	1	double	2026-11-20	2026-11-22	96500.00	2026-03-18 20:19:01.038429+00	83900.00
170	1	triple	2026-11-20	2026-11-22	131000.00	2026-03-18 20:19:01.038429+00	106600.00
171	1	quad	2026-11-20	2026-11-22	160000.00	2026-03-18 20:19:01.038429+00	133000.00
172	1	quintuple	2026-11-20	2026-11-22	182000.00	2026-03-18 20:19:01.038429+00	154000.00
173	1	familiar	2026-11-20	2026-11-22	182000.00	2026-03-18 20:19:01.038429+00	154000.00
174	1	single	2026-11-23	2026-11-30	61600.00	2026-03-18 20:19:01.043936+00	59000.00
175	1	double	2026-11-23	2026-11-30	88000.00	2026-03-18 20:19:01.043936+00	83900.00
176	1	triple	2026-11-23	2026-11-30	120500.00	2026-03-18 20:19:01.043936+00	106600.00
177	1	quad	2026-11-23	2026-11-30	149000.00	2026-03-18 20:19:01.043936+00	133000.00
178	1	quintuple	2026-11-23	2026-11-30	170000.00	2026-03-18 20:19:01.043936+00	154000.00
179	1	familiar	2026-11-23	2026-11-30	170000.00	2026-03-18 20:19:01.043936+00	154000.00
180	1	single	2026-12-01	2026-12-31	61600.00	2026-03-18 20:19:01.049438+00	59000.00
181	1	double	2026-12-01	2026-12-31	88000.00	2026-03-18 20:19:01.049438+00	83900.00
182	1	triple	2026-12-01	2026-12-31	120500.00	2026-03-18 20:19:01.049438+00	106600.00
183	1	quad	2026-12-01	2026-12-31	149000.00	2026-03-18 20:19:01.049438+00	133000.00
184	1	quintuple	2026-12-01	2026-12-31	170000.00	2026-03-18 20:19:01.049438+00	154000.00
185	1	familiar	2026-12-01	2026-12-31	170000.00	2026-03-18 20:19:01.049438+00	154000.00
\.


--
-- Data for Name: reservations; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.reservations (id, hotel_id, room_id, guest_id, channel_id, group_id, check_in, check_out, status, notes, created_at, updated_at, tipo_ocupacion) FROM stdin;
121	1	19	\N	2	\N	2026-03-07	2026-03-08	confirmed	\N	2026-03-18 19:20:45.874489+00	2026-03-18 19:20:45.874494+00	individual
122	1	23	\N	1	\N	2026-03-07	2026-03-08	confirmed	\N	2026-03-18 19:21:02.20849+00	2026-03-18 19:21:02.208494+00	individual
123	1	25	\N	1	\N	2026-03-07	2026-03-08	confirmed	\N	2026-03-18 19:21:05.296196+00	2026-03-18 19:21:05.2962+00	individual
124	1	25	\N	1	\N	2026-03-08	2026-03-09	confirmed	\N	2026-03-18 19:21:20.03565+00	2026-03-18 19:21:20.035654+00	individual
125	1	25	\N	1	\N	2026-03-09	2026-03-10	confirmed	\N	2026-03-18 19:21:30.089143+00	2026-03-18 19:21:30.089147+00	individual
126	1	19	\N	2	\N	2026-03-08	2026-03-09	confirmed	\N	2026-03-18 19:21:42.709096+00	2026-03-18 19:21:42.709101+00	individual
127	1	19	\N	2	\N	2026-03-09	2026-03-10	confirmed	\N	2026-03-18 19:21:43.609968+00	2026-03-18 19:21:43.609971+00	individual
128	1	19	\N	2	\N	2026-03-10	2026-03-11	confirmed	\N	2026-03-18 19:21:44.793682+00	2026-03-18 19:21:44.793685+00	individual
129	1	19	\N	2	\N	2026-03-11	2026-03-12	confirmed	\N	2026-03-18 19:21:45.629894+00	2026-03-18 19:21:45.629898+00	individual
130	1	19	\N	2	\N	2026-03-12	2026-03-13	confirmed	\N	2026-03-18 19:21:46.297514+00	2026-03-18 19:21:46.297517+00	individual
131	1	20	\N	1	\N	2026-03-09	2026-03-10	confirmed	\N	2026-03-18 19:22:02.739017+00	2026-03-18 19:22:02.73902+00	individual
132	1	28	\N	1	\N	2026-03-09	2026-03-10	confirmed	\N	2026-03-18 19:22:19.907777+00	2026-03-18 19:22:19.907781+00	individual
133	1	28	\N	1	\N	2026-03-10	2026-03-11	confirmed	\N	2026-03-18 19:22:21.227365+00	2026-03-18 19:22:21.227368+00	individual
134	1	18	\N	1	\N	2026-03-11	2026-03-12	confirmed	\N	2026-03-18 19:22:31.474869+00	2026-03-18 19:22:31.474872+00	individual
135	1	18	\N	1	\N	2026-03-12	2026-03-13	confirmed	\N	2026-03-18 19:22:32.323724+00	2026-03-18 19:22:32.323727+00	individual
72	1	21	\N	4	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:50:04.110697+00	2026-03-18 18:50:04.110701+00	individual
73	1	21	\N	4	\N	2026-03-02	2026-03-03	confirmed	\N	2026-03-18 18:50:12.841696+00	2026-03-18 18:50:12.841699+00	individual
74	1	22	\N	4	\N	2026-03-01	2026-03-03	confirmed	\N	2026-03-18 18:50:15.841763+00	2026-03-18 18:50:15.841766+00	individual
75	1	21	\N	4	\N	2026-03-03	2026-03-04	confirmed	\N	2026-03-18 18:50:24.75474+00	2026-03-18 18:50:24.754745+00	individual
76	1	22	\N	4	\N	2026-03-03	2026-03-04	confirmed	\N	2026-03-18 18:50:26.449981+00	2026-03-18 18:50:26.449985+00	individual
77	1	1	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:51:06.071169+00	2026-03-18 18:51:06.071173+00	individual
78	1	2	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:51:07.323021+00	2026-03-18 18:51:07.323025+00	individual
79	1	3	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:51:12.379762+00	2026-03-18 18:51:12.379765+00	individual
80	1	5	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:51:13.948182+00	2026-03-18 18:51:13.948186+00	individual
81	1	4	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:51:16.228398+00	2026-03-18 18:51:16.228401+00	individual
82	1	7	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:51:33.175939+00	2026-03-18 18:51:33.175942+00	individual
83	1	18	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:53:15.808176+00	2026-03-18 18:53:15.808179+00	individual
84	1	19	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:53:18.024933+00	2026-03-18 18:53:18.024937+00	individual
85	1	21	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:53:30.098594+00	2026-03-18 18:53:30.098598+00	individual
86	1	22	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:53:33.081775+00	2026-03-18 18:53:33.08178+00	individual
87	1	24	\N	4	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 18:53:43.931443+00	2026-03-18 18:53:43.931447+00	individual
136	1	18	\N	1	\N	2026-03-13	2026-03-14	confirmed	\N	2026-03-18 19:22:34.773299+00	2026-03-18 19:22:34.773303+00	individual
89	1	7	\N	4	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:54:27.387857+00	2026-03-18 18:54:27.387862+00	individual
90	1	8	\N	4	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:54:32.9435+00	2026-03-18 18:54:32.943504+00	individual
91	1	19	\N	1	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:55:04.966464+00	2026-03-18 18:55:04.966468+00	individual
92	1	20	\N	1	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:55:06.253358+00	2026-03-18 18:55:06.253362+00	individual
93	1	25	\N	1	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:55:13.045031+00	2026-03-18 18:55:13.045034+00	individual
94	1	26	\N	1	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:55:14.870244+00	2026-03-18 18:55:14.870247+00	individual
137	1	18	\N	1	\N	2026-03-14	2026-03-15	confirmed	\N	2026-03-18 19:22:35.780006+00	2026-03-18 19:22:35.78001+00	individual
96	1	7	\N	4	\N	2026-03-02	2026-03-03	confirmed	\N	2026-03-18 18:55:29.998194+00	2026-03-18 18:55:29.998198+00	individual
97	1	8	\N	4	\N	2026-03-02	2026-03-03	confirmed	\N	2026-03-18 18:55:30.976915+00	2026-03-18 18:55:30.976921+00	individual
98	1	23	\N	2	\N	2026-03-01	2026-03-02	confirmed	\N	2026-03-18 18:55:50.136295+00	2026-03-18 18:55:50.136299+00	individual
99	1	23	\N	2	\N	2026-03-02	2026-03-03	confirmed	\N	2026-03-18 18:55:55.848275+00	2026-03-18 18:55:55.848278+00	individual
100	1	5	\N	4	\N	2026-03-03	2026-03-04	confirmed	\N	2026-03-18 18:56:09.750836+00	2026-03-18 18:56:09.750839+00	individual
101	1	7	\N	4	\N	2026-03-03	2026-03-04	confirmed	\N	2026-03-18 18:56:11.384186+00	2026-03-18 18:56:11.384189+00	individual
102	1	8	\N	4	\N	2026-03-03	2026-03-04	confirmed	\N	2026-03-18 18:56:12.511702+00	2026-03-18 18:56:12.511706+00	individual
103	1	23	\N	2	\N	2026-03-03	2026-03-04	confirmed	\N	2026-03-18 18:56:24.265204+00	2026-03-18 18:56:24.265208+00	individual
104	1	25	\N	1	\N	2026-03-03	2026-03-04	confirmed	\N	2026-03-18 18:56:48.115246+00	2026-03-18 18:56:48.115249+00	individual
105	1	19	\N	1	\N	2026-03-04	2026-03-05	confirmed	\N	2026-03-18 18:57:06.419562+00	2026-03-18 18:57:06.419566+00	individual
106	1	25	\N	1	\N	2026-03-04	2026-03-05	confirmed	\N	2026-03-18 18:57:15.939525+00	2026-03-18 18:57:15.939529+00	individual
107	1	23	\N	2	\N	2026-03-04	2026-03-05	confirmed	\N	2026-03-18 18:57:56.933941+00	2026-03-18 18:57:56.933945+00	individual
108	1	23	\N	2	\N	2026-03-05	2026-03-06	confirmed	\N	2026-03-18 18:58:12.469714+00	2026-03-18 18:58:12.469717+00	individual
109	1	23	\N	2	\N	2026-03-06	2026-03-07	confirmed	\N	2026-03-18 18:58:14.422368+00	2026-03-18 18:58:14.422372+00	individual
110	1	25	\N	1	\N	2026-03-05	2026-03-06	confirmed	\N	2026-03-18 18:58:34.12792+00	2026-03-18 18:58:34.127923+00	individual
111	1	25	\N	1	\N	2026-03-06	2026-03-07	confirmed	\N	2026-03-18 18:58:36.223657+00	2026-03-18 18:58:36.223663+00	individual
138	1	19	\N	1	\N	2026-03-14	2026-03-15	confirmed	\N	2026-03-18 19:22:38.820421+00	2026-03-18 19:22:38.820424+00	individual
139	1	23	\N	1	\N	2026-03-11	2026-03-12	confirmed	\N	2026-03-18 19:22:48.661938+00	2026-03-18 19:22:48.661941+00	individual
140	1	23	\N	1	\N	2026-03-12	2026-03-13	confirmed	\N	2026-03-18 19:22:49.444902+00	2026-03-18 19:22:49.444906+00	individual
141	1	23	\N	1	\N	2026-03-13	2026-03-14	confirmed	\N	2026-03-18 19:23:12.484563+00	2026-03-18 19:23:12.484567+00	individual
142	1	23	\N	1	\N	2026-03-14	2026-03-15	confirmed	\N	2026-03-18 19:23:14.414138+00	2026-03-18 19:23:14.414142+00	individual
143	1	23	\N	1	\N	2026-03-15	2026-03-16	confirmed	\N	2026-03-18 19:23:16.094057+00	2026-03-18 19:23:16.094061+00	individual
144	1	23	\N	1	\N	2026-03-16	2026-03-17	confirmed	\N	2026-03-18 19:23:20.166729+00	2026-03-18 19:23:20.166734+00	individual
145	1	23	\N	1	\N	2026-03-17	2026-03-18	confirmed	\N	2026-03-18 19:23:21.614754+00	2026-03-18 19:23:21.614757+00	individual
146	1	25	\N	1	\N	2026-03-14	2026-03-15	confirmed	\N	2026-03-18 19:23:38.334587+00	2026-03-18 19:23:38.33459+00	individual
147	1	26	\N	1	\N	2026-03-14	2026-03-15	confirmed	\N	2026-03-18 19:23:39.598733+00	2026-03-18 19:23:39.598737+00	individual
148	1	28	\N	1	\N	2026-03-15	2026-03-16	confirmed	\N	2026-03-18 19:23:46.503307+00	2026-03-18 19:23:46.50331+00	individual
149	1	25	\N	1	\N	2026-03-15	2026-03-16	confirmed	\N	2026-03-18 19:23:52.048108+00	2026-03-18 19:23:52.048112+00	individual
150	1	25	\N	1	\N	2026-03-17	2026-03-18	confirmed	\N	2026-03-18 19:23:53.343155+00	2026-03-18 19:23:53.343159+00	individual
151	1	25	\N	1	\N	2026-03-16	2026-03-17	confirmed	\N	2026-03-18 19:23:54.679448+00	2026-03-18 19:23:54.679452+00	individual
152	1	25	\N	1	\N	2026-03-18	2026-03-19	confirmed	\N	2026-03-18 19:24:03.073752+00	2026-03-18 19:24:03.073755+00	individual
153	1	25	\N	1	\N	2026-03-19	2026-03-20	confirmed	\N	2026-03-18 19:24:07.856936+00	2026-03-18 19:24:07.856939+00	individual
154	1	19	\N	2	\N	2026-03-15	2026-03-16	confirmed	\N	2026-03-18 19:24:18.513734+00	2026-03-18 19:24:18.513738+00	individual
155	1	19	\N	2	\N	2026-03-16	2026-03-17	confirmed	\N	2026-03-18 19:24:20.793309+00	2026-03-18 19:24:20.793313+00	individual
156	1	19	\N	2	\N	2026-03-17	2026-03-18	confirmed	\N	2026-03-18 19:24:23.640613+00	2026-03-18 19:24:23.640616+00	individual
157	1	23	\N	2	\N	2026-03-18	2026-03-19	confirmed	\N	2026-03-18 19:24:33.093044+00	2026-03-18 19:24:33.093049+00	individual
158	1	23	\N	2	\N	2026-03-19	2026-03-20	confirmed	\N	2026-03-18 19:24:34.689632+00	2026-03-18 19:24:34.689636+00	individual
159	1	23	\N	2	\N	2026-03-20	2026-03-21	confirmed	\N	2026-03-18 19:24:36.265167+00	2026-03-18 19:24:36.26517+00	individual
160	1	23	\N	2	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:24:41.281014+00	2026-03-18 19:24:41.281017+00	individual
161	1	23	\N	2	\N	2026-03-22	2026-03-23	confirmed	\N	2026-03-18 19:24:42.898628+00	2026-03-18 19:24:42.898633+00	individual
162	1	23	\N	2	\N	2026-03-23	2026-03-24	confirmed	\N	2026-03-18 19:24:46.137726+00	2026-03-18 19:24:46.137729+00	individual
163	1	18	\N	1	\N	2026-03-18	2026-03-19	confirmed	\N	2026-03-18 19:25:05.592543+00	2026-03-18 19:25:05.592546+00	individual
164	1	18	\N	1	\N	2026-03-19	2026-03-20	confirmed	\N	2026-03-18 19:25:09.003716+00	2026-03-18 19:25:09.003719+00	individual
165	1	18	\N	1	\N	2026-03-20	2026-03-21	confirmed	\N	2026-03-18 19:25:10.562674+00	2026-03-18 19:25:10.562677+00	individual
166	1	19	\N	2	\N	2026-03-19	2026-03-20	confirmed	\N	2026-03-18 19:25:27.244686+00	2026-03-18 19:25:27.24469+00	individual
167	1	19	\N	2	\N	2026-03-20	2026-03-21	confirmed	\N	2026-03-18 19:25:28.555868+00	2026-03-18 19:25:28.555872+00	individual
168	1	19	\N	2	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:25:29.987655+00	2026-03-18 19:25:29.987658+00	individual
169	1	20	\N	1	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:25:43.028904+00	2026-03-18 19:25:43.028908+00	individual
170	1	21	\N	1	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:25:44.793213+00	2026-03-18 19:25:44.793216+00	individual
171	1	22	\N	1	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:25:46.156229+00	2026-03-18 19:25:46.156234+00	individual
112	1	20	\N	1	\N	2026-03-07	2026-03-08	confirmed	\N	2026-03-18 19:03:45.665987+00	2026-03-18 19:03:45.665999+00	individual
172	1	24	\N	1	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:25:59.023627+00	2026-03-18 19:25:59.023631+00	individual
173	1	27	\N	1	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:26:06.173312+00	2026-03-18 19:26:06.173316+00	individual
174	1	25	\N	2	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:26:17.216875+00	2026-03-18 19:26:17.216879+00	individual
175	1	25	\N	2	\N	2026-03-20	2026-03-21	confirmed	\N	2026-03-18 19:26:18.677177+00	2026-03-18 19:26:18.677181+00	individual
117	1	1	\N	4	\N	2026-03-01	2026-03-04	confirmed	\N	2026-03-18 19:19:01.153939+00	2026-03-18 19:19:01.153947+00	individual
118	1	2	\N	4	\N	2026-03-01	2026-03-04	confirmed	\N	2026-03-18 19:19:04.796159+00	2026-03-18 19:19:04.796162+00	individual
119	1	3	\N	4	\N	2026-03-01	2026-03-04	confirmed	\N	2026-03-18 19:19:09.610837+00	2026-03-18 19:19:09.61084+00	individual
120	1	5	\N	4	\N	2026-03-01	2026-03-03	confirmed	\N	2026-03-18 19:19:11.963923+00	2026-03-18 19:19:11.963927+00	individual
176	1	26	\N	2	\N	2026-03-20	2026-03-21	confirmed	\N	2026-03-18 19:26:20.141294+00	2026-03-18 19:26:20.141297+00	individual
177	1	26	\N	2	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:26:21.622005+00	2026-03-18 19:26:21.622009+00	individual
178	1	26	\N	2	\N	2026-03-22	2026-03-25	confirmed	\N	2026-03-18 19:26:30.663079+00	2026-03-18 19:26:30.663083+00	individual
179	1	20	\N	2	\N	2026-03-22	2026-03-26	confirmed	\N	2026-03-18 19:26:49.935165+00	2026-03-18 19:26:49.935168+00	individual
180	1	22	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:27:05.176385+00	2026-03-18 19:27:05.176389+00	individual
181	1	1	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:27:18.051532+00	2026-03-18 19:27:18.051535+00	individual
182	1	3	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:27:23.016748+00	2026-03-18 19:27:23.016753+00	individual
183	1	4	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:27:28.919924+00	2026-03-18 19:27:28.919928+00	individual
184	1	5	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:27:32.401864+00	2026-03-18 19:27:32.401867+00	individual
185	1	7	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:27:53.232008+00	2026-03-18 19:27:53.232012+00	individual
186	1	8	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:28:01.72263+00	2026-03-18 19:28:01.722637+00	individual
187	1	9	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:28:04.73844+00	2026-03-18 19:28:04.738444+00	individual
188	1	10	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:28:06.962541+00	2026-03-18 19:28:06.962544+00	individual
189	1	11	\N	4	\N	2026-03-23	2026-03-25	confirmed	\N	2026-03-18 19:28:09.490496+00	2026-03-18 19:28:09.4905+00	individual
190	1	2	\N	1	\N	2026-03-19	2026-03-22	confirmed	\N	2026-03-18 19:28:24.430612+00	2026-03-18 19:28:24.430615+00	individual
191	1	6	\N	2	\N	2026-03-21	2026-03-22	confirmed	\N	2026-03-18 19:28:34.411899+00	2026-03-18 19:28:34.411903+00	individual
192	1	8	\N	1	\N	2026-03-21	2026-03-23	confirmed	\N	2026-03-18 19:28:42.043068+00	2026-03-18 19:28:42.043072+00	individual
193	1	25	\N	1	\N	2026-03-22	2026-03-28	confirmed	\N	2026-03-18 19:29:46.339136+00	2026-03-18 19:29:46.339139+00	individual
194	1	28	\N	2	\N	2026-03-25	2026-03-27	confirmed	\N	2026-03-18 19:30:03.495197+00	2026-03-18 19:30:03.4952+00	individual
195	1	1	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:31:33.77904+00	2026-03-18 19:31:33.779044+00	individual
196	1	2	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:31:36.196083+00	2026-03-18 19:31:36.196086+00	individual
197	1	3	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:31:39.476392+00	2026-03-18 19:31:39.476396+00	individual
198	1	4	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:31:41.828139+00	2026-03-18 19:31:41.828142+00	individual
199	1	5	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:31:43.667836+00	2026-03-18 19:31:43.667839+00	individual
313	1	1	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:07:44.954376+00	2026-03-20 05:07:44.954376+00	individual
314	1	2	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:07:47.383264+00	2026-03-20 05:07:47.383264+00	individual
316	1	4	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:07:52.096118+00	2026-03-20 05:07:52.096118+00	individual
320	1	9	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:08:04.399739+00	2026-03-20 05:08:04.399739+00	individual
203	1	7	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:01.523901+00	2026-03-18 19:32:01.523905+00	individual
204	1	8	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:04.324167+00	2026-03-18 19:32:04.32417+00	individual
205	1	9	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:06.997065+00	2026-03-18 19:32:06.997068+00	individual
206	1	10	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:09.148601+00	2026-03-18 19:32:09.148605+00	individual
207	1	11	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:11.292533+00	2026-03-18 19:32:11.292537+00	individual
208	1	12	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:13.956693+00	2026-03-18 19:32:13.956697+00	individual
209	1	13	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:15.828881+00	2026-03-18 19:32:15.828885+00	individual
210	1	14	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:17.884876+00	2026-03-18 19:32:17.884879+00	individual
211	1	15	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:20.485711+00	2026-03-18 19:32:20.485715+00	individual
212	1	16	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:22.989232+00	2026-03-18 19:32:22.989236+00	individual
213	1	17	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:25.221479+00	2026-03-18 19:32:25.221482+00	individual
214	1	18	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:26.909467+00	2026-03-18 19:32:26.909471+00	individual
215	1	19	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:29.429535+00	2026-03-18 19:32:29.429539+00	individual
216	1	20	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:40.858558+00	2026-03-18 19:32:40.858562+00	individual
217	1	21	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:43.351052+00	2026-03-18 19:32:43.351057+00	individual
218	1	22	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:45.63803+00	2026-03-18 19:32:45.638034+00	individual
219	1	23	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:48.014131+00	2026-03-18 19:32:48.014135+00	individual
220	1	24	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:52.574884+00	2026-03-18 19:32:52.574888+00	individual
221	1	25	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:54.750629+00	2026-03-18 19:32:54.750634+00	individual
222	1	26	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:32:58.67891+00	2026-03-18 19:32:58.678914+00	individual
223	1	27	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:33:00.806587+00	2026-03-18 19:33:00.806592+00	individual
224	1	28	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:33:04.767422+00	2026-03-18 19:33:04.767425+00	individual
225	1	29	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:33:09.223258+00	2026-03-18 19:33:09.223261+00	individual
226	1	30	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:33:13.399804+00	2026-03-18 19:33:13.399809+00	individual
321	1	10	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:08:08.455412+00	2026-03-20 05:08:08.455412+00	individual
324	1	20	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:08:29.394488+00	2026-03-20 05:08:29.394488+00	individual
229	1	6	\N	4	\N	2026-03-28	2026-03-30	confirmed	\N	2026-03-18 19:34:07.857914+00	2026-03-18 19:34:07.857917+00	individual
230	1	8	\N	1	\N	2026-03-30	2026-04-01	confirmed	\N	2026-03-18 19:34:40.164765+00	2026-03-18 19:34:40.16477+00	individual
231	1	15	\N	1	\N	2026-03-30	2026-04-01	confirmed	\N	2026-03-18 19:34:52.179864+00	2026-03-18 19:34:52.179867+00	individual
232	1	19	\N	1	\N	2026-03-31	2026-04-01	confirmed	\N	2026-03-18 19:35:03.956199+00	2026-03-18 19:35:03.956202+00	individual
233	1	21	\N	1	\N	2026-03-30	2026-04-01	confirmed	\N	2026-03-18 19:35:10.38137+00	2026-03-18 19:35:10.381374+00	individual
234	1	23	\N	1	\N	2026-03-30	2026-03-31	confirmed	\N	2026-03-18 19:35:15.869586+00	2026-03-18 19:35:15.869588+00	individual
235	1	25	\N	1	\N	2026-03-31	2026-04-01	confirmed	\N	2026-03-18 19:35:22.308705+00	2026-03-18 19:35:22.308708+00	individual
236	1	26	\N	1	\N	2026-03-31	2026-04-01	confirmed	\N	2026-03-18 19:35:24.29243+00	2026-03-18 19:35:24.292434+00	individual
237	1	20	\N	2	\N	2026-03-31	2026-04-01	confirmed	\N	2026-03-18 19:35:34.957907+00	2026-03-18 19:35:34.957911+00	individual
238	1	22	\N	2	\N	2026-03-31	2026-04-01	confirmed	\N	2026-03-18 19:35:37.021199+00	2026-03-18 19:35:37.021202+00	individual
239	1	23	\N	2	\N	2026-03-31	2026-04-01	confirmed	\N	2026-03-18 19:35:41.047671+00	2026-03-18 19:35:41.047676+00	individual
240	1	28	\N	2	\N	2026-03-31	2026-04-01	confirmed	\N	2026-03-18 19:35:45.230083+00	2026-03-18 19:35:45.230088+00	individual
337	1	2	\N	2	\N	2026-04-02	2026-04-04	confirmed	\N	2026-03-20 05:21:58.805281+00	2026-03-20 05:21:58.805291+00	individual
339	1	15	\N	2	\N	2026-04-01	2026-04-03	confirmed	\N	2026-03-20 05:25:07.703872+00	2026-03-20 05:25:07.703876+00	individual
343	1	24	\N	2	\N	2026-04-01	2026-04-02	confirmed	\N	2026-03-20 05:25:37.332357+00	2026-03-20 05:25:37.33236+00	individual
347	1	15	\N	1	\N	2026-04-03	2026-04-04	confirmed	\N	2026-03-20 05:26:09.358627+00	2026-03-20 05:26:09.358631+00	individual
349	1	18	\N	1	\N	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 05:26:25.60777+00	2026-03-20 05:26:25.607773+00	individual
351	1	20	\N	1	\N	2026-04-02	2026-04-05	confirmed	\N	2026-03-20 05:26:37.829752+00	2026-03-20 05:26:37.829757+00	individual
355	1	24	\N	1	\N	2026-04-02	2026-04-05	confirmed	\N	2026-03-20 05:27:05.123821+00	2026-03-20 05:27:05.123824+00	individual
361	1	22	\N	1	\N	2026-04-19	2026-04-20	confirmed	\N	2026-03-20 05:28:02.104804+00	2026-03-20 05:28:02.104808+00	individual
255	1	1	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:43:33.009291+00	2026-03-20 05:03:01.218773+00	individual
315	1	3	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:07:50.760553+00	2026-03-20 05:07:50.760553+00	individual
317	1	5	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:07:52.951504+00	2026-03-20 05:07:52.951504+00	individual
318	1	7	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:08:02.184363+00	2026-03-20 05:08:02.184363+00	individual
319	1	8	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:08:03.319435+00	2026-03-20 05:08:03.319435+00	individual
326	1	18	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:08:59.188495+00	2026-03-20 05:08:59.188495+00	individual
327	1	22	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:09:10.906516+00	2026-03-20 05:09:10.906516+00	individual
329	1	26	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:09:21.179589+00	2026-03-20 05:09:21.179589+00	individual
330	1	27	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:09:22.235205+00	2026-03-20 05:09:22.235205+00	individual
336	1	22	10	2	\N	2026-04-02	2026-04-06	confirmed	\N	2026-03-20 05:17:53.009895+00	2026-03-20 05:17:53.009899+00	individual
338	1	8	\N	2	\N	2026-04-01	2026-04-03	confirmed	\N	2026-03-20 05:22:09.797772+00	2026-03-20 05:22:09.797776+00	individual
341	1	18	\N	2	\N	2026-04-04	2026-04-05	confirmed	\N	2026-03-20 05:25:21.452661+00	2026-03-20 05:25:21.452665+00	individual
345	1	26	\N	2	\N	2026-04-01	2026-04-05	confirmed	\N	2026-03-20 05:25:48.869703+00	2026-03-20 05:25:48.869706+00	individual
256	1	3	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:43:38.587014+00	2026-03-20 05:03:01.218773+00	individual
259	1	7	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:43:56.784388+00	2026-03-20 05:03:01.218773+00	individual
262	1	10	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:21.643387+00	2026-03-20 05:03:01.218773+00	individual
266	1	14	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:25.771245+00	2026-03-20 05:03:01.218773+00	individual
269	1	17	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:28.700492+00	2026-03-20 05:03:01.218773+00	individual
274	1	26	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:49.709934+00	2026-03-20 05:03:01.218773+00	individual
348	1	16	\N	1	\N	2026-04-02	2026-04-06	confirmed	\N	2026-03-20 05:26:16.641535+00	2026-03-20 05:26:16.64154+00	individual
352	1	21	\N	1	\N	2026-04-03	2026-04-05	confirmed	\N	2026-03-20 05:26:44.985091+00	2026-03-20 05:26:44.985094+00	individual
280	1	4	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:51:36.327526+00	2026-03-20 05:05:05.657037+00	individual
286	1	24	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:52:12.217829+00	2026-03-20 05:05:05.657037+00	individual
354	1	23	\N	1	\N	2026-04-04	2026-04-05	confirmed	\N	2026-03-20 05:26:58.400485+00	2026-03-20 05:26:58.400489+00	individual
356	1	27	\N	1	\N	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 05:27:10.875289+00	2026-03-20 05:27:10.875292+00	individual
358	1	28	\N	1	\N	2026-04-03	2026-04-04	confirmed	\N	2026-03-20 05:27:17.042779+00	2026-03-20 05:27:17.042782+00	individual
360	1	22	\N	1	\N	2026-04-10	2026-04-13	confirmed	\N	2026-03-20 05:27:54.707306+00	2026-03-20 05:27:54.707311+00	individual
363	1	23	\N	2	\N	2026-04-26	2026-05-01	confirmed	\N	2026-03-20 05:28:52.701297+00	2026-03-20 05:28:52.701301+00	individual
290	1	11	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:22.941417+00	2026-03-20 05:05:35.48178+00	individual
296	1	17	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:34.085077+00	2026-03-20 05:05:35.48178+00	individual
301	1	6	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:42.933514+00	2026-03-20 05:05:35.48178+00	individual
305	1	20	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:00.466231+00	2026-03-20 05:05:35.48178+00	individual
311	1	29	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:15.911935+00	2026-03-20 05:05:35.48178+00	individual
367	1	23	\N	2	\N	2026-04-07	2026-04-08	confirmed	\N	2026-03-20 05:29:48.178051+00	2026-03-20 05:29:48.178055+00	individual
371	1	3	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:56:54.883813+00	2026-03-20 05:56:54.883813+00	individual
382	1	22	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:24.416671+00	2026-03-20 05:57:24.416671+00	individual
390	1	11	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:43.850406+00	2026-03-20 05:58:43.850406+00	individual
394	1	15	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:46.618746+00	2026-03-20 05:58:46.618746+00	individual
402	1	22	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:52.282785+00	2026-03-20 05:58:52.282785+00	individual
406	1	26	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:55.16248+00	2026-03-20 05:58:55.16248+00	individual
416	1	8	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:59:03.265671+00	2026-03-20 05:59:03.265671+00	individual
421	1	7	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:43.981938+00	2026-03-20 06:00:43.981938+00	individual
426	1	22	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:01:04.008687+00	2026-03-20 06:01:04.008687+00	individual
429	1	11	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:18.099717+00	2026-03-20 06:02:18.099717+00	individual
434	1	16	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:21.451065+00	2026-03-20 06:02:21.451065+00	individual
437	1	23	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:28.112683+00	2026-03-20 06:02:28.112683+00	individual
442	1	29	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:32.155727+00	2026-03-20 06:02:32.155727+00	individual
452	1	5	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:49.855148+00	2026-03-20 06:03:49.855148+00	individual
459	1	13	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:05.23179+00	2026-03-20 06:04:05.23179+00	individual
462	1	16	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:07.560144+00	2026-03-20 06:04:07.560144+00	individual
466	1	20	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:10.817107+00	2026-03-20 06:04:10.817107+00	individual
472	1	30	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:26.91327+00	2026-03-20 06:04:26.91327+00	individual
475	1	3	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:43.797296+00	2026-03-20 06:05:43.797296+00	individual
487	1	15	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:56.316254+00	2026-03-20 06:05:56.316254+00	individual
493	1	21	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:06:01.788333+00	2026-03-20 06:06:01.788333+00	individual
495	1	2	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:20.024774+00	2026-03-20 06:07:20.024774+00	individual
499	1	6	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:26.456734+00	2026-03-20 06:07:26.456734+00	individual
508	1	15	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:34.752391+00	2026-03-20 06:07:34.752391+00	individual
514	1	21	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:39.232523+00	2026-03-20 06:07:39.232523+00	individual
521	1	4	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:37.82682+00	2026-03-20 06:08:37.82682+00	individual
528	1	22	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:54.444621+00	2026-03-20 06:08:54.444621+00	individual
533	1	3	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:03.1268+00	2026-03-20 06:10:03.1268+00	individual
536	1	7	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:17.062851+00	2026-03-20 06:10:17.062851+00	individual
542	1	13	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:23.416689+00	2026-03-20 06:10:23.416689+00	individual
548	1	20	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:34.256639+00	2026-03-20 06:10:34.256639+00	individual
559	1	8	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:12.436045+00	2026-03-20 06:12:12.436045+00	individual
564	1	13	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:17.619504+00	2026-03-20 06:12:17.619504+00	individual
568	1	17	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:20.996652+00	2026-03-20 06:12:20.996652+00	individual
575	1	22	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:09.514055+00	2026-03-20 06:14:09.514055+00	individual
581	1	28	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:14.785889+00	2026-03-20 06:14:14.785889+00	individual
584	1	2	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:30.184233+00	2026-03-20 06:15:30.184233+00	individual
589	1	8	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:47.845969+00	2026-03-20 06:15:47.845969+00	individual
595	1	14	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:57.997595+00	2026-03-20 06:15:57.997595+00	individual
599	1	18	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:16:02.989132+00	2026-03-20 06:16:02.989132+00	individual
606	1	24	12	2	\N	2026-05-02	2026-05-04	confirmed	\N	2026-03-20 06:24:41.269576+00	2026-03-20 06:24:41.269582+00	individual
610	1	27	\N	2	\N	2026-05-17	2026-05-19	confirmed	\N	2026-03-20 06:25:38.823524+00	2026-03-20 06:25:38.823527+00	individual
325	1	21	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:08:30.257451+00	2026-03-20 05:08:30.257451+00	individual
331	1	29	\N	4	7	2026-04-30	2026-05-03	confirmed	\N	2026-03-20 05:09:28.035995+00	2026-03-20 05:09:28.035995+00	individual
332	1	6	11	2	\N	2026-04-02	2026-04-06	confirmed	\N	2026-03-20 05:10:54.202031+00	2026-03-20 05:10:54.202034+00	individual
340	1	19	\N	2	\N	2026-04-01	2026-04-02	confirmed	\N	2026-03-20 05:25:12.56355+00	2026-03-20 05:25:12.563553+00	individual
342	1	21	\N	2	\N	2026-04-01	2026-04-03	confirmed	\N	2026-03-20 05:25:31.917861+00	2026-03-20 05:25:31.917865+00	individual
344	1	25	\N	2	\N	2026-04-01	2026-04-05	confirmed	\N	2026-03-20 05:25:46.598978+00	2026-03-20 05:25:46.598981+00	individual
346	1	27	\N	2	\N	2026-04-04	2026-04-05	confirmed	\N	2026-03-20 05:25:55.464463+00	2026-03-20 05:25:55.464468+00	individual
350	1	19	\N	1	\N	2026-04-02	2026-04-05	confirmed	\N	2026-03-20 05:26:29.711167+00	2026-03-20 05:26:29.711171+00	individual
353	1	23	\N	1	\N	2026-04-01	2026-04-02	confirmed	\N	2026-03-20 05:26:51.7096+00	2026-03-20 05:26:51.709604+00	individual
357	1	28	\N	1	\N	2026-04-01	2026-04-02	confirmed	\N	2026-03-20 05:27:14.177198+00	2026-03-20 05:27:14.177202+00	individual
359	1	20	\N	1	\N	2026-04-11	2026-04-17	confirmed	\N	2026-03-20 05:27:37.20812+00	2026-03-20 05:27:37.208123+00	individual
264	1	12	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:23.843267+00	2026-03-20 05:03:01.218773+00	individual
271	1	19	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:33.704125+00	2026-03-20 05:03:01.218773+00	individual
275	1	27	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:53.526175+00	2026-03-20 05:03:01.218773+00	individual
278	1	30	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:56.478088+00	2026-03-20 05:03:01.218773+00	individual
362	1	26	\N	1	\N	2026-04-25	2026-04-28	confirmed	\N	2026-03-20 05:28:16.628132+00	2026-03-20 05:28:16.628136+00	individual
285	1	23	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:52:08.765945+00	2026-03-20 05:05:05.657037+00	individual
365	1	28	\N	2	\N	2026-04-25	2026-05-01	confirmed	\N	2026-03-20 05:29:15.954482+00	2026-03-20 05:29:15.954485+00	individual
372	1	4	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:56:56.070043+00	2026-03-20 05:56:56.070043+00	individual
375	1	8	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:01.725564+00	2026-03-20 05:57:01.725564+00	individual
292	1	13	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:24.757654+00	2026-03-20 05:05:35.48178+00	individual
306	1	21	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:01.294134+00	2026-03-20 05:05:35.48178+00	individual
309	1	24	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:04.630937+00	2026-03-20 05:05:35.48178+00	individual
381	1	21	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:23.60668+00	2026-03-20 05:57:23.60668+00	individual
386	1	29	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:36.433905+00	2026-03-20 05:57:36.433905+00	individual
393	1	14	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:45.858363+00	2026-03-20 05:58:45.858363+00	individual
396	1	17	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:48.267211+00	2026-03-20 05:58:48.267211+00	individual
404	1	24	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:53.691206+00	2026-03-20 05:58:53.691206+00	individual
407	1	27	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:55.922696+00	2026-03-20 05:58:55.922696+00	individual
410	1	3	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:58.387148+00	2026-03-20 05:58:58.387148+00	individual
417	1	9	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:59:04.138143+00	2026-03-20 05:59:04.138143+00	individual
419	1	3	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:38.462494+00	2026-03-20 06:00:38.462494+00	individual
423	1	19	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:55.16698+00	2026-03-20 06:00:55.16698+00	individual
430	1	12	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:18.707704+00	2026-03-20 06:02:18.707704+00	individual
436	1	2	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:26.148025+00	2026-03-20 06:02:26.148025+00	individual
445	1	6	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:36.411667+00	2026-03-20 06:02:36.411667+00	individual
448	1	1	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:39.294809+00	2026-03-20 06:03:39.294809+00	individual
455	1	9	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:58.26441+00	2026-03-20 06:03:58.26441+00	individual
460	1	14	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:06.047731+00	2026-03-20 06:04:06.047731+00	individual
465	1	19	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:09.9676+00	2026-03-20 06:04:09.9676+00	individual
468	1	22	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:15.984299+00	2026-03-20 06:04:15.984299+00	individual
476	1	4	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:45.444322+00	2026-03-20 06:05:45.444322+00	individual
480	1	8	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:49.029599+00	2026-03-20 06:05:49.029599+00	individual
485	1	13	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:54.516319+00	2026-03-20 06:05:54.516319+00	individual
490	1	18	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:58.924443+00	2026-03-20 06:05:58.924443+00	individual
496	1	3	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:23.375976+00	2026-03-20 06:07:23.375976+00	individual
501	1	8	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:28.224174+00	2026-03-20 06:07:28.224174+00	individual
504	1	11	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:32.008366+00	2026-03-20 06:07:32.008366+00	individual
509	1	16	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:35.40078+00	2026-03-20 06:07:35.40078+00	individual
517	1	24	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:42.632735+00	2026-03-20 06:07:42.632735+00	individual
520	1	3	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:36.43545+00	2026-03-20 06:08:36.43545+00	individual
526	1	20	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:52.398701+00	2026-03-20 06:08:52.398701+00	individual
531	1	1	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:09:58.552767+00	2026-03-20 06:09:58.552767+00	individual
534	1	4	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:05.238984+00	2026-03-20 06:10:05.238984+00	individual
538	1	9	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:19.31868+00	2026-03-20 06:10:19.31868+00	individual
541	1	12	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:22.664439+00	2026-03-20 06:10:22.664439+00	individual
544	1	15	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:25.016061+00	2026-03-20 06:10:25.016061+00	individual
549	1	21	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:35.071515+00	2026-03-20 06:10:35.071515+00	individual
555	1	3	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:00.54098+00	2026-03-20 06:12:00.54098+00	individual
561	1	10	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:15.075941+00	2026-03-20 06:12:15.075941+00	individual
565	1	14	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:18.411988+00	2026-03-20 06:12:18.411988+00	individual
570	1	21	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:30.702236+00	2026-03-20 06:12:30.702236+00	individual
576	1	23	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:10.288606+00	2026-03-20 06:14:10.288606+00	individual
579	1	26	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:12.578757+00	2026-03-20 06:14:12.578757+00	individual
583	1	1	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:27.263102+00	2026-03-20 06:15:27.263102+00	individual
587	1	5	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:41.269328+00	2026-03-20 06:15:41.269328+00	individual
591	1	10	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:55.117658+00	2026-03-20 06:15:55.117658+00	individual
596	1	15	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:58.742635+00	2026-03-20 06:15:58.742635+00	individual
603	1	25	12	2	\N	2026-05-02	2026-05-04	confirmed	\N	2026-03-20 06:17:39.342285+00	2026-03-20 06:17:39.342288+00	individual
608	1	22	\N	2	\N	2026-05-17	2026-05-19	confirmed	\N	2026-03-20 06:25:25.238932+00	2026-03-20 06:25:25.238935+00	individual
611	1	1	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:12.216638+00	2026-03-20 18:34:12.216638+00	individual
614	1	12	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:15.91133+00	2026-03-20 18:34:15.91133+00	individual
616	1	14	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:17.111685+00	2026-03-20 18:34:17.111685+00	individual
619	1	17	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:19.559505+00	2026-03-20 18:34:19.559505+00	individual
620	1	18	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:20.263232+00	2026-03-20 18:34:20.263232+00	individual
364	1	25	\N	2	\N	2026-04-25	2026-05-01	confirmed	\N	2026-03-20 05:29:02.773848+00	2026-03-20 05:29:02.773854+00	individual
366	1	21	\N	2	\N	2026-04-08	2026-04-14	confirmed	\N	2026-03-20 05:29:40.040588+00	2026-03-20 05:29:40.040593+00	individual
368	1	23	\N	2	\N	2026-04-11	2026-04-14	confirmed	\N	2026-03-20 05:29:57.032435+00	2026-03-20 05:29:57.032439+00	individual
377	1	10	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:08.294646+00	2026-03-20 05:57:08.294646+00	individual
380	1	20	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:22.775207+00	2026-03-20 05:57:22.775207+00	individual
384	1	26	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:30.832267+00	2026-03-20 05:57:30.832267+00	individual
395	1	16	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:47.377464+00	2026-03-20 05:58:47.377464+00	individual
399	1	2	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:50.138705+00	2026-03-20 05:58:50.138705+00	individual
403	1	23	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:53.002489+00	2026-03-20 05:58:53.002489+00	individual
408	1	28	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:56.77146+00	2026-03-20 05:58:56.77146+00	individual
412	1	4	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:59.939031+00	2026-03-20 05:58:59.939031+00	individual
415	1	7	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:59:02.481564+00	2026-03-20 05:59:02.481564+00	individual
418	1	1	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:30.184607+00	2026-03-20 06:00:30.184607+00	individual
422	1	18	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:54.151204+00	2026-03-20 06:00:54.151204+00	individual
427	1	26	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:01:09.618529+00	2026-03-20 06:01:09.618529+00	individual
432	1	14	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:19.811006+00	2026-03-20 06:02:19.811006+00	individual
439	1	25	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:29.421027+00	2026-03-20 06:02:29.421027+00	individual
443	1	30	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:34.403486+00	2026-03-20 06:02:34.403486+00	individual
447	1	9	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:43.788398+00	2026-03-20 06:02:43.788398+00	individual
261	1	6	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:11.978425+00	2026-03-20 05:03:01.218773+00	individual
265	1	13	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:24.762727+00	2026-03-20 05:03:01.218773+00	individual
268	1	16	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:27.65098+00	2026-03-20 05:03:01.218773+00	individual
273	1	22	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:41.16092+00	2026-03-20 05:03:01.218773+00	individual
276	1	28	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:54.541771+00	2026-03-20 05:03:01.218773+00	individual
450	1	3	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:47.35167+00	2026-03-20 06:03:47.35167+00	individual
454	1	8	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:56.664475+00	2026-03-20 06:03:56.664475+00	individual
281	1	5	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:51:37.117208+00	2026-03-20 05:05:05.657037+00	individual
284	1	20	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:52:04.222711+00	2026-03-20 05:05:05.657037+00	individual
457	1	11	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:03.471705+00	2026-03-20 06:04:03.471705+00	individual
469	1	24	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:18.432817+00	2026-03-20 06:04:18.432817+00	individual
478	1	6	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:46.82896+00	2026-03-20 06:05:46.82896+00	individual
483	1	11	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:52.941141+00	2026-03-20 06:05:52.941141+00	individual
489	1	17	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:57.900056+00	2026-03-20 06:05:57.900056+00	individual
494	1	1	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:17.10627+00	2026-03-20 06:07:17.10627+00	individual
288	1	1	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:21.575547+00	2026-03-20 05:05:35.48178+00	individual
291	1	12	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:23.694086+00	2026-03-20 05:05:35.48178+00	individual
294	1	15	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:29.678279+00	2026-03-20 05:05:35.48178+00	individual
298	1	3	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:39.494447+00	2026-03-20 05:05:35.48178+00	individual
302	1	7	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:43.76595+00	2026-03-20 05:05:35.48178+00	individual
308	1	23	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:03.533274+00	2026-03-20 05:05:35.48178+00	individual
500	1	7	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:27.176761+00	2026-03-20 06:07:27.176761+00	individual
505	1	12	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:32.672305+00	2026-03-20 06:07:32.672305+00	individual
511	1	18	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:36.993543+00	2026-03-20 06:07:36.993543+00	individual
515	1	22	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:40.106733+00	2026-03-20 06:07:40.106733+00	individual
518	1	1	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:29.942672+00	2026-03-20 06:08:29.942672+00	individual
522	1	5	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:38.707298+00	2026-03-20 06:08:38.707298+00	individual
525	1	9	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:46.075369+00	2026-03-20 06:08:46.075369+00	individual
529	1	24	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:59.540801+00	2026-03-20 06:08:59.540801+00	individual
540	1	11	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:21.983154+00	2026-03-20 06:10:21.983154+00	individual
547	1	18	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:27.560322+00	2026-03-20 06:10:27.560322+00	individual
550	1	22	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:35.880732+00	2026-03-20 06:10:35.880732+00	individual
553	1	1	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:11:55.597228+00	2026-03-20 06:11:55.597228+00	individual
556	1	4	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:01.786982+00	2026-03-20 06:12:01.786982+00	individual
560	1	9	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:13.267796+00	2026-03-20 06:12:13.267796+00	individual
567	1	16	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:20.02044+00	2026-03-20 06:12:20.02044+00	individual
577	1	24	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:10.952982+00	2026-03-20 06:14:10.952982+00	individual
580	1	27	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:13.417422+00	2026-03-20 06:14:13.417422+00	individual
588	1	7	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:47.044586+00	2026-03-20 06:15:47.044586+00	individual
593	1	12	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:56.686429+00	2026-03-20 06:15:56.686429+00	individual
597	1	16	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:16:01.621385+00	2026-03-20 06:16:01.621385+00	individual
602	1	30	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:16:11.816041+00	2026-03-20 06:16:11.816041+00	individual
612	1	10	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:14.822241+00	2026-03-20 18:34:14.822241+00	individual
615	1	13	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:16.479053+00	2026-03-20 18:34:16.479053+00	individual
617	1	15	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:18.032264+00	2026-03-20 18:34:18.032264+00	individual
621	1	19	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:21.295957+00	2026-03-20 18:34:21.295957+00	individual
622	1	2	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:22.046863+00	2026-03-20 18:34:22.046863+00	individual
625	1	3	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:26.456242+00	2026-03-20 18:34:26.456242+00	individual
626	1	4	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:28.345039+00	2026-03-20 18:34:28.345039+00	individual
628	1	6	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:29.928784+00	2026-03-20 18:34:29.928784+00	individual
629	1	7	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:30.856265+00	2026-03-20 18:34:30.856265+00	individual
631	1	9	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:37.847955+00	2026-03-20 18:34:37.847955+00	individual
632	1	22	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:39.778865+00	2026-03-20 18:35:39.778865+00	individual
634	1	24	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:41.216985+00	2026-03-20 18:35:41.216985+00	individual
636	1	26	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:42.50743+00	2026-03-20 18:35:42.50743+00	individual
637	1	27	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:43.449686+00	2026-03-20 18:35:43.449686+00	individual
369	1	1	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:56:47.555162+00	2026-03-20 05:56:47.555162+00	individual
374	1	7	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:00.703006+00	2026-03-20 05:57:00.703006+00	individual
378	1	17	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:13.198328+00	2026-03-20 05:57:13.198328+00	individual
383	1	23	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:26.495123+00	2026-03-20 05:57:26.495123+00	individual
387	1	30	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:37.606848+00	2026-03-20 05:57:37.606848+00	individual
388	1	1	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:42.835486+00	2026-03-20 05:58:42.835486+00	individual
391	1	12	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:44.674165+00	2026-03-20 05:58:44.674165+00	individual
397	1	18	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:48.977598+00	2026-03-20 05:58:48.977598+00	individual
400	1	20	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:50.603218+00	2026-03-20 05:58:50.603218+00	individual
405	1	25	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:54.434637+00	2026-03-20 05:58:54.434637+00	individual
411	1	30	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:59.202622+00	2026-03-20 05:58:59.202622+00	individual
414	1	6	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:59:01.578529+00	2026-03-20 05:59:01.578529+00	individual
263	1	11	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:22.659109+00	2026-03-20 05:03:01.218773+00	individual
270	1	18	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:29.708205+00	2026-03-20 05:03:01.218773+00	individual
424	1	20	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:59.016671+00	2026-03-20 06:00:59.016671+00	individual
282	1	8	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:51:45.206743+00	2026-03-20 05:05:05.657037+00	individual
431	1	13	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:19.267077+00	2026-03-20 06:02:19.267077+00	individual
435	1	17	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:22.331107+00	2026-03-20 06:02:22.331107+00	individual
440	1	27	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:30.59639+00	2026-03-20 06:02:30.59639+00	individual
444	1	4	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:35.202798+00	2026-03-20 06:02:35.202798+00	individual
451	1	4	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:49.055241+00	2026-03-20 06:03:49.055241+00	individual
456	1	10	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:02.696279+00	2026-03-20 06:04:02.696279+00	individual
293	1	14	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:27.757723+00	2026-03-20 05:05:35.48178+00	individual
297	1	2	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:36.133402+00	2026-03-20 05:05:35.48178+00	individual
300	1	5	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:42.22165+00	2026-03-20 05:05:35.48178+00	individual
303	1	8	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:45.853869+00	2026-03-20 05:05:35.48178+00	individual
307	1	22	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:02.60671+00	2026-03-20 05:05:35.48178+00	individual
312	1	30	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:16.760529+00	2026-03-20 05:05:35.48178+00	individual
461	1	15	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:06.951102+00	2026-03-20 06:04:06.951102+00	individual
464	1	18	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:09.080053+00	2026-03-20 06:04:09.080053+00	individual
470	1	26	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:21.969193+00	2026-03-20 06:04:21.969193+00	individual
473	1	1	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:37.733076+00	2026-03-20 06:05:37.733076+00	individual
479	1	7	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:47.901591+00	2026-03-20 06:05:47.901591+00	individual
482	1	10	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:52.157764+00	2026-03-20 06:05:52.157764+00	individual
486	1	14	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:55.467699+00	2026-03-20 06:05:55.467699+00	individual
491	1	19	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:59.908364+00	2026-03-20 06:05:59.908364+00	individual
497	1	4	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:24.688377+00	2026-03-20 06:07:24.688377+00	individual
503	1	10	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:31.400843+00	2026-03-20 06:07:31.400843+00	individual
507	1	14	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:34.040769+00	2026-03-20 06:07:34.040769+00	individual
512	1	19	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:37.681965+00	2026-03-20 06:07:37.681965+00	individual
516	1	23	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:41.649126+00	2026-03-20 06:07:41.649126+00	individual
519	1	2	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:33.642859+00	2026-03-20 06:08:33.642859+00	individual
524	1	8	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:45.211881+00	2026-03-20 06:08:45.211881+00	individual
530	1	25	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:09:00.588747+00	2026-03-20 06:09:00.588747+00	individual
532	1	2	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:00.815498+00	2026-03-20 06:10:00.815498+00	individual
537	1	8	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:18.39167+00	2026-03-20 06:10:18.39167+00	individual
543	1	14	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:24.144447+00	2026-03-20 06:10:24.144447+00	individual
546	1	17	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:26.903716+00	2026-03-20 06:10:26.903716+00	individual
552	1	29	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:43.848666+00	2026-03-20 06:10:43.848666+00	individual
554	1	2	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:11:58.092527+00	2026-03-20 06:11:58.092527+00	individual
558	1	7	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:11.400681+00	2026-03-20 06:12:11.400681+00	individual
563	1	12	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:16.828489+00	2026-03-20 06:12:16.828489+00	individual
569	1	18	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:22.037478+00	2026-03-20 06:12:22.037478+00	individual
572	1	30	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:37.165494+00	2026-03-20 06:12:37.165494+00	individual
573	1	19	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:07.275456+00	2026-03-20 06:14:07.275456+00	individual
585	1	3	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:39.148983+00	2026-03-20 06:15:39.148983+00	individual
590	1	9	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:48.621226+00	2026-03-20 06:15:48.621226+00	individual
594	1	13	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:57.341626+00	2026-03-20 06:15:57.341626+00	individual
598	1	17	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:16:02.326212+00	2026-03-20 06:16:02.326212+00	individual
600	1	21	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:16:07.654212+00	2026-03-20 06:16:07.654212+00	individual
601	1	29	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:16:10.87901+00	2026-03-20 06:16:10.87901+00	individual
605	1	24	13	4	\N	2026-04-30	2026-05-02	confirmed	\N	2026-03-20 06:23:59.654901+00	2026-03-20 06:23:59.654904+00	individual
607	1	23	\N	2	\N	2026-05-17	2026-05-19	confirmed	\N	2026-03-20 06:25:20.368497+00	2026-03-20 06:25:20.368501+00	individual
609	1	20	\N	2	\N	2026-05-17	2026-05-19	confirmed	\N	2026-03-20 06:25:29.644507+00	2026-03-20 06:25:29.644511+00	individual
613	1	11	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:15.318336+00	2026-03-20 18:34:15.318336+00	individual
618	1	16	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:18.782601+00	2026-03-20 18:34:18.782601+00	individual
623	1	20	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:22.807781+00	2026-03-20 18:34:22.807781+00	individual
624	1	21	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:23.584434+00	2026-03-20 18:34:23.584434+00	individual
627	1	5	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:28.920141+00	2026-03-20 18:34:28.920141+00	individual
630	1	8	\N	4	20	2026-06-01	2026-06-04	confirmed	\N	2026-03-20 18:34:36.822229+00	2026-03-20 18:34:36.822229+00	individual
633	1	23	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:40.426159+00	2026-03-20 18:35:40.426159+00	individual
635	1	25	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:41.832825+00	2026-03-20 18:35:41.832825+00	individual
638	1	28	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:44.434221+00	2026-03-20 18:35:44.434221+00	individual
639	1	29	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:45.290771+00	2026-03-20 18:35:45.290771+00	individual
640	1	30	\N	4	21	2026-06-02	2026-06-03	confirmed	\N	2026-03-20 18:35:46.306406+00	2026-03-20 18:35:46.306406+00	individual
370	1	2	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:56:50.725763+00	2026-03-20 05:56:50.725763+00	individual
373	1	5	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:56:57.005745+00	2026-03-20 05:56:57.005745+00	individual
376	1	9	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:04.446266+00	2026-03-20 05:57:04.446266+00	individual
379	1	18	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:15.150211+00	2026-03-20 05:57:15.150211+00	individual
385	1	28	\N	4	8	2026-05-03	2026-05-05	confirmed	\N	2026-03-20 05:57:35.407323+00	2026-03-20 05:57:35.407323+00	individual
389	1	10	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:43.377299+00	2026-03-20 05:58:43.377299+00	individual
392	1	13	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:45.2824+00	2026-03-20 05:58:45.2824+00	individual
398	1	19	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:49.562299+00	2026-03-20 05:58:49.562299+00	individual
401	1	21	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:51.507624+00	2026-03-20 05:58:51.507624+00	individual
409	1	29	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:58:57.587054+00	2026-03-20 05:58:57.587054+00	individual
413	1	5	\N	4	9	2026-05-08	2026-05-11	confirmed	\N	2026-03-20 05:59:00.691406+00	2026-03-20 05:59:00.691406+00	individual
420	1	5	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:39.852918+00	2026-03-20 06:00:39.852918+00	individual
425	1	21	\N	4	10	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:00:59.982727+00	2026-03-20 06:00:59.982727+00	individual
428	1	10	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:17.412704+00	2026-03-20 06:02:17.412704+00	individual
433	1	15	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:20.579867+00	2026-03-20 06:02:20.579867+00	individual
438	1	24	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:28.787542+00	2026-03-20 06:02:28.787542+00	individual
441	1	28	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:31.402678+00	2026-03-20 06:02:31.402678+00	individual
446	1	8	\N	4	11	2026-05-11	2026-05-14	confirmed	\N	2026-03-20 06:02:37.980362+00	2026-03-20 06:02:37.980362+00	individual
449	1	2	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:41.967497+00	2026-03-20 06:03:41.967497+00	individual
453	1	7	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:03:55.498513+00	2026-03-20 06:03:55.498513+00	individual
458	1	12	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:04.135222+00	2026-03-20 06:04:04.135222+00	individual
463	1	17	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:08.232086+00	2026-03-20 06:04:08.232086+00	individual
467	1	21	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:11.76003+00	2026-03-20 06:04:11.76003+00	individual
471	1	29	\N	4	12	2026-05-14	2026-05-17	confirmed	\N	2026-03-20 06:04:25.689417+00	2026-03-20 06:04:25.689417+00	individual
474	1	2	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:40.619315+00	2026-03-20 06:05:40.619315+00	individual
241	1	1	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:00.675854+00	2026-03-20 05:02:18.720735+00	individual
242	1	3	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:15.640895+00	2026-03-20 05:02:18.720735+00	individual
243	1	4	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:17.160096+00	2026-03-20 05:02:18.720735+00	individual
244	1	5	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:19.529302+00	2026-03-20 05:02:18.720735+00	individual
245	1	7	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:21.648646+00	2026-03-20 05:02:18.720735+00	individual
246	1	9	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:32.449549+00	2026-03-20 05:02:18.720735+00	individual
247	1	10	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:45.916008+00	2026-03-20 05:02:18.720735+00	individual
248	1	11	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:47.098768+00	2026-03-20 05:02:18.720735+00	individual
249	1	12	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:48.250858+00	2026-03-20 05:02:18.720735+00	individual
250	1	13	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:49.538291+00	2026-03-20 05:02:18.720735+00	individual
251	1	14	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:40:56.501605+00	2026-03-20 05:02:18.720735+00	individual
252	1	17	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:41:03.763278+00	2026-03-20 05:02:18.720735+00	individual
253	1	29	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:41:07.418577+00	2026-03-20 05:02:18.720735+00	individual
254	1	30	\N	4	3	2026-04-01	2026-04-04	confirmed	\N	2026-03-20 04:41:08.579616+00	2026-03-20 05:02:18.720735+00	individual
477	1	5	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:46.180698+00	2026-03-20 06:05:46.180698+00	individual
481	1	9	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:50.070417+00	2026-03-20 06:05:50.070417+00	individual
484	1	12	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:53.651824+00	2026-03-20 06:05:53.651824+00	individual
267	1	15	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:26.755142+00	2026-03-20 05:03:01.218773+00	individual
272	1	21	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:39.896376+00	2026-03-20 05:03:01.218773+00	individual
277	1	29	\N	4	4	2026-04-16	2026-04-19	confirmed	\N	2026-03-20 04:44:55.581179+00	2026-03-20 05:03:01.218773+00	individual
488	1	16	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:05:57.075979+00	2026-03-20 06:05:57.075979+00	individual
492	1	20	\N	4	13	2026-05-19	2026-05-21	confirmed	\N	2026-03-20 06:06:00.748212+00	2026-03-20 06:06:00.748212+00	individual
498	1	5	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:25.24801+00	2026-03-20 06:07:25.24801+00	individual
279	1	2	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:51:29.665973+00	2026-03-20 05:05:05.657037+00	individual
283	1	9	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:51:46.134579+00	2026-03-20 05:05:05.657037+00	individual
287	1	25	\N	4	5	2026-04-17	2026-04-22	confirmed	\N	2026-03-20 04:52:13.054502+00	2026-03-20 05:05:05.657037+00	individual
502	1	9	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:29.05703+00	2026-03-20 06:07:29.05703+00	individual
506	1	13	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:33.368027+00	2026-03-20 06:07:33.368027+00	individual
510	1	17	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:36.129319+00	2026-03-20 06:07:36.129319+00	individual
513	1	20	\N	4	14	2026-05-21	2026-05-22	confirmed	\N	2026-03-20 06:07:38.504853+00	2026-03-20 06:07:38.504853+00	individual
523	1	7	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:44.051669+00	2026-03-20 06:08:44.051669+00	individual
289	1	10	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:22.317472+00	2026-03-20 05:05:35.48178+00	individual
295	1	16	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:30.630327+00	2026-03-20 05:05:35.48178+00	individual
299	1	4	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:41.493955+00	2026-03-20 05:05:35.48178+00	individual
304	1	9	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:54:46.606403+00	2026-03-20 05:05:35.48178+00	individual
310	1	27	\N	4	6	2026-04-23	2026-04-26	confirmed	\N	2026-03-20 04:55:11.143215+00	2026-03-20 05:05:35.48178+00	individual
527	1	21	\N	4	15	2026-05-22	2026-05-24	confirmed	\N	2026-03-20 06:08:53.476179+00	2026-03-20 06:08:53.476179+00	individual
535	1	5	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:05.967291+00	2026-03-20 06:10:05.967291+00	individual
539	1	10	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:21.127544+00	2026-03-20 06:10:21.127544+00	individual
545	1	16	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:26.032407+00	2026-03-20 06:10:26.032407+00	individual
551	1	27	\N	4	16	2026-05-24	2026-05-25	confirmed	\N	2026-03-20 06:10:42.455676+00	2026-03-20 06:10:42.455676+00	individual
557	1	5	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:02.930798+00	2026-03-20 06:12:02.930798+00	individual
562	1	11	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:15.955579+00	2026-03-20 06:12:15.955579+00	individual
566	1	15	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:19.292131+00	2026-03-20 06:12:19.292131+00	individual
571	1	29	\N	4	17	2026-05-25	2026-05-27	confirmed	\N	2026-03-20 06:12:35.581632+00	2026-03-20 06:12:35.581632+00	individual
574	1	20	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:08.496619+00	2026-03-20 06:14:08.496619+00	individual
578	1	25	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:11.736996+00	2026-03-20 06:14:11.736996+00	individual
582	1	6	\N	4	18	2026-05-25	2026-05-30	confirmed	\N	2026-03-20 06:14:17.20304+00	2026-03-20 06:14:17.20304+00	individual
586	1	4	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:40.172335+00	2026-03-20 06:15:40.172335+00	individual
592	1	11	\N	4	19	2026-05-28	2026-06-01	confirmed	\N	2026-03-20 06:15:55.981839+00	2026-03-20 06:15:55.981839+00	individual
641	1	1	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:39.357353+00	2026-03-20 18:36:39.357353+00	individual
647	1	8	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:52.493369+00	2026-03-20 18:36:52.493369+00	individual
654	1	15	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:59.885844+00	2026-03-20 18:36:59.885844+00	individual
665	1	12	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:00.816185+00	2026-03-20 18:38:00.816185+00	individual
669	1	16	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:03.471066+00	2026-03-20 18:38:03.471066+00	individual
672	1	19	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:05.911605+00	2026-03-20 18:38:05.911605+00	individual
642	1	2	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:41.973186+00	2026-03-20 18:36:41.973186+00	individual
646	1	7	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:51.660652+00	2026-03-20 18:36:51.660652+00	individual
650	1	11	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:56.053846+00	2026-03-20 18:36:56.053846+00	individual
655	1	16	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:37:00.66131+00	2026-03-20 18:37:00.66131+00	individual
659	1	21	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:37:05.860205+00	2026-03-20 18:37:05.860205+00	individual
662	1	1	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:37:59.043133+00	2026-03-20 18:37:59.043133+00	individual
668	1	15	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:02.783347+00	2026-03-20 18:38:02.783347+00	individual
676	1	3	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:10.945357+00	2026-03-20 18:38:10.945357+00	individual
643	1	3	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:45.51715+00	2026-03-20 18:36:45.51715+00	individual
648	1	9	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:53.573266+00	2026-03-20 18:36:53.573266+00	individual
653	1	14	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:57.749677+00	2026-03-20 18:36:57.749677+00	individual
658	1	20	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:37:02.963921+00	2026-03-20 18:37:02.963921+00	individual
661	1	29	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:37:09.829459+00	2026-03-20 18:37:09.829459+00	individual
666	1	13	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:01.296703+00	2026-03-20 18:38:01.296703+00	individual
673	1	2	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:06.63111+00	2026-03-20 18:38:06.63111+00	individual
677	1	4	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:12.384139+00	2026-03-20 18:38:12.384139+00	individual
644	1	4	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:46.80535+00	2026-03-20 18:36:46.80535+00	individual
649	1	10	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:55.134532+00	2026-03-20 18:36:55.134532+00	individual
652	1	13	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:57.157488+00	2026-03-20 18:36:57.157488+00	individual
657	1	18	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:37:02.051325+00	2026-03-20 18:37:02.051325+00	individual
664	1	11	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:00.14497+00	2026-03-20 18:38:00.14497+00	individual
671	1	18	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:04.887556+00	2026-03-20 18:38:04.887556+00	individual
675	1	21	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:08.167561+00	2026-03-20 18:38:08.167561+00	individual
645	1	5	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:47.628138+00	2026-03-20 18:36:47.628138+00	individual
651	1	12	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:36:56.59747+00	2026-03-20 18:36:56.59747+00	individual
656	1	17	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:37:01.309471+00	2026-03-20 18:37:01.309471+00	individual
660	1	22	\N	4	22	2026-06-07	2026-06-10	confirmed	\N	2026-03-20 18:37:06.435784+00	2026-03-20 18:37:06.435784+00	individual
663	1	10	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:37:59.744257+00	2026-03-20 18:37:59.744257+00	individual
667	1	14	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:01.982729+00	2026-03-20 18:38:01.982729+00	individual
670	1	17	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:04.167416+00	2026-03-20 18:38:04.167416+00	individual
674	1	20	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:07.408373+00	2026-03-20 18:38:07.408373+00	individual
678	1	5	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:12.995016+00	2026-03-20 18:38:12.995016+00	individual
679	1	6	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:13.545806+00	2026-03-20 18:38:13.545806+00	individual
680	1	7	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:14.448248+00	2026-03-20 18:38:14.448248+00	individual
681	1	8	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:15.28085+00	2026-03-20 18:38:15.28085+00	individual
682	1	9	\N	4	23	2026-06-10	2026-06-12	confirmed	\N	2026-03-20 18:38:16.048447+00	2026-03-20 18:38:16.048447+00	individual
683	1	1	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:24.142897+00	2026-03-20 18:39:24.142897+00	individual
684	1	10	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:24.619921+00	2026-03-20 18:39:24.619921+00	individual
685	1	11	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:25.395179+00	2026-03-20 18:39:25.395179+00	individual
686	1	12	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:25.947638+00	2026-03-20 18:39:25.947638+00	individual
687	1	13	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:26.564256+00	2026-03-20 18:39:26.564256+00	individual
688	1	14	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:27.259408+00	2026-03-20 18:39:27.259408+00	individual
689	1	15	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:27.971861+00	2026-03-20 18:39:27.971861+00	individual
690	1	16	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:28.659964+00	2026-03-20 18:39:28.659964+00	individual
691	1	17	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:29.260564+00	2026-03-20 18:39:29.260564+00	individual
692	1	18	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:29.867616+00	2026-03-20 18:39:29.867616+00	individual
693	1	19	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:30.444776+00	2026-03-20 18:39:30.444776+00	individual
694	1	2	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:31.020427+00	2026-03-20 18:39:31.020427+00	individual
695	1	20	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:31.596503+00	2026-03-20 18:39:31.596503+00	individual
696	1	21	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:32.218875+00	2026-03-20 18:39:32.218875+00	individual
697	1	22	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:32.804338+00	2026-03-20 18:39:32.804338+00	individual
698	1	23	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:33.39483+00	2026-03-20 18:39:33.39483+00	individual
699	1	24	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:33.948314+00	2026-03-20 18:39:33.948314+00	individual
700	1	25	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:34.540183+00	2026-03-20 18:39:34.540183+00	individual
701	1	26	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:35.147869+00	2026-03-20 18:39:35.147869+00	individual
702	1	27	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:35.787924+00	2026-03-20 18:39:35.787924+00	individual
703	1	28	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:36.459297+00	2026-03-20 18:39:36.459297+00	individual
704	1	29	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:37.123971+00	2026-03-20 18:39:37.123971+00	individual
705	1	3	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:37.723834+00	2026-03-20 18:39:37.723834+00	individual
706	1	30	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:38.299755+00	2026-03-20 18:39:38.299755+00	individual
707	1	4	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:38.868942+00	2026-03-20 18:39:38.868942+00	individual
708	1	5	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:39.547595+00	2026-03-20 18:39:39.547595+00	individual
709	1	6	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:40.075161+00	2026-03-20 18:39:40.075161+00	individual
710	1	7	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:40.675214+00	2026-03-20 18:39:40.675214+00	individual
711	1	8	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:41.227746+00	2026-03-20 18:39:41.227746+00	individual
712	1	9	\N	4	24	2026-06-12	2026-06-16	confirmed	\N	2026-03-20 18:39:41.804196+00	2026-03-20 18:39:41.804196+00	individual
713	1	1	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:13.049797+00	2026-03-20 18:41:13.049797+00	individual
714	1	10	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:13.582985+00	2026-03-20 18:41:13.582985+00	individual
715	1	11	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:13.934472+00	2026-03-20 18:41:13.934472+00	individual
716	1	12	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:14.527083+00	2026-03-20 18:41:14.527083+00	individual
717	1	13	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:14.993685+00	2026-03-20 18:41:14.993685+00	individual
718	1	14	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:15.623272+00	2026-03-20 18:41:15.623272+00	individual
719	1	15	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:16.119296+00	2026-03-20 18:41:16.119296+00	individual
720	1	16	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:16.966873+00	2026-03-20 18:41:16.966873+00	individual
721	1	17	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:17.654819+00	2026-03-20 18:41:17.654819+00	individual
722	1	18	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:18.376479+00	2026-03-20 18:41:18.376479+00	individual
723	1	19	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:18.983043+00	2026-03-20 18:41:18.983043+00	individual
724	1	2	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:19.608094+00	2026-03-20 18:41:19.608094+00	individual
725	1	20	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:20.231151+00	2026-03-20 18:41:20.231151+00	individual
726	1	21	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:20.856191+00	2026-03-20 18:41:20.856191+00	individual
727	1	3	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:23.425169+00	2026-03-20 18:41:23.425169+00	individual
728	1	4	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:24.776104+00	2026-03-20 18:41:24.776104+00	individual
729	1	5	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:25.408098+00	2026-03-20 18:41:25.408098+00	individual
730	1	6	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:25.952083+00	2026-03-20 18:41:25.952083+00	individual
731	1	7	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:26.783686+00	2026-03-20 18:41:26.783686+00	individual
732	1	8	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:27.62466+00	2026-03-20 18:41:27.62466+00	individual
733	1	9	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:28.440347+00	2026-03-20 18:41:28.440347+00	individual
734	1	22	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:37.844113+00	2026-03-20 18:41:37.844113+00	individual
735	1	24	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:42.010599+00	2026-03-20 18:41:42.010599+00	individual
736	1	26	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:46.089854+00	2026-03-20 18:41:46.089854+00	individual
737	1	27	\N	4	25	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:41:47.049944+00	2026-03-20 18:41:47.049944+00	individual
738	1	1	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:42:56.399731+00	2026-03-20 18:42:56.399731+00	individual
739	1	10	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:42:57.007859+00	2026-03-20 18:42:57.007859+00	individual
740	1	11	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:42:57.685933+00	2026-03-20 18:42:57.685933+00	individual
741	1	12	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:42:58.340998+00	2026-03-20 18:42:58.340998+00	individual
742	1	2	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:00.661095+00	2026-03-20 18:43:00.661095+00	individual
743	1	3	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:03.892868+00	2026-03-20 18:43:03.892868+00	individual
744	1	4	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:05.117038+00	2026-03-20 18:43:05.117038+00	individual
745	1	5	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:06.060846+00	2026-03-20 18:43:06.060846+00	individual
748	1	8	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:08.556845+00	2026-03-20 18:43:08.556845+00	individual
755	1	14	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:43:59.935549+00	2026-03-20 18:43:59.935549+00	individual
761	1	2	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:04.479954+00	2026-03-20 18:44:04.479954+00	individual
765	1	4	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:10.567532+00	2026-03-20 18:44:10.567532+00	individual
772	1	30	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:18.848784+00	2026-03-20 18:44:18.848784+00	individual
777	1	5	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:31.003972+00	2026-03-20 18:45:31.003972+00	individual
781	1	10	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:42.140079+00	2026-03-20 18:45:42.140079+00	individual
784	1	13	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:44.788306+00	2026-03-20 18:45:44.788306+00	individual
792	1	21	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:50.300745+00	2026-03-20 18:45:50.300745+00	individual
746	1	6	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:06.749492+00	2026-03-20 18:43:06.749492+00	individual
751	1	10	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:43:57.664542+00	2026-03-20 18:43:57.664542+00	individual
756	1	15	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:00.784493+00	2026-03-20 18:44:00.784493+00	individual
762	1	20	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:05.215338+00	2026-03-20 18:44:05.215338+00	individual
768	1	7	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:12.615809+00	2026-03-20 18:44:12.615809+00	individual
779	1	8	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:35.049065+00	2026-03-20 18:45:35.049065+00	individual
788	1	17	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:47.77245+00	2026-03-20 18:45:47.77245+00	individual
791	1	20	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:49.668188+00	2026-03-20 18:45:49.668188+00	individual
747	1	7	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:07.57295+00	2026-03-20 18:43:07.57295+00	individual
750	1	1	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:43:57.257591+00	2026-03-20 18:43:57.257591+00	individual
754	1	13	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:43:59.391555+00	2026-03-20 18:43:59.391555+00	individual
759	1	18	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:03.070508+00	2026-03-20 18:44:03.070508+00	individual
766	1	5	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:11.176165+00	2026-03-20 18:44:11.176165+00	individual
769	1	8	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:13.399268+00	2026-03-20 18:44:13.399268+00	individual
775	1	3	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:28.452483+00	2026-03-20 18:45:28.452483+00	individual
780	1	9	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:35.873989+00	2026-03-20 18:45:35.873989+00	individual
785	1	14	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:45.525989+00	2026-03-20 18:45:45.525989+00	individual
789	1	18	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:48.460013+00	2026-03-20 18:45:48.460013+00	individual
749	1	9	\N	4	26	2026-06-19	2026-06-22	confirmed	\N	2026-03-20 18:43:09.221573+00	2026-03-20 18:43:09.221573+00	individual
753	1	12	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:43:58.833094+00	2026-03-20 18:43:58.833094+00	individual
757	1	16	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:01.608652+00	2026-03-20 18:44:01.608652+00	individual
760	1	19	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:03.838781+00	2026-03-20 18:44:03.838781+00	individual
764	1	3	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:09.008433+00	2026-03-20 18:44:09.008433+00	individual
771	1	29	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:17.929039+00	2026-03-20 18:44:17.929039+00	individual
774	1	2	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:25.451491+00	2026-03-20 18:45:25.451491+00	individual
778	1	7	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:34.345803+00	2026-03-20 18:45:34.345803+00	individual
782	1	12	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:42.603499+00	2026-03-20 18:45:42.603499+00	individual
787	1	16	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:47.147219+00	2026-03-20 18:45:47.147219+00	individual
790	1	19	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:49.011171+00	2026-03-20 18:45:49.011171+00	individual
752	1	11	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:43:58.296414+00	2026-03-20 18:43:58.296414+00	individual
758	1	17	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:02.375098+00	2026-03-20 18:44:02.375098+00	individual
763	1	21	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:05.944445+00	2026-03-20 18:44:05.944445+00	individual
767	1	6	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:11.688281+00	2026-03-20 18:44:11.688281+00	individual
770	1	9	\N	4	27	2026-06-22	2026-06-26	confirmed	\N	2026-03-20 18:44:14.079512+00	2026-03-20 18:44:14.079512+00	individual
773	1	1	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:21.260935+00	2026-03-20 18:45:21.260935+00	individual
776	1	4	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:30.126101+00	2026-03-20 18:45:30.126101+00	individual
783	1	11	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:43.88306+00	2026-03-20 18:45:43.88306+00	individual
786	1	15	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:46.29952+00	2026-03-20 18:45:46.29952+00	individual
793	1	29	\N	4	28	2026-06-26	2026-06-30	confirmed	\N	2026-03-20 18:45:55.219984+00	2026-03-20 18:45:55.219984+00	individual
794	1	23	\N	2	\N	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:46:18.497238+00	2026-03-20 18:46:18.497242+00	individual
795	1	25	\N	2	\N	2026-06-17	2026-06-19	confirmed	\N	2026-03-20 18:46:20.896503+00	2026-03-20 18:46:20.896507+00	individual
796	1	6	\N	1	\N	2026-06-04	2026-06-05	confirmed	\N	2026-03-20 18:46:30.527077+00	2026-03-20 18:46:30.52708+00	individual
797	1	23	\N	1	\N	2026-06-09	2026-06-10	confirmed	\N	2026-03-20 18:46:38.246374+00	2026-03-20 18:46:38.246379+00	individual
798	1	1	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:01.399407+00	2026-03-20 18:55:01.399407+00	individual
799	1	10	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:02.106603+00	2026-03-20 18:55:02.106603+00	individual
800	1	11	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:02.492162+00	2026-03-20 18:55:02.492162+00	individual
801	1	12	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:03.147248+00	2026-03-20 18:55:03.147248+00	individual
802	1	13	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:03.610927+00	2026-03-20 18:55:03.610927+00	individual
803	1	14	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:04.010968+00	2026-03-20 18:55:04.010968+00	individual
804	1	15	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:04.722736+00	2026-03-20 18:55:04.722736+00	individual
805	1	16	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:05.515073+00	2026-03-20 18:55:05.515073+00	individual
806	1	17	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:06.27499+00	2026-03-20 18:55:06.27499+00	individual
807	1	18	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:06.843455+00	2026-03-20 18:55:06.843455+00	individual
808	1	19	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:07.443415+00	2026-03-20 18:55:07.443415+00	individual
809	1	2	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:08.082657+00	2026-03-20 18:55:08.082657+00	individual
810	1	20	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:08.692039+00	2026-03-20 18:55:08.692039+00	individual
811	1	21	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:09.307132+00	2026-03-20 18:55:09.307132+00	individual
812	1	3	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:16.838246+00	2026-03-20 18:55:16.838246+00	individual
813	1	29	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:18.19673+00	2026-03-20 18:55:18.19673+00	individual
814	1	30	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:19.037335+00	2026-03-20 18:55:19.037335+00	individual
815	1	4	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:19.804216+00	2026-03-20 18:55:19.804216+00	individual
816	1	5	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:20.500737+00	2026-03-20 18:55:20.500737+00	individual
817	1	6	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:21.629051+00	2026-03-20 18:55:21.629051+00	individual
818	1	28	\N	4	29	2026-07-01	2026-07-03	cancelled	\N	2026-03-20 18:55:22.172875+00	2026-03-20 18:55:25.679502+00	individual
819	1	7	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:30.837981+00	2026-03-20 18:55:30.837981+00	individual
820	1	8	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:31.747798+00	2026-03-20 18:55:31.747798+00	individual
821	1	9	\N	4	29	2026-07-01	2026-07-03	confirmed	\N	2026-03-20 18:55:32.420374+00	2026-03-20 18:55:32.420374+00	individual
822	1	1	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:26.285552+00	2026-03-20 18:56:26.285552+00	individual
823	1	10	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:26.967224+00	2026-03-20 18:56:26.967224+00	individual
824	1	11	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:27.687104+00	2026-03-20 18:56:27.687104+00	individual
825	1	12	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:29.600044+00	2026-03-20 18:56:29.600044+00	individual
826	1	13	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:30.319438+00	2026-03-20 18:56:30.319438+00	individual
827	1	14	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:31.007312+00	2026-03-20 18:56:31.007312+00	individual
828	1	15	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:32.030701+00	2026-03-20 18:56:32.030701+00	individual
829	1	16	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:32.69428+00	2026-03-20 18:56:32.69428+00	individual
830	1	17	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:33.423096+00	2026-03-20 18:56:33.423096+00	individual
831	1	18	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:34.150167+00	2026-03-20 18:56:34.150167+00	individual
832	1	19	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:34.798428+00	2026-03-20 18:56:34.798428+00	individual
833	1	2	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:35.454577+00	2026-03-20 18:56:35.454577+00	individual
834	1	20	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:36.167079+00	2026-03-20 18:56:36.167079+00	individual
835	1	21	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:37.28114+00	2026-03-20 18:56:37.28114+00	individual
836	1	22	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:41.296696+00	2026-03-20 18:56:41.296696+00	individual
837	1	27	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:43.128906+00	2026-03-20 18:56:43.128906+00	individual
838	1	29	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:46.880824+00	2026-03-20 18:56:46.880824+00	individual
839	1	3	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:48.825842+00	2026-03-20 18:56:48.825842+00	individual
840	1	30	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:49.552154+00	2026-03-20 18:56:49.552154+00	individual
841	1	4	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:50.520953+00	2026-03-20 18:56:50.520953+00	individual
842	1	5	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:51.407674+00	2026-03-20 18:56:51.407674+00	individual
843	1	6	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:52.039748+00	2026-03-20 18:56:52.039748+00	individual
844	1	7	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:52.71996+00	2026-03-20 18:56:52.71996+00	individual
845	1	8	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:53.952195+00	2026-03-20 18:56:53.952195+00	individual
846	1	9	\N	4	30	2026-07-04	2026-07-07	confirmed	\N	2026-03-20 18:56:55.345979+00	2026-03-20 18:56:55.345979+00	individual
847	1	1	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:57:59.423241+00	2026-03-20 18:57:59.423241+00	individual
848	1	10	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:00.131687+00	2026-03-20 18:58:00.131687+00	individual
849	1	11	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:00.715737+00	2026-03-20 18:58:00.715737+00	individual
850	1	12	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:01.468381+00	2026-03-20 18:58:01.468381+00	individual
851	1	13	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:02.210635+00	2026-03-20 18:58:02.210635+00	individual
852	1	2	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:04.418804+00	2026-03-20 18:58:04.418804+00	individual
853	1	3	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:07.483935+00	2026-03-20 18:58:07.483935+00	individual
854	1	4	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:09.331806+00	2026-03-20 18:58:09.331806+00	individual
855	1	5	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:10.45074+00	2026-03-20 18:58:10.45074+00	individual
856	1	6	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:11.306966+00	2026-03-20 18:58:11.306966+00	individual
857	1	7	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:12.491543+00	2026-03-20 18:58:12.491543+00	individual
858	1	8	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:13.331375+00	2026-03-20 18:58:13.331375+00	individual
859	1	9	\N	4	31	2026-07-08	2026-07-12	confirmed	\N	2026-03-20 18:58:14.059784+00	2026-03-20 18:58:14.059784+00	individual
862	1	3	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:17.294912+00	2026-03-20 18:59:17.294912+00	individual
867	1	9	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:25.974116+00	2026-03-20 18:59:25.974116+00	individual
871	1	13	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:32.246647+00	2026-03-20 18:59:32.246647+00	individual
875	1	17	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:34.582589+00	2026-03-20 18:59:34.582589+00	individual
883	1	3	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:09.235688+00	2026-03-20 19:01:09.235688+00	individual
886	1	6	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:12.595163+00	2026-03-20 19:01:12.595163+00	individual
894	1	13	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:17.84103+00	2026-03-20 19:03:17.84103+00	individual
901	1	3	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:25.913973+00	2026-03-20 19:03:25.913973+00	individual
911	1	12	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:12.138333+00	2026-03-20 19:13:12.138333+00	individual
915	1	16	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:15.018401+00	2026-03-20 19:13:15.018401+00	individual
922	1	7	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:23.755606+00	2026-03-20 19:13:23.755606+00	individual
860	1	1	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:11.615748+00	2026-03-20 18:59:11.615748+00	individual
864	1	5	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:19.310512+00	2026-03-20 18:59:19.310512+00	individual
870	1	12	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:31.633471+00	2026-03-20 18:59:31.633471+00	individual
876	1	18	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:35.26418+00	2026-03-20 18:59:35.26418+00	individual
880	1	1	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:02.204321+00	2026-03-20 19:01:02.204321+00	individual
884	1	4	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:10.420047+00	2026-03-20 19:01:10.420047+00	individual
890	1	1	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:15.450381+00	2026-03-20 19:03:15.450381+00	individual
896	1	15	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:19.193945+00	2026-03-20 19:03:19.193945+00	individual
904	1	6	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:28.427508+00	2026-03-20 19:03:28.427508+00	individual
913	1	14	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:13.339206+00	2026-03-20 19:13:13.339206+00	individual
918	1	3	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:20.035811+00	2026-03-20 19:13:20.035811+00	individual
923	1	8	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:24.509437+00	2026-03-20 19:13:24.509437+00	individual
861	1	2	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:14.358467+00	2026-03-20 18:59:14.358467+00	individual
866	1	8	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:25.14366+00	2026-03-20 18:59:25.14366+00	individual
869	1	11	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:30.864382+00	2026-03-20 18:59:30.864382+00	individual
874	1	16	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:33.913412+00	2026-03-20 18:59:33.913412+00	individual
879	1	30	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:45.823727+00	2026-03-20 18:59:45.823727+00	individual
887	1	7	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:13.708653+00	2026-03-20 19:01:13.708653+00	individual
893	1	12	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:17.273325+00	2026-03-20 19:03:17.273325+00	individual
898	1	17	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:20.810066+00	2026-03-20 19:03:20.810066+00	individual
902	1	4	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:27.105711+00	2026-03-20 19:03:27.105711+00	individual
905	1	7	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:29.434161+00	2026-03-20 19:03:29.434161+00	individual
908	1	1	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:10.132749+00	2026-03-20 19:13:10.132749+00	individual
914	1	15	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:14.266515+00	2026-03-20 19:13:14.266515+00	individual
917	1	2	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:17.171092+00	2026-03-20 19:13:17.171092+00	individual
920	1	5	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:22.236007+00	2026-03-20 19:13:22.236007+00	individual
863	1	4	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:18.358877+00	2026-03-20 18:59:18.358877+00	individual
868	1	10	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:30.079183+00	2026-03-20 18:59:30.079183+00	individual
873	1	15	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:33.311319+00	2026-03-20 18:59:33.311319+00	individual
878	1	29	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:44.318986+00	2026-03-20 18:59:44.318986+00	individual
882	1	2	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:05.75517+00	2026-03-20 19:01:05.75517+00	individual
889	1	9	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:15.492318+00	2026-03-20 19:01:15.492318+00	individual
892	1	11	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:16.680685+00	2026-03-20 19:03:16.680685+00	individual
897	1	16	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:19.985145+00	2026-03-20 19:03:19.985145+00	individual
900	1	2	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:22.433439+00	2026-03-20 19:03:22.433439+00	individual
906	1	8	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:30.433716+00	2026-03-20 19:03:30.433716+00	individual
909	1	10	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:10.859617+00	2026-03-20 19:13:10.859617+00	individual
912	1	13	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:12.706761+00	2026-03-20 19:13:12.706761+00	individual
919	1	4	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:21.371646+00	2026-03-20 19:13:21.371646+00	individual
924	1	9	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:25.347848+00	2026-03-20 19:13:25.347848+00	individual
865	1	7	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:23.422757+00	2026-03-20 18:59:23.422757+00	individual
872	1	14	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:32.782878+00	2026-03-20 18:59:32.782878+00	individual
877	1	21	\N	4	32	2026-07-12	2026-07-15	confirmed	\N	2026-03-20 18:59:38.743314+00	2026-03-20 18:59:38.743314+00	individual
881	1	10	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:02.85847+00	2026-03-20 19:01:02.85847+00	individual
885	1	5	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:11.468776+00	2026-03-20 19:01:11.468776+00	individual
888	1	8	\N	4	33	2026-07-18	2026-07-21	confirmed	\N	2026-03-20 19:01:14.610939+00	2026-03-20 19:01:14.610939+00	individual
891	1	10	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:16.071886+00	2026-03-20 19:03:16.071886+00	individual
895	1	14	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:18.497174+00	2026-03-20 19:03:18.497174+00	individual
899	1	18	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:21.482357+00	2026-03-20 19:03:21.482357+00	individual
903	1	5	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:27.753937+00	2026-03-20 19:03:27.753937+00	individual
907	1	9	\N	4	34	2026-07-21	2026-07-23	confirmed	\N	2026-03-20 19:03:31.265205+00	2026-03-20 19:03:31.265205+00	individual
910	1	11	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:11.490105+00	2026-03-20 19:13:11.490105+00	individual
916	1	17	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:16.07483+00	2026-03-20 19:13:16.07483+00	individual
921	1	6	\N	4	35	2026-07-23	2026-07-25	confirmed	\N	2026-03-20 19:13:23.04314+00	2026-03-20 19:13:23.04314+00	individual
925	1	1	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:31.329527+00	2026-03-20 19:14:31.329527+00	individual
926	1	10	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:31.884217+00	2026-03-20 19:14:31.884217+00	individual
927	1	11	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:32.413336+00	2026-03-20 19:14:32.413336+00	individual
928	1	12	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:33.04525+00	2026-03-20 19:14:33.04525+00	individual
929	1	13	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:33.60511+00	2026-03-20 19:14:33.60511+00	individual
930	1	14	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:34.43859+00	2026-03-20 19:14:34.43859+00	individual
931	1	15	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:35.198273+00	2026-03-20 19:14:35.198273+00	individual
932	1	16	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:36.357456+00	2026-03-20 19:14:36.357456+00	individual
933	1	2	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:37.525059+00	2026-03-20 19:14:37.525059+00	individual
934	1	3	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:40.053251+00	2026-03-20 19:14:40.053251+00	individual
935	1	4	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:41.269433+00	2026-03-20 19:14:41.269433+00	individual
936	1	5	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:42.150026+00	2026-03-20 19:14:42.150026+00	individual
937	1	6	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:42.901875+00	2026-03-20 19:14:42.901875+00	individual
938	1	7	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:43.774142+00	2026-03-20 19:14:43.774142+00	individual
939	1	8	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:44.543327+00	2026-03-20 19:14:44.543327+00	individual
940	1	9	\N	4	36	2026-07-26	2026-07-28	confirmed	\N	2026-03-20 19:14:45.727179+00	2026-03-20 19:14:45.727179+00	individual
941	1	1	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:41.330446+00	2026-03-20 19:15:41.330446+00	individual
942	1	2	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:43.681168+00	2026-03-20 19:15:43.681168+00	individual
943	1	3	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:46.145111+00	2026-03-20 19:15:46.145111+00	individual
944	1	4	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:47.697152+00	2026-03-20 19:15:47.697152+00	individual
945	1	5	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:48.505499+00	2026-03-20 19:15:48.505499+00	individual
946	1	7	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:55.227944+00	2026-03-20 19:15:55.227944+00	individual
947	1	8	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:56.154246+00	2026-03-20 19:15:56.154246+00	individual
948	1	9	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:15:56.889905+00	2026-03-20 19:15:56.889905+00	individual
949	1	10	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:03.477204+00	2026-03-20 19:16:03.477204+00	individual
950	1	11	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:04.264944+00	2026-03-20 19:16:04.264944+00	individual
951	1	12	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:05.096306+00	2026-03-20 19:16:05.096306+00	individual
952	1	13	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:05.736603+00	2026-03-20 19:16:05.736603+00	individual
953	1	14	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:06.329146+00	2026-03-20 19:16:06.329146+00	individual
954	1	15	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:06.969023+00	2026-03-20 19:16:06.969023+00	individual
955	1	16	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:07.5778+00	2026-03-20 19:16:07.5778+00	individual
956	1	17	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:08.313821+00	2026-03-20 19:16:08.313821+00	individual
957	1	18	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:08.993043+00	2026-03-20 19:16:08.993043+00	individual
958	1	20	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:12.049849+00	2026-03-20 19:16:12.049849+00	individual
959	1	21	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:12.938591+00	2026-03-20 19:16:12.938591+00	individual
960	1	24	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:19.076032+00	2026-03-20 19:16:19.076032+00	individual
961	1	25	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:19.875722+00	2026-03-20 19:16:19.875722+00	individual
962	1	29	\N	4	37	2026-07-28	2026-08-01	confirmed	\N	2026-03-20 19:16:23.155324+00	2026-03-20 19:16:23.155324+00	individual
963	1	1	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:17.394405+00	2026-03-20 19:24:17.394405+00	individual
964	1	10	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:17.7988+00	2026-03-20 19:24:17.7988+00	individual
965	1	11	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:18.368815+00	2026-03-20 19:24:18.368815+00	individual
966	1	12	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:18.847118+00	2026-03-20 19:24:18.847118+00	individual
967	1	13	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:19.359075+00	2026-03-20 19:24:19.359075+00	individual
968	1	14	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:19.807193+00	2026-03-20 19:24:19.807193+00	individual
969	1	15	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:20.486976+00	2026-03-20 19:24:20.486976+00	individual
970	1	16	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:21.246797+00	2026-03-20 19:24:21.246797+00	individual
971	1	17	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:21.991012+00	2026-03-20 19:24:21.991012+00	individual
972	1	18	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:22.743786+00	2026-03-20 19:24:22.743786+00	individual
973	1	19	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:23.399459+00	2026-03-20 19:24:23.399459+00	individual
974	1	2	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:24.031077+00	2026-03-20 19:24:24.031077+00	individual
975	1	20	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:24.687626+00	2026-03-20 19:24:24.687626+00	individual
976	1	29	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:28.320034+00	2026-03-20 19:24:28.320034+00	individual
977	1	3	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:29.264085+00	2026-03-20 19:24:29.264085+00	individual
978	1	30	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:30.120476+00	2026-03-20 19:24:30.120476+00	individual
979	1	4	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:30.688355+00	2026-03-20 19:24:30.688355+00	individual
980	1	5	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:31.37625+00	2026-03-20 19:24:31.37625+00	individual
981	1	6	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:32.102939+00	2026-03-20 19:24:32.102939+00	individual
982	1	7	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:32.815949+00	2026-03-20 19:24:32.815949+00	individual
983	1	8	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:33.648356+00	2026-03-20 19:24:33.648356+00	individual
984	1	9	\N	4	38	2026-08-04	2026-08-06	confirmed	\N	2026-03-20 19:24:34.42295+00	2026-03-20 19:24:34.42295+00	individual
985	1	1	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:25.331686+00	2026-03-20 19:25:25.331686+00	individual
986	1	10	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:25.929292+00	2026-03-20 19:25:25.929292+00	individual
993	1	17	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:30.650718+00	2026-03-20 19:25:30.650718+00	individual
999	1	7	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:38.51355+00	2026-03-20 19:25:38.51355+00	individual
1007	1	14	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:40.200295+00	2026-03-20 19:26:40.200295+00	individual
1011	1	18	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:43.105615+00	2026-03-20 19:26:43.105615+00	individual
1017	1	29	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:53.806264+00	2026-03-20 19:26:53.806264+00	individual
1022	1	6	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:57.494775+00	2026-03-20 19:26:57.494775+00	individual
1026	1	1	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:45.178422+00	2026-03-20 19:27:45.178422+00	individual
1033	1	9	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:58.424493+00	2026-03-20 19:27:58.424493+00	individual
1037	1	24	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:28:08.05576+00	2026-03-20 19:28:08.05576+00	individual
1040	1	10	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:15.844641+00	2026-03-20 19:29:15.844641+00	individual
1045	1	15	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:18.611855+00	2026-03-20 19:29:18.611855+00	individual
1049	1	19	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:21.011843+00	2026-03-20 19:29:21.011843+00	individual
1052	1	21	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:22.828121+00	2026-03-20 19:29:22.828121+00	individual
1056	1	25	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:25.17295+00	2026-03-20 19:29:25.17295+00	individual
1060	1	29	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:28.005773+00	2026-03-20 19:29:28.005773+00	individual
1064	1	5	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:30.709559+00	2026-03-20 19:29:30.709559+00	individual
987	1	11	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:26.417503+00	2026-03-20 19:25:26.417503+00	individual
991	1	15	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:28.842981+00	2026-03-20 19:25:28.842981+00	individual
995	1	3	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:34.497008+00	2026-03-20 19:25:34.497008+00	individual
1000	1	8	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:39.377243+00	2026-03-20 19:25:39.377243+00	individual
1004	1	11	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:38.31955+00	2026-03-20 19:26:38.31955+00	individual
1008	1	15	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:40.800939+00	2026-03-20 19:26:40.800939+00	individual
1013	1	2	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:44.315639+00	2026-03-20 19:26:44.315639+00	individual
1018	1	3	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:54.734573+00	2026-03-20 19:26:54.734573+00	individual
1027	1	2	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:48.008996+00	2026-03-20 19:27:48.008996+00	individual
1031	1	7	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:56.833508+00	2026-03-20 19:27:56.833508+00	individual
1035	1	21	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:28:05.240219+00	2026-03-20 19:28:05.240219+00	individual
1039	1	1	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:15.101604+00	2026-03-20 19:29:15.101604+00	individual
1044	1	14	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:17.747675+00	2026-03-20 19:29:17.747675+00	individual
1048	1	18	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:20.468859+00	2026-03-20 19:29:20.468859+00	individual
1053	1	22	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:23.452407+00	2026-03-20 19:29:23.452407+00	individual
1057	1	26	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:25.764468+00	2026-03-20 19:29:25.764468+00	individual
1061	1	3	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:28.709196+00	2026-03-20 19:29:28.709196+00	individual
1066	1	7	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:32.091712+00	2026-03-20 19:29:32.091712+00	individual
988	1	12	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:27.083602+00	2026-03-20 19:25:27.083602+00	individual
992	1	16	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:29.80949+00	2026-03-20 19:25:29.80949+00	individual
996	1	4	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:36.249438+00	2026-03-20 19:25:36.249438+00	individual
1001	1	9	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:40.122343+00	2026-03-20 19:25:40.122343+00	individual
1003	1	10	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:38.032655+00	2026-03-20 19:26:38.032655+00	individual
1006	1	13	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:39.719215+00	2026-03-20 19:26:39.719215+00	individual
1010	1	17	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:42.424956+00	2026-03-20 19:26:42.424956+00	individual
1015	1	21	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:48.076276+00	2026-03-20 19:26:48.076276+00	individual
1021	1	5	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:56.902766+00	2026-03-20 19:26:56.902766+00	individual
1025	1	9	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:59.742676+00	2026-03-20 19:26:59.742676+00	individual
1029	1	4	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:51.865893+00	2026-03-20 19:27:51.865893+00	individual
1032	1	8	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:57.745898+00	2026-03-20 19:27:57.745898+00	individual
1036	1	22	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:28:06.150836+00	2026-03-20 19:28:06.150836+00	individual
1042	1	12	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:16.786892+00	2026-03-20 19:29:16.786892+00	individual
1047	1	17	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:19.940391+00	2026-03-20 19:29:19.940391+00	individual
1051	1	20	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:22.211998+00	2026-03-20 19:29:22.211998+00	individual
1059	1	28	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:27.317092+00	2026-03-20 19:29:27.317092+00	individual
1065	1	6	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:31.325219+00	2026-03-20 19:29:31.325219+00	individual
989	1	13	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:27.617533+00	2026-03-20 19:25:27.617533+00	individual
994	1	2	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:31.521824+00	2026-03-20 19:25:31.521824+00	individual
998	1	6	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:37.522064+00	2026-03-20 19:25:37.522064+00	individual
1002	1	1	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:37.417989+00	2026-03-20 19:26:37.417989+00	individual
1005	1	12	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:39.168036+00	2026-03-20 19:26:39.168036+00	individual
1009	1	16	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:41.50463+00	2026-03-20 19:26:41.50463+00	individual
1014	1	20	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:44.964853+00	2026-03-20 19:26:44.964853+00	individual
1019	1	30	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:55.550773+00	2026-03-20 19:26:55.550773+00	individual
1024	1	8	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:59.125839+00	2026-03-20 19:26:59.125839+00	individual
1028	1	3	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:50.41665+00	2026-03-20 19:27:50.41665+00	individual
1034	1	10	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:28:00.112805+00	2026-03-20 19:28:00.112805+00	individual
1038	1	25	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:28:08.944114+00	2026-03-20 19:28:08.944114+00	individual
1043	1	13	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:17.308168+00	2026-03-20 19:29:17.308168+00	individual
1050	1	2	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:21.604304+00	2026-03-20 19:29:21.604304+00	individual
1055	1	24	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:24.628631+00	2026-03-20 19:29:24.628631+00	individual
1062	1	30	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:29.41241+00	2026-03-20 19:29:29.41241+00	individual
1068	1	9	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:33.483657+00	2026-03-20 19:29:33.483657+00	individual
990	1	14	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:28.209236+00	2026-03-20 19:25:28.209236+00	individual
997	1	5	\N	4	39	2026-08-06	2026-08-08	confirmed	\N	2026-03-20 19:25:36.913005+00	2026-03-20 19:25:36.913005+00	individual
1012	1	19	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:43.756127+00	2026-03-20 19:26:43.756127+00	individual
1016	1	22	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:48.780068+00	2026-03-20 19:26:48.780068+00	individual
1020	1	4	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:56.190444+00	2026-03-20 19:26:56.190444+00	individual
1023	1	7	\N	4	40	2026-08-08	2026-08-11	confirmed	\N	2026-03-20 19:26:58.415424+00	2026-03-20 19:26:58.415424+00	individual
1030	1	5	\N	4	41	2026-08-12	2026-08-14	confirmed	\N	2026-03-20 19:27:52.784398+00	2026-03-20 19:27:52.784398+00	individual
1041	1	11	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:16.30782+00	2026-03-20 19:29:16.30782+00	individual
1046	1	16	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:19.260686+00	2026-03-20 19:29:19.260686+00	individual
1054	1	23	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:24.045391+00	2026-03-20 19:29:24.045391+00	individual
1058	1	27	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:26.564765+00	2026-03-20 19:29:26.564765+00	individual
1063	1	4	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:30.068539+00	2026-03-20 19:29:30.068539+00	individual
1067	1	8	\N	4	42	2026-08-14	2026-08-16	confirmed	\N	2026-03-20 19:29:32.819459+00	2026-03-20 19:29:32.819459+00	individual
1069	1	1	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:27.370006+00	2026-03-20 19:30:27.370006+00	individual
1070	1	10	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:27.814704+00	2026-03-20 19:30:27.814704+00	individual
1071	1	11	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:28.56774+00	2026-03-20 19:30:28.56774+00	individual
1072	1	12	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:29.416366+00	2026-03-20 19:30:29.416366+00	individual
1073	1	13	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:29.974946+00	2026-03-20 19:30:29.974946+00	individual
1074	1	14	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:30.744238+00	2026-03-20 19:30:30.744238+00	individual
1075	1	15	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:31.400425+00	2026-03-20 19:30:31.400425+00	individual
1076	1	16	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:32.101934+00	2026-03-20 19:30:32.101934+00	individual
1077	1	17	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:32.846834+00	2026-03-20 19:30:32.846834+00	individual
1078	1	18	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:33.471505+00	2026-03-20 19:30:33.471505+00	individual
1079	1	19	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:34.103014+00	2026-03-20 19:30:34.103014+00	individual
1080	1	2	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:35.326948+00	2026-03-20 19:30:35.326948+00	individual
1081	1	20	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:36.030942+00	2026-03-20 19:30:36.030942+00	individual
1082	1	21	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:36.766325+00	2026-03-20 19:30:36.766325+00	individual
1083	1	3	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:39.263175+00	2026-03-20 19:30:39.263175+00	individual
1084	1	4	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:40.455186+00	2026-03-20 19:30:40.455186+00	individual
1085	1	5	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:41.190566+00	2026-03-20 19:30:41.190566+00	individual
1086	1	6	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:42.223007+00	2026-03-20 19:30:42.223007+00	individual
1087	1	7	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:42.982966+00	2026-03-20 19:30:42.982966+00	individual
1088	1	8	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:43.678609+00	2026-03-20 19:30:43.678609+00	individual
1089	1	9	\N	4	43	2026-08-16	2026-08-18	confirmed	\N	2026-03-20 19:30:44.263396+00	2026-03-20 19:30:44.263396+00	individual
1090	1	1	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:48.612938+00	2026-03-20 19:31:48.612938+00	individual
1091	1	10	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:49.227575+00	2026-03-20 19:31:49.227575+00	individual
1092	1	11	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:49.75477+00	2026-03-20 19:31:49.75477+00	individual
1093	1	12	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:50.346232+00	2026-03-20 19:31:50.346232+00	individual
1094	1	13	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:50.882579+00	2026-03-20 19:31:50.882579+00	individual
1095	1	14	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:51.706679+00	2026-03-20 19:31:51.706679+00	individual
1096	1	15	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:52.370097+00	2026-03-20 19:31:52.370097+00	individual
1097	1	16	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:53.498346+00	2026-03-20 19:31:53.498346+00	individual
1098	1	17	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:54.6273+00	2026-03-20 19:31:54.6273+00	individual
1099	1	2	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:55.523926+00	2026-03-20 19:31:55.523926+00	individual
1100	1	3	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:58.539846+00	2026-03-20 19:31:58.539846+00	individual
1101	1	4	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:31:59.650874+00	2026-03-20 19:31:59.650874+00	individual
1102	1	5	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:32:00.45986+00	2026-03-20 19:32:00.45986+00	individual
1103	1	6	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:32:01.388+00	2026-03-20 19:32:01.388+00	individual
1104	1	7	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:32:02.491007+00	2026-03-20 19:32:02.491007+00	individual
1105	1	8	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:32:03.434395+00	2026-03-20 19:32:03.434395+00	individual
1106	1	9	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:32:04.177543+00	2026-03-20 19:32:04.177543+00	individual
1107	1	29	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:32:07.777821+00	2026-03-20 19:32:07.777821+00	individual
1108	1	30	\N	4	44	2026-08-18	2026-08-21	confirmed	\N	2026-03-20 19:32:08.522057+00	2026-03-20 19:32:08.522057+00	individual
1109	1	1	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:03.550757+00	2026-03-20 19:33:03.550757+00	individual
1110	1	10	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:04.300897+00	2026-03-20 19:33:04.300897+00	individual
1111	1	11	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:04.853306+00	2026-03-20 19:33:04.853306+00	individual
1112	1	12	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:05.405401+00	2026-03-20 19:33:05.405401+00	individual
1113	1	13	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:05.988468+00	2026-03-20 19:33:05.988468+00	individual
1114	1	14	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:06.708488+00	2026-03-20 19:33:06.708488+00	individual
1115	1	15	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:07.317558+00	2026-03-20 19:33:07.317558+00	individual
1116	1	16	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:07.988473+00	2026-03-20 19:33:07.988473+00	individual
1117	1	17	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:08.724936+00	2026-03-20 19:33:08.724936+00	individual
1118	1	18	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:09.397017+00	2026-03-20 19:33:09.397017+00	individual
1119	1	19	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:10.053852+00	2026-03-20 19:33:10.053852+00	individual
1120	1	2	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:10.764946+00	2026-03-20 19:33:10.764946+00	individual
1121	1	3	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:12.598715+00	2026-03-20 19:33:12.598715+00	individual
1122	1	4	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:13.624537+00	2026-03-20 19:33:13.624537+00	individual
1123	1	5	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:14.725249+00	2026-03-20 19:33:14.725249+00	individual
1124	1	6	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:15.341242+00	2026-03-20 19:33:15.341242+00	individual
1125	1	7	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:16.278366+00	2026-03-20 19:33:16.278366+00	individual
1126	1	8	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:17.077189+00	2026-03-20 19:33:17.077189+00	individual
1127	1	9	\N	4	45	2026-08-22	2026-08-23	confirmed	\N	2026-03-20 19:33:17.66205+00	2026-03-20 19:33:17.66205+00	individual
1128	1	1	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:20.859389+00	2026-03-20 19:34:20.859389+00	individual
1129	1	10	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:21.497332+00	2026-03-20 19:34:21.497332+00	individual
1130	1	11	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:22.00074+00	2026-03-20 19:34:22.00074+00	individual
1131	1	12	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:22.536386+00	2026-03-20 19:34:22.536386+00	individual
1135	1	16	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:25.489113+00	2026-03-20 19:34:25.489113+00	individual
1140	1	4	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:34.264525+00	2026-03-20 19:34:34.264525+00	individual
1144	1	8	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:37.233439+00	2026-03-20 19:34:37.233439+00	individual
1149	1	12	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:42.140643+00	2026-03-20 19:35:42.140643+00	individual
1153	1	16	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:44.748059+00	2026-03-20 19:35:44.748059+00	individual
1158	1	4	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:53.924653+00	2026-03-20 19:35:53.924653+00	individual
1163	1	9	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:57.461611+00	2026-03-20 19:35:57.461611+00	individual
1166	1	11	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:45.793909+00	2026-03-20 19:36:45.793909+00	individual
1171	1	16	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:49.233617+00	2026-03-20 19:36:49.233617+00	individual
1177	1	5	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:59.898326+00	2026-03-20 19:36:59.898326+00	individual
1181	1	9	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:37:03.607299+00	2026-03-20 19:37:03.607299+00	individual
1184	1	11	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:37:56.850663+00	2026-03-20 19:37:56.850663+00	individual
1189	1	16	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:00.090838+00	2026-03-20 19:38:00.090838+00	individual
1192	1	19	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:02.529126+00	2026-03-20 19:38:02.529126+00	individual
1197	1	3	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:08.954306+00	2026-03-20 19:38:08.954306+00	individual
1200	1	6	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:11.882025+00	2026-03-20 19:38:11.882025+00	individual
1207	1	12	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:15.378702+00	2026-03-20 19:44:15.378702+00	individual
1213	1	18	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:19.466196+00	2026-03-20 19:44:19.466196+00	individual
1217	1	3	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:23.738606+00	2026-03-20 19:44:23.738606+00	individual
1132	1	13	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:23.313845+00	2026-03-20 19:34:23.313845+00	individual
1138	1	29	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:32.345058+00	2026-03-20 19:34:32.345058+00	individual
1143	1	7	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:36.200129+00	2026-03-20 19:34:36.200129+00	individual
1146	1	1	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:32.500717+00	2026-03-20 19:35:32.500717+00	individual
1150	1	13	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:42.683893+00	2026-03-20 19:35:42.683893+00	individual
1155	1	2	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:46.796256+00	2026-03-20 19:35:46.796256+00	individual
1159	1	5	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:54.556888+00	2026-03-20 19:35:54.556888+00	individual
1169	1	14	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:47.721267+00	2026-03-20 19:36:47.721267+00	individual
1174	1	29	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:57.061634+00	2026-03-20 19:36:57.061634+00	individual
1179	1	7	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:37:02.166529+00	2026-03-20 19:37:02.166529+00	individual
1182	1	1	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:37:55.635377+00	2026-03-20 19:37:55.635377+00	individual
1188	1	15	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:37:59.291332+00	2026-03-20 19:37:59.291332+00	individual
1193	1	2	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:04.026745+00	2026-03-20 19:38:04.026745+00	individual
1199	1	5	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:11.161769+00	2026-03-20 19:38:11.161769+00	individual
1206	1	11	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:14.921554+00	2026-03-20 19:44:14.921554+00	individual
1211	1	16	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:17.946471+00	2026-03-20 19:44:17.946471+00	individual
1216	1	20	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:21.466076+00	2026-03-20 19:44:21.466076+00	individual
1219	1	5	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:25.754456+00	2026-03-20 19:44:25.754456+00	individual
1133	1	14	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:23.94508+00	2026-03-20 19:34:23.94508+00	individual
1137	1	2	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:27.625612+00	2026-03-20 19:34:27.625612+00	individual
1141	1	5	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:34.923639+00	2026-03-20 19:34:34.923639+00	individual
1148	1	11	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:41.588988+00	2026-03-20 19:35:41.588988+00	individual
1151	1	14	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:43.285325+00	2026-03-20 19:35:43.285325+00	individual
1157	1	3	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:52.660848+00	2026-03-20 19:35:52.660848+00	individual
1162	1	8	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:56.726221+00	2026-03-20 19:35:56.726221+00	individual
1165	1	10	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:45.200699+00	2026-03-20 19:36:45.200699+00	individual
1168	1	13	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:46.890097+00	2026-03-20 19:36:46.890097+00	individual
1175	1	3	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:58.266257+00	2026-03-20 19:36:58.266257+00	individual
1187	1	14	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:37:58.570495+00	2026-03-20 19:37:58.570495+00	individual
1191	1	18	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:01.832566+00	2026-03-20 19:38:01.832566+00	individual
1195	1	21	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:05.994202+00	2026-03-20 19:38:05.994202+00	individual
1202	1	8	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:13.793848+00	2026-03-20 19:38:13.793848+00	individual
1208	1	13	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:15.930436+00	2026-03-20 19:44:15.930436+00	individual
1212	1	17	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:18.658709+00	2026-03-20 19:44:18.658709+00	individual
1220	1	6	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:26.514976+00	2026-03-20 19:44:26.514976+00	individual
1223	1	9	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:29.067786+00	2026-03-20 19:44:29.067786+00	individual
1134	1	15	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:24.641298+00	2026-03-20 19:34:24.641298+00	individual
1139	1	3	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:33.144587+00	2026-03-20 19:34:33.144587+00	individual
1145	1	9	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:37.928888+00	2026-03-20 19:34:37.928888+00	individual
1147	1	10	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:40.97258+00	2026-03-20 19:35:40.97258+00	individual
1154	1	17	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:45.635972+00	2026-03-20 19:35:45.635972+00	individual
1160	1	6	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:55.116704+00	2026-03-20 19:35:55.116704+00	individual
1167	1	12	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:46.362445+00	2026-03-20 19:36:46.362445+00	individual
1172	1	17	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:50.113475+00	2026-03-20 19:36:50.113475+00	individual
1176	1	4	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:59.178497+00	2026-03-20 19:36:59.178497+00	individual
1180	1	8	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:37:02.982278+00	2026-03-20 19:37:02.982278+00	individual
1183	1	10	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:37:56.338048+00	2026-03-20 19:37:56.338048+00	individual
1186	1	13	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:37:57.948136+00	2026-03-20 19:37:57.948136+00	individual
1190	1	17	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:01.066388+00	2026-03-20 19:38:01.066388+00	individual
1196	1	22	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:06.746397+00	2026-03-20 19:38:06.746397+00	individual
1201	1	7	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:12.826521+00	2026-03-20 19:38:12.826521+00	individual
1204	1	1	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:13.747283+00	2026-03-20 19:44:13.747283+00	individual
1209	1	14	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:16.449923+00	2026-03-20 19:44:16.449923+00	individual
1214	1	19	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:20.067253+00	2026-03-20 19:44:20.067253+00	individual
1222	1	8	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:28.346328+00	2026-03-20 19:44:28.346328+00	individual
1136	1	17	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:26.43367+00	2026-03-20 19:34:26.43367+00	individual
1142	1	6	\N	4	46	2026-08-24	2026-08-26	confirmed	\N	2026-03-20 19:34:35.56812+00	2026-03-20 19:34:35.56812+00	individual
1152	1	15	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:43.980897+00	2026-03-20 19:35:43.980897+00	individual
1156	1	29	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:52.006169+00	2026-03-20 19:35:52.006169+00	individual
1161	1	7	\N	4	47	2026-08-26	2026-08-28	confirmed	\N	2026-03-20 19:35:55.829573+00	2026-03-20 19:35:55.829573+00	individual
1164	1	1	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:44.666247+00	2026-03-20 19:36:44.666247+00	individual
1170	1	15	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:48.353182+00	2026-03-20 19:36:48.353182+00	individual
1173	1	2	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:36:51.025453+00	2026-03-20 19:36:51.025453+00	individual
1178	1	6	\N	4	48	2026-08-28	2026-08-30	confirmed	\N	2026-03-20 19:37:00.698558+00	2026-03-20 19:37:00.698558+00	individual
1185	1	12	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:37:57.401455+00	2026-03-20 19:37:57.401455+00	individual
1194	1	20	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:04.786103+00	2026-03-20 19:38:04.786103+00	individual
1198	1	4	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:10.322101+00	2026-03-20 19:38:10.322101+00	individual
1203	1	9	\N	4	49	2026-08-30	2026-09-01	confirmed	\N	2026-03-20 19:38:14.362809+00	2026-03-20 19:38:14.362809+00	individual
1205	1	10	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:14.353325+00	2026-03-20 19:44:14.353325+00	individual
1210	1	15	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:17.11536+00	2026-03-20 19:44:17.11536+00	individual
1215	1	2	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:20.81786+00	2026-03-20 19:44:20.81786+00	individual
1218	1	4	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:25.04331+00	2026-03-20 19:44:25.04331+00	individual
1221	1	7	\N	4	50	2026-09-04	2026-09-08	confirmed	\N	2026-03-20 19:44:27.564438+00	2026-03-20 19:44:27.564438+00	individual
1224	1	1	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:21.303304+00	2026-03-20 19:45:21.303304+00	individual
1225	1	10	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:21.908164+00	2026-03-20 19:45:21.908164+00	individual
1226	1	11	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:22.341925+00	2026-03-20 19:45:22.341925+00	individual
1227	1	12	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:22.892911+00	2026-03-20 19:45:22.892911+00	individual
1228	1	13	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:23.357787+00	2026-03-20 19:45:23.357787+00	individual
1229	1	14	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:23.903767+00	2026-03-20 19:45:23.903767+00	individual
1230	1	15	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:24.57332+00	2026-03-20 19:45:24.57332+00	individual
1231	1	16	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:25.301364+00	2026-03-20 19:45:25.301364+00	individual
1232	1	17	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:26.022113+00	2026-03-20 19:45:26.022113+00	individual
1233	1	18	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:26.60533+00	2026-03-20 19:45:26.60533+00	individual
1234	1	19	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:27.205218+00	2026-03-20 19:45:27.205218+00	individual
1235	1	2	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:27.645928+00	2026-03-20 19:45:27.645928+00	individual
1236	1	20	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:28.117299+00	2026-03-20 19:45:28.117299+00	individual
1237	1	21	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:28.773427+00	2026-03-20 19:45:28.773427+00	individual
1238	1	22	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:29.302203+00	2026-03-20 19:45:29.302203+00	individual
1239	1	23	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:29.806737+00	2026-03-20 19:45:29.806737+00	individual
1240	1	24	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:30.309133+00	2026-03-20 19:45:30.309133+00	individual
1241	1	25	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:30.797277+00	2026-03-20 19:45:30.797277+00	individual
1242	1	26	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:31.293928+00	2026-03-20 19:45:31.293928+00	individual
1243	1	27	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:31.839812+00	2026-03-20 19:45:31.839812+00	individual
1244	1	28	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:32.28467+00	2026-03-20 19:45:32.28467+00	individual
1245	1	29	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:32.908726+00	2026-03-20 19:45:32.908726+00	individual
1246	1	3	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:33.580506+00	2026-03-20 19:45:33.580506+00	individual
1247	1	30	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:34.084355+00	2026-03-20 19:45:34.084355+00	individual
1248	1	4	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:34.707833+00	2026-03-20 19:45:34.707833+00	individual
1249	1	5	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:35.24448+00	2026-03-20 19:45:35.24448+00	individual
1250	1	6	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:35.716778+00	2026-03-20 19:45:35.716778+00	individual
1251	1	7	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:36.204724+00	2026-03-20 19:45:36.204724+00	individual
1252	1	8	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:36.748399+00	2026-03-20 19:45:36.748399+00	individual
1253	1	9	\N	4	51	2026-09-08	2026-09-11	confirmed	\N	2026-03-20 19:45:37.253793+00	2026-03-20 19:45:37.253793+00	individual
1254	1	1	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:30.890078+00	2026-03-20 19:46:30.890078+00	individual
1255	1	10	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:31.512542+00	2026-03-20 19:46:31.512542+00	individual
1256	1	11	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:31.98644+00	2026-03-20 19:46:31.98644+00	individual
1257	1	12	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:32.737977+00	2026-03-20 19:46:32.737977+00	individual
1258	1	13	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:33.243348+00	2026-03-20 19:46:33.243348+00	individual
1259	1	14	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:34.171622+00	2026-03-20 19:46:34.171622+00	individual
1260	1	15	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:34.914113+00	2026-03-20 19:46:34.914113+00	individual
1261	1	16	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:35.698191+00	2026-03-20 19:46:35.698191+00	individual
1262	1	17	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:36.418526+00	2026-03-20 19:46:36.418526+00	individual
1263	1	18	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:37.299157+00	2026-03-20 19:46:37.299157+00	individual
1264	1	19	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:37.834887+00	2026-03-20 19:46:37.834887+00	individual
1265	1	2	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:38.33232+00	2026-03-20 19:46:38.33232+00	individual
1266	1	20	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:38.866974+00	2026-03-20 19:46:38.866974+00	individual
1267	1	21	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:39.380652+00	2026-03-20 19:46:39.380652+00	individual
1268	1	22	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:39.844073+00	2026-03-20 19:46:39.844073+00	individual
1269	1	23	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:40.363762+00	2026-03-20 19:46:40.363762+00	individual
1270	1	24	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:40.883327+00	2026-03-20 19:46:40.883327+00	individual
1271	1	25	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:41.354775+00	2026-03-20 19:46:41.354775+00	individual
1272	1	26	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:41.827972+00	2026-03-20 19:46:41.827972+00	individual
1273	1	27	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:42.291777+00	2026-03-20 19:46:42.291777+00	individual
1274	1	28	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:42.763369+00	2026-03-20 19:46:42.763369+00	individual
1275	1	29	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:43.243645+00	2026-03-20 19:46:43.243645+00	individual
1276	1	3	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:43.772237+00	2026-03-20 19:46:43.772237+00	individual
1277	1	30	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:44.276681+00	2026-03-20 19:46:44.276681+00	individual
1278	1	4	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:44.813195+00	2026-03-20 19:46:44.813195+00	individual
1279	1	5	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:45.315244+00	2026-03-20 19:46:45.315244+00	individual
1280	1	6	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:45.90828+00	2026-03-20 19:46:45.90828+00	individual
1281	1	7	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:46.396745+00	2026-03-20 19:46:46.396745+00	individual
1284	1	1	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:17.990656+00	2026-03-20 19:48:17.990656+00	individual
1290	1	15	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:21.870963+00	2026-03-20 19:48:21.870963+00	individual
1296	1	6	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:33.729531+00	2026-03-20 19:48:33.729531+00	individual
1299	1	9	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:36.346451+00	2026-03-20 19:48:36.346451+00	individual
1301	1	2	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:25.985596+00	2026-03-20 19:49:25.985596+00	individual
1306	1	8	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:38.399802+00	2026-03-20 19:49:38.399802+00	individual
1316	1	16	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:04.864459+00	2026-03-20 19:51:04.864459+00	individual
1320	1	23	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:12.289772+00	2026-03-20 19:51:12.289772+00	individual
1323	1	28	\N	4	55	2026-09-23	2026-09-26	cancelled	\N	2026-03-20 19:51:21.756026+00	2026-03-20 19:51:25.04122+00	individual
1325	1	6	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:34.556963+00	2026-03-20 19:51:34.556963+00	individual
1328	1	11	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:21.6729+00	2026-03-20 19:52:21.6729+00	individual
1331	1	14	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:23.346596+00	2026-03-20 19:52:23.346596+00	individual
1338	1	20	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:28.428539+00	2026-03-20 19:52:28.428539+00	individual
1350	1	4	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:35.460194+00	2026-03-20 19:52:35.460194+00	individual
1360	1	5	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:53:55.612979+00	2026-03-20 19:53:55.612979+00	individual
1364	1	10	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:08.833631+00	2026-03-20 19:54:08.833631+00	individual
1369	1	15	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:12.466549+00	2026-03-20 19:54:12.466549+00	individual
1374	1	21	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:30.75785+00	2026-03-20 19:54:30.75785+00	individual
1380	1	11	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:13.024799+00	2026-03-20 19:59:13.024799+00	individual
1384	1	15	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:15.280099+00	2026-03-20 19:59:15.280099+00	individual
1388	1	19	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:18.224309+00	2026-03-20 19:59:18.224309+00	individual
1394	1	4	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:24.699259+00	2026-03-20 19:59:24.699259+00	individual
1398	1	8	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:28.082844+00	2026-03-20 19:59:28.082844+00	individual
1282	1	8	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:46.899751+00	2026-03-20 19:46:46.899751+00	individual
1286	1	11	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:19.277269+00	2026-03-20 19:48:19.277269+00	individual
1291	1	16	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:22.958719+00	2026-03-20 19:48:22.958719+00	individual
1294	1	4	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:32.393816+00	2026-03-20 19:48:32.393816+00	individual
1297	1	7	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:34.42585+00	2026-03-20 19:48:34.42585+00	individual
1300	1	1	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:23.531336+00	2026-03-20 19:49:23.531336+00	individual
1305	1	7	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:37.432194+00	2026-03-20 19:49:37.432194+00	individual
1309	1	18	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:48.297267+00	2026-03-20 19:49:48.297267+00	individual
1317	1	17	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:05.632185+00	2026-03-20 19:51:05.632185+00	individual
1326	1	1	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:20.235108+00	2026-03-20 19:52:20.235108+00	individual
1333	1	16	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:24.634526+00	2026-03-20 19:52:24.634526+00	individual
1337	1	2	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:27.0103+00	2026-03-20 19:52:27.0103+00	individual
1342	1	24	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:30.944738+00	2026-03-20 19:52:30.944738+00	individual
1347	1	29	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:33.764477+00	2026-03-20 19:52:33.764477+00	individual
1352	1	6	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:36.660503+00	2026-03-20 19:52:36.660503+00	individual
1358	1	3	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:53:53.277309+00	2026-03-20 19:53:53.277309+00	individual
1363	1	9	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:03.928493+00	2026-03-20 19:54:03.928493+00	individual
1367	1	13	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:11.01816+00	2026-03-20 19:54:11.01816+00	individual
1370	1	16	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:13.514598+00	2026-03-20 19:54:13.514598+00	individual
1375	1	22	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:32.77268+00	2026-03-20 19:54:32.77268+00	individual
1382	1	13	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:14.049118+00	2026-03-20 19:59:14.049118+00	individual
1387	1	18	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:17.53697+00	2026-03-20 19:59:17.53697+00	individual
1391	1	21	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:20.38423+00	2026-03-20 19:59:20.38423+00	individual
1283	1	9	\N	4	52	2026-09-12	2026-09-13	confirmed	\N	2026-03-20 19:46:47.403949+00	2026-03-20 19:46:47.403949+00	individual
1287	1	12	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:19.876569+00	2026-03-20 19:48:19.876569+00	individual
1295	1	5	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:33.106009+00	2026-03-20 19:48:33.106009+00	individual
1302	1	3	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:28.314021+00	2026-03-20 19:49:28.314021+00	individual
1310	1	20	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:51.504751+00	2026-03-20 19:49:51.504751+00	individual
1313	1	13	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:00.710825+00	2026-03-20 19:51:00.710825+00	individual
1319	1	22	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:10.897061+00	2026-03-20 19:51:10.897061+00	individual
1324	1	27	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:29.075335+00	2026-03-20 19:51:29.075335+00	individual
1327	1	10	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:21.05707+00	2026-03-20 19:52:21.05707+00	individual
1332	1	15	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:23.978658+00	2026-03-20 19:52:23.978658+00	individual
1336	1	19	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:26.49995+00	2026-03-20 19:52:26.49995+00	individual
1341	1	23	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:30.239283+00	2026-03-20 19:52:30.239283+00	individual
1344	1	26	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:32.059821+00	2026-03-20 19:52:32.059821+00	individual
1349	1	30	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:34.844367+00	2026-03-20 19:52:34.844367+00	individual
1354	1	8	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:37.781162+00	2026-03-20 19:52:37.781162+00	individual
1359	1	4	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:53:54.581514+00	2026-03-20 19:53:54.581514+00	individual
1371	1	17	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:21.684917+00	2026-03-20 19:54:21.684917+00	individual
1378	1	1	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:11.921367+00	2026-03-20 19:59:11.921367+00	individual
1385	1	16	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:16.007783+00	2026-03-20 19:59:16.007783+00	individual
1392	1	22	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:21.13639+00	2026-03-20 19:59:21.13639+00	individual
1396	1	6	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:26.001091+00	2026-03-20 19:59:26.001091+00	individual
1285	1	10	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:18.740075+00	2026-03-20 19:48:18.740075+00	individual
1289	1	14	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:21.17245+00	2026-03-20 19:48:21.17245+00	individual
1292	1	2	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:27.973362+00	2026-03-20 19:48:27.973362+00	individual
1303	1	4	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:29.194355+00	2026-03-20 19:49:29.194355+00	individual
1308	1	10	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:41.191196+00	2026-03-20 19:49:41.191196+00	individual
1312	1	26	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:50:03.048253+00	2026-03-20 19:50:03.048253+00	individual
1315	1	15	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:02.080292+00	2026-03-20 19:51:02.080292+00	individual
1318	1	19	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:07.456523+00	2026-03-20 19:51:07.456523+00	individual
1322	1	25	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:14.128768+00	2026-03-20 19:51:14.128768+00	individual
1329	1	12	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:22.200591+00	2026-03-20 19:52:22.200591+00	individual
1335	1	18	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:25.946583+00	2026-03-20 19:52:25.946583+00	individual
1340	1	22	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:29.622423+00	2026-03-20 19:52:29.622423+00	individual
1345	1	27	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:32.571013+00	2026-03-20 19:52:32.571013+00	individual
1348	1	3	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:34.275926+00	2026-03-20 19:52:34.275926+00	individual
1353	1	7	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:37.26057+00	2026-03-20 19:52:37.26057+00	individual
1356	1	1	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:53:47.30091+00	2026-03-20 19:53:47.30091+00	individual
1362	1	8	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:03.03305+00	2026-03-20 19:54:03.03305+00	individual
1365	1	11	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:09.657905+00	2026-03-20 19:54:09.657905+00	individual
1368	1	14	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:11.778152+00	2026-03-20 19:54:11.778152+00	individual
1373	1	20	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:29.944048+00	2026-03-20 19:54:29.944048+00	individual
1377	1	30	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:36.46116+00	2026-03-20 19:54:36.46116+00	individual
1379	1	10	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:12.488312+00	2026-03-20 19:59:12.488312+00	individual
1383	1	14	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:14.544484+00	2026-03-20 19:59:14.544484+00	individual
1389	1	2	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:18.832545+00	2026-03-20 19:59:18.832545+00	individual
1393	1	3	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:23.257859+00	2026-03-20 19:59:23.257859+00	individual
1397	1	7	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:27.113531+00	2026-03-20 19:59:27.113531+00	individual
1288	1	13	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:20.404882+00	2026-03-20 19:48:20.404882+00	individual
1293	1	3	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:31.558049+00	2026-03-20 19:48:31.558049+00	individual
1298	1	8	\N	4	53	2026-09-14	2026-09-18	confirmed	\N	2026-03-20 19:48:35.187124+00	2026-03-20 19:48:35.187124+00	individual
1304	1	5	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:30.210106+00	2026-03-20 19:49:30.210106+00	individual
1307	1	9	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:39.110681+00	2026-03-20 19:49:39.110681+00	individual
1311	1	21	\N	4	54	2026-09-23	2026-09-25	confirmed	\N	2026-03-20 19:49:54.080674+00	2026-03-20 19:49:54.080674+00	individual
1314	1	14	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:01.44365+00	2026-03-20 19:51:01.44365+00	individual
1321	1	24	\N	4	55	2026-09-23	2026-09-26	confirmed	\N	2026-03-20 19:51:13.297284+00	2026-03-20 19:51:13.297284+00	individual
1330	1	13	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:22.762344+00	2026-03-20 19:52:22.762344+00	individual
1334	1	17	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:25.321979+00	2026-03-20 19:52:25.321979+00	individual
1339	1	21	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:29.01348+00	2026-03-20 19:52:29.01348+00	individual
1343	1	25	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:31.480641+00	2026-03-20 19:52:31.480641+00	individual
1346	1	28	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:33.133233+00	2026-03-20 19:52:33.133233+00	individual
1351	1	5	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:36.044576+00	2026-03-20 19:52:36.044576+00	individual
1355	1	9	\N	4	56	2026-09-28	2026-09-29	confirmed	\N	2026-03-20 19:52:38.3404+00	2026-03-20 19:52:38.3404+00	individual
1357	1	2	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:53:50.548004+00	2026-03-20 19:53:50.548004+00	individual
1361	1	7	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:01.921327+00	2026-03-20 19:54:01.921327+00	individual
1366	1	12	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:10.338222+00	2026-03-20 19:54:10.338222+00	individual
1372	1	18	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:22.404866+00	2026-03-20 19:54:22.404866+00	individual
1376	1	29	\N	4	57	2026-09-29	2026-10-03	confirmed	\N	2026-03-20 19:54:35.229133+00	2026-03-20 19:54:35.229133+00	individual
1381	1	12	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:13.512177+00	2026-03-20 19:59:13.512177+00	individual
1386	1	17	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:16.800154+00	2026-03-20 19:59:16.800154+00	individual
1390	1	20	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:19.576763+00	2026-03-20 19:59:19.576763+00	individual
1395	1	5	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:25.336366+00	2026-03-20 19:59:25.336366+00	individual
1399	1	9	\N	4	58	2026-10-03	2026-10-07	confirmed	\N	2026-03-20 19:59:28.697429+00	2026-03-20 19:59:28.697429+00	individual
1400	1	1	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:24.109338+00	2026-03-20 20:00:24.109338+00	individual
1401	1	10	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:24.646067+00	2026-03-20 20:00:24.646067+00	individual
1402	1	11	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:25.19657+00	2026-03-20 20:00:25.19657+00	individual
1403	1	12	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:25.684086+00	2026-03-20 20:00:25.684086+00	individual
1404	1	13	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:26.204551+00	2026-03-20 20:00:26.204551+00	individual
1405	1	14	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:26.773691+00	2026-03-20 20:00:26.773691+00	individual
1406	1	15	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:27.411743+00	2026-03-20 20:00:27.411743+00	individual
1407	1	16	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:28.219783+00	2026-03-20 20:00:28.219783+00	individual
1408	1	17	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:29.204695+00	2026-03-20 20:00:29.204695+00	individual
1409	1	18	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:29.860599+00	2026-03-20 20:00:29.860599+00	individual
1410	1	19	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:30.452748+00	2026-03-20 20:00:30.452748+00	individual
1411	1	2	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:31.08404+00	2026-03-20 20:00:31.08404+00	individual
1412	1	20	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:31.668248+00	2026-03-20 20:00:31.668248+00	individual
1413	1	21	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:32.266622+00	2026-03-20 20:00:32.266622+00	individual
1414	1	22	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:33.340473+00	2026-03-20 20:00:33.340473+00	individual
1415	1	3	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:35.787697+00	2026-03-20 20:00:35.787697+00	individual
1416	1	4	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:36.683808+00	2026-03-20 20:00:36.683808+00	individual
1417	1	5	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:37.643106+00	2026-03-20 20:00:37.643106+00	individual
1418	1	6	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:38.339368+00	2026-03-20 20:00:38.339368+00	individual
1419	1	7	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:39.139219+00	2026-03-20 20:00:39.139219+00	individual
1420	1	8	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:40.092713+00	2026-03-20 20:00:40.092713+00	individual
1421	1	9	\N	4	59	2026-10-08	2026-10-10	confirmed	\N	2026-03-20 20:00:40.892517+00	2026-03-20 20:00:40.892517+00	individual
1422	1	1	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:01:57.161591+00	2026-03-20 20:01:57.161591+00	individual
1423	1	10	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:01:57.808099+00	2026-03-20 20:01:57.808099+00	individual
1424	1	11	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:01:58.295885+00	2026-03-20 20:01:58.295885+00	individual
1425	1	12	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:01:58.953078+00	2026-03-20 20:01:58.953078+00	individual
1426	1	13	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:01:59.463857+00	2026-03-20 20:01:59.463857+00	individual
1427	1	14	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:00.05515+00	2026-03-20 20:02:00.05515+00	individual
1428	1	15	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:00.624047+00	2026-03-20 20:02:00.624047+00	individual
1429	1	16	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:01.352892+00	2026-03-20 20:02:01.352892+00	individual
1430	1	17	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:02.127029+00	2026-03-20 20:02:02.127029+00	individual
1431	1	18	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:02.744051+00	2026-03-20 20:02:02.744051+00	individual
1432	1	19	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:03.327074+00	2026-03-20 20:02:03.327074+00	individual
1433	1	2	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:03.935002+00	2026-03-20 20:02:03.935002+00	individual
1434	1	20	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:04.559944+00	2026-03-20 20:02:04.559944+00	individual
1435	1	21	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:05.127248+00	2026-03-20 20:02:05.127248+00	individual
1436	1	22	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:05.831402+00	2026-03-20 20:02:05.831402+00	individual
1437	1	25	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:10.601802+00	2026-03-20 20:02:10.601802+00	individual
1438	1	26	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:11.312286+00	2026-03-20 20:02:11.312286+00	individual
1439	1	3	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:16.985322+00	2026-03-20 20:02:16.985322+00	individual
1440	1	30	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:17.834412+00	2026-03-20 20:02:17.834412+00	individual
1441	1	4	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:18.67294+00	2026-03-20 20:02:18.67294+00	individual
1442	1	5	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:19.336404+00	2026-03-20 20:02:19.336404+00	individual
1443	1	6	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:19.96089+00	2026-03-20 20:02:19.96089+00	individual
1444	1	7	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:20.520566+00	2026-03-20 20:02:20.520566+00	individual
1445	1	8	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:21.39316+00	2026-03-20 20:02:21.39316+00	individual
1446	1	9	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:22.168775+00	2026-03-20 20:02:22.168775+00	individual
1447	1	29	\N	4	60	2026-10-14	2026-10-18	confirmed	\N	2026-03-20 20:02:44.611057+00	2026-03-20 20:02:44.611057+00	individual
1448	1	1	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:34.893668+00	2026-03-20 20:03:34.893668+00	individual
1449	1	2	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:37.715084+00	2026-03-20 20:03:37.715084+00	individual
1450	1	3	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:39.899612+00	2026-03-20 20:03:39.899612+00	individual
1455	1	9	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:47.020762+00	2026-03-20 20:03:47.020762+00	individual
1467	1	22	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:14.991642+00	2026-03-20 20:07:54.743036+00	individual
1479	1	15	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:19.618964+00	2026-03-20 20:08:17.268561+00	individual
1483	1	3	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:25.259267+00	2026-03-20 20:08:17.268561+00	individual
1487	1	6	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:28.251271+00	2026-03-20 20:08:17.268561+00	individual
1493	1	11	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:15.746794+00	2026-03-20 20:09:15.746794+00	individual
1497	1	15	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:18.554616+00	2026-03-20 20:09:18.554616+00	individual
1503	1	20	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:22.450188+00	2026-03-20 20:09:22.450188+00	individual
1508	1	25	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:25.107068+00	2026-03-20 20:09:25.107068+00	individual
1516	1	5	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:29.54783+00	2026-03-20 20:09:29.54783+00	individual
1451	1	4	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:41.027497+00	2026-03-20 20:03:41.027497+00	individual
1456	1	10	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:49.132523+00	2026-03-20 20:03:49.132523+00	individual
1460	1	22	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:59.485501+00	2026-03-20 20:03:59.485501+00	individual
1463	1	18	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:12.088103+00	2026-03-20 20:07:54.743036+00	individual
1469	1	24	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:16.616726+00	2026-03-20 20:07:54.743036+00	individual
1475	1	11	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:17.555847+00	2026-03-20 20:08:17.268561+00	individual
1481	1	17	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:21.219461+00	2026-03-20 20:08:17.268561+00	individual
1485	1	4	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:26.940223+00	2026-03-20 20:08:17.268561+00	individual
1489	1	8	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:30.019491+00	2026-03-20 20:08:17.268561+00	individual
1495	1	13	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:16.95472+00	2026-03-20 20:09:16.95472+00	individual
1500	1	18	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:20.753937+00	2026-03-20 20:09:20.753937+00	individual
1506	1	23	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:24.002618+00	2026-03-20 20:09:24.002618+00	individual
1511	1	28	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:26.69997+00	2026-03-20 20:09:26.69997+00	individual
1515	1	4	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:28.995778+00	2026-03-20 20:09:28.995778+00	individual
1518	1	7	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:30.619568+00	2026-03-20 20:09:30.619568+00	individual
1452	1	5	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:41.939745+00	2026-03-20 20:03:41.939745+00	individual
1457	1	18	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:55.044021+00	2026-03-20 20:03:55.044021+00	individual
1464	1	19	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:12.904184+00	2026-03-20 20:07:54.743036+00	individual
1468	1	23	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:15.888718+00	2026-03-20 20:07:54.743036+00	individual
1472	1	27	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:19.017595+00	2026-03-20 20:07:54.743036+00	individual
1476	1	12	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:18.13889+00	2026-03-20 20:08:17.268561+00	individual
1480	1	16	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:20.460325+00	2026-03-20 20:08:17.268561+00	individual
1486	1	5	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:27.508887+00	2026-03-20 20:08:17.268561+00	individual
1490	1	9	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:30.644869+00	2026-03-20 20:08:17.268561+00	individual
1492	1	10	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:15.266568+00	2026-03-20 20:09:15.266568+00	individual
1496	1	14	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:17.721749+00	2026-03-20 20:09:17.721749+00	individual
1501	1	19	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:21.363964+00	2026-03-20 20:09:21.363964+00	individual
1505	1	22	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:23.474526+00	2026-03-20 20:09:23.474526+00	individual
1513	1	3	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:27.850869+00	2026-03-20 20:09:27.850869+00	individual
1517	1	6	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:30.107872+00	2026-03-20 20:09:30.107872+00	individual
1453	1	7	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:45.325865+00	2026-03-20 20:03:45.325865+00	individual
1459	1	21	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:58.517751+00	2026-03-20 20:03:58.517751+00	individual
1462	1	2	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:01.400886+00	2026-03-20 20:07:54.743036+00	individual
1465	1	20	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:13.63203+00	2026-03-20 20:07:54.743036+00	individual
1470	1	25	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:17.496852+00	2026-03-20 20:07:54.743036+00	individual
1473	1	28	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:19.856329+00	2026-03-20 20:07:54.743036+00	individual
1477	1	13	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:18.675257+00	2026-03-20 20:08:17.268561+00	individual
1482	1	29	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:24.012643+00	2026-03-20 20:08:17.268561+00	individual
1488	1	7	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:29.291931+00	2026-03-20 20:08:17.268561+00	individual
1491	1	1	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:14.651501+00	2026-03-20 20:09:14.651501+00	individual
1494	1	12	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:16.409648+00	2026-03-20 20:09:16.409648+00	individual
1499	1	17	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:20.042208+00	2026-03-20 20:09:20.042208+00	individual
1502	1	2	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:21.890833+00	2026-03-20 20:09:21.890833+00	individual
1507	1	24	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:24.602685+00	2026-03-20 20:09:24.602685+00	individual
1510	1	27	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:26.17088+00	2026-03-20 20:09:26.17088+00	individual
1514	1	30	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:28.387509+00	2026-03-20 20:09:28.387509+00	individual
1519	1	8	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:31.163318+00	2026-03-20 20:09:31.163318+00	individual
1454	1	8	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:46.196938+00	2026-03-20 20:03:46.196938+00	individual
1458	1	20	\N	4	61	2026-10-18	2026-10-20	confirmed	\N	2026-03-20 20:03:56.438341+00	2026-03-20 20:03:56.438341+00	individual
1461	1	1	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:04:57.897772+00	2026-03-20 20:07:54.743036+00	individual
1466	1	21	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:14.239903+00	2026-03-20 20:07:54.743036+00	individual
1471	1	26	\N	4	62	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:05:18.208544+00	2026-03-20 20:07:54.743036+00	individual
1474	1	10	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:16.756441+00	2026-03-20 20:08:17.268561+00	individual
1478	1	14	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:19.163913+00	2026-03-20 20:08:17.268561+00	individual
1484	1	30	\N	4	63	2026-10-20	2026-10-23	confirmed	\N	2026-03-20 20:06:26.180547+00	2026-03-20 20:08:17.268561+00	individual
1498	1	16	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:19.466701+00	2026-03-20 20:09:19.466701+00	individual
1504	1	21	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:22.979408+00	2026-03-20 20:09:22.979408+00	individual
1509	1	26	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:25.666427+00	2026-03-20 20:09:25.666427+00	individual
1512	1	29	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:27.235159+00	2026-03-20 20:09:27.235159+00	individual
1520	1	9	\N	4	64	2026-10-26	2026-10-29	confirmed	\N	2026-03-20 20:09:31.682958+00	2026-03-20 20:09:31.682958+00	individual
1521	1	1	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:34.723898+00	2026-03-20 20:12:34.723898+00	individual
1522	1	2	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:36.723215+00	2026-03-20 20:12:36.723215+00	individual
1523	1	3	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:38.931884+00	2026-03-20 20:12:38.931884+00	individual
1524	1	4	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:40.197129+00	2026-03-20 20:12:40.197129+00	individual
1525	1	5	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:40.986192+00	2026-03-20 20:12:40.986192+00	individual
1526	1	7	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:43.202535+00	2026-03-20 20:12:43.202535+00	individual
1527	1	8	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:44.139538+00	2026-03-20 20:12:44.139538+00	individual
1528	1	9	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:45.075337+00	2026-03-20 20:12:45.075337+00	individual
1529	1	10	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:48.035358+00	2026-03-20 20:12:48.035358+00	individual
1530	1	11	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:48.796631+00	2026-03-20 20:12:48.796631+00	individual
1531	1	12	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:49.597127+00	2026-03-20 20:12:49.597127+00	individual
1532	1	13	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:50.308343+00	2026-03-20 20:12:50.308343+00	individual
1533	1	14	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:50.947584+00	2026-03-20 20:12:50.947584+00	individual
1534	1	15	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:52.003979+00	2026-03-20 20:12:52.003979+00	individual
1535	1	16	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:52.627473+00	2026-03-20 20:12:52.627473+00	individual
1536	1	17	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:53.651985+00	2026-03-20 20:12:53.651985+00	individual
1537	1	18	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:56.756678+00	2026-03-20 20:12:56.756678+00	individual
1538	1	20	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:12:59.516334+00	2026-03-20 20:12:59.516334+00	individual
1539	1	21	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:13:00.364483+00	2026-03-20 20:13:00.364483+00	individual
1540	1	22	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:13:01.013936+00	2026-03-20 20:13:01.013936+00	individual
1541	1	24	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:13:04.268207+00	2026-03-20 20:13:04.268207+00	individual
1542	1	29	\N	4	65	2026-11-03	2026-11-07	confirmed	\N	2026-03-20 20:13:07.588429+00	2026-03-20 20:13:07.588429+00	individual
1543	1	1	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:13:50.536878+00	2026-03-20 20:13:50.536878+00	individual
1544	1	3	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:13:52.704008+00	2026-03-20 20:13:52.704008+00	individual
1545	1	7	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:00.240098+00	2026-03-20 20:14:00.240098+00	individual
1546	1	9	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:03.845873+00	2026-03-20 20:14:03.845873+00	individual
1547	1	10	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:09.143368+00	2026-03-20 20:14:09.143368+00	individual
1548	1	11	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:09.974205+00	2026-03-20 20:14:09.974205+00	individual
1549	1	15	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:12.991323+00	2026-03-20 20:14:12.991323+00	individual
1550	1	16	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:13.95166+00	2026-03-20 20:14:13.95166+00	individual
1551	1	20	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:21.870493+00	2026-03-20 20:14:21.870493+00	individual
1552	1	21	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:23.103542+00	2026-03-20 20:14:23.103542+00	individual
1553	1	22	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:24.183957+00	2026-03-20 20:14:24.183957+00	individual
1554	1	24	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:30.185312+00	2026-03-20 20:14:30.185312+00	individual
1555	1	27	\N	4	66	2026-11-19	2026-11-21	confirmed	\N	2026-03-20 20:14:32.935023+00	2026-03-20 20:14:32.935023+00	individual
1556	1	18	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:15:35.652067+00	2026-03-20 20:15:35.652067+00	individual
1557	1	19	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:15:36.554159+00	2026-03-20 20:15:36.554159+00	individual
1558	1	25	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:15:45.059665+00	2026-03-20 20:15:45.059665+00	individual
1559	1	26	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:15:45.786438+00	2026-03-20 20:15:45.786438+00	individual
1560	1	2	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:15:57.499987+00	2026-03-20 20:15:57.499987+00	individual
1561	1	4	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:16:04.956501+00	2026-03-20 20:16:04.956501+00	individual
1562	1	5	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:16:05.908404+00	2026-03-20 20:16:05.908404+00	individual
1563	1	8	\N	4	67	2026-11-19	2026-11-23	confirmed	\N	2026-03-20 20:16:08.580186+00	2026-03-20 20:16:08.580186+00	individual
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.rooms (id, hotel_id, number, type, capacity, floor, description, active, created_at, subtipo) FROM stdin;
2	1	2	triple	3	0	\N	t	2026-03-14 00:24:01.711489+00	twin
3	1	3	double	2	0	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
4	1	4	triple	3	0	\N	t	2026-03-14 00:24:01.711489+00	twin
5	1	5	double	2	0	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
6	1	6	quintuple	5	0	\N	t	2026-03-14 00:24:01.711489+00	twin
7	1	7	double	2	1	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
8	1	8	double	2	1	\N	t	2026-03-14 00:24:01.711489+00	twin
9	1	9	double	2	1	\N	t	2026-03-14 00:24:01.711489+00	twin
10	1	10	triple	3	1	\N	t	2026-03-14 00:24:01.711489+00	twin
11	1	11	double	2	1	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
12	1	12	quad	4	1	\N	t	2026-03-14 00:24:01.711489+00	twin
13	1	13	quad	4	1	\N	t	2026-03-14 00:24:01.711489+00	twin
14	1	14	quad	4	1	\N	t	2026-03-14 00:24:01.711489+00	twin
15	1	15	quad	4	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
16	1	16	quad	4	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
17	1	17	triple	3	2	\N	t	2026-03-14 00:24:01.711489+00	twin
18	1	18	double	2	2	\N	t	2026-03-14 00:24:01.711489+00	twin
19	1	19	triple	3	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
20	1	20	double	2	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
21	1	21	double	2	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
22	1	22	double	2	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
23	1	23	double	2	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
24	1	24	double	2	2	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
25	1	25	double	2	3	\N	t	2026-03-14 00:24:01.711489+00	twin
26	1	26	triple	3	3	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
27	1	27	double	2	3	\N	t	2026-03-14 00:24:01.711489+00	matrimonial
28	1	28	familiar	6	3	\N	t	2026-03-14 00:24:01.711489+00	familiar
29	1	29	quad	4	3	\N	t	2026-03-14 00:24:01.711489+00	twin
30	1	30	familiar	6	3	\N	t	2026-03-14 00:24:01.711489+00	familiar
1	1	1	double	2	0	\N	t	2026-03-14 00:24:01.711489+00	twin
\.


--
-- Data for Name: sueldos; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.sueldos (id, hotel_id, user_id, sueldo_fijo, sueldo_por_hora, activo, created_at) FROM stdin;
1	1	3	0.00	20000.00	t	2026-03-18 05:07:20.126532+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: alumno
--

COPY public.users (id, hotel_id, email, name, password_hash, role, active, created_at, phone, categoria, fecha_ingreso) FROM stdin;
1	1	admin@hotelpuntacorral.com	Lorena	$argon2id$v=19$m=65536,t=3,p=4$NcY4x9hby5lzznlv7Z0zxg$HqFftsxNonrYKQuYJxy+joV1g+aIK37TI8mEDECFWpI	admin	t	2026-03-17 23:41:23.763682+00	\N	\N	\N
2	1	mucama@hotelpuntacorral.com	María García	$argon2id$v=19$m=65536,t=3,p=4$NcY4x9hby5lzznlv7Z0zxg$HqFftsxNonrYKQuYJxy+joV1g+aIK37TI8mEDECFWpI	employee	t	2026-03-18 02:59:14.277109+00	\N	mucama	2026-01-01
3	1	recepcionista@hotelpuntacorral.com	Ana López	$argon2id$v=19$m=65536,t=3,p=4$NcY4x9hby5lzznlv7Z0zxg$HqFftsxNonrYKQuYJxy+joV1g+aIK37TI8mEDECFWpI	employee	t	2026-03-18 03:41:36.170144+00	\N	recepcionista	2026-01-01
\.


--
-- Name: channels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.channels_id_seq', 5, true);


--
-- Name: configuracion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.configuracion_id_seq', 1, true);


--
-- Name: fichajes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.fichajes_id_seq', 1, true);


--
-- Name: gastos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.gastos_id_seq', 1, false);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.groups_id_seq', 67, true);


--
-- Name: guests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.guests_id_seq', 13, true);


--
-- Name: habitaciones_override_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.habitaciones_override_id_seq', 1, false);


--
-- Name: hotels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.hotels_id_seq', 1, true);


--
-- Name: precios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.precios_id_seq', 185, true);


--
-- Name: reservations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.reservations_id_seq', 1563, true);


--
-- Name: rooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.rooms_id_seq', 30, true);


--
-- Name: sueldos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.sueldos_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alumno
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: channels channels_slug_key; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_slug_key UNIQUE (slug);


--
-- Name: configuracion configuracion_hotel_id_clave_key; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_hotel_id_clave_key UNIQUE (hotel_id, clave);


--
-- Name: configuracion configuracion_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_pkey PRIMARY KEY (id);


--
-- Name: fichajes fichajes_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.fichajes
    ADD CONSTRAINT fichajes_pkey PRIMARY KEY (id);


--
-- Name: gastos gastos_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: guests guests_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_pkey PRIMARY KEY (id);


--
-- Name: habitaciones_override habitaciones_override_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.habitaciones_override
    ADD CONSTRAINT habitaciones_override_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (id);


--
-- Name: hotels hotels_slug_key; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_slug_key UNIQUE (slug);


--
-- Name: precios precios_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.precios
    ADD CONSTRAINT precios_pkey PRIMARY KEY (id);


--
-- Name: reservations reservations_hotel_id_room_id_check_in_key; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_hotel_id_room_id_check_in_key UNIQUE (hotel_id, room_id, check_in);


--
-- Name: reservations reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_hotel_id_number_key; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_hotel_id_number_key UNIQUE (hotel_id, number);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: sueldos sueldos_hotel_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.sueldos
    ADD CONSTRAINT sueldos_hotel_id_user_id_key UNIQUE (hotel_id, user_id);


--
-- Name: sueldos sueldos_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.sueldos
    ADD CONSTRAINT sueldos_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_fichajes_hotel_fecha; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_fichajes_hotel_fecha ON public.fichajes USING btree (hotel_id, fecha);


--
-- Name: idx_fichajes_user; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_fichajes_user ON public.fichajes USING btree (user_id);


--
-- Name: idx_gastos_hotel_fecha; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_gastos_hotel_fecha ON public.gastos USING btree (hotel_id, fecha);


--
-- Name: idx_groups_arrival; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_groups_arrival ON public.groups USING btree (hotel_id, arrival_date);


--
-- Name: idx_groups_hotel; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_groups_hotel ON public.groups USING btree (hotel_id);


--
-- Name: idx_guests_email; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_guests_email ON public.guests USING btree (hotel_id, email);


--
-- Name: idx_guests_hotel; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_guests_hotel ON public.guests USING btree (hotel_id);


--
-- Name: idx_hab_override; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_hab_override ON public.habitaciones_override USING btree (hotel_id, room_id, fecha_desde, fecha_hasta);


--
-- Name: idx_precios_fechas; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_precios_fechas ON public.precios USING btree (hotel_id, tipo, fecha_desde, fecha_hasta);


--
-- Name: idx_precios_hotel; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_precios_hotel ON public.precios USING btree (hotel_id);


--
-- Name: idx_res_channel; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_res_channel ON public.reservations USING btree (hotel_id, channel_id);


--
-- Name: idx_res_dates; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_res_dates ON public.reservations USING btree (hotel_id, check_in, check_out);


--
-- Name: idx_res_group; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_res_group ON public.reservations USING btree (hotel_id, group_id);


--
-- Name: idx_res_hotel; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_res_hotel ON public.reservations USING btree (hotel_id);


--
-- Name: idx_res_room; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_res_room ON public.reservations USING btree (room_id);


--
-- Name: idx_res_status; Type: INDEX; Schema: public; Owner: alumno
--

CREATE INDEX idx_res_status ON public.reservations USING btree (hotel_id, status);


--
-- Name: reservations trg_reservation_overlap; Type: TRIGGER; Schema: public; Owner: alumno
--

CREATE TRIGGER trg_reservation_overlap BEFORE INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.check_reservation_overlap();


--
-- Name: reservations trg_reservations_updated_at; Type: TRIGGER; Schema: public; Owner: alumno
--

CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: configuracion configuracion_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.configuracion
    ADD CONSTRAINT configuracion_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: fichajes fichajes_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.fichajes
    ADD CONSTRAINT fichajes_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: fichajes fichajes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.fichajes
    ADD CONSTRAINT fichajes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: gastos gastos_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: groups groups_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: guests guests_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.guests
    ADD CONSTRAINT guests_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: habitaciones_override habitaciones_override_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.habitaciones_override
    ADD CONSTRAINT habitaciones_override_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: habitaciones_override habitaciones_override_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.habitaciones_override
    ADD CONSTRAINT habitaciones_override_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: precios precios_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.precios
    ADD CONSTRAINT precios_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE RESTRICT;


--
-- Name: reservations reservations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: reservations reservations_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE SET NULL;


--
-- Name: reservations reservations_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: reservations reservations_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE RESTRICT;


--
-- Name: rooms rooms_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: sueldos sueldos_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.sueldos
    ADD CONSTRAINT sueldos_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: sueldos sueldos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.sueldos
    ADD CONSTRAINT sueldos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alumno
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

