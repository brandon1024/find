#!/usr/bin/env bash

rm -rf .build
mkdir .build
mkdir .build/chr .build/moz
cp -R * .build/chr
cp -R * .build/moz

# Package Extension for Chrome
cd .build
rm chr/_config.yml chr/build.sh chr/manifest_firefox.json
## TODO: zip


# Package Extension for Firefox
rm chr/_config.yml chr/build.sh chr/manifest.json
mv chr/manifest_firefox.json chr/manifest.json
## TODO: zip