PRAGMA cache_size = 10000;
PRAGMA short_column_names = 1;
PRAGMA temp_store = 2;


CREATE TABLE IF NOT EXISTS tag_cache (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT,
	type	  TEXT,
	directory TEXT DEFAULT '',
    name      TEXT,
	created   INTEGER DEFAULT CURRENT_TIMESTAMP,
	db_update INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS file (
    ID        INTEGER UNIQUE,
    URI       TEXT UNIQUE PRIMARY KEY,
	type	  TEXT,
	title     TEXT,
	album     TEXT DEFAULT '<unknown>',
	artist    TEXT DEFAULT '<unknown>',
	genre     TEXT,
	composer  TEXT,
	performer TEXT,
	track     INTEGER,
	date      INTEGER,
	disc      INTEGER,
	time      INTEGER,
	any 	  TEXT
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
	children  INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS stats (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT UNIQUE,
	value	  INTEGER,
    title     TEXT
);





CREATE VIEW IF NOT EXISTS _dir_filter AS
	SELECT type, directory, name as title,
	    ifnull(nullif(directory || '/', '/'), '') || name as name, URI
	    FROM tag_cache
	    WHERE type='directory'
	    ORDER BY directory, title;


CREATE VIEW IF NOT EXISTS lsinfo AS
    SELECT t.URI as URI, t.type as type, t.directory as directory, t.name as name,
        f.disc as disc, f.track as track, f.title as title, f.album as album,
        f.artist as artist, f.composer as composer, f.performer as performer,
        f.genre as genre, f.date as date, f.time as time, p.pos as pos,
        p.pos + 1 as position
    FROM tag_cache as t
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


CREATE VIEW IF NOT EXISTS genre AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'genre' AS type, 'genre://' || genre AS URI,
	            genre as title, count(*) as track,
	            count(DISTINCT album) as children
            FROM file
            WHERE genre NOTNULL
            GROUP BY genre
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS topgenre AS
    SELECT * FROM genre WHERE rank < ((SELECT count(*) FROM genre)/10)+1;


CREATE VIEW IF NOT EXISTS artist AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'artist' AS type, 'artist://' || artist AS URI,
	            artist as title, count(*) as track,
	            count(DISTINCT album) as children
            FROM file
            GROUP BY artist
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS topartist AS
    SELECT * FROM artist WHERE rank < ((SELECT count(*) FROM artist)/10)+1;


CREATE VIEW IF NOT EXISTS performer AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'performer' AS type, 'performer://' || performer AS URI,
	            performer as title, count(*) as track,
	            count(DISTINCT album) as children
            FROM file
            WHERE performer NOTNULL
            GROUP BY performer
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS composer AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'composer' AS type, 'composer://' || composer AS URI,
	            composer as title, count(*) as track,
	            count(DISTINCT album) as children
            FROM file
            WHERE composer NOTNULL
            GROUP BY composer
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS date AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'date' AS type, 'date://' || date AS URI, date as title,
	            count(*) as track, count(DISTINCT album) as children
            FROM file
            WHERE date > 1900 AND date < cast( strftime('%Y',date('now')) as INTEGER)+1
            GROUP BY date
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS album AS
    SELECT rowid AS rank, * FROM (
            SELECT 'album' AS type, 'album://' || album AS URI, album as title,
	            count(*) as track, 0 as children,
                CASE count(DISTINCT artist)
                WHEN 1 THEN artist
                WHEN 2 then group_concat(DISTINCT artist)
                WHEN 3 then group_concat(DISTINCT artist)
                ELSE 'Various Artists'
                END artist
            FROM file
            GROUP BY album
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS plalbums AS
    SELECT 'album' AS type, min(pos) AS pos,
        ifnull(p.album,'<Unknown Album>') AS title,
        ifnull(b.artist,p.artist) as artist,
        max(p.artist) as key_artist
    FROM plinfo as p
    LEFT OUTER JOIN album as b ON p.album = b.title
    GROUP BY p.album
    ORDER BY pos;




CREATE INDEX IF NOT EXISTS tc_dir_index ON tag_cache (directory);
CREATE INDEX IF NOT EXISTS tc_name_index ON tag_cache (name);
CREATE UNIQUE INDEX IF NOT EXISTS tc_path_index ON tag_cache (directory, name);

CREATE UNIQUE INDEX IF NOT EXISTS f_ID_index ON file (ID);
CREATE UNIQUE INDEX IF NOT EXISTS f_URI_index ON file (URI);
CREATE INDEX IF NOT EXISTS f_title_index ON file (title);
CREATE INDEX IF NOT EXISTS f_artist_index ON file (artist);
CREATE INDEX IF NOT EXISTS f_album_index ON file (album);
CREATE INDEX IF NOT EXISTS f_genre_index ON file (genre);
CREATE INDEX IF NOT EXISTS f_date_index ON file (date);
CREATE INDEX IF NOT EXISTS f_any_index ON file (any);

CREATE UNIQUE INDEX IF NOT EXISTS pl_index ON playlist (URI);
CREATE UNIQUE INDEX IF NOT EXISTS pl_pos_index ON playlist (pos);

CREATE UNIQUE INDEX IF NOT EXISTS stats_index ON stats (type);




CREATE TRIGGER IF NOT EXISTS tc_ensure_db_update BEFORE INSERT ON tag_cache
	BEGIN
    	UPDATE tag_cache SET db_update = new.db_update
		WHERE type=new.type AND directory=new.directory AND name=new.name;
	END;


CREATE TRIGGER IF NOT EXISTS tc_make_URI AFTER INSERT ON tag_cache
	BEGIN
    	UPDATE tag_cache SET URI=new.type || '://'
        || ifnull(nullif(new.directory || '/', '/'), '') || new.name
		WHERE rowid=new.rowid;
	END;


CREATE TRIGGER IF NOT EXISTS tc_delete_file AFTER DELETE ON tag_cache WHEN old.type='file'
	BEGIN
        DELETE FROM file WHERE file.URI = old.URI;
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
