#!/bin/bash
cd /home/kavia/workspace/code-generation/offline-document-organizer-300488-300497/document_tracker_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

