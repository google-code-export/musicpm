#!/bin/bash
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
python ../2.0_no_db/goooglecode_upload.py -u cseickel -s "Music Player Minion 2 Alpha (xulrunner package)" -p musicpm -l "Type-Archive,OpSys-All" mpm_xulrunner_$1.zip
python ../2.0_no_db/googlecode_upload.py -u cseickel -s "Music Player Minion 2 Alpha (firefox extension)" -p musicpm -l "Featured,Type-Installer,OpSys-All" mpm_$1.xpi
