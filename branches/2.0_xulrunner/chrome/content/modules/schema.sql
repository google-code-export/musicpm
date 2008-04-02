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
	playcount INTEGER DEFAULT 0,
	lastplay  INTEGER,
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


ATTACH DATABASE ':memory:' AS mem;

CREATE TABLE IF NOT EXISTS mem.playlist (
    pos       INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT
);


CREATE TABLE IF NOT EXISTS mem.browse(
    pos       INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT
);


