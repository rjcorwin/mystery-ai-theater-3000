#!/bin/bash

# Check if the correct number of arguments is provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <source_image_path> <output_image_path>"
    exit 1
fi

SOURCE_IMAGE="$1"
OUTPUT_IMAGE="$2"

# Verify that the source image file exists and is readable
if [ ! -f "$SOURCE_IMAGE" ] || [ ! -r "$SOURCE_IMAGE" ]; then
    echo "Error: Source image does not exist or cannot be read."
    exit 1
fi

# Check if sips command is available on the system
if ! command -v sips &> /dev/null; then
    echo "Error: 'sips' is not installed. This script requires macOS with sips."
    exit 1
fi

sips --resampleHeightWidthMax 1120 "$SOURCE_IMAGE" --out "$OUTPUT_IMAGE"


# Get the dimensions of the original image
width=$(identify -format "%w" "$OUTPUT_IMAGE")
height=$(identify -format "%h" "$OUTPUT_IMAGE")

if [ "$width" -gt "$height" ]; then
		# Landscape orientation (width > height)
		magick convert "$OUTPUT_IMAGE" -resize 1120x \
				-gravity center -extent 1120x1120 \
				"$OUTPUT_IMAGE"
else
		# Portrait orientation (height >= width)
		magick convert "$OUTPUT_IMAGE" -resize x1120 \
				-gravity center -extent 1120x1120 \
				"$OUTPUT_IMAGE"
fi
