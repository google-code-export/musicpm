#!/bin/bash

if [ -z "$1" ]
then
	echo "$0 release_number"
	exit 1
fi

cd ..
rm -rf mpm_release
svn export 2.0_no_db mpm_release
cd mpm_release
rm *.py
rm *.sh
find . \( -iname "*.js" -or -iname "*.rdf" -or -iname "*.x?l" -or -iname "*.html" \) -type f | xargs sed -i "s/__mpm_version__/$1/g"
zip -r mpm_$1.xpi *
rm defaults/preferences/prefs.js
mv defaults/preferences/prefs.xr defaults/preferences/prefs.js
zip -r mpm_xulrunner_$1.zip * -x mpm_$1.xpi
