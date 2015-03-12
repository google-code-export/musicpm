# Introduction #

This page  is to provide an explanation of the configuration options in Music Player Minion 2, currently in Alpha and available as versions 1.99.x.


# Album Cover Art #

In the Settings window, you may enter a custom location for album cover art if you enter a properly formatted URI and check off the "Use custom album cover URL" option.  If the "Fetch album covers from Amazon.com" option is checked also, it will use that method if the custom URL fails.

You are provide with three variables you may use in the URL:

  * **{Artist}** - The Artist name from the ID3 tag.
  * **{Album}** - The Album name from the ID3 tag.
  * **{Path}** - The directory the file is in.

When viewing an album in the browser, these variables will be pulled from the first song displayed.

For example, I have saved album art using artist\_album.png format, and shared the folder as a samba share as well as ftp and can use the following URLs:

  * `file:///mnt/music/covers/{Artist}_{Album}.png` - Linux mounted share.
  * `file://M:/music/covers/{Artist}_{Album}.png` - Windows share mounted as M:\
  * `ftp://192.168.1.2/covers/{Artist}_{Album}.png` - Ftp server.