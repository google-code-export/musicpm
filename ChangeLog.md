#summary A history of changes made for each release.  Alphas not included.
#labels Featured

# 2.1.2 (under development) #
  * Added integration option to the "Save as..." dialog box ([issue 85](https://code.google.com/p/musicpm/issues/detail?id=85)) ([r339](https://code.google.com/p/musicpm/source/detail?r=339))
  * Added support for drag and drop for playlists only ([issue 84](https://code.google.com/p/musicpm/issues/detail?id=84)) ([r339](https://code.google.com/p/musicpm/source/detail?r=339))
  * Added integration option in the preference dialog box ([r339](https://code.google.com/p/musicpm/source/detail?r=339))
  * Visual enhancement (style and positions) in the preference dialog box ([r339](https://code.google.com/p/musicpm/source/detail?r=339), [r340](https://code.google.com/p/musicpm/source/detail?r=340), [r341](https://code.google.com/p/musicpm/source/detail?r=341))
  * Updated translations
  * Fixed support for xspf playlists ([issue 39](https://code.google.com/p/musicpm/issues/detail?id=39)) ([r339](https://code.google.com/p/musicpm/source/detail?r=339))
  * Fixed support for m3u playlists ([r339](https://code.google.com/p/musicpm/source/detail?r=339))
  * Fixed resizable statusbar in  Firefox 3.0 ([issue 86](https://code.google.com/p/musicpm/issues/detail?id=86)) ([r339](https://code.google.com/p/musicpm/source/detail?r=339))
  * Fixed statusbar title when playlist is empty at startup ([issue 87](https://code.google.com/p/musicpm/issues/detail?id=87)) ([r339](https://code.google.com/p/musicpm/source/detail?r=339))
  * Removed context menu
  * Removed broken custom menu "Add URL to Playlist" since the sandbox prevent prompt()
  * Removed obsolote functions
  * Removed obsolete code

# 2.1.1 (2010/06/04) #
  * Added a resizable statusbar. The size is saved and restored properly. ([r324](https://code.google.com/p/musicpm/source/detail?r=324))
  * Ability to entirely hide the statusbar ([r330](https://code.google.com/p/musicpm/source/detail?r=330))
  * Added menu to control the extension when the statusbar is hidden ([r330](https://code.google.com/p/musicpm/source/detail?r=330))
  * At first statup, if MPD\_HOST and MPD\_PORT exist, they're used as default server ([r332](https://code.google.com/p/musicpm/source/detail?r=332))
  * Added preferences to individualy hide/show statusbar controls ([issue 52](https://code.google.com/p/musicpm/issues/detail?id=52)) ([r333](https://code.google.com/p/musicpm/source/detail?r=333))
  * Added Minion menu in the menubar ([issue 75](https://code.google.com/p/musicpm/issues/detail?id=75)) ([r330](https://code.google.com/p/musicpm/source/detail?r=330))
  * The upgrade box is always displayed after each update ([r335](https://code.google.com/p/musicpm/source/detail?r=335))
  * Updated Spanish translation (About box)
  * Fixed menu corruption is menu editor ([issue 80](https://code.google.com/p/musicpm/issues/detail?id=80))
  * Fixed upgrade dialog box when displayed. Version and name properly displayed ([r325](https://code.google.com/p/musicpm/source/detail?r=325))
  * Fixed Spanish translations (UTF-8 + BOM header)
  * Fixed French translation

# 2.1.0 (2010/05/16) #
  * New main interface (including, playlist, folder and tag navigation)
  * New preference panels (including debugs, amazon and status-bar controls)
  * Playback controls in Firefox status-bar
  * Spanish language
  * Added a proper "about" box
  * Added an uprade window
  * Per-profile settings
  * Compatible with Portable Firefox
  * Security fixes
  * Fixed some UTF-8 problems
  * Many fixes
  * A total of 62 commits

# 1.4.4 #

  * Fixed loading playlists with apostrophes from menus.
  * Fixed version number in About page.
  * Bumped max version to 3.0b5.

# 1.4.3 #

  * Added workarounds for somafm.com.  Their internet radio links will now be recognized as .pls and their links converted to the .pls files.
  * Turned off debug messages in the console.
  * Added validation to the $() function (shortcut for getElementById).

# 1.4.2 #

  * Added chrome to mini-player (OS supplied window decorations).  The chromeless window was to buggy under Windows.
  * Fixed bugs with browser overlay commands not always working, such as the statusba controls.

# 1.4a #

  * Added mini-player.
  * Shortened "Music Player Minion" menu to just "Minion".
  * Check for blank lines when loading .pls and .m3u playlists, which resulted in adding the whole library when executed.
  * Added Mini-Player, About, and Help buttons to the main player interface.
  * Starting with this release, the installed version will be included in the about page.
  * Can now use scroll wheel to change volume and seek when mouse is over those controls.

Thanks to Alex Eng for inspiration on how to move a window with no Title bar:
http://aecreations.blogspot.com/2007/12/creating-clippings-toolbar.html

# 1.3.1 #

  * Fixed drag and drop loading for playlist to handle URLs the same as the menu command does.
  * Added "Add Link to MPD Playlist" and "Play with MPD" commands to Firefox's context menu for supported links.

# 1.3 #

  * Added support for loading m3u and pls internet radio streams from URLs.
  * Cleaned up navigation buttons when browsing via tag types.

# 1.2 #

  * Playback controls added to statusbar.
  * Improved filtering and sorting.  Sorting now sorts Time, Position, and Track as a number.  Filter as you type will filter on the sorted column.  Using `*` is now allowed at beginging of filter.
  * Playlists can now be edited without loading them.  Current Playlist has all of the features and controls of the playlist sidebar.
  * Added context menu command for "Add to Saved Playlist".
  * Playlist menu will remain visible if the playlist sidebar is collapsed.  The playlist sidebar has become an optional feature.
  * Context menus have been improved to only show relevant commands for the item clicked on.
  * "Update" (F5) will now update only the current directory when browsing Folders.  Container icons will change to the update icon while an update is in progress.
  * Added indicators for the currently playing song.  Current song will always be bolded with an icon to indicate playing or paused.
  * An icon will be displayed for all tag types.
  * Numerous small bug fixes and tweaks.


# 1.1 #
  * Added filter feature.  Will now filter on the Title field as you type when browsing the library.
  * Standalone version now sizes itself to fit the content when it opens.  Prior to this it was set to display at a fixed size which cut off the clear search button on the right hand side.