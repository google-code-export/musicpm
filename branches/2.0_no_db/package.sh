#!/bin/bash
mkdir mpm_$1
cp -R * mpm_$1
cd mpm_$1
find . -name ".svn" -exec rm -rf {} \;
sed 's/mpm_version/$1/g' find .
cd ..
zip -r mpm_$1.xpi mpm_$1

