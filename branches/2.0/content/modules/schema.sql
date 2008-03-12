PRAGMA cache_size = 10000;
PRAGMA short_column_names = 1;
PRAGMA temp_store = MEMORY;

CREATE TABLE IF NOT EXISTS tag_cache (
	type	  TEXT,
	directory TEXT DEFAULT '',
    name      TEXT,
	title     TEXT,
	album     TEXT,
	artist    TEXT,
	genre     TEXT,
	composer  TEXT,
	performer TEXT,
	track     TEXT,
	date      TEXT,
	disc      TEXT,
	time      INTEGER,
	any 	  TEXT,
	created   INTEGER DEFAULT CURRENT_TIMESTAMP,
	db_update INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS path_index ON tag_cache (directory);
CREATE INDEX IF NOT EXISTS name_index ON tag_cache (name);
CREATE UNIQUE INDEX IF NOT EXISTS file_index ON tag_cache (directory, name);
CREATE INDEX IF NOT EXISTS title_index ON tag_cache (title);
CREATE INDEX IF NOT EXISTS artist_index ON tag_cache (artist);
CREATE INDEX IF NOT EXISTS album_index ON tag_cache (album);
CREATE INDEX IF NOT EXISTS genre_index ON tag_cache (genre);
CREATE INDEX IF NOT EXISTS date_index ON tag_cache (date);
CREATE UNIQUE INDEX IF NOT EXISTS any_index ON tag_cache (any);

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
INSERT OR IGNORE INTO stats VALUES(NULL, 'schema_version', 0);


CREATE TEMP TABLE IF NOT EXISTS cur_playlist (
    pos       INTEGER PRIMARY KEY,
    filename  TEXT
);
CREATE INDEX IF NOT EXISTS cur_playlist_index ON cur_playlist (filename);


CREATE TEMP TABLE IF NOT EXISTS playlist (
    pos       INTEGER PRIMARY KEY,
    filename  TEXT
);
CREATE INDEX IF NOT EXISTS playlist_index ON playlist (filename);


CREATE VIEW IF NOT EXISTS file AS
	SELECT type,track,title,time,album,artist,genre,performer,composer,
	    date,disc,directory,name
	    FROM tag_cache
	    WHERE type='file'
	    ORDER BY name;
	
CREATE VIEW IF NOT EXISTS directory AS
	SELECT type,track,title,time,album,artist,genre,performer,composer,
	    date,disc,directory,name
	    FROM tag_cache
	    ORDER BY type, directory, name;

CREATE VIEW IF NOT EXISTS dir AS
	SELECT type, directory, name
	    FROM tag_cache
	    WHERE type='directory'
	    ORDER BY directory, name;
	    
CREATE VIEW IF NOT EXISTS artist AS
	SELECT DISTINCT 'artist' AS type, artist as name
	    FROM tag_cache
	    ORDER BY name;
	
CREATE VIEW IF NOT EXISTS album AS
	SELECT DISTINCT 'album' AS type, album as name
	    FROM tag_cache
	    ORDER BY name;
	
CREATE VIEW IF NOT EXISTS genre AS
	SELECT DISTINCT 'genre' AS type, genre as name
	    FROM tag_cache
	    ORDER BY name;
	
CREATE VIEW IF NOT EXISTS date AS
	SELECT DISTINCT 'date' AS type, date as name
	    FROM tag_cache
	    ORDER BY name;
	
CREATE VIEW IF NOT EXISTS composer AS
	SELECT DISTINCT 'composer' AS type, composer as name
	    FROM tag_cache
	    ORDER BY name;
	
CREATE VIEW IF NOT EXISTS performer AS
	SELECT DISTINCT 'performer' AS type, performer as name
	    FROM tag_cache
	    ORDER BY name;
	
CREATE VIEW IF NOT EXISTS stats AS
	SELECT 'stats' AS type, type || ': ' || value AS name
	    FROM stats;
	
