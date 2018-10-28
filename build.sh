#!/usr/bin/env bash

# Display Usage
function help() {
        cat <<EOS
usage: ${ME} [options]
Build and package the find+ extension.

example:
    ${ME} -m find/manifest.json -v 1.4.4 -o find/buildpath

options:
    -m, --manifest  Alternate path of the manifest file 'manifest.json'.
    -v, --version   New extension version number
    -o, --output    Alternate build directory. Default '.build' in same directory as the manifest file.
    -h, --help      Show help and exit
EOS
    exit 2
}

ME=$0
MANIFEST="./manifest.json"
function parseargs() {
    while [[ $# -gt 0 ]]; do
        key="$1"

        case $key in
            -m|--manifest)
            MANIFEST=$2
            shift
            shift
            ;;
            -v|--version)
            VERSION=$2
            shift
            shift
            ;;
            -o|--output)
            BUILD=$2
            shift
            shift
            ;;
            -h|--help)
            help
            ;;
            *)
            echo "Error: Unknown option $key"
            help
            ;;
        esac
    done
}

parseargs "$@"

# Check if manifest filename matches expected filename
if [[ $MANIFEST =~ "*/manifest.json" ]]; then
    # Prepend ./ if necessary, else exit
    if [[ $MANIFEST == "manifest.json" ]]; then
        MANIFEST="./manifest.json"
    else
        echo "Error: file '$MANIFEST' must have the filename 'manifest.json'"
        exit 2
    fi
fi

# Check if manifest file exists
if [ ! -f $MANIFEST ]; then
    echo "Error: file '$MANIFEST' not found."
    exit 2
fi

# Check if version number is set
if [ -z "$VERSION" ]; then
    echo "Error: missing version number."
    help
fi

# Check if build directory is valid
if [ -z "$BUILD" ]; then
    BUILD=$(echo "$MANIFEST" | sed 's/manifest.json/.build/')
fi

# Create build directory if necessary
if [ ! -d "$BUILD" ]; then
    mkdir -p "$BUILD"
else
    rm -rf "$BUILD/*"
fi

mkdir "$BUILD/chr"
mkdir "$BUILD/moz"

PROJECTFILES=$(echo "$MANIFEST" | sed 's/manifest.json/*/')

cp -r "$PROJECTFILES" "$BUILD/chr"
cp -r "$PROJECTFILES" "$BUILD/moz"

#
## Package Extension for Chrome
#cd .build
#rm chr/_config.yml chr/build.sh chr/manifest_firefox.json
#sed -i 's/"version": "1"/"version": ""/' manifest.json
### TODO: zip
#
#
## Package Extension for Firefox
#rm chr/_config.yml chr/build.sh chr/manifest.json
#mv chr/manifest_firefox.json chr/manifest.json
## TODO: zip
