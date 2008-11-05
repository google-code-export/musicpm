#!/bin/bash
mkdir mpm_$1
cp -R * mpm_$1
cd mpm_$1
find . -name ".svn" -exec rm -rf {} \;
find . \( -iname "*.js" -or -iname "*.rdf" -or -iname "*.x?l" -or -iname "*.html" \) -type f | xargs sed 's/__mpm_version__/$1/g'
cd ..
zip -r mpm_$1.xpi mpm_$1
rm -rf mpm_$1
