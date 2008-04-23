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
CREATE INDEX IF NOT EXISTS tc_dir_index ON tag_cache (directory);
CREATE INDEX IF NOT EXISTS tc_name_index ON tag_cache (name);
CREATE UNIQUE INDEX IF NOT EXISTS tc_path_index ON tag_cache (directory, name);
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


CREATE TABLE IF NOT EXISTS file (
    ID        INTEGER UNIQUE,
    URI       TEXT UNIQUE PRIMARY KEY,
	type	  TEXT,
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
	any 	  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS f_ID_index ON file (ID);
CREATE UNIQUE INDEX IF NOT EXISTS f_URI_index ON file (URI);
CREATE INDEX IF NOT EXISTS f_title_index ON file (title);
CREATE INDEX IF NOT EXISTS f_artist_index ON file (artist);
CREATE INDEX IF NOT EXISTS f_album_index ON file (album);
CREATE INDEX IF NOT EXISTS f_genre_index ON file (genre);
CREATE INDEX IF NOT EXISTS f_date_index ON file (date);
CREATE INDEX IF NOT EXISTS f_any_index ON file (any);

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


CREATE VIEW IF NOT EXISTS lsinfo AS
    SELECT t.URI as URI, t.type as type, t.directory as directory, t.name as name,
        f.disc as disc, f.track as track, f.title as title, f.album as album,
        f.artist as artist, f.composer as composer, f.performer as performer,
        f.genre as genre, f.time as time
    FROM tag_cache as t LEFT OUTER JOIN file as f on t.ID = f.ID;


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
CREATE TRIGGER IF NOT EXISTS make_title AFTER INSERT ON stats
	BEGIN
    	UPDATE stats SET title=new.type || ':  ' || CAST(new.value AS TEXT)
		WHERE rowid=new.rowid;
	END;
CREATE UNIQUE INDEX IF NOT EXISTS  stats_index ON stats (type);

CREATE TABLE IF NOT EXISTS playlist (
    pos       INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT
);

