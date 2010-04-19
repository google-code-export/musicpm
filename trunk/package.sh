#!/bin/bash

DEFLNG="en-US"
L10N="chrome/locale"
DST="./release"
PHP="/usr/bin/php"


cd "`dirname "$0"`"

if [ -z "$1" ]
then
	echo "$0 release_number"
	exit 1
fi

echo "checking locales..."
for x in `cat $L10N/all-locales | grep -v $DEFLNG`
do
	php testlocale.php -s $L10N/$DEFLNG -d $L10N/$x
	if [ $? -ne 0 ]
	then
		echo "locale $x check failed"
		exit 1;
	fi
done

echo "exporting content..."
rm -rf $DST
mkdir -p $DST
rsync -r --delete-excluded --exclude=.\* \
	--exclude=\*.db --exclude=\*.jar --exclude=\*.php \
	--exclude=\*.sh --exclude=\*.py --exclude=\*.xpi --exclude=$DST ./ $DST

cd $DST

echo "applying version information..."
find . \( -iname "*.js" -or -iname "*.rdf" -or -iname "*.x?l" -or -iname "*.html" \) -type f | xargs sed -i "s/__mpm_version__/$1/g"

echo "creating package..."
rm -rf $DST
zip -q -r mpm_$1.xpi *
# rm defaults/preferences/prefs.js
# mv defaults/preferences/prefs.xr defaults/preferences/prefs.js
# zip -r mpm_xulrunner_$1.zip * -x mpm_$1.xpi
mv *.xpi ../
cd ..
rm -rf $DST
