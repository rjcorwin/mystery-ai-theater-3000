#!/bin/bash

cd backend
go run main.go &
cd ..

cd frontend
npm start
