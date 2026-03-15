#!/usr/bin/env bash

ME=$0
PROJECT_SRC_DIR=$(cd $(dirname "$ME") && pwd)
BUILD_DIR="$PWD/.build"
VERSION=

# Display Usage
function help() {
        cat <<EOS
usage: ${ME} [options]
Build and package the find+ extension.

example:
    ${ME} -v 1.4.4 -o find/buildpath

options:
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
            -v|--version)
                VERSION=$2
                shift
                shift
                ;;
            -o|--output)
                case $2 in
                    /*) BUILD_DIR="$2" ;;
                    *) BUILD_DIR="$PWD/$2" ;;
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

# Check if version number is set
if [ -z "$VERSION" ]; then
    echo "Error: missing version number."
    help
fi

# Check if zip is installed
if ! command -v zip >/dev/null; then
    echo "Error: missing 'zip' utility."
    exit 2
fi

# Create build directory structure
echo "$ME: Creating the build directory structure under $BUILD_DIR..."
rm -rf "$BUILD_DIR"
mkdir --parents --verbose "$BUILD_DIR/chr"
mkdir --parents --verbose "$BUILD_DIR/moz"

# Copy project src to build directory
echo "$ME: Copying project source files to build directory..."
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
(
    cd "$BUILD_DIR/chr" &&
    rm -f "manifest_firefox.json" &&
    zip -r "$BUILD_DIR/find-chrome.zip" . ;
)

# Package extension for firefox
echo "$ME: Packaging extension for Firefox..."
(
    cd "$BUILD_DIR/moz" &&
    mv "manifest_firefox.json" "manifest.json" &&
    zip -r "$BUILD_DIR/find-firefox.zip" . ;
)
