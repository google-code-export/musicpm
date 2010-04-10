#!/bin/bash

if [ -z "$1" ]
then
	echo "$0 release_number"
	exit 1
fi

DEFLNG="en-US"
L10N="chrome/locale"
for x in `cat $L10N/all-locales | grep -v $DEFLNG`
do
	php testlocale.php -s $L10N/$DEFLNG -d $L10N/$x
	if [ $? -ne 0 ]
	then
		echo "locale $x check failed"
		exit 1;
	fi
done

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
