# Introduction #

This page  is to provide an explanation of the configuration options in Music Player Minion (2.0+).


# Album Cover Art #

In the Settings window, you may enter a custom location for album cover art. If you enter a properly formatted URI, custom covers may be retrieved from a local location. Additionaly, it is also possible to use amazon service to retrive and save (locally) covers.

# Interface #

![http://musicpm.googlecode.com/files/Music_Player_Minion_2c2.png](http://musicpm.googlecode.com/files/Music_Player_Minion_2c2.png)


## Tag Syntax ##

You are provide with three variables you may use in the URL:

  * **{Artist}** - The Artist name from the ID3 tag.
  * **{Album}** - The Album name from the ID3 tag.
  * **{Path}** - The directory the file is in.

## Custom Cover Art ##

When viewing an album in the browser, these variables will be pulled from the first song displayed.

For example, I have saved album art using artist\_album.jpg format, and shared the folder as a samba share as well as ftp and can use the following URLs:

  * `file:///mnt/music/.covers/{Artist}_{Album}.jpg` - Linux mounted share.
  * `file://M:/music/.covers/{Artist}_{Album}.jpg` - Windows share mounted as M:\
  * `ftp://192.168.1.2/.covers/{Artist}_{Album}.jpg` - Ftp server.
  * `http://192.168.1.2/.covers/{Artist}_{Album}.jpg` - Web server.

You may also want to specify login and password for ftp and http like : **`ftp://login:pass@server/path/{Artist}_{Album}.jpg`**

It is also possible to a little bit more complex format such as **`{Artist}/{Artist}_{Album}.jpg`**

If the cover can't be retrieved, then it is possible to fallback and use amazon.com covers.

## Amazon Cover Art ##

Since version 2.0+, it is possible to retrieve and save custom album covers to a specific location.

  * **`No`** - Amazon.com service won't be used
  * **`Yes`** - Amazon.com service will be used
  * **`Save`** - Amazon.com service is use and album cover will be saved at the specified location

The URI format is same as above. Be sure to have write permissions otherwise music player minion won't be able to save the file.

### FTP Upload ###

If you save files to a FTP server, depending if you're using a proxy and based on its configuration, sub directories may or may not be created. By default, Firefox will **NOT** create the sub directories, but proxies like [Squid-cache](http://www.squid-cache.org/) will. If you notice you're not able to save covers, use a simplier file path like `/path/{Artists}_{Album}.jpg` instead.

Here is some logs with proftpd:
  * Using squid :
```
::ffff:127.0.0.1 UNKNOWN ftp [16/Apr/2010:12:48:49 +1000] "USER mpmtest" 331 -
::ffff:127.0.0.1 UNKNOWN mpmtest [15/Apr/2010:21:48:49 -0500] "PASS (hidden)" 230 -
::ffff:127.0.0.1 UNKNOWN mpmtest [15/Apr/2010:21:48:49 -0500] "MKD Ramin Djawadi" 257 -
::ffff:127.0.0.1 UNKNOWN mpmtest [15/Apr/2010:21:48:49 -0500] "STOR Ramin Djawadi_Iron Man.jpg" 226 7495
```
The Artist directory is created, then the image is sent to the server.

  * Without Squid
```
::ffff:192.168.1.2 UNKNOWN ftp [16/Apr/2010:12:40:21 +1000] "USER mpmtest" 331 -
::ffff:192.168.1.2 UNKNOWN mpmtest [15/Apr/2010:21:40:21 -0500] "PASS (hidden)" 230 -
::ffff:192.168.1.2 UNKNOWN mpmtest [15/Apr/2010:21:40:21 -0500] "STOR .covers/Ramin Djawadi/Ramin Djawadi_Iron Man.jpg" 550 -
```
The image with full path is sent to the server. The sub directory `Ramin Djawadi` has been created first. The command is reject, code 550.
See [FTP Codes](http://en.wikipedia.org/wiki/List_of_FTP_server_return_codes).