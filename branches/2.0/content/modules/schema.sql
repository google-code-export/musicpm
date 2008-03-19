PRAGMA cache_size = 10000;
PRAGMA short_column_names = 1;

CREATE TABLE IF NOT EXISTS tag_cache (
    URI       TEXT UNIQUE PRIMARY KEY,
	type	  TEXT,
	directory TEXT DEFAULT '',
    name      TEXT,
	title     TEXT,
	album     TEXT,
	artist    TEXT,
	genre     TEXT,
	composer  TEXT,
	performer TEXT,
	any 	  TEXT,
	track     INTEGER,
	date      INTEGER,
	disc      INTEGER,
	time      INTEGER,
	created   INTEGER DEFAULT CURRENT_TIMESTAMP,
	db_update INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS path_index ON tag_cache (directory);
CREATE INDEX IF NOT EXISTS name_index ON tag_cache (name);
CREATE INDEX IF NOT EXISTS URI_index ON tag_cache (URI);
CREATE UNIQUE INDEX IF NOT EXISTS file_index ON tag_cache (directory, name);
CREATE INDEX IF NOT EXISTS title_index ON tag_cache (title);
CREATE INDEX IF NOT EXISTS artist_index ON tag_cache (artist);
CREATE INDEX IF NOT EXISTS album_index ON tag_cache (album);
CREATE INDEX IF NOT EXISTS genre_index ON tag_cache (genre);
CREATE INDEX IF NOT EXISTS date_index ON tag_cache (date);
CREATE UNIQUE INDEX IF NOT EXISTS any_index ON tag_cache (any);

CREATE TRIGGER IF NOT EXISTS ensure_db_update BEFORE INSERT ON tag_cache
	BEGIN
    	UPDATE tag_cache SET db_update = new.db_update
		WHERE directory=new.directory AND name=new.name;
	END;
	
CREATE TRIGGER IF NOT EXISTS make_URI AFTER INSERT ON tag_cache
	BEGIN
    	UPDATE tag_cache SET URI=
    	new.type || '://' || ifnull(nullif(new.directory || '/', '/'), '') || new.name
		WHERE rowid=new.rowid;
	END;
	
CREATE TRIGGER IF NOT EXISTS make_any AFTER INSERT ON tag_cache WHEN new.type='file'
	BEGIN
    	UPDATE tag_cache SET any=lower( ifnull(new.title,'') || ifnull(new.artist,'') 
    	|| ifnull(new.album,'') || new.name || ifnull(new.genre,'')
    	|| ifnull(new.performer,'') || ifnull(new.composer,'') )
		WHERE rowid=new.rowid;
	END;


CREATE TABLE IF NOT EXISTS stats (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT UNIQUE,
	value	  INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS  stats_index ON stats (type);


CREATE VIEW IF NOT EXISTS file AS
	SELECT type,track,title,time,album,artist,genre,performer,composer,
	    date,disc,directory,name, URI
	    FROM tag_cache
	    WHERE type='file'
	    ORDER BY title;
	
CREATE VIEW IF NOT EXISTS directory AS
	SELECT type,track,title,time,album,artist,genre,performer,composer,
	    date,disc,directory,name, URI
	    FROM tag_cache
	    ORDER BY type, directory, name;

CREATE VIEW IF NOT EXISTS dir AS
	SELECT type, directory, name as title, URI
	    FROM tag_cache
	    WHERE type='directory'
	    ORDER BY directory, title;
	    
CREATE VIEW IF NOT EXISTS artist AS
	SELECT 'artist' AS type, artist as title, count(*) as track, 
            count(distinct album) || ' albums' as album, 
            'artist://' || artist AS URI
	    FROM tag_cache
	    WHERE artist NOTNULL
	    GROUP BY artist
	    ORDER BY title;
	
CREATE VIEW IF NOT EXISTS album AS
	SELECT DISTINCT 'album' AS type, album as title, 'album://' || album AS URI
	    FROM tag_cache
	    WHERE album NOTNULL
	    ORDER BY title;
	
CREATE VIEW IF NOT EXISTS genre AS
	SELECT DISTINCT 'genre' AS type, genre as title, 'genre://' || genre AS URI
	    FROM tag_cache
	    WHERE genre NOTNULL
	    ORDER BY title;
	
CREATE VIEW IF NOT EXISTS date AS
	SELECT DISTINCT 'date' AS type, date as title, 'date://' || date AS URI
	    FROM tag_cache
	    WHERE date NOTNULL
	    ORDER BY title;
	
CREATE VIEW IF NOT EXISTS composer AS
	SELECT DISTINCT 'composer' AS type, composer as title, 'composer://' || composer AS URI
	    FROM tag_cache
	    WHERE composer NOTNULL
	    ORDER BY title;
	
CREATE VIEW IF NOT EXISTS performer AS
	SELECT DISTINCT 'performer' AS type, performer as title, 'performer://' || performer AS URI
	    FROM tag_cache
	    WHERE performer NOTNULL
	    ORDER BY title;
	
CREATE VIEW IF NOT EXISTS stats_view AS
	SELECT 'stats' AS type, type || ': ' || CAST(value AS TEXT) as title
	    FROM stats;
	    
	    
	    
ATTACH DATABASE ':memory:' AS mem;

CREATE TABLE IF NOT EXISTS mem.playlist (
    pos       INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT
);


CREATE TABLE IF NOT EXISTS mem.browse(
    pos       INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT
);
	
