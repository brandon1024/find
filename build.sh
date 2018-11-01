#!/usr/bin/env bash

ME=$0
ROOT_DIR=$PWD
BUILD_DIR="$ROOT_DIR/.build"
MANIFEST="$ROOT_DIR/manifest.json"
VERSION=

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
    -o, --output    Alternate build directory. Default '.build' in the current working directory
    -h, --help      Show help and exit
EOS
    exit 2
}

function parseargs() {
    while [[ $# -gt 0 ]]; do
        key="$1"

        case $key in
            -m|--manifest)
                case $2 in
                    /*) MANIFEST="$2" ;;
                    *) MANIFEST="$ROOT_DIR/$2" ;;
                esac
                shift
                shift
                ;;
            -v|--version)
                VERSION=$2
                shift
                shift
                ;;
            -o|--output)
                case $2 in
                    /*) BUILD_DIR="$2" ;;
                    *) BUILD_DIR="$ROOT_DIR/$2" ;;
                esac
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
if [[ ${MANIFEST} =~ "*/manifest.json" ]]; then
    echo "Error: file '$MANIFEST' must have the filename 'manifest.json'"
    exit 2
fi

# Check if manifest file exists
if [ ! -f ${MANIFEST} ]; then
    echo "Error: manifest file '$MANIFEST' not found."
    exit 2
fi

# Check if version number is set
if [ -z "$VERSION" ]; then
    echo "Error: missing version number."
    help
fi

# Create build directory structure
echo "$ME: Creating the build directory structure under $BUILD_DIR..."
rm -rf "$BUILD_DIR"
mkdir --parents --verbose "$BUILD_DIR/chr"
mkdir --parents --verbose "$BUILD_DIR/moz"

# Copy project src to build directory
echo "$ME: Copying project source files to build directory..."
PROJECT_SRC_DIR=$(dirname "${MANIFEST}")
for file in "$PROJECT_SRC_DIR/"*
do
    [[ $file = $BUILD_DIR ]] && continue
    cp -r "$file" "$BUILD_DIR/chr"
    cp -r "$file" "$BUILD_DIR/moz"
done

# Update manifest version numbers
echo "$ME: Updating version number in manifest to $VERSION..."
sed -i "s/\"version\": \"1\"/\"version\": \"$VERSION\"/" "$BUILD_DIR/chr/manifest.json"
sed -i "s/\"version\": \"1\"/\"version\": \"$VERSION\"/" "$BUILD_DIR/moz/manifest_firefox.json"

# Package extension for chrome
echo "$ME: Packaging extension for Chrome..."
rm -f "$BUILD_DIR/chr/manifest_firefox.json"
cd "$BUILD_DIR/chr"
zip -r "$BUILD_DIR/find-chrome.zip" .
cd "$ROOT_DIR"

# Package extension for firefox
echo "$ME: Packaging extension for Firefox..."
mv "$BUILD_DIR/moz/manifest_firefox.json" "$BUILD_DIR/moz/manifest.json"
cd "$BUILD_DIR/moz"
zip -r "$BUILD_DIR/find-firefox.zip" .
cd "$ROOT_DIR"