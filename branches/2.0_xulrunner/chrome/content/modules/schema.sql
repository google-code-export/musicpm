PRAGMA cache_size = 10000;
PRAGMA short_column_names = 1;
PRAGMA temp_store = 2;


CREATE TABLE IF NOT EXISTS FS (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT,
	directory TEXT DEFAULT '',
    name      TEXT,
	created   INTEGER DEFAULT 0,
	db_update INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS directory (
    ID        INTEGER UNIQUE,
    URI       TEXT UNIQUE PRIMARY KEY,
	type	  TEXT DEFAULT 'directory',
    name      TEXT,
	directory TEXT DEFAULT '',
    title     TEXT COLLATE NOCASE,
    container BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS file (
    ID        INTEGER UNIQUE,
    URI       TEXT UNIQUE PRIMARY KEY,
	type	  TEXT DEFAULT 'file',
	title     TEXT COLLATE NOCASE,
	album     TEXT COLLATE NOCASE,
	artist    TEXT COLLATE NOCASE,
	genre     TEXT COLLATE NOCASE,
	composer  TEXT COLLATE NOCASE,
	performer TEXT COLLATE NOCASE,
	track     INTEGER,
	date      INTEGER,
	disc      INTEGER,
	secs      INTEGER,
	time      TEXT,
	any 	  TEXT,
    lyrics    TEXT
);

CREATE TABLE IF NOT EXISTS genre (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'genre',
    title     TEXT COLLATE NOCASE,
    track     INTEGER,
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS artist (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'artist',
    title     TEXT COLLATE NOCASE,
    track     INTEGER,
    groupon   TEXT DEFAULT '!#...0-9...?@',
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS performer (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'performer',
    title     TEXT COLLATE NOCASE,
    track     INTEGER,
    container BOOLEAN DEFAULT 1,
    rank      INTEGER
);

CREATE TABLE IF NOT EXISTS composer (
    ID        INTEGER PRIMARY KEY AUTOINCREMENT,
    URI       TEXT UNIQUE,
	type	  TEXT DEFAULT 'composer',
    title     TEXT COLLATE NOCASE,
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
    title     TEXT COLLATE NOCASE,
    artist    TEXT COLLATE NOCASE,
    date      INTEGER,
    track     INTEGER,
    groupon   TEXT DEFAULT '!#...0-9...?@',
    container BOOLEAN DEFAULT 0
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
	title     TEXT COLLATE NOCASE,
	name      TEXT DEFAULT '',
	level     INTEGER DEFAULT 0,
	loc       TEXT DEFAULT 'Z.',
	container BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS stats (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT UNIQUE,
	value	  INTEGER,
    title     TEXT COLLATE NOCASE,
	container BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commands (
    cmd      TEXT UNIQUE PRIMARY KEY,
    syntax   TEXT
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
    SELECT * FROM genre WHERE rank < ((SELECT count(*) FROM genre)/10)+1
    ORDER BY title;


CREATE VIEW IF NOT EXISTS artist_view AS
    SELECT rowid AS rank, * FROM (
	        SELECT 'artist' AS type, 'artist://' || artist AS URI,
	            artist as title, count(*) as track,
                CASE (substr(artist,1,1) < 'A')
                WHEN 1 THEN '!#...0-9...?@'
                ELSE substr(replace(upper(artist),'THE ',''),1,1)
                END AS groupon,
	            album not null as container
            FROM file
            WHERE artist NOTNULL
            GROUP BY artist
            ORDER BY count(*) DESC
        )
        ORDER BY title;


CREATE VIEW IF NOT EXISTS topartist AS
    SELECT * FROM artist WHERE rank < ((SELECT count(*) FROM artist)/10)+1
    ORDER BY title;


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


CREATE VIEW IF NOT EXISTS topperformer AS
    SELECT * FROM performer WHERE rank < ((SELECT count(*) FROM performer)/10)+1
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


CREATE VIEW IF NOT EXISTS topcomposer AS
    SELECT * FROM composer WHERE rank < ((SELECT count(*) FROM composer)/10)+1
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
        max(date) as date,
        CASE (substr(album,1,1) < 'A')
        WHEN 1 THEN '!#...0-9...?@'
        ELSE substr(replace(upper(album),'THE ',''),1,1)
        END AS groupon
    FROM file
    WHERE album NOTNULL
    GROUP BY album
    ORDER BY artist,title;

CREATE VIEW IF NOT EXISTS lsinfo AS
    SELECT t.URI as URI, t.type as type, t.directory as directory, t.name as name,
        f.disc as disc, f.track as track, ifnull(f.title,t.name) as title, f.album as album,
        f.artist as artist, f.composer as composer, f.performer as performer,
        f.genre as genre, f.date as date, f.secs as secs, f.time as time,
        p.pos as pos, p.pos + 1 as position
    FROM FS as t
    LEFT OUTER JOIN file as f on t.ID = f.ID
    LEFT OUTER JOIN playlist as p on t.URI = p.URI
    ORDER BY type,title;

CREATE VIEW IF NOT EXISTS plinfo AS
    SELECT f.URI as URI, f.type as type,
        f.disc as disc, f.track as track, f.title as title,
        ifnull(f.album, 'unknown by ' || ifnull(f.artist, 'unknown')) as album,
        f.artist as artist, f.composer as composer, f.performer as performer,
        f.genre as genre, f.time as time, p.pos as pos, p.pos + 1 as position
    FROM playlist AS p
    INNER JOIN file as f ON f.URI = p.URI
    ORDER BY pos;

CREATE VIEW IF NOT EXISTS plalbums AS
    SELECT 'album' AS type, min(pos) AS pos,
        p.album AS title,
        ifnull(b.artist, p.artist) as artist,
        CASE count(*) WHEN 1 THEN
            p.position || '.  ' || p.title
        ELSE count(*) || ' songs...' END track,
        count(*) as children
    FROM plinfo as p
    LEFT OUTER JOIN album as b ON p.album = b.title
    GROUP BY p.album;




CREATE UNIQUE INDEX IF NOT EXISTS fs_URI_index ON FS (URI);
CREATE INDEX IF NOT EXISTS fs_name_index ON FS (name);

CREATE UNIQUE INDEX IF NOT EXISTS dir_URI_index ON directory (URI);

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

CREATE INDEX IF NOT EXISTS i_URI_index ON album_art (album);
CREATE INDEX IF NOT EXISTS i_title_index ON album_art (artist);

CREATE UNIQUE INDEX IF NOT EXISTS pl_index ON playlist (URI);
CREATE UNIQUE INDEX IF NOT EXISTS pl_pos_index ON playlist (pos);

CREATE UNIQUE INDEX IF NOT EXISTS aa_unique_index ON album_art (album, artist);




CREATE TRIGGER IF NOT EXISTS fs_ensure_db_update BEFORE INSERT ON FS
	BEGIN
    	UPDATE FS SET db_update = new.created
		WHERE type=new.type AND directory=new.directory AND name=new.name;
	END;

CREATE TRIGGER IF NOT EXISTS fs_create_URI AFTER INSERT ON FS
	BEGIN
    	UPDATE FS SET URI = new.type || '://' || ifnull(nullif(directory || '/', '/'), '') || new.name
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

CREATE TRIGGER IF NOT EXISTS f_make_time AFTER UPDATE ON file
	BEGIN
    	UPDATE file SET time=ifnull(nullif(ltrim(strftime('%H:',datetime(new.secs, 'unixepoch')),'0'),':'),'') ||
            ifnull(nullif(ltrim(strftime('%M:',datetime(new.secs, 'unixepoch')),'0'),':'),'0:') ||
            strftime('%S',datetime(new.secs, 'unixepoch'))
		WHERE rowid=new.rowid;
	END;

CREATE TRIGGER IF NOT EXISTS stats_make_title AFTER INSERT ON stats
    WHEN new.type NOT IN ('db_update', 'uptime', 'playtime', 'db_playtime')
	BEGIN
    	UPDATE stats SET title=CAST(new.value AS TEXT) || ' ' ||
            upper(substr(new.type,1,1)) || substr(new.type,2) || '.'
		WHERE rowid=new.rowid;
	END;

CREATE TRIGGER IF NOT EXISTS stats_make_title_time AFTER INSERT ON stats
    WHEN new.type IN ('uptime', 'playtime', 'db_playtime')
	BEGIN
    	UPDATE stats SET title=upper(substr(new.type,1,1)) || substr(new.type,2)
            || ':  ' ||
            CASE strftime("%Y", datetime(value, 'unixepoch')) - 1970
            WHEN 0 THEN
            ''
            ELSE
            cast((strftime("%Y", datetime(value, 'unixepoch'))-1970) as TEXT)  ||
            ' years, '
            END ||
            ltrim(cast(strftime("%j", datetime(new.value, 'unixepoch')) as TEXT),'0')  ||
            ' days, '  ||
            ltrim(cast(strftime("%H", datetime(new.value, 'unixepoch')) as TEXT),'0')  ||
            ' hours, '  ||
            ltrim(cast(strftime("%M", datetime(new.value, 'unixepoch')) as TEXT),'0')  ||
            ' minutes'
		WHERE rowid=new.rowid;
	END;

CREATE TRIGGER IF NOT EXISTS stats_make_title_date AFTER INSERT ON stats
    WHEN new.type = 'db_update'
	BEGIN
    	UPDATE stats SET title= 'Last Db Update:  ' || datetime(new.value,'unixepoch', 'localtime')
		WHERE rowid=new.rowid;
	END;



insert or ignore into commands (cmd, syntax) values('add', 'add <string>  (add to playlist)');
insert or ignore into commands (cmd, syntax) values('clear', '(clears playlist)');
insert or ignore into commands (cmd, syntax) values('crossfade', 'crossfade <int seconds>');
insert or ignore into commands (cmd, syntax) values('delete', 'delete <int song>');
insert or ignore into commands (cmd, syntax) values('disableoutput', 'disableoutput <int outputid>');
insert or ignore into commands (cmd, syntax) values('enableoutput', 'enableoutput <int outputid>');
insert or ignore into commands (cmd, syntax) values('kill', "(kill mpd proccess, don't do it)");
insert or ignore into commands (cmd, syntax) values('load', 'load <string name>');
insert or ignore into commands (cmd, syntax) values('move', 'move <int from> <int to>');
insert or ignore into commands (cmd, syntax) values('next', '(next track)');
insert or ignore into commands (cmd, syntax) values('password', 'password <string password>');
insert or ignore into commands (cmd, syntax) values('pause', 'pause [<bool pause>]');
insert or ignore into commands (cmd, syntax) values('play', 'play [<int song>]');
insert or ignore into commands (cmd, syntax) values('playlistadd', 'playlistadd <str playlist name> <str path>');
insert or ignore into commands (cmd, syntax) values('playlistclear', 'playlistclear <str playlist name>');
insert or ignore into commands (cmd, syntax) values('playlistdelete', 'playlistdelete <str playlist name> <int song id>');
insert or ignore into commands (cmd, syntax) values('playlistmove', 'playlistmove <str playlist name> <int song id> <int position>');
insert or ignore into commands (cmd, syntax) values('previous', '(previous track)');
insert or ignore into commands (cmd, syntax) values('random', 'random <int state>');
insert or ignore into commands (cmd, syntax) values('rename', 'rename <str name> <str new_name>');
insert or ignore into commands (cmd, syntax) values('repeat', 'repeat <int state>');
insert or ignore into commands (cmd, syntax) values('rm', 'rm <string name>');
insert or ignore into commands (cmd, syntax) values('save', 'save <string playlist name>');
insert or ignore into commands (cmd, syntax) values('seek', 'seek <int song> <int time>');
insert or ignore into commands (cmd, syntax) values('setvol', 'setvol <int vol>');