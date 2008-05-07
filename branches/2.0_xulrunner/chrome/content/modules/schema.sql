PRAGMA cache_size = 10000;
PRAGMA short_column_names = 1;
PRAGMA temp_store = 2;


CREATE TABLE IF NOT EXISTS FS (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT,
	directory TEXT DEFAULT '',
    name      TEXT,
	created   INTEGER DEFAULT CURRENT_TIMESTAMP,
	db_update INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS directory (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT,
    name      TEXT,
	directory TEXT DEFAULT '',
    title     TEXT,
    container BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS file (
    ID        INTEGER UNIQUE,
    URI       TEXT UNIQUE PRIMARY KEY,
	type	  TEXT DEFAULT 'file',
	title     TEXT,
	album     TEXT,
	artist    TEXT,
	genre     TEXT,
	composer  TEXT,
	performer TEXT,
	track     INTEGER,
	date      INTEGER,
	disc      INTEGER,
	time      INTEGER,
	any 	  TEXT,
    lyrics    TEXT
);

CREATE TABLE IF NOT EXISTS genre (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'genre',
    title     TEXT,
    track     INTEGER,
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS artist (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'artist',
    title     TEXT,
    track     INTEGER,
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS performer (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'performer',
    title     TEXT,
    track     INTEGER,
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS composer (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'composer',
    title     TEXT,
    track     INTEGER,
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS date (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'date',
    title     INTEGER,
    track     INTEGER,
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS album (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'album',
    title     TEXT,
    artist    TEXT,
    date      INTEGER,
    track     INTEGER,
    container BOOLEAN DEFAULT 0,
    art_ID    INTEGER
);

CREATE TABLE IF NOT EXISTS album_art (
    ID       INTEGER PRIMARY KEY AUTOINCREMENT,
    album    TEXT,
    artist   TEXT,
    image    TEXT DEFAULT "chrome://minion/content/images/album_blank.png"
);

CREATE TABLE IF NOT EXISTS playlist (
    pos       INTEGER PRIMARY KEY,
    URI       TEXT
);

CREATE TABLE IF NOT EXISTS home (
    URI       TEXT UNIQUE PRIMARY KEY,
	type	  TEXT,
	title     TEXT,
	name      TEXT DEFAULT '',
	level     INTEGER DEFAULT 0,
	loc       TEXT DEFAULT 'Z.',
	container BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS stats (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT UNIQUE,
	value	  INTEGER,
    title     TEXT,
	container BOOLEAN DEFAULT 0
);





CREATE VIEW IF NOT EXISTS _dir_filter AS
	SELECT type, directory, name as title,
	    ifnull(nullif(directory || '/', '/'), '') || name as name, URI
	    FROM FS
	    WHERE type='directory'
	    ORDER BY directory, title;

CREATE VIEW IF NOT EXISTS directory_view AS
    SELECT p.URI AS URI, (count(p.URI <> c.URI) > 0) as container,
        p.title AS title, p.type AS type,
        p.directory AS directory, p.name AS name
    FROM _dir_filter as p
    LEFT OUTER JOIN _dir_filter as c
    ON c.directory=p.title
    GROUP BY p.name
    ORDER BY p.URI;


CREATE VIEW IF NOT EXISTS genre_view AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'genre' AS type, 'genre://' || genre AS URI,
	            genre as title, count(*) as track,
	            artist not null as container
            FROM file
            WHERE genre NOTNULL
            GROUP BY genre
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS topgenre AS
    SELECT * FROM genre WHERE rank < ((SELECT count(*) FROM genre)/10)+1;


CREATE VIEW IF NOT EXISTS artist_view AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'artist' AS type, 'artist://' || artist AS URI,
	            artist as title, count(*) as track,
	            album not null as container
            FROM file
            GROUP BY artist
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS topartist AS
    SELECT * FROM artist WHERE rank < ((SELECT count(*) FROM artist)/10)+1;


CREATE VIEW IF NOT EXISTS performer_view AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'performer' AS type, 'performer://' || performer AS URI,
	            performer as title, count(*) as track,
	            album not null as container
            FROM file
            WHERE performer NOTNULL
            GROUP BY performer
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS composer_view AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'composer' AS type, 'composer://' || composer AS URI,
	            composer as title, count(*) as track,
	            album not null as container
            FROM file
            WHERE composer NOTNULL
            GROUP BY composer
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS date_view AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'date' AS type, 'date://' || date AS URI, date as title,
	            count(*) as track,
	            album not null as container
            FROM file
            WHERE date NOTNULL
            GROUP BY date
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE view IF NOT EXISTS album_view AS
    SELECT 'album' AS type, 'album://' || album AS URI, album as title,
        count(*) as track, 0 as children,
        CASE count(DISTINCT artist)
        WHEN 1 THEN artist
        WHEN 2 then max(artist)
        WHEN 3 then max(artist)
        ELSE 'Various Artists'
        END artist,
        max(date) as date
    FROM file
    GROUP BY album
    ORDER BY title;

drop view lsinfo;
CREATE VIEW IF NOT EXISTS lsinfo AS
    SELECT t.URI as URI, t.type as type, t.directory as directory, t.name as name,
        f.disc as disc, f.track as track, ifnull(f.title,t.name) as title, f.album as album,
        f.artist as artist, f.composer as composer, f.performer as performer,
        f.genre as genre, f.date as date, f.time as time, p.pos as pos,
        p.pos + 1 as position
    FROM FS as t
    LEFT OUTER JOIN file as f on t.ID = f.ID
    LEFT OUTER JOIN playlist as p on t.URI = p.URI
    ORDER BY type,title;


CREATE VIEW IF NOT EXISTS plinfo AS
    SELECT f.URI as URI, f.type as type,
        f.disc as disc, f.track as track, f.title as title, f.album as album,
        f.artist as artist, f.composer as composer, f.performer as performer,
        f.genre as genre, f.time as time, p.pos as pos, p.pos + 1 as position
    FROM playlist AS p
    INNER JOIN file as f ON f.URI = p.URI
    ORDER BY pos;


CREATE VIEW IF NOT EXISTS plalbums AS
    SELECT 'album' AS type, min(pos) AS pos,
        p.album AS title,
        b.artist as artist,
        CASE count(*) WHEN 1 THEN p.title ELSE count(*) || ' songs...' END track
    FROM plinfo as p
    LEFT OUTER JOIN album as b ON p.album = b.title
    GROUP BY p.album
    ORDER BY pos;




CREATE INDEX IF NOT EXISTS fs_dir_index ON FS (directory);
CREATE INDEX IF NOT EXISTS fs_name_index ON FS (name);
CREATE UNIQUE INDEX IF NOT EXISTS fs_path_index ON FS (directory, name);

CREATE UNIQUE INDEX IF NOT EXISTS dir_URI_index ON directory (URI);
CREATE INDEX IF NOT EXISTS dir_name_index ON directory (name);

CREATE UNIQUE INDEX IF NOT EXISTS f_ID_index ON file (ID);
CREATE UNIQUE INDEX IF NOT EXISTS f_URI_index ON file (URI);
CREATE INDEX IF NOT EXISTS f_title_index ON file (title);
CREATE INDEX IF NOT EXISTS f_genre_index ON file (genre);
CREATE INDEX IF NOT EXISTS f_artist_index ON file (artist);
CREATE INDEX IF NOT EXISTS f_performer_index ON file (performer);
CREATE INDEX IF NOT EXISTS f_composer_index ON file (composer);
CREATE INDEX IF NOT EXISTS f_album_index ON file (album);
CREATE INDEX IF NOT EXISTS f_date_index ON file (date);
CREATE INDEX IF NOT EXISTS f_any_index ON file (any);

CREATE UNIQUE INDEX IF NOT EXISTS g_URI_index ON genre (URI);
CREATE UNIQUE INDEX IF NOT EXISTS g_title_index ON genre (title);
CREATE UNIQUE INDEX IF NOT EXISTS g_rank_index ON genre (rank);

CREATE UNIQUE INDEX IF NOT EXISTS a_URI_index ON artist (URI);
CREATE UNIQUE INDEX IF NOT EXISTS a_title_index ON artist (title);
CREATE UNIQUE INDEX IF NOT EXISTS a_rank_index ON artist (rank);

CREATE UNIQUE INDEX IF NOT EXISTS p_URI_index ON performer (URI);
CREATE UNIQUE INDEX IF NOT EXISTS p_title_index ON performer (title);
CREATE UNIQUE INDEX IF NOT EXISTS p_rank_index ON performer (rank);

CREATE UNIQUE INDEX IF NOT EXISTS c_URI_index ON composer (URI);
CREATE UNIQUE INDEX IF NOT EXISTS c_title_index ON composer (title);
CREATE UNIQUE INDEX IF NOT EXISTS c_rank_index ON composer (rank);

CREATE UNIQUE INDEX IF NOT EXISTS d_URI_index ON date (URI);
CREATE UNIQUE INDEX IF NOT EXISTS d_title_index ON date (title);
CREATE UNIQUE INDEX IF NOT EXISTS d_rank_index ON date (rank);

CREATE UNIQUE INDEX IF NOT EXISTS b_URI_index ON album (URI);
CREATE UNIQUE INDEX IF NOT EXISTS b_title_index ON album (title);
CREATE UNIQUE INDEX IF NOT EXISTS b_cover_index ON album (art_ID);

CREATE INDEX IF NOT EXISTS i_URI_index ON album_art (album);
CREATE INDEX IF NOT EXISTS i_title_index ON album_art (artist);

CREATE UNIQUE INDEX IF NOT EXISTS pl_index ON playlist (URI);
CREATE UNIQUE INDEX IF NOT EXISTS pl_pos_index ON playlist (pos);

CREATE UNIQUE INDEX IF NOT EXISTS stats_index ON stats (type);




CREATE TRIGGER IF NOT EXISTS fs_ensure_db_update BEFORE INSERT ON FS
	BEGIN
    	UPDATE FS SET db_update = new.db_update
		WHERE type=new.type AND directory=new.directory AND name=new.name;
	END;


CREATE TRIGGER IF NOT EXISTS fs_make_URI AFTER INSERT ON FS
	BEGIN
    	UPDATE FS SET URI=new.type || '://'
        || ifnull(nullif(new.directory || '/', '/'), '') || new.name
		WHERE rowid=new.rowid;
	END;


CREATE TRIGGER IF NOT EXISTS fs_delete_file AFTER DELETE ON FS WHEN old.type='file'
	BEGIN
        DELETE FROM file WHERE file.URI = old.URI;
	END;

CREATE TRIGGER IF NOT EXISTS f_check_date BEFORE UPDATE ON file
	BEGIN
    	UPDATE file SET date=CASE (
                new.date BETWEEN 1900 AND
                cast( strftime('%Y',date('now')) as INTEGER)+1
            )
            WHEN 1 THEN new.date ELSE NULL END
		WHERE rowid=new.rowid;
	END;

CREATE TRIGGER IF NOT EXISTS f_make_any AFTER UPDATE ON file
	BEGIN
    	UPDATE file SET any=lower( ifnull(new.title,'') || ifnull(new.artist,'')
    	|| ifnull(new.album,'') || replace(new.URI,'file://','') || ifnull(new.genre,'')
    	|| ifnull(new.performer,'') || ifnull(new.composer,'') )
		WHERE rowid=new.rowid;
	END;


CREATE TRIGGER IF NOT EXISTS make_title AFTER INSERT ON stats
	BEGIN
    	UPDATE stats SET title=new.type || ':  ' || CAST(new.value AS TEXT)
		WHERE rowid=new.rowid;
	END;


ANALYZE;
