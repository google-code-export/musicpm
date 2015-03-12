## How do I add Music to Music Player Minion? How do I add songs? ##
**Answer:**  You don't.  See MusicPlayerDaemon.

## Introduction ##
Welcome to the Music Player Minion help page.  This page is a work in progress.  If you don't see what you are looking for yet, please feel free to post your question in the comments section at the bottom of this page in at http://groups.google.com/group/music-player-minion

If you are not already familiar with Music Player Daemon, please read this page: MusicPlayerDaemon

**This page will always refer to the most recent version available.**


---

## Keyboard Shortcuts ##
**Note:**  Where "Control" is mentioned, this may be a different accelerator key depending on your operating system.

### Application Level ###
| Play/Pause | Spacebar (if not in textbox or browsing collection) |
|:-----------|:----------------------------------------------------|
| Next Track | Control + Right |
| Previous Track | Control + Left |
| Stop Playback | Control + Backspace |
| Volume Up | = or + |
| Volume Down | - |
| Focus Search | Control + Z |
| Focus Playlist | Left |
| Focus Browse | Right |
| Focus MPD Command | F2 |
| Browse Back | Backspace |
| Bookmark Current Location | Control + D |
| Update Library / Current Folder | F5 |
| Playlist Menu | Alt + P |

### Playlist ###
| Select All | Control + A |
|:-----------|:------------|
| Delete Item(s) | Delete |

### Browse ###
| Select All | Control + A |
|:-----------|:------------|
| Delete Item(s) | Delete |
| Add to Playlist | Insert |
| Replace Playlist | Shift + Insert |
| Filter | Type any printable characters |


---

## Drag and drop ##

The following drag and drop combinations are possible within Music player Minion:

  * Drag to reorder within a playlist.
  * Drag to reorder items on the Home page.
  * Drag from playlist to browse section to remove playlist items.
  * Drag from browse section to playlist to add items.
  * Drag from browse to the current song section at the top to add to playlist and play those items immediately.
  * Drag from playlist to other destinations will drop text in the format:  artist - album - title
  * Drag from browse section to other destinations will drop the object name in text format.  For files this will be the filename, for all others it will be what is displayed in the Title column.
  * Links to supported audio files or playlists (.m3u or .pls) can be dropped into Minion's playlist.  This is a useful feature if you are using the sidebar version and want to drop a link from a web page.


---

## Custom Commands ##
Commands sent to MPD will be displayed in the status bar where it says "Last Command".  In addition to being informative, this location is also a textbox where you can enter your own commands.  This can be useful for using mpd features not implemented by MPM.  Commands entered here are the same as MPD's telnet protocol, see http://mpd.wikia.com/wiki/Protocol_Reference for details.  Commands that return results from the database will be displayed in the Browse section above.

Examples of how this feature could be used is to enter the command "list genre" to browse by  Genre,"crossfade 3" to add a 3 second crossfade, or advanced find and list commands.

Also, multiple commands can be strung together to create macros or queries using mpd's command\_list feature.  As a convenience, you can omit the command\_list\_begin/end commands.    To enter multiple commands, separate each command with a semicolon `;` (or use Alt + Enter to force a newline).  If you omit the command\_list\_begin or command\_list\_end statements they will be automatically added in before the commands are run.

The following example will play the entire library on random:
```
clear;add "/";random 1;play
```
which is the same as:
```
command_list_begin
clear
add "/"
random 1
play
command_list_end
```

When a command list will return multiple sets of database results, those results will be joined and the duplicates removed.


---

## Bookmarks ##
Bookmarking a location will add it to the Home page in Minion.  This can be especially useful when used with custom commands, creating a sort of "macro" feature.  Bookmarks for custom commands can be renamed after the bookmark has been created by right clicking on it and choosing Rename.