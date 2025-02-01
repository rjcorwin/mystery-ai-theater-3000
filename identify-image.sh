#!/bin/bash

# ./slurp-image.sh ./path/to/file.png "What this?"

BASE64_IMAGE=$(cat $1 | base64)
MESSAGE_CONTENT="$2"

# echo "$MESSAGE_CONTENT"

echo "um. um. um. I got it... it's um..."

curl -X POST 'http://localhost:11434/api/chat' \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2-vision",
    "messages": [
      {
        "role": "user",
        "content": "'"$MESSAGE_CONTENT"'",
        "images": ["'"$BASE64_IMAGE"'"]
      }
    ]
  }' -sS \
  | jq '.message.content' -c | tr -d '\n' | tr -d '"'

