## Introduction ##

Music Player Minion is not a music player by itself, but rather a client to control a music player.  The music player it controls is called Music Player Daemon, and you'll need to have this setup and running for Minion to be of any use.



## How do I Install MPD? ##

### Supported Operating Systems ###

MPD will only run on a unix style operating systems, such as Linux or BSD.  It can also be installed on Mac OSX, but expect it would be a little difficult.  Of these choices, linux would be the easiest choice.

For more information about linux, **I highly recommend this site:**
http://www.getgnulinux.org/

If you are using Windows and you decide you want to try linux, I'd recommend using Wubi to install ubunbtu as a great way to start:
http://wubi-installer.org/


### Who Should Use MPD ###

If you are new to Linux, I must warn you that MPD is not "User Friendly".  I don't want anyone to get the impression from this guide that Linux is complicated and difficult to use.  MPD's target audience is people that regularly use a command line interface and edit text files to configure their systems.

You'll notice that I put the warning _after_ I told you about Linux.  This is because I believe you should try Linux whether or not you end up using MPD and Music Player Minion.


### MPD Installation on Linux ###

The vast majority of Linux distributions use some sort of package manager.  This is similar to Add/Remove Programs in Windows, except that it is **actually** used to **Add** programs.  Common package managers include Synaptic, YAST, Fedora Package Manager, etc.  Just open up whichever you have and search for mpd.

If you have Ubuntu, you can install MPD by opening a terminal and typing (or copy and pasting):
`sudo apt-get install mpd`


### Configure MPD ###

To configure mpd, you'll need to edit a text file.  This file will be in different places depending on your distribution, it should be somewhere logical such as `/etc/mpd.conf` or `/etc/mpd/mpd.conf`.  You should not be able to edit this file without being root.  The easiest way to edit protected files is to open up a terminal and type:
`sudo gedit /etc/mpd.conf`

Any line that starts with a # is a comment and is ignored by mpd.  Reading the lines starting with # should provide you with all you need to know to configure mpd.

The most important line to change is `music_directory`.  You may want to change it a location in your home directory, which is /home/_Username_

To connect to the mpd server from another computer, you'll also need to change the bind\_to\_address option to "any".

Once you are done and have added music to the directory you specified, you may need to create the database for the first time.  Open a terminal and type:
`mpd --create-db`