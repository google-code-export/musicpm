CREATE TABLE IF NOT EXISTS file (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
	type	  TEXT,
    value     TEXT UNIQUE,
	directory TEXT,
    name      TEXT,
	Pos		  INTEGER,
	Title     TEXT,
	Album     TEXT,
	Artist    TEXT,
	Genre     TEXT,
	Composer  TEXT,
	Performer TEXT,
	Track     INTEGER DEFAULT 0,
	Date      TEXT DEFAULT 0,
	Disc      TEXT DEFAULT 1,
	Time      INTEGER DEFAULT 0,
	search	  TEXT DEFAULT '',
	lyrics    TEXT DEFAULT '',
	playcount INTEGER DEFAULT 0,
	lastplay  INTEGER DEFAULT 0,
	created   INTEGER DEFAULT CURRENT_TIMESTAMP,
	db_update INTEGER
);

CREATE TRIGGER IF NOT EXISTS make_search AFTER INSERT ON file
	BEGIN
    	UPDATE file SET search=ifnull(new.Title,'') || ifnull(new.Artist,'') 
    	|| ifnull(new.Album,'') || new.value || ifnull(new.Genre,'')
    	|| ifnull(new.Performer,'') || ifnull(new.Composer,'')
		WHERE rowid=new.rowid;
	END;

CREATE TABLE IF NOT EXISTS dir (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT,
    value     TEXT UNIQUE,
	directory TEXT,
    name      TEXT,
	db_update INTEGER
);

CREATE TABLE IF NOT EXISTS stats (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT UNIQUE,
	value	  INTEGER
);


CREATE UNIQUE INDEX IF NOT EXISTS filename_index ON file (value);
CREATE INDEX IF NOT EXISTS artist_index ON file (Artist);
CREATE INDEX IF NOT EXISTS album_index ON file (Album);
CREATE INDEX IF NOT EXISTS search_index ON file (search);
CREATE UNIQUE INDEX IF NOT EXISTS dir_index ON dir (value);

CREATE VIEW IF NOT EXISTS files AS
	SELECT type,Pos,Track,Title,Time,Album,Artist,Genre,Performer,Composer,Date,Disc,directory,value,name
	FROM file;

CREATE VIEW IF NOT EXISTS lsinfo AS
	SELECT type,NULL AS Pos,NULL AS Track,NULL AS Title,NULL AS Album,NULL AS Artist,
		NULL AS Date,NULL AS Disc,directory,value,name
	FROM dir
	UNION SELECT type,Pos,Track,Title,Album,Artist,Date,Disc,directory,value,name
	FROM file;
	
	
CREATE VIEW IF NOT EXISTS artists AS
	SELECT DISTINCT 'Artist' AS type, Artist as name FROM file;
	
CREATE VIEW IF NOT EXISTS albums AS
	SELECT DISTINCT 'Album' AS type, Album as name FROM file;
	
CREATE VIEW IF NOT EXISTS genres AS
	SELECT DISTINCT 'Genre' AS type, Genre as name FROM file;
	
CREATE VIEW IF NOT EXISTS dates AS
	SELECT DISTINCT 'Date' AS type, Date as name FROM file;
	
CREATE VIEW IF NOT EXISTS composers AS
	SELECT DISTINCT 'Composer' AS type, Composer as name FROM file;
	
CREATE VIEW IF NOT EXISTS performers AS
	SELECT DISTINCT 'Performer' AS type, Performer as name FROM file;
	
CREATE TEMP TABLE IF NOT EXISTS browse (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
	type	  TEXT,
    value     TEXT UNIQUE,
	directory TEXT,
    name      TEXT,
	Title     TEXT,
	Album     TEXT,
	Artist    TEXT,
	Genre     TEXT,
	Composer  TEXT,
	Performer TEXT,
	Track     INTEGER DEFAULT 0,
	Date      TEXT DEFAULT 0,
	Disc      TEXT DEFAULT 1,
	Time      INTEGER DEFAULT 0,
	Pos		  INTEGER
);

