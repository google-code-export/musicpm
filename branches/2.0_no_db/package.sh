#!/bin/bash
rm -rf ../mpm_release
mkdir ../mpm_release
cp -R * ../mpm_release
cd ../mpm_release
rm *.py
find . -type d -name ".svn*" -exec rm -rf {} \;
find . -type f -name ".svn*" -exec rm -rf {} \;
find . \( -iname "*.js" -or -iname "*.rdf" -or -iname "*.x?l" -or -iname "*.html" \) -type f | xargs sed -i "s/__mpm_version__/$1/g"
zip -r mpm_$1.xpi *
rm defaults/preferences/prefs.js
mv defaults/preferences/prefs.xr defaults/preferences/prefs.js
zip -r mpm_xulrunner_$1.zip * -x mpm_$1.xpi
cd ../mpm2
python googlecode_upload.py -u cseickel -p k7e5b4w8 -s "Music Player Minion 2 Alpha (xulrunner package)" -p musicpm -l "Type-Archive,OpSys-All" ../mpm_release/mpm_xulrunner_$1.zip
python googlecode_upload.py -u cseickel -p k7e5b4w8 -s "Music Player Minion 2 Alpha (firefox extension)" -p musicpm -l "Featured,Type-Installer,OpSys-All" ../mpm_release/mpm_$1.xpi
